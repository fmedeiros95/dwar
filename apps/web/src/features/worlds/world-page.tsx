import { worldEntryPath } from '../../routing.js';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type Account } from '@dwar/api-client';
import { LegacyFrame } from '../../components/legacy-frame.js';

export function WorldPage({
  account,
  onLogout,
}: {
  account: Account;
  onLogout: () => Promise<void>;
}) {
  const worlds = useQuery({ queryKey: ['worlds'], queryFn: api.worlds });
  const navigate = useNavigate();
  const logout = useMutation({ mutationFn: onLogout });
  return (
    <LegacyFrame
      navigation={
        <>
          <Link to="/worlds">Mundos</Link>
          <span>{account.username}</span>
          <button onClick={() => logout.mutate()} disabled={logout.isPending}>
            Sair
          </button>
        </>
      }
    >
      <div className="legacy-titlebar">
        <span>» Seus mundos</span>
        <span>Bem-vindo, {account.username}!</span>
      </div>
      <div className="portal-columns">
        <aside className="registration-pane">
          <h2>Jogador</h2>
          <p>
            <strong>{account.username}</strong>
          </p>
          <p>Escolha um mundo para entrar na sua aldeia.</p>
        </aside>
        <section className="worlds-content">
          <h1>Mundos disponíveis</h1>
          {worlds.isPending ? <p>Carregando mundos…</p> : null}
          {worlds.error ? (
            <p className="error" role="alert">
              {worlds.error.message}
              <button className="text-button" onClick={() => void worlds.refetch()}>
                Tentar novamente
              </button>
            </p>
          ) : null}
          {worlds.data?.length === 0 ? <p>Nenhum mundo disponível no momento.</p> : null}
          <div className="table-scroll">
            <table className="legacy-table world-table">
              <thead>
                <tr>
                  <th>Mundo</th>
                  <th>Construção</th>
                  <th>Produção</th>
                  <th>Entrar</th>
                </tr>
              </thead>
              <tbody>
                {worlds.data?.map((world) => (
                  <tr key={world.id}>
                    <td>
                      <strong>{world.name}</strong>
                    </td>
                    <td>{world.buildSpeed}×</td>
                    <td>{world.productionSpeed}×</td>
                    <td>
                      <button
                        className="green"
                        onClick={() => navigate(worldEntryPath(world.slug))}
                      >
                        Entrar no mundo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logout.error ? (
            <p className="error" role="alert">
              {logout.error.message}
            </p>
          ) : null}
        </section>
      </div>
    </LegacyFrame>
  );
}
