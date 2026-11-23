import { StatusPage } from './components/status-page.js';
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
  if (account.isPending) return <StatusPage title="Abrindo os portões…" home={false} />;
  if (
    !account.data &&
    account.error &&
    (!(account.error instanceof ApiError) || account.error.status !== 401)
  ) {
    return (
      <StatusPage
        title="O mundo está indisponível"
        error="Não foi possível conectar ao servidor."
        onRetry={() => void account.refetch()}
        retrying={account.isFetching}
        home={false}
      />
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
