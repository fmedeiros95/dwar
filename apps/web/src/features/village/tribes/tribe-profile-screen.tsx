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
        <p role={tribe.error ? 'alert' : 'status'}>
          {tribe.error?.message ?? (tribeId ? 'Carregando tribo…' : 'Tribo não encontrada.')}
        </p>
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
      <section className="tribe-card" aria-label="Membros da tribo">
        <h2>Membros</h2>
        <div className="table-scroll">
          <table className="legacy-table rank-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Jogador</th>
                <th>Cargo</th>
                <th>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr key={member.playerId}>
                  <td>{member.rank}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => go('info_player', { id: member.playerId })}
                    >
                      {member.username}
                    </button>
                  </td>
                  <td>{member.title || '—'}</td>
                  <td className="num">{numbers.format(member.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
