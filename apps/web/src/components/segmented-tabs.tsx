import { useRef, type KeyboardEvent, type ReactNode } from 'react';

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
  const known = items.some((item) => item.code === value);
  const list = useRef<HTMLDivElement>(null);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.code === value);
    const last = items.length - 1;
    const next = {
      ArrowRight: index >= last ? 0 : index + 1,
      ArrowLeft: index <= 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined || disabled) return;
    event.preventDefault();
    list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    onChange(items[next]!.code);
  }
  return (
    <div ref={list} className="seg-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((item, index) => (
        <button
          key={item.code}
          type="button"
          role="tab"
          aria-selected={item.code === value}
          tabIndex={item.code === value || (index === 0 && !known) ? 0 : -1}
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
