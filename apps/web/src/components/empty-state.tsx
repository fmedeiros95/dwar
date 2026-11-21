import type { ReactNode } from 'react';

/** Estado vazio de uma lista ou tela: ícone, frase curta e, se houver, o que fazer a seguir. */
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-panel" role="status">
      <span className="empty-panel-icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
