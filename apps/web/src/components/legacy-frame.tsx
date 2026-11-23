import { Icon, type IconName } from './icons.js';

const resourceIcon: Record<string, IconName> = {
  wood: 'wood',
  stone: 'clay',
  iron: 'iron',
  peasants: 'people',
  food: 'food',
  merchant: 'coin',
  noble: 'banner',
  time: 'time',
  storage: 'storage',
};

/** Recursos com ícone pintado, produzido em cada tamanho (scripts/make-resource-icons.py). */
const paintedResources = ['wood', 'stone', 'iron'];

export function ResourceIcon({
  code,
  label,
  size = 20,
}: {
  code: string;
  label: string;
  /** 24 na barra superior, 20 nos painéis, 16 nos chips de custo. */
  size?: 16 | 20 | 24;
}) {
  if (paintedResources.includes(code)) {
    const file = `/game/resources/icons/${code}-${size}`;
    return (
      <img
        className={`resource-icon ri-${code} painted`}
        src={`${file}.png`}
        srcSet={`${file}.png 1x, ${file}@2x.png 2x`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        alt={label}
        title={label}
        draggable={false}
      />
    );
  }
  const icon = resourceIcon[code];
  if (!icon)
    return (
      <img
        className="resource-icon"
        src={`/legacy/icons/${code}.png`}
        alt={label}
        title={label}
        width="18"
        height="18"
      />
    );
  return (
    <span className={`resource-icon ri-${code}`} role="img" aria-label={label} title={label}>
      <Icon name={icon} size={20} />
    </span>
  );
}
