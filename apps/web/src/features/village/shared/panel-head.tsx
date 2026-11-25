import type { ReactNode } from 'react';
import type { BuildingView } from '@dwar/api-client';
import { buildingIllustration } from '../overview/scene-model.js';

/** Cabeçalho das telas de edifício com abas: arte, nome, nível e os indicadores da tela. */
export function PanelHead({
  building,
  children,
}: {
  building: BuildingView;
  children?: ReactNode;
}) {
  return (
    <header className="panel-head">
      <img
        src={buildingIllustration(building.code, building.level, building.maxLevel)}
        alt=""
        decoding="async"
      />
      <div className="panel-head-title">
        <h1>
          {building.name} <span className="panel-level">Nível {building.level}</span>
        </h1>
        <p>{building.description}</p>
      </div>
      {children ? <div className="panel-head-stats">{children}</div> : null}
    </header>
  );
}

/** Cartão de seção dentro de uma tela: título com ícone opcional e ações à direita. */
export function PanelCard({
  title,
  icon,
  aside,
  className,
  children,
}: {
  title: string;
  icon?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel-card${className ? ` ${className}` : ''}`}>
      <header>
        <h2>
          {icon}
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
