import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateContentModel } from "@/lib/content.functions";
import type { ContentModel } from "@/lib/content";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

/** Super Admin : catalogue des modèles IA du Studio de contenus. */
export function ContentModelsPanel() {
  const qc = useQueryClient();
  const update = useServerFn(updateContentModel);
  const [edits, setEdits] = useState<Record<string, number>>({});

  const models = useQuery({
    queryKey: ["admin-content-models"],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_models").select("*").order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ContentModel[];
    },
  });

  const mutate = useMutation({
    mutationFn: (input: { key: string; is_active?: boolean; credits?: number }) => update({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content-models"] });
      qc.invalidateQueries({ queryKey: ["content-models"] });
      toast.success("Modèle mis à jour.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Mise à jour impossible."),
  });

  return (
    <Card className="p-5">
      <h2 className="text-base font-bold text-black">Modèles IA — Studio de contenus</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Activez les modèles disponibles pour les utilisateurs et ajustez leur coût en crédits.
      </p>
      <div className="mt-4 space-y-2">
        {(models.data ?? []).map((m) => (
          <div key={m.key} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
            <div className="min-w-52 flex-1">
              <p className="text-sm font-bold text-black">{m.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {m.provider} · {m.kind} · {m.speed} · {m.quality}
              </p>
            </div>
            <Badge variant="secondary">{m.model}</Badge>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                className="w-20"
                value={edits[m.key] ?? m.credits}
                onChange={(e) => setEdits((s) => ({ ...s, [m.key]: Number(e.target.value) }))}
              />
              <span className="text-xs text-muted-foreground">crédits</span>
              {edits[m.key] !== undefined && edits[m.key] !== m.credits ? (
                <Button size="sm" onClick={() => mutate.mutate({ key: m.key, credits: edits[m.key] })}>
                  Enregistrer
                </Button>
              ) : null}
            </div>
            <Switch
              checked={m.is_active}
              onCheckedChange={(v) => mutate.mutate({ key: m.key, is_active: v })}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
