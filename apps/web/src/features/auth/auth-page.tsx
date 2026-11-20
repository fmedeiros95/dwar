import { Brand } from '../../components/icons.js';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, Hammer, Map as MapIcon, Swords } from 'lucide-react';
import { api, type Account } from '@dwar/api-client';

type Mode = 'login' | 'register';

function PasswordField({
  name,
  label,
  autoComplete,
  minLength,
  hint,
}: {
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field-control">
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={128}
          required
        />
        <button
          type="button"
          className="field-toggle"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function AuthPage({ onAuthenticated }: { onAuthenticated: (account: Account) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const login = useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      api.login(data.username, data.password),
    onSuccess: onAuthenticated,
  });
  const challenge = useQuery({
    queryKey: ['registration-challenge'],
    queryFn: api.registrationChallenge,
    staleTime: Infinity,
    enabled: mode === 'register',
  });
  const registration = useMutation({
    mutationFn: (data: { username: string; email: string; password: string; captcha: string }) =>
      api.register(
        data.username,
        data.email,
        data.password,
        challenge.data?.token ?? '',
        data.captcha,
      ),
    onSuccess: onAuthenticated,
  });
  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    login.mutate({
      username: String(form.get('username')),
      password: String(form.get('password')),
    });
  }
  function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    registration.mutate({
      username: String(form.get('username')),
      email: String(form.get('email')),
      password: String(form.get('password')),
      captcha: String(form.get('captcha')),
    });
  }
  const busy = login.isPending || registration.isPending;
  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true" />
      <section className="landing-hero">
        <Brand size={84} />
        <h1>
          Funde sua aldeia.
          <br />
          Escreva sua lenda.
        </h1>
        <p>
          DWar é um jogo de estratégia medieval no navegador. Construa, recrute, negocie e conquiste
          o mapa do mundo.
        </p>
        <ul className="landing-features">
          <li>
            <Hammer aria-hidden="true" />
            <div>
              <strong>Construa</strong>
              <span>Evolua madeira, argila e ferro e erga a sua fortaleza.</span>
            </div>
          </li>
          <li>
            <Swords aria-hidden="true" />
            <div>
              <strong>Recrute</strong>
              <span>Treine tropas, pesquise tecnologias e prepare seu exército.</span>
            </div>
          </li>
          <li>
            <MapIcon aria-hidden="true" />
            <div>
              <strong>Conquiste</strong>
              <span>Explore o mapa, negocie no mercado e suba no ranking.</span>
            </div>
          </li>
        </ul>
      </section>
      <section className="landing-card" aria-label="Acesso à conta">
        <div className="auth-tabs" role="tablist" aria-label="Entrar ou criar conta">
          <button
            type="button"
            role="tab"
            id="tab-login"
            aria-selected={mode === 'login'}
            aria-controls="panel-auth"
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            id="tab-register"
            aria-selected={mode === 'register'}
            aria-controls="panel-auth"
            onClick={() => setMode('register')}
          >
            Criar conta
          </button>
        </div>
        <div
          id="panel-auth"
          role="tabpanel"
          aria-labelledby={mode === 'login' ? 'tab-login' : 'tab-register'}
        >
          {mode === 'login' ? (
            <form className="auth-form" onSubmit={submitLogin} aria-label="Entrar na conta">
              <h2>Bem-vindo de volta</h2>
              <label className="field">
                <span>Nome de jogador</span>
                <input name="username" autoComplete="username" maxLength={24} required autoFocus />
              </label>
              <PasswordField name="password" label="Senha" autoComplete="current-password" />
              {login.error ? (
                <p className="error" role="alert">
                  {login.error.message}
                </p>
              ) : null}
              <button className="green auth-submit" disabled={busy}>
                {login.isPending ? 'Entrando…' : 'Entrar no reino'}
              </button>
              <p className="auth-switch">
                Ainda não tem conta?{' '}
                <button type="button" className="text-button" onClick={() => setMode('register')}>
                  Criar conta
                </button>
              </p>
            </form>
          ) : (
            <form
              className="auth-form"
              id="registro"
              onSubmit={submitRegistration}
              aria-label="Criar conta"
            >
              <h2>Comece sua jornada</h2>
              <label className="field">
                <span>Nome de jogador</span>
                <input
                  name="username"
                  autoComplete="username"
                  minLength={3}
                  maxLength={24}
                  required
                  autoFocus
                />
              </label>
              <label className="field">
                <span>E-mail</span>
                <input name="email" type="email" autoComplete="email" maxLength={254} required />
              </label>
              <PasswordField
                name="password"
                label="Senha"
                autoComplete="new-password"
                minLength={10}
                hint="Pelo menos 10 caracteres."
              />
              <label className="field">
                <span>Verificação: quanto é {challenge.data?.expression ?? '…'}?</span>
                <input
                  name="captcha"
                  inputMode="numeric"
                  maxLength={2}
                  autoComplete="off"
                  required
                  disabled={!challenge.data}
                />
              </label>
              {challenge.error ? (
                <p className="error" role="alert">
                  Não foi possível carregar a verificação.{' '}
                  <button type="button" className="text-button" onClick={() => challenge.refetch()}>
                    Tentar novamente
                  </button>
                </p>
              ) : null}
              {registration.error ? (
                <p className="error" role="alert">
                  {registration.error.message}
                </p>
              ) : null}
              <button className="green auth-submit" disabled={busy}>
                {registration.isPending ? 'Cadastrando…' : 'Criar conta e jogar'}
              </button>
              <p className="auth-switch">
                Já tem conta?{' '}
                <button type="button" className="text-button" onClick={() => setMode('login')}>
                  Entrar
                </button>
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
