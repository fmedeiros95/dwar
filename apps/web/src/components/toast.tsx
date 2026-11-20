import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: Kind; title: string; message?: string | undefined };
type ToastApi = {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const icons = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast precisa estar dentro de ToastProvider.');
  return value;
}

/** Notificações empilhadas no canto da tela; somem sozinhas e podem ser fechadas. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const push = useCallback(
    (kind: Kind, title: string, message?: string) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-3), { id, kind, title, message }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4200);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      info: (title, message) => push('info', title, message),
    }),
    [push],
  );
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="region" aria-label="Notificações">
        {items.map((item) => {
          const Icon = icons[item.kind];
          return (
            <div
              key={item.id}
              className={`toast toast-${item.kind}`}
              role={item.kind === 'error' ? 'alert' : 'status'}
            >
              <Icon className="toast-icon" aria-hidden="true" size={20} />
              <div className="toast-text">
                <strong>{item.title}</strong>
                {item.message ? <span>{item.message}</span> : null}
              </div>
              <button
                type="button"
                className="toast-close"
                aria-label="Fechar notificação"
                onClick={() => dismiss(item.id)}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
