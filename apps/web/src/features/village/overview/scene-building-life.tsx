import type { CSSProperties } from 'react';
import type { SceneLayer } from './scene-life.js';
import './scene-building-life.css';

type BuildingActivity = {
  row: number;
  size: number;
  right: number;
  bottom: number;
  duration: number;
  delay: number;
};

// Ajustes medidos a partir do canto inferior direito da arte, junto ao chão de cada edifício.
const activities: Partial<Record<string, BuildingActivity>> = {
  noble: { row: 0, size: 30, right: 20, bottom: 13, duration: 4.5, delay: 0.7 },
  barracks: { row: 1, size: 32, right: 117, bottom: 16, duration: 2.7, delay: 1.8 },
  stable: { row: 2, size: 36, right: 195, bottom: 60, duration: 3.8, delay: 2.3 },
  workshop: { row: 3, size: 30, right: 21, bottom: 32, duration: 3.2, delay: 1.4 },
};

export function SceneBuildingLife({
  layers,
  workSites,
}: {
  layers: readonly SceneLayer[];
  workSites: ReadonlySet<string>;
}) {
  return layers.map(({ building, placed }) => {
    const activity = activities[building.code];
    const { container, sprite } = placed.slot;
    if (!activity || !container || !sprite || building.level < 1 || workSites.has(building.code)) {
      return null;
    }

    const x = (container.left ?? 0) + (sprite.left ?? 0) + sprite.width - activity.right;
    const y = (container.top ?? 0) + (sprite.top ?? 0) + sprite.height - activity.bottom;

    return (
      <span
        key={building.code}
        className="life-building-activity"
        data-building={building.code}
        style={
          {
            left: x,
            top: y,
            '--activity-size': `${activity.size}px`,
            '--activity-row': `${-100 * activity.row}%`,
            '--activity-duration': `${activity.duration}s`,
            '--activity-delay': `${-activity.delay}s`,
          } as CSSProperties
        }
      >
        <span className="life-building-activity-window">
          <img src="/game/town/life/building-life.webp" alt="" draggable={false} />
        </span>
      </span>
    );
  });
}
