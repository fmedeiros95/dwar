import { preload } from 'react-dom';

export type SceneTheme = 'summer' | 'winter' | 'halloween';
export const sceneThemes: { code: SceneTheme; label: string }[] = [
  { code: 'summer', label: 'Verão' },
  { code: 'winter', label: 'Inverno' },
  { code: 'halloween', label: 'Halloween' },
];

export function backingUrl(theme: SceneTheme): string {
  return `/game/town/backing${theme === 'summer' ? '' : `-${theme}`}.jpg`;
}

/** Começa a baixar o cenário antes da resposta da aldeia, com prioridade. */
export function preloadBacking() {
  const saved = localStorage.getItem('dwar:scene-theme');
  const theme = sceneThemes.some((item) => item.code === saved) ? (saved as SceneTheme) : 'summer';
  preload(backingUrl(theme), { as: 'image', fetchPriority: 'high' });
}
