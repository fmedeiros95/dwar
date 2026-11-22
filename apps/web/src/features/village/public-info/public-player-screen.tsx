import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { useQuery } from '@tanstack/react-query';

import { api, type VillageSnapshot } from '@dwar/api-client';
import { Icon } from '../../../components/icons.js';
import { numbers } from '../shared/index.js';
import { PanelCard } from '../shared/panel-head.js';
import { MedalBadge } from '../medals/index.js';

export function PublicPlayerScreen({ snapshot }: { snapshot: VillageSnapshot }) {
  const [params, setParams] = useSearchParams(),
    playerId = Number(params.get('id'));
  const target = useQuery({
    queryKey: ['public-player', snapshot.world.id, snapshot.village.id, playerId],
    queryFn: () => api.publicPlayer(snapshot.world.id, snapshot.village.id, playerId),
    enabled: !!playerId,
  });
  const medals = useQuery({
    queryKey: ['player-medals', snapshot.world.id, playerId],
    queryFn: () => api.playerMedals(snapshot.world.id, playerId),
    enabled: !!playerId,
  });
  const earned = (medals.data?.medals ?? [])
    .filter((medal) => medal.stage > 0)
    .sort((a, b) => b.stage - a.stage);
  const data = target.data;
  if (!data)
    return (
      <div className="legacy-content">
        <p role={target.error ? 'alert' : 'status'}>
          {target.error?.message ?? (playerId ? 'Carregando jogador…' : 'Jogador não encontrado.')}
        </p>
      </div>
    );
  function go(screen: string, extra: Record<string, string | number> = {}) {
    setParams({ village: snapshot.village.id, screen, ...extra });
  }
  const profile: [string, string][] = [
    [
      'Sexo',
      data.gender === 'm' ? 'Masculino' : data.gender === 'f' ? 'Feminino' : 'Não informado',
    ],
  ];
  if (data.age !== null && data.age > 4 && data.age < 80) profile.push(['Idade', String(data.age)]);
  if (data.location) profile.push(['Localização', data.location]);
  return (
    <div className="legacy-content public-page">
      <header className="public-heading">
        {data.avatarUrl ? (
          <img className="public-avatar" src={data.avatarUrl} alt={`Avatar de ${data.username}`} />
        ) : (
          <Icon name="helm" size={34} />
        )}
        <div>
          <strong>{data.username}</strong>
          <small>
            {numbers.format(data.points)} pontos · {numbers.format(data.rank)}º lugar
          </small>
        </div>
        {!data.own ? (
          <button
            className="button public-heading-action"
            onClick={() => go('mail', { mode: 'new', id: data.id })}
          >
            <Icon name="mail" size={16} /> Enviar mensagem
          </button>
        ) : null}
      </header>
      <ul className="confirm-facts">
        <li>
          <small>Pontos</small>
          <strong>{numbers.format(data.points)}</strong>
        </li>
        <li>
          <small>Classificação</small>
          <strong>{numbers.format(data.rank)}º</strong>
        </li>
        <li>
          <small>Aldeias</small>
          <strong>{numbers.format(data.villages.length)}</strong>
        </li>
        <li>
          <small>Medalhas</small>
          <strong>
            {medals.data ? `${medals.data.total} de ${medals.data.maximum} níveis` : 'Carregando…'}
          </strong>
        </li>
        <li>
          <small>Tribo</small>
          {data.tribe ? (
            <button
              className="text-button"
              onClick={() => go('info_tribe', { id: data.tribe!.id })}
            >
              {data.tribe.name} <span className="tribe-tag static">{data.tribe.tag}</span>
            </button>
          ) : (
            <strong>Sem tribo</strong>
          )}
        </li>
      </ul>
      {earned.length ? (
        <PanelCard title="Medalhas conquistadas" icon={<Icon name="medal" size={18} />}>
          <ul className="medal-strip" aria-label="Medalhas conquistadas">
            {earned.map((medal) => (
              <li key={medal.code} title={medal.current ?? medal.name}>
                <MedalBadge code={medal.code} stage={medal.stage} size={40} />
                {medal.name}
              </li>
            ))}
          </ul>
        </PanelCard>
      ) : null}
      <div className="public-columns">
        <PanelCard
          title="Aldeias"
          icon={<Icon name="village" size={18} />}
          aside={<span className="panel-count">{data.villages.length}</span>}
        >
          <ul className="public-list">
            {data.villages.map((village) => (
              <li key={village.id} className="public-village-row">
                <button
                  className="text-button"
                  onClick={() => go('info_village', { id: village.id })}
                >
                  {village.name}
                </button>
                <span className="public-coords">
                  {village.x}|{village.y} · K{Math.floor(village.y / 100)}
                  {Math.floor(village.x / 100)}
                </span>
                <span className="num">{numbers.format(village.points)} pts</span>
              </li>
            ))}
          </ul>
        </PanelCard>
        <PanelCard title="Perfil" icon={<Icon name="people" size={18} />}>
          <dl className="public-profile">
            {profile.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="public-subtitle">Texto pessoal</h3>
          <p className="public-text">{data.personalText || <em>Nenhum texto pessoal.</em>}</p>
        </PanelCard>
      </div>
    </div>
  );
}
