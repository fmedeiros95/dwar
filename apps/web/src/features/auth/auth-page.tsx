import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type Account } from '@dwar/api-client';
import { LegacyFrame } from '../../components/legacy-frame.js';

export function AuthPage({ onAuthenticated }: { onAuthenticated: (account: Account) => void }) {
  const login = useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      api.login(data.username, data.password),
    onSuccess: onAuthenticated,
  });
  const challenge = useQuery({
    queryKey: ['registration-challenge'],
    queryFn: api.registrationChallenge,
    staleTime: Infinity,
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
  return (
    <LegacyFrame
      masthead={
        <form className="portal-login" onSubmit={submitLogin} aria-label="Entrar na conta">
          <label>
            Nome de jogador:
            <input name="username" autoComplete="username" maxLength={24} required />
          </label>
          <label>
            Senha:
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </label>
          <button className="green" disabled={login.isPending || registration.isPending}>
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      }
    >
      <div className="legacy-titlebar">
        <span>» Cadastro</span>
        <span>DWAR — Estratégia medieval</span>
      </div>
      {login.error ? (
        <p className="error" role="alert">
          {login.error.message}
        </p>
      ) : null}
      <div className="portal-columns">
        <section className="registration-pane" id="registro">
          <form
            className="registration-form"
            onSubmit={submitRegistration}
            aria-label="Criar conta"
          >
            <label>
              Nome de jogador:
              <input
                name="username"
                autoComplete="username"
                minLength={3}
                maxLength={24}
                required
              />
            </label>
            <label>
              Senha:
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
              />
              <small>Pelo menos 10 caracteres.</small>
            </label>
            <label>
              E-mail:
              <input name="email" type="email" autoComplete="email" maxLength={254} required />
            </label>
            <label>
              Quanto é {challenge.data?.expression ?? '...'}?
              <input
                name="captcha"
                size={2}
                maxLength={2}
                autoComplete="off"
                required
                disabled={!challenge.data}
              />
            </label>
            {challenge.error ? (
              <p className="error" role="alert">
                Não foi possível carregar a soma antispam.{' '}
                <button type="button" className="link" onClick={() => challenge.refetch()}>
                  Tentar novamente
                </button>
              </p>
            ) : null}
            {registration.error ? (
              <p className="error" role="alert">
                {registration.error.message}
              </p>
            ) : null}
            <button className="green" disabled={registration.isPending || login.isPending}>
              {registration.isPending ? 'Cadastrando…' : 'Cadastrar'}
            </button>
          </form>
        </section>
        <section className="portal-welcome" id="sobre">
          <h1>DWAR — Decade of War!</h1>
          <p>
            DWar é um jogo de estratégia medieval para navegador. Construa sua aldeia, desenvolva
            sua economia e prepare seu domínio para a guerra.
          </p>
          <h2>Visão da aldeia</h2>
          <a
            className="portal-screenshot"
            href="/legacy/screenshots/screenshot_1.jpg"
            target="_blank"
            rel="noreferrer"
          >
            <img
              src="/legacy/screenshots/screenshot_1.jpg"
              alt="Interface original do DWar, com a aldeia e suas construções"
            />
          </a>
        </section>
      </div>
    </LegacyFrame>
  );
}
