import { useQuery } from '@tanstack/react-query';
import { api, type MedalView, type VillageSnapshot } from '@dwar/api-client';
import { Icon } from '../../../components/icons.js';
import { numbers } from '../shared/index.js';
import { MedalBadge } from './medal-badge.js';

/** Quanto falta para o próximo nível, de 0 a 100 (nas medalhas de posição, quanto menor melhor). */
export function medalProgress(medal: MedalView): number {
  if (medal.stage >= 4) return 100;
  const target = medal.needs[medal.stage]!;
  if (medal.kind === 'rank') {
    // Posição 1000 → 0%, posição do próximo nível → 100%.
    const start =
      medal.stage > 0 ? medal.needs[medal.stage - 1]! : Math.max(medal.value, target * 2);
    if (medal.value <= target) return 100;
    return Math.max(0, Math.min(99, Math.round(((start - medal.value) / (start - target)) * 100)));
  }
  const floor = medal.stage > 0 ? medal.needs[medal.stage - 1]! : 0;
  return Math.max(0, Math.min(99, Math.round(((medal.value - floor) / (target - floor)) * 100)));
}

export function MedalCard({ medal }: { medal: MedalView }) {
  const progress = medalProgress(medal);
  return (
    <li className="medal-card" data-stage={medal.stage}>
      <MedalBadge code={medal.code} stage={medal.stage} />
      <div className="medal-info">
        <h2>
          {medal.name}
          {medal.tier ? <small>{medal.tier}</small> : null}
        </h2>
        <p className="medal-text">{medal.current ?? medal.description}</p>
        {medal.next ? (
          <>
            <div
              className="medal-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label={`Progresso de ${medal.name}`}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="medal-next">
              {medal.next}
              <em>
                {medal.kind === 'rank'
                  ? `você está em ${numbers.format(medal.value)}º`
                  : `${numbers.format(medal.value)} / ${numbers.format(medal.nextValue ?? 0)}`}
              </em>
            </p>
          </>
        ) : (
          <p className="medal-next done">Nível máximo atingido</p>
        )}
      </div>
    </li>
  );
}

export function MedalsPanel({ snapshot }: { snapshot: VillageSnapshot }) {
  const worldId = snapshot.world.id;
  const medals = useQuery({
    queryKey: ['medals', worldId],
    queryFn: () => api.medals(worldId),
    refetchInterval: 30000,
  });
  const data = medals.data;
  return (
    <div className="legacy-content page-card">
      <header className="page-head">
        <h1>
          <Icon name="medal" size={22} /> Medalhas
        </h1>
        {data ? (
          <span className="medal-total">
            {data.total} de {data.maximum} níveis
          </span>
        ) : null}
      </header>
      {medals.error ? (
        <p className="error" role="alert">
          {medals.error.message}
        </p>
      ) : null}
      {data ? (
        <ul className="medal-grid">
          {[...data.medals]
            .sort((a, b) => b.stage - a.stage)
            .map((medal) => (
              <MedalCard key={medal.code} medal={medal} />
            ))}
        </ul>
      ) : (
        <p className="muted">Carregando medalhas…</p>
      )}
    </div>
  );
}
