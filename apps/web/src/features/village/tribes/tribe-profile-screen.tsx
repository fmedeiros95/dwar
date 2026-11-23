import { LoadState } from '../../../components/load-state.js';
import { useQuery } from '@tanstack/react-query';
import { api, type VillageSnapshot } from '@dwar/api-client';
import { Icon } from '../../../components/icons.js';
import { useGameSearchParams } from '../../../routing.js';
import { MailContent } from '../mail/mail-content.js';
import { numbers, targetScreen } from '../shared/index.js';

/** Página pública de uma tribo: perfil, números e membros. */
export function TribeProfileScreen({ snapshot }: { snapshot: VillageSnapshot }) {
  const [params, setParams] = useGameSearchParams();
  const tribeId = Number(params.get('id'));
  const tribe = useQuery({
    queryKey: ['tribe', snapshot.world.id, tribeId],
    queryFn: () => api.tribe(snapshot.world.id, tribeId),
    enabled: tribeId > 0,
  });
  const data = tribe.data;
  if (!data)
    return (
      <div className="legacy-content">
        {tribeId ? (
          <LoadState query={tribe} loading="Carregando tribo…" message />
        ) : (
          <p role="status">Tribo não encontrada.</p>
        )}
      </div>
    );
  const go = (screen: string, extra: Record<string, string | number> = {}) =>
    setParams({ village: snapshot.village.id, screen, ...extra });
  return (
    <div className="legacy-content page-card">
      <header className="tribe-heading">
        <Icon name="tribe" size={34} />
        <div>
          <strong>
            {data.name}
            <span className="tribe-tag static">{data.tag}</span>
          </strong>
          <small>
            {numbers.format(data.points)} pontos · {data.rank}º lugar
          </small>
        </div>
        {data.isMember ? (
          <button className="button tribe-heading-action" onClick={() => go('tribe')}>
            Abrir a minha tribo
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
          <strong>{data.rank}º</strong>
        </li>
        <li>
          <small>Membros</small>
          <strong>{data.members.length}</strong>
        </li>
        <li>
          <small>Aldeias</small>
          <strong>{numbers.format(data.villages)}</strong>
        </li>
        <li>
          <small>Fundada em</small>
          <strong>{new Date(data.createdAt).toLocaleDateString('pt-BR')}</strong>
        </li>
      </ul>
      <section className="tribe-card" aria-label="Perfil da tribo">
        <h2>Perfil</h2>
        <div className="mail-text">
          <MailContent
            nodes={data.description}
            onTarget={(type, id) => go(targetScreen[type], { id })}
          />
        </div>
      </section>
      {data.relations.wars.length ||
      data.relations.ally.length ||
      data.relations.nap.length ||
      data.relations.enemy.length ? (
        <section className="tribe-card" aria-label="Diplomacia da tribo">
          <h2>Diplomacia</h2>
          {data.relations.wars.length ? (
            <p>
              <strong>Em guerra com:</strong>{' '}
              {data.relations.wars.map((war) => (
                <button
                  key={war.id}
                  className="text-button"
                  title={war.title}
                  onClick={() => go('info_tribe', { id: war.other.id })}
                >
                  {war.other.name} <span className="tribe-tag static">{war.other.tag}</span>
                </button>
              ))}
            </p>
          ) : null}
          {(
            [
              ['ally', 'Aliadas'],
              ['nap', 'Pacto de não agressão'],
              ['enemy', 'Inimigas'],
            ] as const
          ).map(([kind, label]) =>
            data.relations[kind].length ? (
              <p key={kind}>
                <strong>{label}:</strong>{' '}
                {data.relations[kind].map((tribe) => (
                  <button
                    key={tribe.id}
                    className="text-button"
                    onClick={() => go('info_tribe', { id: tribe.id })}
                  >
                    {tribe.name} <span className="tribe-tag static">{tribe.tag}</span>
                  </button>
                ))}
              </p>
            ) : null,
          )}
        </section>
      ) : null}
      <section className="tribe-card" aria-label="Membros da tribo">
        <h2>Membros</h2>
        <div className="rank-list rank-members" role="table" aria-label="Membros da tribo">
          <div className="rank-row rank-head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">Jogador</span>
            <span role="columnheader">Cargo</span>
            <span role="columnheader" className="num">
              Pontos
            </span>
          </div>
          {data.members.map((member) => (
            <div key={member.playerId} role="row" className="rank-row">
              <span role="cell">{member.rank}</span>
              <span role="cell" className="rank-player">
                <button
                  className="text-button"
                  onClick={() => go('info_player', { id: member.playerId })}
                >
                  {member.username}
                </button>
              </span>
              <span role="cell">{member.title || '—'}</span>
              <span role="cell" className="num">
                {numbers.format(member.points)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
