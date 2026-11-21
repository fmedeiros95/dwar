import type { TribeRights } from '@dwar/game-config';

/**
 * Aplica a hierarquia das permissões: fundador inclui líder, e líder inclui todas as outras
 * (como no Speed Wars). Garante que nunca exista um estado que a interface não consegue mostrar.
 */
export function normalizeRights(input: Partial<TribeRights>): TribeRights {
  const founder = input.isFounder === true;
  const lead = founder || input.canLead === true;
  return {
    isFounder: founder,
    canLead: lead,
    canInvite: lead || input.canInvite === true,
    canDiplomacy: lead || input.canDiplomacy === true,
    canMassMail: lead || input.canMassMail === true,
    canModerate: lead || input.canModerate === true,
    canHiddenForum: lead || input.canHiddenForum === true,
  };
}

export const noRights: TribeRights = normalizeRights({});
export const founderRights: TribeRights = normalizeRights({ isFounder: true });

/** Quem pode mexer nos cargos de outro membro: líderes, e só fundadores mexem em fundadores. */
export function canManageMember(actor: TribeRights, target: TribeRights): boolean {
  return actor.canLead && (!target.isFounder || actor.isFounder);
}
