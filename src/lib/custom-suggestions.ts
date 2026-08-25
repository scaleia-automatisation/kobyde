import { useCallback, useEffect, useState } from "react";
import { suggestionsFor } from "@/lib/agent-suggestions";

/**
 * Suggestions personnalisées ajoutées par l'utilisateur pour un agent
 * (ex. une demande récente promue en suggestion). Persistées localement.
 */
const PREFIX = "kobyde.suggestions.";
const EVENT = "kobyde:suggestions";

function read(agentKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + agentKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(agentKey: string, values: string[]) {
  try {
    window.localStorage.setItem(PREFIX + agentKey, JSON.stringify(values.slice(0, 12)));
  } catch {
    /* quota ou mode privé : on ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useCustomSuggestions(agentKey: string) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setItems(read(agentKey));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [agentKey]);

  const add = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value) return false;
      const current = read(agentKey);
      if (current.includes(value) || suggestionsFor(agentKey).includes(value)) return false;
      write(agentKey, [value, ...current]);
      return true;
    },
    [agentKey],
  );

  const remove = useCallback(
    (text: string) => write(agentKey, read(agentKey).filter((s) => s !== text)),
    [agentKey],
  );

  return { items, add, remove };
}

/** Suggestions par défaut + personnalisées, sans doublon. */
export function useAgentSuggestions(agentKey: string) {
  const { items, add, remove } = useCustomSuggestions(agentKey);
  const all = [...items, ...suggestionsFor(agentKey).filter((s) => !items.includes(s))];
  return { all, custom: items, add, remove };
}
