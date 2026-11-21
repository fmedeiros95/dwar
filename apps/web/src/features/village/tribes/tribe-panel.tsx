import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MessageTarget, type TribeAction, type VillageSnapshot } from '@dwar/api-client';
import { Icon } from '../../../components/icons.js';
import { useGameSearchParams } from '../../../routing.js';
import { numbers, targetScreen } from '../shared/index.js';
import { NoTribe } from './no-tribe.js';
import { Diplomacy } from './tribe-diplomacy.js';
import { MassMail } from './tribe-mass-mail.js';
import { EditProfile, Invites, Members, Options, Overview } from './tribe-sections.js';

const tabs = [
  { code: 'overview', label: 'Visão geral' },
  { code: 'members', label: 'Membros' },
  { code: 'invites', label: 'Convites' },
  { code: 'diplomacy', label: 'Diplomacia' },
  { code: 'mail', label: 'Mensagem' },
  { code: 'edit', label: 'Perfil e texto' },
  { code: 'options', label: 'Sair' },
] as const;
type Tab = (typeof tabs)[number]['code'];

export function TribePanel({ snapshot }: { snapshot: VillageSnapshot }) {
  const worldId = snapshot.world.id,
    client = useQueryClient();
  const [params, setParams] = useGameSearchParams();
  const requested = params.get('tab');
  const tab: Tab = tabs.some((item) => item.code === requested) ? (requested as Tab) : 'overview';
  const [massMail, setMassMail] = useState<{
    sent: number;
    skipped: number;
    repeated: boolean;
  } | null>(null);
  const home = useQuery({
    queryKey: ['tribes', worldId],
    queryFn: () => api.tribes(worldId),
    refetchInterval: 15000,
  });
  const action = useMutation({
    mutationFn: (input: TribeAction) => api.tribeAction(worldId, input),
    onSuccess: (data, input) => {
      client.setQueryData(['tribes', worldId], data);
      if (data.result) setMassMail(data.result.massMail);
      // Posição e tag aparecem em outras telas; elas se atualizam na próxima consulta.
      void client.invalidateQueries({ queryKey: ['ranking', worldId] });
      void client.invalidateQueries({ queryKey: ['village', worldId] });
      void client.invalidateQueries({ queryKey: ['reports', worldId] });
      if (input.type === 'create' || input.type === 'accept_invite') go('overview');
    },
  });
  function go(next: Tab) {
    setParams({
      village: snapshot.village.id,
      screen: 'tribe',
      ...(next === 'overview' ? {} : { tab: next }),
    });
  }
  function onTarget(type: MessageTarget, id: number) {
    setParams({ village: snapshot.village.id, screen: targetScreen[type], id });
  }
  const data = home.data;
  const error = action.error ?? home.error;
  return (
    <div className="legacy-content page-card">
      <header className="tribe-heading">
        <Icon name="tribe" size={34} />
        <div>
          <strong>
            {data?.tribe ? data.tribe.profile.name : 'Tribo'}
            {data?.tribe ? (
              <span className="tribe-tag static">{data.tribe.profile.tag}</span>
            ) : null}
          </strong>
          {data?.tribe ? (
            <small>
              {numbers.format(data.tribe.profile.points)} pontos · {data.tribe.profile.rank}º lugar
              · {data.tribe.profile.members.length}{' '}
              {data.tribe.profile.members.length === 1 ? 'membro' : 'membros'}
            </small>
          ) : (
            <small>Entre numa tribo ou funde a sua.</small>
          )}
        </div>
      </header>
      {error ? (
        <p className="error" role="alert">
          {error.message}
        </p>
      ) : null}
      {!data ? (
        <p className="muted">Carregando tribo…</p>
      ) : !data.tribe ? (
        <NoTribe
          invites={data.invites}
          pending={action.isPending}
          onAction={(input) => action.mutate(input)}
          onOpen={(tribeId) => onTarget('tribe', tribeId)}
        />
      ) : (
        <>
          <nav className="report-tabs" aria-label="Seções da tribo">
            {tabs
              .filter((item) => item.code !== 'mail' || data.tribe!.me.rights.canMassMail)
              .map((item) => (
                <button
                  key={item.code}
                  className={item.code === tab ? 'active' : undefined}
                  aria-current={item.code === tab ? 'page' : undefined}
                  onClick={() => go(item.code)}
                >
                  {item.label}
                  {item.code === 'diplomacy' &&
                  data.tribe!.diplomacy.wars.some((war) => war.peace && !war.peace.offeredByUs) ? (
                    <span className="report-count">!</span>
                  ) : null}
                  {item.code === 'invites' && data.tribe!.invites.length ? (
                    <span className="report-count">{data.tribe!.invites.length}</span>
                  ) : null}
                </button>
              ))}
          </nav>
          {(() => {
            const shared = {
              data: data.tribe!,
              pending: action.isPending,
              onAction: (input: TribeAction) => action.mutate(input),
              onTarget,
            };
            if (tab === 'members') return <Members {...shared} />;
            if (tab === 'invites') return <Invites {...shared} />;
            if (tab === 'diplomacy') return <Diplomacy {...shared} />;
            if (tab === 'mail')
              return (
                <MassMail
                  data={shared.data}
                  pending={shared.pending}
                  result={massMail}
                  onAction={shared.onAction}
                />
              );
            if (tab === 'edit') return <EditProfile {...shared} />;
            if (tab === 'options') return <Options {...shared} />;
            return <Overview data={data.tribe!} onTarget={onTarget} />;
          })()}
        </>
      )}
    </div>
  );
}
