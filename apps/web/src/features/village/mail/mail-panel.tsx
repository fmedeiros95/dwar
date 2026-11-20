import { useGameSearchParams as useSearchParams } from '../../../routing.js';
import { newRequestKey } from '@dwar/api-client';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, ApiError, type MailAction, type VillageSnapshot } from '@dwar/api-client';
import { MailList } from './mail-list.js';
import { ComposeMail } from './mail-compose.js';
import { Conversation } from './mail-conversation.js';

const modes = [
  { code: 'in', label: 'Mensagens' },
  { code: 'new', label: 'Nova mensagem' },
  { code: 'block', label: 'Bloqueios' },
];

export function MailPanel({ snapshot, clock }: { snapshot: VillageSnapshot; clock: number }) {
  const worldId = snapshot.world.id,
    villageId = snapshot.village.id;
  const client = useQueryClient(),
    [params, setParams] = useSearchParams();
  const mode =
    params.get('mode') === 'new'
      ? 'new'
      : params.get('mode') === 'block'
        ? 'block'
        : params.get('mode') === 'view'
          ? 'view'
          : 'in';
  const page = /^\d+$/.test(params.get('page') ?? '') ? Math.max(1, Number(params.get('page'))) : 1;
  const threadId = mode === 'view' ? Number(params.get('id')) : 0,
    recipientId = mode === 'new' ? Number(params.get('id')) : 0;
  const [preview, setPreview] = useState<string | null>(null),
    [notice, setNotice] = useState(''),
    [blockName, setBlockName] = useState(''),
    [conversationVersion, setConversationVersion] = useState(0);
  const intent = useRef<{ action: MailAction; requestId: string } | null>(null);
  const mailbox = useQuery({
    queryKey: ['mailbox', worldId, page],
    queryFn: () => api.mailbox(worldId, page),
    refetchInterval: 5000,
  });
  const target = useQuery({
    queryKey: ['mail-recipient', worldId, villageId, recipientId],
    queryFn: () => api.publicPlayer(worldId, villageId, recipientId),
    enabled: !!recipientId,
  });
  const thread = useQuery({
    queryKey: ['mail-thread', worldId, threadId],
    enabled: !!threadId,
    refetchInterval: 5000,
    queryFn: async () => {
      const result = await api.mailThread(worldId, threadId);
      if (result.status === 'new') {
        await api.mailAction(worldId, { type: 'read', threadId }, newRequestKey());
        void client.invalidateQueries({ queryKey: ['mailbox', worldId] });
        return { ...result, status: 'read' as const };
      }
      return result;
    },
  });
  function navigate(nextMode: string, extra: Record<string, string | number> = {}) {
    setParams({ village: villageId, screen: 'mail', mode: nextMode, ...extra });
    setPreview(null);
  }
  const action = useMutation({
    mutationFn: (input: { action: MailAction; requestId: string }) =>
      api.mailAction(worldId, input.action, input.requestId),
    onSuccess: (result, input) => {
      intent.current = null;
      void client.invalidateQueries({ queryKey: ['mailbox', worldId] });
      void client.invalidateQueries({ queryKey: ['mail-thread', worldId] });
      if (input.action.type === 'send' && result.threadId) {
        navigate('view', { id: result.threadId });
        setNotice('Mensagem enviada.');
      }
      if (input.action.type === 'reply') {
        setConversationVersion((value) => value + 1);
        setNotice('Resposta enviada.');
      }
      if (input.action.type === 'delete') {
        navigate('in');
        setNotice('Mensagens excluídas da sua caixa.');
      }
      if (input.action.type === 'block') {
        setBlockName('');
        setNotice('Jogador bloqueado.');
      }
      if (input.action.type === 'unblock') setNotice('Jogador desbloqueado.');
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) intent.current = null;
    },
  });
  const previewAction = useMutation({
    mutationFn: (text: string) => api.previewMail(worldId, text),
    onSuccess: (result) => setPreview(result.text),
  });
  function perform(value: MailAction) {
    const input = intent.current ?? { action: value, requestId: newRequestKey() };
    intent.current = input;
    action.mutate(input);
  }
  function onTarget(type: 'player' | 'village', id: number) {
    setParams({
      village: villageId,
      screen: type === 'player' ? 'info_player' : 'info_village',
      id,
    });
  }
  const pending =
    action.isPending || previewAction.isPending || (action.isError && intent.current !== null);
  const error =
    action.error ??
    previewAction.error ??
    mailbox.error ??
    (mode === 'view' ? thread.error : null) ??
    (mode === 'new' ? target.error : null);
  return (
    <div className="market-layout">
      <aside>
        <table className="legacy-table market-menu">
          <thead>
            <tr>
              <th>Submenus</th>
            </tr>
          </thead>
          <tbody>
            {modes.map((item) => (
              <tr key={item.code}>
                <td>
                  <button
                    className="text-button"
                    disabled={pending}
                    onClick={() => {
                      action.reset();
                      previewAction.reset();
                      setNotice('');
                      navigate(item.code);
                    }}
                  >
                    {mode === item.code || (item.code === 'in' && mode === 'view') ? '» ' : ''}
                    {item.label}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </aside>
      <section className="market-content mail-content">
        {error ? (
          <p className="error" role="alert">
            {error.message}
            {action.isError && intent.current ? (
              <button
                className="text-button"
                disabled={action.isPending}
                onClick={() => {
                  if (intent.current) action.mutate(intent.current);
                }}
              >
                Conferir e tentar novamente
              </button>
            ) : null}
          </p>
        ) : null}
        {notice ? <p role="status">{notice}</p> : null}
        {mode === 'in' ? (
          mailbox.data ? (
            <MailList
              key={mailbox.data.page}
              data={mailbox.data}
              pending={pending}
              clock={clock}
              onOpen={(id) => navigate('view', { id })}
              onDelete={(ids) => perform({ type: 'delete', threadIds: ids })}
              onPlayer={(id) => onTarget('player', id)}
              onPage={(page) => navigate('in', { page: String(page) })}
            />
          ) : (
            <p>Carregando mensagens…</p>
          )
        ) : null}
        {mode === 'new' ? (
          recipientId && !target.data && !target.isError ? (
            <p>Carregando destinatário…</p>
          ) : (
            <ComposeMail
              key={recipientId}
              recipient={target.data?.username ?? ''}
              pending={pending}
              onSend={perform}
              onPreview={(text) => previewAction.mutate(text)}
              preview={preview}
            />
          )
        ) : null}
        {mode === 'view' ? (
          thread.data ? (
            <Conversation
              key={`${threadId}:${conversationVersion}`}
              data={thread.data}
              pending={pending}
              clock={clock}
              onReply={(text) => perform({ type: 'reply', threadId, text })}
              onDelete={() => perform({ type: 'delete', threadIds: [threadId] })}
              onTarget={onTarget}
            />
          ) : (
            <p>{threadId ? 'Carregando conversa…' : 'Mensagem não encontrada.'}</p>
          )
        ) : null}
        {mode === 'block' ? (
          <>
            <h2>Bloqueios</h2>
            <table className="legacy-table mail-blocks">
              <thead>
                <tr>
                  <th colSpan={2}>Jogadores bloqueados:</th>
                </tr>
              </thead>
              <tbody>
                {mailbox.data?.blocked.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <button
                        className="text-button"
                        aria-label={`Desbloquear ${person.username}`}
                        disabled={pending}
                        onClick={() => perform({ type: 'unblock', playerId: person.id })}
                      >
                        <img src="/legacy/icons/delete.png" alt="" />
                      </button>
                    </td>
                    <td>
                      <button className="text-button" onClick={() => onTarget('player', person.id)}>
                        {person.username}
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2}>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        perform({ type: 'block', username: blockName });
                      }}
                    >
                      <label>
                        Nome:{' '}
                        <input
                          value={blockName}
                          onChange={(event) => setBlockName(event.target.value)}
                          maxLength={24}
                          size={15}
                          required
                          disabled={pending}
                        />
                      </label>{' '}
                      <button disabled={pending}>OK</button>
                    </form>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : null}
      </section>
    </div>
  );
}
