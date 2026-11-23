import { worldEntryPath, useGameSearchParams as useSearchParams } from '../../routing.js';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type Account, type World } from '@dwar/api-client';
import { Clock, HeartHandshake, Pencil, Swords } from 'lucide-react';
import { LegacyFrame, ResourceIcon } from '../../components/legacy-frame.js';
import { Icon } from '../../components/icons.js';
import { GameShell } from '../../components/game-shell.js';
import { WindowLayer } from '../../components/game-window.js';
import { screenOf, useWindowManager } from '../../components/use-window-manager.js';
import { useToast } from '../../components/toast.js';
import { BuildingScreen, panelBuildings } from './building-screen.js';
import { buildingArtId } from './overview/scene-model.js';
import { Overview } from './overview/index.js';
import { WorldMap } from './map/index.js';
import { PublicVillageScreen, PublicPlayerScreen } from './public-info/index.js';
import { ReportsPanel } from './reports/index.js';
import { MailPanel } from './mail/index.js';
import { NotesPanel } from './notes/index.js';
import { MedalsPanel } from './medals/index.js';
import { TribePanel, TribeProfileScreen } from './tribes/index.js';
import { RankingScreen } from './ranking/index.js';
import { SettingsScreen } from './settings/index.js';
import { IncomingsPanel } from './incomings/incomings-panel.js';
import { ThreatAlert } from './incomings/threat.js';
import { useVillageActions } from './use-village-actions.js';
import { usePlannerState } from './planner/build-planner.js';
import { duration, numbers, resources, timeFormat } from './shared/index.js';
import { currentResources } from './shared/current-resources.js';
import { useResourceDeltas } from './shared/resource-delta.js';

const idleResources = { wood: 0, stone: 0, iron: 0 };

const backgroundScreens = ['overview', 'map'];
const windowTitles: Record<string, string> = {
  reports: 'Relatórios',
  mail: 'Mensagens',
  notes: 'Notas',
  medals: 'Medalhas',
  tribe: 'Tribo',
  info_tribe: 'Tribo',
  activity: 'Atividade da aldeia',
  ranking: 'Ranking',
  settings: 'Ajustes',
  info_village: 'Aldeia',
  info_player: 'Jogador',
  incomings: 'Chegando',
};
const wideScreens = ['mail', 'reports', 'ranking'];
function windowSize(screen: string) {
  // Edifícios sem tela própria mostram só indicadores e evolução: janela compacta.
  if (buildingArtId[screen] && !panelBuildings.includes(screen)) return { w: 760, h: 560 };
  return wideScreens.includes(screen) ? { w: 860, h: 600 } : { w: 920, h: 640 };
}

function lastBackgroundScreen(raw: string, isBackground: boolean, last: string) {
  return isBackground ? raw : last;
}

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
  const rawScreen = params.get('screen') ?? 'overview';
  const isBackground = backgroundScreens.includes(rawScreen);
  const lastBackground = useRef('overview');
  const handledSearch = useRef('');
  const mapCenter = useRef<{ x: string; y: string } | null>(null);
  const windows = useWindowManager(windowSize);
  const openWindow = windows.open;
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
  const profile = useQuery({
    queryKey: ['profile', worldId],
    queryFn: () => api.profile(worldId),
    staleTime: 5 * 60 * 1000,
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
    // Telas de janela são tratadas pelo efeito seguinte, que também corrige a URL.
    if (!backgroundScreens.includes(params.get('screen') ?? 'overview')) return;
    const next = new URLSearchParams(params);
    if (!next.has('village')) next.set('village', String(canonicalVillageId));
    if (!next.has('screen')) next.set('screen', 'overview');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [canonicalVillageId, params, setParams]);
  // Qualquer navegação para uma tela que não é o fundo (aldeia ou mapa) abre uma janela.
  useEffect(() => {
    if (canonicalVillageId === undefined) return;
    if (isBackground) {
      lastBackground.current = rawScreen;
      handledSearch.current = '';
      // Guarda onde o mapa estava: abrir uma janela a partir dele não pode recentralizá-lo.
      if (rawScreen === 'map' && params.has('x') && params.has('y'))
        mapCenter.current = { x: params.get('x')!, y: params.get('y')! };
      return;
    }
    if (handledSearch.current === params.toString()) return;
    handledSearch.current = params.toString();
    const search = new URLSearchParams(params);
    if (!search.has('village')) search.set('village', String(canonicalVillageId));
    openWindow(search.toString());
    const next = new URLSearchParams();
    next.set('village', search.get('village')!);
    next.set('screen', lastBackground.current);
    if (lastBackground.current === 'map' && mapCenter.current) {
      next.set('x', mapCenter.current.x);
      next.set('y', mapCenter.current.y);
    }
    setParams(next, { replace: true });
  }, [canonicalVillageId, isBackground, rawScreen, params, openWindow, setParams]);
  const planner = usePlannerState(canonicalVillageId ?? 0);
  const reports = useQuery({
    queryKey: ['reports', worldId, 1],
    queryFn: () => api.reports(worldId, 1),
    enabled: !!data,
    refetchInterval: 5000,
  });
  const tribes = useQuery({
    queryKey: ['tribes', worldId],
    queryFn: () => api.tribes(worldId),
    enabled: !!data,
    refetchInterval: 30000,
  });
  const mail = useQuery({
    queryKey: ['mailbox', worldId, 1],
    queryFn: () => api.mailbox(worldId, 1),
    enabled: !!data,
    refetchInterval: 5000,
  });
  const incomings = useQuery({
    queryKey: ['incomings', worldId],
    queryFn: () => api.incomings(worldId),
    enabled: !!data,
    refetchInterval: 3000,
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
    cancelledConstructions,
  } = useVillageActions({
    worldId,
    villageId: data?.village.id,
    onLogout,
    onRenameSuccess: () => setEditingName(false),
  });
  // Avisa quando uma obra some da fila sem ter sido cancelada pelo jogador: foi concluída.
  const toast = useToast();
  const queueMemory = useRef<{
    villageId: number;
    items: Map<number, { name: string; level: number }>;
  } | null>(null);
  useEffect(() => {
    if (!data) return;
    const items = new Map(
      data.queue.map((item) => [item.id, { name: item.name, level: item.targetLevel }]),
    );
    const previous = queueMemory.current;
    if (previous && previous.villageId === data.village.id) {
      for (const [id, info] of previous.items) {
        if (items.has(id)) continue;
        if (cancelledConstructions.current.delete(id)) continue;
        toast.success('Obra concluída', `${info.name}, nível ${info.level}`);
      }
    }
    queueMemory.current = { villageId: data.village.id, items };
  }, [data, cancelledConstructions, toast]);
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
    // Na aldeia, o Edifício principal é a mesa de obras acoplada ao cenário.
    if (
      value === 'main' &&
      lastBackground.current === 'overview' &&
      isBackground &&
      account.graphicalOverview !== false
    ) {
      planner.show();
      return;
    }
    if (backgroundScreens.includes(value)) {
      const next = new URLSearchParams(params);
      next.set('screen', value);
      next.delete('mode');
      next.delete('x');
      next.delete('y');
      next.delete('id');
      next.delete('rpage');
      next.delete('rsearch');
      setParams(next);
      return;
    }
    const villageId = params.get('village') ?? String(canonicalVillageId ?? '');
    openWindow(new URLSearchParams({ village: villageId, screen: value }).toString());
  }
  function openIncomings(mode: 'attack' | 'support') {
    const villageId = params.get('village') ?? String(canonicalVillageId ?? '');
    openWindow(new URLSearchParams({ village: villageId, screen: 'incomings', mode }).toString());
  }
  /** Navegação feita de dentro de uma janela: outra tela na própria janela, ou o fundo. */
  function navigateWindow(id: number, search: string) {
    if (backgroundScreens.includes(new URLSearchParams(search).get('screen') ?? '')) {
      setParams(new URLSearchParams(search));
      return;
    }
    windows.setSearch(id, search);
  }
  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    rename.mutate(name);
  }
  const deltas = useResourceDeltas(
    data?.village.id ?? 0,
    data
      ? currentResources(
          data,
          new Date(data.serverTime).getTime() + Math.max(0, now - village.dataUpdatedAt),
        )
      : idleResources,
    data?.village.productionPerHour ?? idleResources,
    data?.village.capacity ?? 0,
  );
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
  const have = currentResources(data, clock);
  const buildingFor = (code: string) => data.buildings.find((building) => building.code === code);
  const focusedWindow = windows.windows.find((item) => item.id === windows.focusedId);
  const focusedScreen = focusedWindow
    ? screenOf(focusedWindow.search)
    : lastBackgroundScreen(rawScreen, isBackground, lastBackground.current);
  const active = buildingFor(focusedScreen);
  const section = active
    ? 'buildings'
    : [...backgroundScreens, ...Object.keys(windowTitles)].includes(focusedScreen)
      ? focusedScreen
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
  // Erros comuns viram notificações; a faixa fixa fica só para o que pede uma ação do jogador.
  const needsAction =
    uncertainAction ||
    (recruitment.isError && recruitmentIntent.current !== null) ||
    (academy.isError && academyIntent.current !== null) ||
    village.error !== null ||
    preference.isError ||
    logout.isError;
  const activityView = (
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
  );
  return (
    <GameShell
      primary={[
        {
          key: 'overview',
          label: 'Aldeia',
          icon: <Icon name="village" size={26} />,
          active: section === 'overview',
          onClick: () => setScreen('overview'),
        },
        {
          key: 'attacks',
          label: 'Ataques',
          icon: <Swords size={25} aria-hidden="true" />,
          badge: incomings.data?.attacks,
          alert: (incomings.data?.attacks ?? 0) > 0,
          onClick: () => openIncomings('attack'),
        },
        {
          key: 'map',
          label: 'Mapa',
          icon: <Icon name="map" size={26} />,
          active: section === 'map',
          onClick: () => setScreen('map'),
        },
        {
          key: 'reports',
          label: 'Relatórios',
          icon: <Icon name="reports" size={26} />,
          active: section === 'reports',
          badge: reports.data?.unread,
          onClick: () => setScreen('reports'),
        },
        {
          key: 'mail',
          label: 'Mensagens',
          icon: <Icon name="mail" size={26} />,
          active: section === 'mail',
          badge: mail.data?.unread,
          onClick: () => setScreen('mail'),
        },
        {
          key: 'tribe',
          label: 'Tribo',
          icon: <Icon name="tribe" size={26} />,
          active: section === 'tribe',
          badge: tribes.data?.invites.length || undefined,
          onClick: () => setScreen('tribe'),
        },
        {
          key: 'medals',
          label: 'Medalhas',
          icon: <Icon name="medal" size={26} />,
          active: section === 'medals',
          onClick: () => setScreen('medals'),
        },
        {
          key: 'notes',
          label: 'Notas',
          icon: <Icon name="notes" size={26} />,
          active: section === 'notes',
          onClick: () => setScreen('notes'),
        },
        {
          key: 'supports',
          label: 'Apoios',
          icon: <HeartHandshake size={25} aria-hidden="true" />,
          badge: incomings.data?.supports,
          onClick: () => openIncomings('support'),
        },
        {
          key: 'ranking',
          label: 'Ranking',
          icon: <Icon name="ranking" size={26} />,
          active: section === 'ranking',
          onClick: () => setScreen('ranking'),
        },
      ]}
      secondary={[
        {
          key: 'settings',
          label: 'Ajustes',
          icon: <Icon name="settings" size={26} />,
          active: section === 'settings',
          onClick: () => setScreen('settings'),
        },
        {
          key: 'worlds',
          label: 'Mundos',
          icon: <Icon name="world" size={26} />,
          onClick: () => navigate('/worlds'),
        },
        {
          key: 'logout',
          label: 'Sair',
          icon: <Icon name="logout" size={26} />,
          disabled: logout.isPending,
          onClick: () => logout.mutate(),
        },
      ]}
      topbar={
        <>
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
            <div className="shell-village">
              <button
                className="text-button village-name"
                title={data.village.name}
                onClick={() => setScreen('overview')}
              >
                {data.village.name}
                <span>
                  ({data.village.x}|{data.village.y}) K{Math.floor(data.village.y / 100)}
                  {Math.floor(data.village.x / 100)}
                </span>
              </button>
              <button
                className="rename-village-icon"
                aria-label="Renomear aldeia"
                title="Renomear aldeia"
                onClick={() => {
                  setName(data.village.name);
                  rename.reset();
                  setEditingName(true);
                }}
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          <ThreatAlert
            data={incomings.data}
            clock={clock}
            onOpen={() => openIncomings('attack')}
            onReport={(id) =>
              openWindow(
                new URLSearchParams({
                  village: String(data.village.id),
                  screen: 'reports',
                  ...(id ? { id: String(id) } : {}),
                }).toString(),
              )
            }
          />
          <div className="legacy-resources" aria-label="Recursos da aldeia">
            {resources.map(({ code, name: resourceName }) => {
              const amount = have[code];
              const fill = Math.min(1, amount / Math.max(1, data.village.capacity));
              const rate = data.village.productionPerHour[code];
              const hoursToFull = rate > 0 ? (data.village.capacity - amount) / rate : Infinity;
              return (
                <span
                  className="resource-amount"
                  key={code}
                  data-state={fill >= 1 ? 'full' : fill >= 0.9 ? 'near' : undefined}
                  style={{ '--fill': fill } as CSSProperties}
                  title={`${resourceName}: +${numbers.format(rate)} por hora · ${
                    fill >= 1
                      ? 'armazém cheio, a produção está parada'
                      : Number.isFinite(hoursToFull)
                        ? `armazém cheio em ${duration(hoursToFull * 3600)}`
                        : 'sem produção'
                  }`}
                >
                  <ResourceIcon code={code} label={resourceName} size={24} />
                  <span className={amount >= data.village.capacity ? 'full-resource' : undefined}>
                    {numbers.format(amount)}
                  </span>
                  {deltas[code] ? (
                    <span
                      key={deltas[code].id}
                      className="resource-delta"
                      data-sign={deltas[code].amount < 0 ? 'spend' : 'gain'}
                      aria-hidden="true"
                    >
                      {deltas[code].amount > 0 ? '+' : '−'}
                      {numbers.format(Math.abs(deltas[code].amount))}
                    </span>
                  ) : null}
                </span>
              );
            })}
            <span className="resource-amount" title="Capacidade do armazém">
              <ResourceIcon code="storage" label="Armazém" />
              {numbers.format(data.village.capacity)}
            </span>
            {data.village.loyalty < 100 ? (
              <span className="resource-amount" title="Lealdade da aldeia">
                Lealdade {data.village.loyalty}%
              </span>
            ) : null}
            <span className="resource-amount" title="População">
              <ResourceIcon code="peasants" label="População" />
              {data.village.populationUsed}/{data.village.populationCapacity}
            </span>
          </div>
          <div className="shell-meta">
            <span className="shell-clock" title={`Horário do servidor · ${data.world.name}`}>
              <Clock size={14} aria-hidden="true" />
              <time>{timeFormat.format(new Date(clock))}</time>
            </span>
            <span
              className="shell-player"
              title={`${data.player.rank}º de ${numbers.format(data.player.players)} jogadores · ${numbers.format(data.player.points)} pontos em ${data.player.villages} ${data.player.villages === 1 ? 'aldeia' : 'aldeias'} (esta aldeia: ${numbers.format(data.village.points)})`}
            >
              <span className="shell-avatar">
                {profile.data?.avatarUrl ? (
                  <img src={profile.data.avatarUrl} alt={`Avatar de ${account.username}`} />
                ) : (
                  <span aria-hidden="true">{account.username.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <span className="shell-player-info">
                <span className="shell-player-name">{account.username}</span>
                <small>
                  #{data.player.rank} · {numbers.format(data.player.points)} pts
                </small>
              </span>
            </span>
          </div>
        </>
      }
      subbar={
        <>
          <Link to="/worlds" className="subbar-world">
            {data.world.name}
          </Link>
          <div className="subbar-links">
            {['main', 'noble', 'barracks', 'stable', 'workshop', 'market', 'place'].flatMap(
              (code) => {
                const building = data.buildings.find(
                  (item) => item.code === code && item.level > 0,
                );
                return building
                  ? [
                      <button
                        className="subbar-link"
                        key={code}
                        aria-current={focusedScreen === code ? 'page' : undefined}
                        onClick={() => setScreen(code)}
                      >
                        {building.name}
                        <small>{building.level}</small>
                      </button>,
                    ]
                  : [];
              },
            )}
          </div>
        </>
      }
    >
      {error && needsAction ? (
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
      {lastBackgroundScreen(rawScreen, isBackground, lastBackground.current) === 'overview' ? (
        <Overview
          snapshot={data}
          graphical={account.graphicalOverview !== false}
          preferencePending={preference.isPending}
          onPreference={(value) => preference.mutate(value)}
          onSelect={setScreen}
          clock={clock}
          planner={planner}
          pending={pending}
          pendingCode={build.isPending ? build.variables?.buildingCode : undefined}
          onConstruct={construct}
          onCancel={(id) => cancel.mutate(id)}
        />
      ) : (
        <WorldMap snapshot={data} />
      )}
      <WindowLayer
        manager={windows}
        titleOf={(search) => {
          const code = screenOf(search);
          if (code === 'incomings')
            return new URLSearchParams(search).get('mode') === 'support'
              ? 'Apoios chegando'
              : 'Ataques chegando';
          return buildingFor(code)?.name ?? windowTitles[code] ?? 'Janela';
        }}
        onNavigate={navigateWindow}
        render={(win) => {
          const code = screenOf(win.search);
          const building = buildingFor(code);
          const select = (value: string) =>
            navigateWindow(
              win.id,
              new URLSearchParams({ village: String(data.village.id), screen: value }).toString(),
            );
          if (building)
            return (
              <BuildingScreen
                snapshot={data}
                building={building}
                clock={clock}
                planner={planner}
                pending={pending}
                pendingCode={build.isPending ? build.variables?.buildingCode : undefined}
                onCancel={(id) => cancel.mutate(id)}
                onConstruct={construct}
                onSelect={select}
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
            );
          if (code === 'info_village') return <PublicVillageScreen snapshot={data} />;
          if (code === 'info_player') return <PublicPlayerScreen snapshot={data} />;
          if (code === 'reports') return <ReportsPanel snapshot={data} clock={clock} />;
          if (code === 'mail') return <MailPanel snapshot={data} clock={clock} />;
          if (code === 'notes') return <NotesPanel snapshot={data} />;
          if (code === 'medals') return <MedalsPanel snapshot={data} />;
          if (code === 'tribe') return <TribePanel snapshot={data} />;
          if (code === 'info_tribe') return <TribeProfileScreen snapshot={data} />;
          if (code === 'ranking') return <RankingScreen snapshot={data} />;
          if (code === 'settings') return <SettingsScreen snapshot={data} />;
          if (code === 'incomings')
            return (
              <IncomingsPanel
                snapshot={data}
                data={incomings.data}
                clock={clock}
                mode={
                  new URLSearchParams(win.search).get('mode') === 'support' ? 'support' : 'attack'
                }
              />
            );
          if (code === 'activity') return activityView;
          return null;
        }}
      />
    </GameShell>
  );
}
