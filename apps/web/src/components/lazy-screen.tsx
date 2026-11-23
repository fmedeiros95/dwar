import { Component, Suspense, lazy, type ComponentType, type ReactNode } from 'react';

/** Se a tela não baixar (rede caiu ou saiu versão nova), avisa em vez de derrubar o jogo. */
class ScreenBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen-failed" role="alert">
        <p>Não foi possível abrir esta tela. Verifique a conexão e recarregue a página.</p>
        <button type="button" onClick={() => location.reload()}>
          Recarregar
        </button>
      </div>
    );
  }
}

const loaders: (() => Promise<unknown>)[] = [];

/** Tela baixada só quando é aberta (ou antes, por `preloadScreens`). */
export function lazyScreen<P extends object>(load: () => Promise<ComponentType<P>>) {
  loaders.push(load);
  const Screen = lazy(async () => ({ default: await load() })) as unknown as ComponentType<P>;
  return function LazyScreen(props: P) {
    return (
      <ScreenBoundary>
        <Suspense
          fallback={
            <div className="screen-loading" role="status">
              <span className="spinner" aria-hidden="true" />
              Carregando…
            </div>
          }
        >
          <Screen {...props} />
        </Suspense>
      </ScreenBoundary>
    );
  };
}

/** Com o jogo já na tela, baixa as outras telas uma a uma para abrirem na hora. */
export async function preloadScreens() {
  for (const load of loaders) {
    try {
      await load();
    } catch {
      return; // sem rede agora: cada tela tenta de novo quando for aberta
    }
  }
}
