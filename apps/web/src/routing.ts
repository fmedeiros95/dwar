import { useSearchParams, type NavigateOptions } from 'react-router-dom';
type GameParams = URLSearchParams | Record<string, string | number | string[] | undefined>;
function serialize(value: GameParams): URLSearchParams {
  if (value instanceof URLSearchParams) return value;
  const result = new URLSearchParams();
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    if (Array.isArray(entry)) entry.forEach((item) => result.append(key, item));
    else result.set(key, String(entry));
  }
  return result;
}
export function useGameSearchParams() {
  const [params, set] = useSearchParams();
  const update = (
    next: GameParams | ((previous: URLSearchParams) => GameParams),
    options?: NavigateOptions,
  ) => set((previous) => serialize(typeof next === 'function' ? next(previous) : next), options);
  return [params, update] as const;
}

export function worldEntryPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/enter`;
}
export function worldGamePath(slug: string, params?: GameParams): string {
  const search = params ? serialize(params).toString() : '';
  return `/${encodeURIComponent(slug)}/game${search ? `?${search}` : ''}`;
}
