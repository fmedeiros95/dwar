import { createContext, useCallback, useContext } from 'react';
import { useSearchParams, type NavigateOptions } from 'react-router-dom';
export type GameParams = URLSearchParams | Record<string, string | number | string[] | undefined>;
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
type UpdateParams = (
  next: GameParams | ((previous: URLSearchParams) => GameParams),
  options?: NavigateOptions,
) => void;

/** Dentro de uma janela do jogo, os parâmetros são os da janela, não os da URL. */
export type WindowScope = { params: URLSearchParams; set: UpdateParams };
export const WindowScopeContext = createContext<WindowScope | null>(null);

export function useGameSearchParams() {
  const scope = useContext(WindowScopeContext);
  const [params, set] = useSearchParams();
  const update = useCallback<UpdateParams>(
    (next, options) =>
      set((previous) => serialize(typeof next === 'function' ? next(previous) : next), options),
    [set],
  );
  return scope ? ([scope.params, scope.set] as const) : ([params, update] as const);
}
export function serializeParams(value: GameParams): URLSearchParams {
  return serialize(value);
}

export function worldEntryPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/enter`;
}
export function worldGamePath(slug: string, params?: GameParams): string {
  const search = params ? serialize(params).toString() : '';
  return `/${encodeURIComponent(slug)}/game${search ? `?${search}` : ''}`;
}
