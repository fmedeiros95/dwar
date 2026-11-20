import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type Account } from '@dwar/api-client';
import { WorldRoute } from './world-route.js';
import { AuthPage } from './features/auth/auth-page.js';
import { WorldPage } from './features/worlds/world-page.js';

export function App() {
  const account = useQuery({ queryKey: ['account'], queryFn: api.me, staleTime: 60_000 });
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  function authenticated(value: Account) {
    client.clear();
    client.setQueryData(['account'], value);
    const returnTo = /^\/[a-z][a-z0-9-]{1,31}\/(game|enter)$/.test(location.pathname)
      ? `${location.pathname}${location.search}${location.hash}`
      : '/worlds';
    navigate(returnTo);
  }
  async function logout() {
    await api.logout();
    client.clear();
    client.setQueryData(['account'], null);
    navigate('/');
  }
  if (account.isPending)
    return (
      <main className="center-screen">
        <p className="loading-message">Abrindo os portões…</p>
      </main>
    );
  if (
    !account.data &&
    account.error &&
    (!(account.error instanceof ApiError) || account.error.status !== 401)
  ) {
    return (
      <main className="center-screen">
        <div className="notice">
          <h1>O mundo está indisponível</h1>
          <p>Não foi possível conectar ao servidor.</p>
          <button onClick={() => void account.refetch()}>Tentar novamente</button>
        </div>
      </main>
    );
  }
  if (!account.data || (account.error instanceof ApiError && account.error.status === 401))
    return <AuthPage onAuthenticated={authenticated} />;
  return (
    <Routes>
      <Route path="/worlds" element={<WorldPage account={account.data} onLogout={logout} />} />
      <Route
        path="/:worldCode/enter"
        element={<WorldRoute page="enter" account={account.data} onLogout={logout} />}
      />
      <Route
        path="/:worldCode/game"
        element={<WorldRoute page="game" account={account.data} onLogout={logout} />}
      />
      <Route path="*" element={<Navigate to="/worlds" replace />} />
    </Routes>
  );
}
