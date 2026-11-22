import { useEffect, useRef, useState } from 'react';

type Code = 'wood' | 'stone' | 'iron';
export type ResourceDelta = { id: number; amount: number };
const codes = ['wood', 'stone', 'iron'] as const;

/**
 * Detecta saltos nos recursos que não vêm da produção normal: gasto (obra, recrutamento,
 * envio no mercado) e chegada (saque, comércio). Cada salto vira um número flutuante sobre o
 * recurso da barra superior, para o jogador ver que o comando foi aceito e quanto custou.
 */
export function useResourceDeltas(
  villageId: number,
  have: Record<Code, number>,
  perHour: Record<Code, number>,
  capacity: number,
): Partial<Record<Code, ResourceDelta>> {
  const previous = useRef<{ villageId: number; at: number; have: Record<Code, number> } | null>(
    null,
  );
  const rates = useRef(perHour);
  rates.current = perHour;
  const nextId = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [deltas, setDeltas] = useState<Partial<Record<Code, ResourceDelta>>>({});
  const { wood, stone, iron } = have;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  useEffect(() => {
    const now = Date.now();
    const current = { wood, stone, iron };
    const last = previous.current;
    previous.current = { villageId, at: now, have: current };
    // Trocar de aldeia não é gasto nem ganho.
    if (!last || last.villageId !== villageId) return;
    const elapsedHours = Math.max(0, now - last.at) / 3_600_000;
    const found: Partial<Record<Code, ResourceDelta>> = {};
    for (const code of codes) {
      // A produção para no limite do armazém.
      const expected = Math.max(
        0,
        Math.min(rates.current[code] * elapsedHours, capacity - last.have[code]),
      );
      const jump = Math.round(current[code] - last.have[code] - expected);
      // Tolerância para arredondamento e para a correção do relógio pelo servidor.
      const tolerance = Math.max(3, expected * 0.5);
      if (Math.abs(jump) > tolerance) found[code] = { id: nextId.current++, amount: jump };
    }
    if (Object.keys(found).length === 0) return;
    setDeltas((value) => ({ ...value, ...found }));
    const ids = Object.values(found).map((delta) => delta.id);
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setDeltas((value) => {
        const rest = { ...value };
        for (const code of codes) if (rest[code] && ids.includes(rest[code].id)) delete rest[code];
        return rest;
      });
    }, 1600);
    timers.current.add(timer);
  }, [villageId, wood, stone, iron, capacity]);

  return deltas;
}
