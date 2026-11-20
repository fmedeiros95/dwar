import { worldEntryPath, useGameSearchParams as useSearchParams } from '../../routing.js';
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type Account, type World } from '@dwar/api-client';
import { LegacyFrame, ResourceIcon } from '../../components/legacy-frame.js';
import { BuildingScreen } from './building-screen.js';
import { Overview } from './overview/index.js';
import { WorldMap } from './map/index.js';
import { PublicVillageScreen, PublicPlayerScreen } from './public-info/index.js';
import { ReportsPanel } from './reports/index.js';
import { MailPanel } from './mail/index.js';
import { RankingScreen } from './ranking/index.js';
import { SettingsScreen } from './settings/index.js';
import { useVillageActions } from './use-village-actions.js';
import { numbers, resources, timeFormat } from './shared/index.js';

export function VillagePage({
  account,
  onLogout,
  world,
}: {
  account: Account;
  world: World;
  onLogout: () => Promise<void>;
}) {
  const worldId = world.id;
  const client = useQueryClient(),
    navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const screen = params.get('screen') ?? 'overview';
  const selectedVillageId = params.has('village') ? Number(params.get('village')) : undefined;
  const villageKey = ['village', worldId, selectedVillageId ?? null];
  const [now, setNow] = useState(Date.now());
  const [editingName, setEditingName] = useState(false),
    [name, setName] = useState('');
  const village = useQuery({
    queryKey: villageKey,
    queryFn: () => api.village(worldId, selectedVillageId),
    refetchInterval: 3000,
  });
  useEffect(() => {
    if (village.error instanceof ApiError && [404, 409].includes(village.error.status)) {
      client.removeQueries({ queryKey: ['village', worldId] });
      navigate(worldEntryPath(world.slug), { replace: true });
    }
  }, [village.error, client, navigate, worldId, world.slug]);
  const data = village.data;
  const canonicalVillageId = data?.village.id;
  useEffect(() => {
    if (canonicalVillageId === undefined) return;
    const next = new URLSearchParams(params);
    if (!next.has('village')) next.set('village', String(canonicalVillageId));
    if (!next.has('screen')) next.set('screen', 'overview');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [canonicalVillageId, params, setParams]);
  const reports = useQuery({
    queryKey: ['reports', worldId, 1],
    queryFn: () => api.reports(worldId, 1),
    enabled: !!data,
    refetchInterval: 5000,
  });
  const mail = useQuery({
    queryKey: ['mailbox', worldId, 1],
    queryFn: () => api.mailbox(worldId, 1),
    enabled: !!data,
    refetchInterval: 5000,
  });
  const {
    build,
    recruitment,
    academy,
    cancelRecruitment,
    research,
    cancel,
    rename,
    preference,
    logout,
    construct,
    recruit,
    academyAction,
    intent,
    recruitmentIntent,
    academyIntent,
    recruitmentVersion,
  } = useVillageActions({
    worldId,
    villageId: data?.village.id,
    onLogout,
    onRenameSuccess: () => setEditingName(false),
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (village.error instanceof ApiError && village.error.status === 401) {
      client.clear();
      client.setQueryData(['account'], null);
      navigate('/');
    }
  }, [village.error, client, navigate, worldId, world.slug]);
  function setScreen(value: string) {
    const next = new URLSearchParams(params);
    next.set('screen', value);
    next.delete('mode');
    next.delete('x');
    next.delete('y');
    next.delete('id');
    next.delete('rpage');
    next.delete('rsearch');
    setParams(next);
  }
  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    rename.mutate(name);
  }
  if (!data)
    return (
      <LegacyFrame>
        <div className="legacy-content">
          <h1>{village.isPending ? 'Carregando aldeia…' : 'Aldeia indisponível'}</h1>
          {village.error ? (
            <p className="error" role="alert">
              {village.error.message}
            </p>
          ) : null}
          <Link to="/worlds">Voltar aos mundos</Link>
        </div>
      </LegacyFrame>
    );
  const clock = new Date(data.serverTime).getTime() + Math.max(0, now - village.dataUpdatedAt);
  const elapsed = Math.max(0, now - village.dataUpdatedAt) / 3_600_000;
  const active = data.buildings.find((building) => building.code === screen);
  const section = active
    ? 'buildings'
    : screen === 'reports'
      ? 'reports'
      : screen === 'map'
        ? 'map'
        : screen === 'mail'
          ? 'mail'
          : screen === 'activity'
            ? 'activity'
            : screen === 'info_village' || screen === 'info_player'
              ? screen
              : screen === 'ranking'
                ? 'ranking'
                : screen === 'settings'
                  ? 'settings'
                  : 'overview';
  const uncertainAction = build.isError && intent.current !== null;
  const pending = build.isPending || cancel.isPending || uncertainAction;
  const error =
    village.error ??
    build.error ??
    cancel.error ??
    research.error ??
    recruitment.error ??
    academy.error ??
    cancelRecruitment.error ??
    rename.error ??
    preference.error ??
    logout.error;
  return (
    <LegacyFrame
      navigation={
        <>
          <button onClick={() => logout.mutate()} disabled={logout.isPending}>
            Sair
          </button>
          <Link to="/worlds">Mundos</Link>
          <button
            aria-current={section === 'overview' ? 'page' : undefined}
            onClick={() => setScreen('overview')}
          >
            Visão da aldeia
          </button>
          <button
            aria-current={section === 'buildings' ? 'page' : undefined}
            onClick={() => setScreen('main')}
          >
            Construções
          </button>
          <button
            aria-current={section === 'map' ? 'page' : undefined}
            onClick={() => setScreen('map')}
          >
            Mapa
          </button>
          <button
            aria-current={section === 'reports' ? 'page' : undefined}
            onClick={() => setScreen('reports')}
          >
            Relatórios{reports.data?.unread ? ` (${reports.data.unread})` : ''}
          </button>
          <button
            aria-current={section === 'mail' ? 'page' : undefined}
            onClick={() => setScreen('mail')}
          >
            Mensagens{mail.data?.unread ? ` (${mail.data.unread})` : ''}
          </button>
          <button
            aria-current={section === 'activity' ? 'page' : undefined}
            onClick={() => setScreen('activity')}
          >
            Atividade
          </button>
          <button
            aria-current={section === 'ranking' ? 'page' : undefined}
            onClick={() => setScreen('ranking')}
          >
            Ranking
          </button>
          <button
            aria-current={section === 'settings' ? 'page' : undefined}
            onClick={() => setScreen('settings')}
          >
            Configurações
          </button>
          <span>
            {account.username} ({numbers.format(data.village.points)} pontos)
          </span>
        </>
      }
      footer={
        <>
          <span>
            Horário do servidor: <time>{timeFormat.format(new Date(clock))}</time>
          </span>
          <span>{data.world.name}</span>
        </>
      }
    >
      <div className="legacy-statusbar">
        <div className="legacy-overview-links">
          <button className="text-button" onClick={() => setScreen('overview')}>
            Visão geral
          </button>
          <span> | </span>
          <button className="text-button" onClick={() => setScreen('main')}>
            Construções
          </button>
        </div>
        <div className="legacy-village-status">
          {editingName ? (
            <form className="rename-village" onSubmit={submitName}>
              <input
                aria-label="Nome da aldeia"
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setEditingName(false);
                }}
                minLength={3}
                maxLength={25}
                required
                autoFocus
              />
              <button className="green" disabled={rename.isPending}>
                Renomear
              </button>
              <button type="button" className="text-button" onClick={() => setEditingName(false)}>
                Cancelar
              </button>
            </form>
          ) : (
            <div className="village-name-controls">
              <button
                className="text-button village-name"
                title={data.village.name}
                onClick={() => setScreen('overview')}
              >
                {data.village.name}{' '}
                <span>
                  ({data.village.x}|{data.village.y}) K{Math.floor(data.village.y / 100)}
                  {Math.floor(data.village.x / 100)}
                </span>
              </button>
              <button
                className="rename-village-icon"
                aria-label="Renomear aldeia"
                onClick={() => {
                  setName(data.village.name);
                  rename.reset();
                  setEditingName(true);
                }}
              >
                <img src="/legacy/icons/edit.png" alt="" />
              </button>
            </div>
          )}
          <div className="legacy-resources" aria-label="Recursos da aldeia">
            {resources.map(({ code, name: resourceName }) => {
              const amount = Math.min(
                data.village.capacity,
                Math.floor(
                  data.village.resources[code] + data.village.productionPerHour[code] * elapsed,
                ),
              );
              return (
                <span
                  className="resource-amount"
                  key={code}
                  style={
                    {
                      '--fill': Math.min(1, amount / Math.max(1, data.village.capacity)),
                    } as CSSProperties
                  }
                  title={`${resourceName}: ${numbers.format(data.village.productionPerHour[code])} por hora`}
                >
                  <ResourceIcon code={code} label={resourceName} />
                  <span className={amount >= data.village.capacity ? 'full-resource' : undefined}>
                    {numbers.format(amount)}
                  </span>
                </span>
              );
            })}
            <span className="resource-amount">
              <ResourceIcon code="storage" label="Armazém" />
              {numbers.format(data.village.capacity)}
            </span>
            <span className="resource-separator">|</span>
            {data.village.loyalty < 100 ? <span>Lealdade: {data.village.loyalty}% | </span> : null}
            <span className="resource-amount">
              <ResourceIcon code="peasants" label="População" />
              {data.village.populationUsed}/{data.village.populationCapacity}
            </span>
          </div>
        </div>
      </div>
      <div className="legacy-quickbar">
        <Link to="/worlds">{data.world.name}</Link>
        <div>
          {['main', 'noble', 'barracks', 'stable', 'workshop', 'market', 'place']
            .flatMap((code) => {
              const building = data.buildings.find((item) => item.code === code && item.level > 0);
              return building
                ? [
                    <button className="text-button" key={code} onClick={() => setScreen(code)}>
                      {building.name}
                    </button>,
                  ]
                : [];
            })
            .map((button, index) => (
              <span key={button.key}>
                {index > 0 ? ' | ' : ''}
                {button}
              </span>
            ))}
        </div>
      </div>
      {error ? (
        <p className="error" role="alert">
          {error.message}
          {uncertainAction ? (
            <button
              className="text-button"
              disabled={build.isPending}
              onClick={() => construct(active?.code ?? 'main')}
            >
              Conferir e tentar novamente
            </button>
          ) : recruitment.isError && recruitmentIntent.current ? (
            <button
              className="text-button"
              disabled={recruitment.isPending}
              onClick={() => {
                const action = recruitmentIntent.current;
                if (action) recruitment.mutate(action);
              }}
            >
              Conferir e tentar novamente
            </button>
          ) : academy.isError && academyIntent.current ? (
            <button
              className="text-button"
              disabled={academy.isPending}
              onClick={() => {
                const intent = academyIntent.current;
                if (intent) academy.mutate(intent);
              }}
            >
              Conferir e tentar novamente
            </button>
          ) : village.error ? (
            <button className="text-button" onClick={() => void village.refetch()}>
              Reconectar
            </button>
          ) : null}
        </p>
      ) : null}
      {section === 'overview' ? (
        <Overview
          snapshot={data}
          graphical={account.graphicalOverview !== false}
          preferencePending={preference.isPending}
          onPreference={(value) => preference.mutate(value)}
          onSelect={setScreen}
          clock={clock}
        />
      ) : null}
      {section === 'map' ? <WorldMap snapshot={data} /> : null}
      {section === 'info_village' ? <PublicVillageScreen snapshot={data} /> : null}
      {section === 'info_player' ? <PublicPlayerScreen snapshot={data} /> : null}
      {section === 'reports' ? <ReportsPanel snapshot={data} clock={clock} /> : null}
      {section === 'mail' ? <MailPanel snapshot={data} clock={clock} /> : null}
      {section === 'ranking' ? <RankingScreen snapshot={data} /> : null}
      {section === 'settings' ? <SettingsScreen snapshot={data} /> : null}
      {section === 'buildings' && active ? (
        <BuildingScreen
          snapshot={data}
          building={active}
          clock={clock}
          pending={pending}
          onCancel={(id) => cancel.mutate(id)}
          onConstruct={construct}
          onSelect={setScreen}
          onResearch={(code) => research.mutate(code)}
          researchPending={research.isPending}
          onRecruit={recruit}
          onCancelRecruitment={(id) => cancelRecruitment.mutate(id)}
          recruitmentPending={
            recruitment.isPending ||
            cancelRecruitment.isPending ||
            (recruitment.isError && recruitmentIntent.current !== null)
          }
          recruitmentVersion={recruitmentVersion}
          onAcademyAction={academyAction}
          academyPending={
            academy.isPending ||
            cancelRecruitment.isPending ||
            (academy.isError && academyIntent.current !== null)
          }
        />
      ) : null}
      {section === 'activity' ? (
        <div className="legacy-content">
          <h1>Atividade da aldeia</h1>
          <div className="table-scroll">
            <table className="legacy-table activity-table">
              <thead>
                <tr>
                  <th>Acontecimento</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {data.activity.map((item) => (
                  <tr key={item.id}>
                    <td>{item.message}</td>
                    <td>
                      <time dateTime={item.occurredAt}>
                        {new Date(item.occurredAt).toLocaleString('pt-BR')}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </LegacyFrame>
  );
}
