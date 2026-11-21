/** Páginas a mostrar: primeira, última e vizinhas da atual, com lacunas (null). */
export function pageWindow(current: number, count: number): (number | null)[] {
  const keep = new Set([1, count, current - 1, current, current + 1]);
  const sorted = [...keep].filter((page) => page >= 1 && page <= count).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((page, index) => {
    if (index && page - sorted[index - 1]! > 1) out.push(null);
    out.push(page);
  });
  return out;
}
