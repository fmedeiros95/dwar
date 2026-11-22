import { buildings, units, unitCodes, type Troops } from '@dwar/game-config';
import { emptyTroops } from '../src/index.js';

export { buildings, units, unitCodes };

export const emptyTroopsFor = (): Troops => emptyTroops();

/** Gerador pseudoaleatório determinístico (mulberry32), para testes reproduzíveis. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
