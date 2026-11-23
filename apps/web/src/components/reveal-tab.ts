/**
 * Ref da aba ativa: no celular as abas deslizam numa linha, e a ativa não pode abrir fora da vista.
 * É uma função estável, então só roda quando a aba ativa muda.
 */
export function revealTab(element: HTMLElement | null) {
  element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
