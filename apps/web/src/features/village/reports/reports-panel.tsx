import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Swords } from 'lucide-react';
import {
  api,
  type ReportAction,
  type ReportGroup,
  type MessageTarget,
  type ReportRef,
  type VillageSnapshot,
} from '@dwar/api-client';
import { useGameSearchParams } from '../../../routing.js';
import { ReportList } from './report-list.js';
import { BattleDetail, NoticeDetail } from './report-detail.js';
import { refKey, tabs } from './report-parts.js';
import { targetScreen } from '../shared/index.js';

export function ReportsPanel({ snapshot, clock }: { snapshot: VillageSnapshot; clock: number }) {
  const [params, setParams] = useGameSearchParams(),
    client = useQueryClient();
  const worldId = snapshot.world.id;
  const id = Number(params.get('id')),
    source: ReportRef['source'] = params.get('kind') === 'notice' ? 'notice' : 'battle',
    page = Math.max(1, Number(params.get('page')) || 1),
    onlyHere = params.get('scope') === 'village';
  const requested = params.get('group');
  const group: ReportGroup = tabs.some((tab) => tab.code === requested)
    ? (requested as ReportGroup)
    : 'all';
  const villageFilter = onlyHere ? snapshot.village.id : undefined;

  const list = useQuery({
    queryKey: ['reports', worldId, page, group, villageFilter ?? 0],
    queryFn: () => api.reports(worldId, page, villageFilter, group),
    refetchInterval: 5000,
    placeholderData: (previous) => previous,
  });
  const detail = useQuery({
    queryKey: ['report', worldId, source, id],
    enabled: id > 0,
    queryFn: async () => {
      const result =
        source === 'notice' ? await api.notice(worldId, id) : await api.report(worldId, id);
      void client.invalidateQueries({ queryKey: ['reports', worldId] });
      return result;
    },
  });
  const action = useMutation({
    mutationFn: (input: ReportAction) => api.reportAction(worldId, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['reports', worldId] });
      void client.invalidateQueries({ queryKey: ['report', worldId] });
    },
  });

  /** Mantém a aba e o filtro de aldeia ao navegar; `extra` troca o que for preciso. */
  function go(extra: Record<string, string | number> = {}) {
    setParams({
      village: snapshot.village.id,
      screen: 'reports',
      ...(group === 'all' ? {} : { group }),
      ...(onlyHere ? { scope: 'village' } : {}),
      ...(page > 1 ? { page } : {}),
      ...extra,
    });
  }
  const open = (ref: ReportRef) =>
    go({ id: ref.id, ...(ref.source === 'notice' ? { kind: 'notice' } : {}) });
  function onTarget(type: MessageTarget, targetId: number) {
    setParams({
      village: snapshot.village.id,
      screen: targetScreen[type],
      id: targetId,
    });
  }
  const current: ReportRef = { source, id };
  const removeThen = (next: ReportRef | null) =>
    action.mutate(
      { type: 'delete', items: [current] },
      { onSuccess: () => (next ? open(next) : go({ id: 0 })) },
    );
  const markUnread = () =>
    action.mutate({ type: 'unread', items: [current] }, { onSuccess: () => go({ id: 0 }) });
  const data = detail.data;
  const error = detail.error ?? list.error ?? action.error;
  const shared = {
    clock,
    pending: action.isPending,
    onGo: open,
    onUnread: markUnread,
    onTarget,
  };
  return (
    <div className="legacy-content page-card">
      <header className="page-head">
        <h1>
          <Swords size={22} aria-hidden="true" /> Relatórios
        </h1>
        {id > 0 ? (
          <button className="button" onClick={() => go({ id: 0 })}>
            <ChevronLeft size={15} aria-hidden="true" /> Todos os relatórios
          </button>
        ) : null}
      </header>
      {error ? (
        <p className="error" role="alert">
          {error.message}
        </p>
      ) : null}
      {id > 0 || list.data ? (
        <div className="split-host">
          <div className={id > 0 ? 'split-view has-detail' : 'split-view'}>
            {list.data ? (
              <div className="split-list">
                <nav className="report-tabs" aria-label="Tipo de relatório">
                  {tabs.map((tab) => (
                    <button
                      key={tab.code}
                      className={tab.code === group ? 'active' : undefined}
                      aria-current={tab.code === group ? 'page' : undefined}
                      onClick={() =>
                        setParams({
                          village: snapshot.village.id,
                          screen: 'reports',
                          ...(tab.code === 'all' ? {} : { group: tab.code }),
                          ...(onlyHere ? { scope: 'village' } : {}),
                          ...(id > 0
                            ? { id, ...(source === 'notice' ? { kind: 'notice' } : {}) }
                            : {}),
                        })
                      }
                    >
                      {tab.label}
                      {list.data.groups[tab.code].unread ? (
                        <span className="report-count">{list.data.groups[tab.code].unread}</span>
                      ) : null}
                    </button>
                  ))}
                  <label className="report-scope">
                    <input
                      type="checkbox"
                      checked={onlyHere}
                      onChange={(event) =>
                        setParams({
                          village: snapshot.village.id,
                          screen: 'reports',
                          ...(group === 'all' ? {} : { group }),
                          ...(event.target.checked ? { scope: 'village' } : {}),
                          ...(id > 0
                            ? { id, ...(source === 'notice' ? { kind: 'notice' } : {}) }
                            : {}),
                        })
                      }
                    />
                    Só desta aldeia
                  </label>
                </nav>
                <ReportList
                  key={`${group}-${list.data.page}-${villageFilter ?? 0}`}
                  data={list.data}
                  clock={clock}
                  group={group}
                  pending={action.isPending}
                  activeKey={id > 0 ? refKey(current) : undefined}
                  onOpen={open}
                  onAction={(input) => action.mutate(input)}
                  onPage={(next) => go({ page: next })}
                />
              </div>
            ) : null}
            {id > 0 ? (
              <div className="split-detail">
                {data ? (
                  data.source === 'notice' ? (
                    <NoticeDetail
                      {...shared}
                      data={data}
                      onDelete={() => removeThen(data.next ?? data.previous)}
                    />
                  ) : (
                    <BattleDetail
                      {...shared}
                      data={data}
                      snapshot={snapshot}
                      onDelete={() => removeThen(data.next ?? data.previous)}
                    />
                  )
                ) : (
                  <p className="muted">Carregando relatório…</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="muted">Carregando relatórios…</p>
      )}
    </div>
  );
}
