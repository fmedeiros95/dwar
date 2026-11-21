import type { MessageTarget } from '@dwar/api-client';

/** Tela que cada tipo de link dentro de uma mensagem, nota ou relatório abre. */
export const targetScreen: Record<MessageTarget, string> = {
  player: 'info_player',
  village: 'info_village',
  tribe: 'info_tribe',
};
