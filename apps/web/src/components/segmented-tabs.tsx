import type { ReactNode } from 'react';

export type SegmentedTab = {
  code: string;
  label: string;
  icon?: ReactNode;
  /** Contador ao lado do rótulo (ex.: ofertas disponíveis); some quando é 0. */
  count?: number;
};

/** Abas de uma tela, no mesmo controle segmentado usado no resto do jogo. */
export function SegmentedTabs({
  items,
  value,
  onChange,
  disabled,
  label,
}: {
  items: SegmentedTab[];
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="seg-tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.code}
          type="button"
          role="tab"
          aria-selected={item.code === value}
          className={item.code === value ? 'active' : undefined}
          disabled={disabled}
          onClick={() => onChange(item.code)}
        >
          {item.icon}
          {item.label}
          {item.count ? <span className="seg-count">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
