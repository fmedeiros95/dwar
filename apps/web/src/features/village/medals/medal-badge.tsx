import {
  Award,
  BrickWall,
  Coins,
  Crown,
  Eye,
  Flag,
  Hammer,
  HeartHandshake,
  Handshake,
  PackageCheck,
  Shield,
  Skull,
  Swords,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

const glyphs: Record<string, LucideIcon> = {
  points: Trophy,
  rank: Crown,
  loot: Coins,
  raids: PackageCheck,
  conquests: Flag,
  kills: Swords,
  support_losses: HeartHandshake,
  trades: Handshake,
  attacks: Target,
  demolisher: Hammer,
  wallbreaker: BrickWall,
  noble_slayer: Skull,
  victories: Award,
  reinforcements: Shield,
  scout_defense: Eye,
};

export const tierNames = ['Madeira', 'Bronze', 'Prata', 'Ouro'];

/**
 * Selo de uma medalha: o disco muda de material a cada nível (madeira, bronze, prata e ouro) e
 * fica apagado enquanto o jogador ainda não tem o primeiro nível.
 */
export function MedalBadge({
  code,
  stage,
  size = 56,
}: {
  code: string;
  stage: number;
  size?: number;
}) {
  const Glyph = glyphs[code] ?? Award;
  return (
    <span
      className="medal-badge"
      data-stage={stage}
      style={{ width: size, height: size }}
      role="img"
      aria-label={stage > 0 ? `Nível ${stage}: ${tierNames[stage - 1]}` : 'Ainda não conquistada'}
    >
      <Glyph size={Math.round(size * 0.46)} aria-hidden="true" strokeWidth={2} />
      {stage > 0 ? (
        <span className="medal-pips" aria-hidden="true">
          {Array.from({ length: stage }, (_, index) => (
            <i key={index} />
          ))}
        </span>
      ) : null}
    </span>
  );
}
