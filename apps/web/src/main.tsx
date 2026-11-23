import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './app.js';
import { preloadGame } from './preload-game.js';
import { ToastProvider } from './components/toast.js';
import '@fontsource-variable/inter';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import './styles.css';
import './theme.css';
import './skin.css';
import './frames.css';
import './bbcode.css';
import './reports.css';
import './medals.css';
import './travel.css';
import './tribes.css';
import './scene-life.css';
import './hud.css';
import './ui.css';
import './controls.css';
import './trade.css';
import './building.css';
import './public.css';
import './split.css';
import './a11y.css';
import './art.css';
import './flows.css';

const client = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: true } },
});
preloadGame(client);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
