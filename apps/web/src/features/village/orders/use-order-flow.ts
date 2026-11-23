import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  ApiError,
  newRequestKey,
  type RallyAction,
  type SupportPreview,
  type VillageSnapshot,
} from '@dwar/api-client';

/** O que o jogador escolhe numa ordem, venha o alvo do mapa ou das coordenadas da Praça. */
export type OrderChoice = {
  kind: 'attack' | 'support';
  counts: Record<string, number>;
  targetBuilding: string;
};
export const emptyChoice: OrderChoice = { kind: 'attack', counts: {}, targetBuilding: 'main' };

/** Tropas que cabem na ordem: nunca mais do que há em casa agora. */
export function clampCounts(
  counts: Record<string, number>,
  home: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counts).map(([code, value]) => [
      code,
      Math.max(0, Math.min(home[code] ?? 0, value)),
    ]),
  );
}

/**
 * Rascunhos guardados fora das telas: fechar a Praça, ir à aldeia ou trocar de janela não obriga a
 * escolher tudo de novo. Vale por aldeia e por entrada (mapa ou Praça), só nesta sessão.
 */
const drafts = new Map<string, unknown>();
export function useSavedDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (drafts.get(key) as T | undefined) ?? initial);
  return [
    value,
    (next: T | ((previous: T) => T)) =>
      setValue((previous) => {
        const result = typeof next === 'function' ? (next as (p: T) => T)(previous) : next;
        drafts.set(key, result);
        return result;
      }),
  ] as const;
}

/**
 * Da escolha à confirmação, igual para as duas entradas. A revisão guarda a resposta do servidor e
 * a confirmação envia exatamente essa resposta, nunca o rascunho.
 */
export function useOrderFlow(
  snapshot: VillageSnapshot,
  onDone: (action: RallyAction, reviewed: SupportPreview | null) => void,
) {
  const worldId = snapshot.world.id,
    villageId = snapshot.village.id;
  const client = useQueryClient();
  const key = ['rally', worldId, villageId];
  const [confirmation, setConfirmation] = useState<SupportPreview | null>(null);
  // Pedido cujo resultado ainda não se sabe: repetir usa a mesma chave, então nunca envia em dobro.
  const intent = useRef<{ action: RallyAction; requestId: string } | null>(null);
  const rally = useQuery({
    queryKey: key,
    queryFn: () => api.rally(worldId, villageId),
    refetchInterval: 3000,
  });
  const preview = useMutation({
    mutationFn: ({ x, y, choice }: { x: number; y: number; choice: OrderChoice }) => {
      const counts = clampCounts(choice.counts, rally.data?.home ?? {});
      return api.previewSupport(
        worldId,
        villageId,
        x,
        y,
        // A API pede todas as unidades, inclusive as que não vão.
        Object.fromEntries(
          (rally.data?.unitTypes ?? []).map(({ code }) => [code, counts[code] ?? 0]),
        ),
        choice.kind,
        choice.kind === 'attack' && (counts.catapult ?? 0) > 0 ? choice.targetBuilding : undefined,
      );
    },
    onSuccess: setConfirmation,
  });
  const send = useMutation({
    mutationFn: (input: { action: RallyAction; requestId: string }) =>
      api.rallyAction(worldId, villageId, input.action, input.requestId),
    onSuccess: (data, input) => {
      intent.current = null;
      client.setQueryData(key, data);
      void client.invalidateQueries({ queryKey: ['village', worldId] });
      void client.invalidateQueries({ queryKey: ['map', worldId] });
      const reviewed =
        input.action.type === 'attack' || input.action.type === 'support' ? confirmation : null;
      if (reviewed) setConfirmation(null);
      preview.reset();
      onDone(input.action, reviewed);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) intent.current = null;
    },
  });
  function perform(action: RallyAction) {
    const input = intent.current ?? { action, requestId: newRequestKey() };
    intent.current = input;
    send.mutate(input);
  }
  /** Não se sabe se a ordem saiu: só dá para conferir, não para editar e mandar outra por cima. */
  const uncertain = send.isError && intent.current !== null;
  const clock = rally.data
    ? new Date(rally.data.serverTime).getTime() + Math.max(0, Date.now() - rally.dataUpdatedAt)
    : Date.now();
  return {
    data: rally.data,
    refetch: () => void rally.refetch(),
    clock,
    confirmation,
    review: (x: number, y: number, choice: OrderChoice, onReviewed?: () => void) => {
      send.reset();
      preview.mutate({ x, y, choice }, onReviewed ? { onSuccess: onReviewed } : undefined);
    },
    /** Volta da revisão para ajustar, mantendo tudo o que foi escolhido. */
    back: () => {
      setConfirmation(null);
      send.reset();
    },
    confirm: () => {
      if (!confirmation) return;
      const { kind, target, troops, targetBuilding } = confirmation;
      perform(
        kind === 'attack'
          ? {
              type: 'attack',
              targetId: target.id,
              troops,
              ...(targetBuilding ? { targetBuilding } : {}),
            }
          : { type: 'support', targetId: target.id, troops },
      );
    },
    cancel: (movementId: number) => perform({ type: 'cancel', movementId }),
    recall: (locationId: number) => perform({ type: 'recall', locationId }),
    retry: () => {
      if (intent.current) send.mutate(intent.current);
    },
    /** Esquece o aviso de erro quando o jogador muda a escolha que o causou. */
    clearError: () => {
      if (uncertain) return;
      if (preview.isError) preview.reset();
      if (send.isError) send.reset();
    },
    uncertain,
    reviewing: preview.isPending,
    sending: send.isPending,
    pending: preview.isPending || send.isPending || uncertain,
    /** O erro veio do pedido de revisão: aparece junto do botão que o causou. */
    formError: preview.isError && !send.isError,
    error: send.error ?? preview.error ?? rally.error,
  };
}
export type OrderFlow = ReturnType<typeof useOrderFlow>;
