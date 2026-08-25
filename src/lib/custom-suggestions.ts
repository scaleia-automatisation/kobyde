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

const HIDDEN_PREFIX = "kobyde.suggestions.hidden.";

function readHidden(agentKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_PREFIX + agentKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function writeHidden(agentKey: string, values: string[]) {
  try {
    window.localStorage.setItem(HIDDEN_PREFIX + agentKey, JSON.stringify(values.slice(0, 50)));
  } catch {
    /* quota ou mode privé : on ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useCustomSuggestions(agentKey: string) {
  const [items, setItems] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      setItems(read(agentKey));
      setHidden(readHidden(agentKey));
    };
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
      writeHidden(agentKey, readHidden(agentKey).filter((s) => s !== value));
      write(agentKey, [value, ...current]);
      return true;
    },
    [agentKey],
  );

  /** Retire une suggestion : personnalisée (supprimée) ou par défaut (masquée). */
  const remove = useCallback(
    (text: string) => {
      const current = read(agentKey);
      if (current.includes(text)) write(agentKey, current.filter((s) => s !== text));
      else writeHidden(agentKey, [...readHidden(agentKey), text]);
    },
    [agentKey],
  );

  const removeAll = useCallback(() => {
    write(agentKey, []);
    writeHidden(agentKey, suggestionsFor(agentKey));
  }, [agentKey]);

  return { items, hidden, add, remove, removeAll };
}

/** Suggestions par défaut + personnalisées, sans doublon ni suggestion masquée. */
export function useAgentSuggestions(agentKey: string) {
  const { items, hidden, add, remove, removeAll } = useCustomSuggestions(agentKey);
  const all = [...items, ...suggestionsFor(agentKey).filter((s) => !items.includes(s))].filter(
    (s) => !hidden.includes(s),
  );
  return { all, custom: items, add, remove, removeAll };
}

