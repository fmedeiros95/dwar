/** O que falta para uma tela aparecer: espera com indicador ou falha com nova tentativa. */
export function LoadState({
  query,
  loading,
  message = false,
}: {
  query: { error: Error | null; isFetching: boolean; refetch: () => unknown };
  loading: string;
  /** Mostra o motivo da falha; desligado quando a tela já o mostra no topo. */
  message?: boolean;
}) {
  if (query.error)
    return (
      <div className="screen-failed" role={message ? 'alert' : undefined}>
        {message ? <p>{query.error.message}</p> : null}
        <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>
          {query.isFetching ? 'Tentando…' : 'Tentar novamente'}
        </button>
      </div>
    );
  return (
    <div className="screen-loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {loading}
    </div>
  );
}
