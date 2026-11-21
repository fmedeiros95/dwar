/** Limites das tribos (nome e tag seguem o Speed Wars). */
export const tribeLimits = {
  name: { min: 4, max: 25 },
  tag: { min: 2, max: 6 },
  title: 24,
  text: 10000,
  members: 50,
} as const;

/** A tag aparece junto ao nome do jogador: só letras, números e alguns símbolos, sem espaços. */
export const tribeTagPattern = /^[\p{L}\p{N}_.\-*!+]+$/u;

/** Permissões de um membro. Fundador inclui líder, e líder inclui todas as outras. */
export type TribeRights = {
  isFounder: boolean;
  canLead: boolean;
  canInvite: boolean;
  canDiplomacy: boolean;
  canMassMail: boolean;
  canModerate: boolean;
  canHiddenForum: boolean;
};
