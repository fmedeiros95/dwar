import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { useQuery } from '@tanstack/react-query';

import { api, type VillageSnapshot } from '@dwar/api-client';
import { numbers } from '../shared/index.js';
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
  return (
    <div className="legacy-content">
      <h1>Jogador {data.username}</h1>
      <div className="public-player-layout">
        <table className="legacy-table">
          <thead>
            <tr>
              <th colSpan={3}>{data.username}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Pontos:</td>
              <td colSpan={2}>{numbers.format(data.points)}</td>
            </tr>
            <tr>
              <td>Classificação:</td>
              <td colSpan={2}>{numbers.format(data.rank)}</td>
            </tr>
            <tr>
              <td>Medalhas:</td>
              <td colSpan={2}>
                {medals.data
                  ? `${medals.data.total} de ${medals.data.maximum} níveis`
                  : 'Carregando…'}
                {earned.length ? (
                  <ul className="medal-strip" aria-label="Medalhas conquistadas">
                    {earned.map((medal) => (
                      <li key={medal.code} title={medal.current ?? medal.name}>
                        <MedalBadge code={medal.code} stage={medal.stage} size={40} />
                        {medal.name}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </td>
            </tr>
            <tr>
              <td>Tribo:</td>
              <td colSpan={2}>
                {data.tribe ? (
                  <button
                    className="text-button"
                    onClick={() =>
                      setParams({
                        village: snapshot.village.id,
                        screen: 'info_tribe',
                        id: data.tribe!.id,
                      })
                    }
                  >
                    {data.tribe.name} <span className="tribe-tag static">{data.tribe.tag}</span>
                  </button>
                ) : (
                  'Sem tribo'
                )}
              </td>
            </tr>
            {!data.own ? (
              <tr>
                <td colSpan={3}>
                  <button
                    className="text-button"
                    onClick={() =>
                      setParams({
                        village: snapshot.village.id,
                        screen: 'mail',
                        mode: 'new',
                        id: data.id,
                      })
                    }
                  >
                    » Enviar mensagem
                  </button>
                </td>
              </tr>
            ) : null}
            <tr>
              <th colSpan={3}>&nbsp;</th>
            </tr>
            <tr>
              <td className="public-spacer" colSpan={3}>
                &nbsp;
              </td>
            </tr>
            <tr>
              <th>Aldeias ({data.villages.length})</th>
              <th>Coordenadas</th>
              <th>Pontos</th>
            </tr>
            {data.villages.map((village) => (
              <tr key={village.id}>
                <td>
                  <button
                    className="text-button"
                    onClick={() =>
                      setParams({
                        village: snapshot.village.id,
                        screen: 'info_village',
                        id: village.id,
                      })
                    }
                  >
                    {village.name}
                  </button>
                </td>
                <td>
                  {village.x}|{village.y} K{Math.floor(village.y / 100)}
                  {Math.floor(village.x / 100)}
                </td>
                <td>{numbers.format(village.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="legacy-table">
          <thead>
            <tr>
              <th colSpan={2}>Perfil</th>
            </tr>
          </thead>
          <tbody>
            {data.avatarUrl ? (
              <tr>
                <td colSpan={2}>
                  <img src={data.avatarUrl} alt={`Avatar de ${data.username}`} />
                </td>
              </tr>
            ) : null}
            <tr>
              <td>Sexo:</td>
              <td>
                {data.gender === 'm'
                  ? 'Masculino'
                  : data.gender === 'f'
                    ? 'Feminino'
                    : 'Não informado'}
              </td>
            </tr>
            {data.age !== null && data.age > 4 && data.age < 80 ? (
              <tr>
                <td>Idade:</td>
                <td>{data.age}</td>
              </tr>
            ) : null}
            {data.location ? (
              <tr>
                <td>Localização:</td>
                <td>{data.location}</td>
              </tr>
            ) : null}
            <tr>
              <td className="public-spacer" colSpan={2}>
                &nbsp;
              </td>
            </tr>
            <tr>
              <th colSpan={2}>Texto pessoal</th>
            </tr>
            <tr>
              <td colSpan={2}>{data.personalText || <em>Nenhum texto pessoal.</em>}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
