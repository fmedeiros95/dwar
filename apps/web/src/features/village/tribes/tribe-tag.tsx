import type { TribeRef } from '@dwar/api-client';

/** A tag da tribo ao lado do nome de um jogador; clicar abre a página da tribo. */
export function TribeTag({
  tribe,
  onOpen,
}: {
  tribe: TribeRef | null | undefined;
  onOpen: (tribeId: number) => void;
}) {
  if (!tribe) return null;
  return (
    <button
      type="button"
      className="tribe-tag"
      title={`Tribo ${tribe.name}`}
      aria-label={`Tribo ${tribe.name}`}
      onClick={() => onOpen(tribe.id)}
    >
      {tribe.tag}
    </button>
  );
}
