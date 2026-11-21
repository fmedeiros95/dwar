import { ChevronLeft, ChevronRight, EyeOff, Shield, Swords, Trash2 } from 'lucide-react';
import type {
  BattleReportView,
  NoticeReportView,
  ReportRef,
  ReportSide,
  VillageSnapshot,
} from '@dwar/api-client';
import { ResourceIcon } from '../../../components/legacy-frame.js';
import { numbers, completionDate } from '../shared/index.js';
import { Marks, TroopTable, lossPercent, roleLabel } from './report-parts.js';
import { MedalBadge } from '../medals/index.js';

const lootCodes = [
  { code: 'wood', label: 'Madeira' },
  { code: 'stone', label: 'Argila' },
  { code: 'iron', label: 'Ferro' },
] as const;

type Target = (type: 'player' | 'village', id: number) => void;

function Party({ label, side, onTarget }: { label: string; side: ReportSide; onTarget: Target }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {side.playerId ? (
          <button className="text-button" onClick={() => onTarget('player', side.playerId!)}>
            {side.username}
          </button>
        ) : (
          side.username
        )}
        <small>
          <button className="text-button" onClick={() => onTarget('village', side.villageId)}>
            {side.name} ({side.x}|{side.y})
          </button>
        </small>
      </dd>
    </div>
  );
}

function Tools({
  previous,
  next,
  pending,
  onGo,
  onDelete,
  onUnread,
}: {
  previous: ReportRef | null;
  next: ReportRef | null;
  pending: boolean;
  onGo: (ref: ReportRef) => void;
  onDelete: () => void;
  onUnread: () => void;
}) {
  return (
    <div className="report-detail-tools">
      <button className="button" disabled={!previous} onClick={() => previous && onGo(previous)}>
        <ChevronLeft size={15} aria-hidden="true" /> Mais antigo
      </button>
      <button className="button" disabled={!next} onClick={() => next && onGo(next)}>
        Mais novo <ChevronRight size={15} aria-hidden="true" />
      </button>
      <button className="button" disabled={pending} onClick={onUnread}>
        <EyeOff size={14} aria-hidden="true" /> Marcar como não lido
      </button>
      <button className="button" disabled={pending} onClick={onDelete}>
        <Trash2 size={14} aria-hidden="true" /> Excluir
      </button>
    </div>
  );
}

function Side({
  data,
  label,
  icon,
  counts,
  losses,
}: {
  data: BattleReportView;
  label: string;
  icon: 'attack' | 'defense';
  counts: Record<string, number> | null;
  losses: Record<string, number> | null;
}) {
  const loss = counts && losses ? lossPercent(counts, losses) : null;
  return (
    <section className={`report-side ${icon}`} aria-label={label}>
      <h2>
        {icon === 'attack' ? (
          <Swords size={16} aria-hidden="true" />
        ) : (
          <Shield size={16} aria-hidden="true" />
        )}
        {label}
        {loss ? (
          <small className="report-loss">
            Perdeu {loss.percent}% das tropas ({numbers.format(loss.lost)} de{' '}
            {numbers.format(loss.total)})
          </small>
        ) : null}
      </h2>
      {counts && losses ? (
        <TroopTable unitTypes={data.unitTypes} counts={counts} losses={losses} />
      ) : (
        <p className="muted">Nenhuma informação disponível.</p>
      )}
    </section>
  );
}

export function BattleDetail({
  data,
  snapshot,
  clock,
  pending,
  onGo,
  onDelete,
  onUnread,
  onTarget,
}: {
  data: BattleReportView;
  snapshot: VillageSnapshot;
  clock: number;
  pending: boolean;
  onGo: (ref: ReportRef) => void;
  onDelete: () => void;
  onUnread: () => void;
  onTarget: Target;
}) {
  const buildingName = (code: string) =>
    snapshot.buildings.find((b) => b.code === code)?.name ?? code;
  return (
    <div className="report-detail">
      <Tools
        previous={data.previous}
        next={data.next}
        pending={pending}
        onGo={onGo}
        onDelete={onDelete}
        onUnread={onUnread}
      />
      <div className={`report-banner ${data.outcome}`}>
        <strong>{data.title}</strong>
        <span>
          {roleLabel(data)} · {completionDate(data.occurredAt, clock)}
        </span>
        <Marks report={data} />
      </div>
      <dl className="report-parties">
        <Party label="Atacante" side={data.from} onTarget={onTarget} />
        <Party label="Defensor" side={data.to} onTarget={onTarget} />
        {data.morale !== null ? (
          <div>
            <dt>Moral do atacante</dt>
            <dd>{data.morale}%</dd>
          </div>
        ) : null}
        {data.luck !== null ? (
          <div>
            <dt>Sorte</dt>
            <dd>{data.luck}%</dd>
          </div>
        ) : null}
      </dl>
      {data.role === 'support' ? (
        <Side
          data={data}
          label="Suas tropas de apoio"
          icon="defense"
          counts={data.supportTroops}
          losses={data.supportLosses}
        />
      ) : (
        <>
          <Side
            data={data}
            label="Atacante"
            icon="attack"
            counts={data.attacker}
            losses={data.attackerLosses}
          />
          <Side
            data={data}
            label="Defensor"
            icon="defense"
            counts={data.defender}
            losses={data.defenderLosses}
          />
        </>
      )}
      {data.loot ? (
        <section className="report-side" aria-label="Saque">
          <h2>Saque</h2>
          <ul className="bcard-cost">
            {lootCodes.map(({ code, label }) => (
              <li key={code}>
                <ResourceIcon code={code} label={label} />
                {numbers.format(data.loot![code])}
              </li>
            ))}
            <li className="bcard-time">
              {numbers.format(Object.values(data.loot).reduce((a, b) => a + b, 0))}/
              {numbers.format(data.lootCapacity ?? 0)}
            </li>
          </ul>
        </section>
      ) : null}
      {(data.wall && data.wall.before !== data.wall.after) || data.demolition || data.loyalty ? (
        <ul className="report-effects">
          {data.wall && data.wall.before !== data.wall.after ? (
            <li>
              Muralha: nível {data.wall.before} → {data.wall.after}
            </li>
          ) : null}
          {data.demolition ? (
            <li>
              {buildingName(data.demolition.code)}: nível {data.demolition.before} →{' '}
              {data.demolition.after}
            </li>
          ) : null}
          {data.loyalty ? (
            <li>
              Lealdade: {data.loyalty.before} → {Math.max(0, data.loyalty.after)}
              {data.loyalty.conquered
                ? '. A aldeia foi conquistada; lealdade reiniciada em 25. O saque permanece na aldeia conquistada.'
                : ''}
            </li>
          ) : null}
        </ul>
      ) : null}
      {data.intel?.resources ? (
        <section className="report-side" aria-label="Recursos espionados">
          <h2>Recursos espionados</h2>
          <ul className="bcard-cost">
            {lootCodes.map(({ code, label }) => (
              <li key={code}>
                <ResourceIcon code={code} label={label} />
                {numbers.format(data.intel!.resources![code])}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.intel?.buildings ? (
        <section className="report-side" aria-label="Edifícios espionados">
          <h2>Edifícios espionados</h2>
          <ul className="report-chips">
            {Object.entries(data.intel.buildings).map(([code, level]) => (
              <li key={code}>
                {buildingName(code)} <strong>{level}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.intel?.outsideTroops ? (
        <section className="report-side" aria-label="Tropas fora da aldeia">
          <h2>Tropas fora da aldeia</h2>
          <ul className="report-chips">
            {data.unitTypes.map((u) => (
              <li key={u.code}>
                {u.name} <strong>{numbers.format(data.intel!.outsideTroops![u.code] ?? 0)}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function NoticeDetail({
  data,
  clock,
  pending,
  onGo,
  onDelete,
  onUnread,
  onTarget,
}: {
  data: NoticeReportView;
  clock: number;
  pending: boolean;
  onGo: (ref: ReportRef) => void;
  onDelete: () => void;
  onUnread: () => void;
  onTarget: Target;
}) {
  const sender = data.kind === 'support' ? 'Quem apoia' : 'Remetente';
  const receiver = data.kind === 'support' ? 'Aldeia apoiada' : 'Destinatário';
  return (
    <div className="report-detail">
      <Tools
        previous={data.previous}
        next={data.next}
        pending={pending}
        onGo={onGo}
        onDelete={onDelete}
        onUnread={onUnread}
      />
      <div className="report-banner neutral">
        <strong>{data.title}</strong>
        <span>
          {roleLabel(data)} · {completionDate(data.occurredAt, clock)}
          {data.mode === 'offer' ? ' · oferta do mercado' : ''}
        </span>
      </div>
      {data.from && data.to ? (
        <dl className="report-parties">
          <Party label={sender} side={data.from} onTarget={onTarget} />
          <Party label={receiver} side={data.to} onTarget={onTarget} />
        </dl>
      ) : null}
      {data.medal ? (
        <section className="medal-notice" aria-label="Medalha">
          <MedalBadge code={data.medal.code} stage={data.medal.stage} size={72} />
          <div>
            <h2>
              {data.medal.name}
              {data.medal.tier ? ` · ${data.medal.tier}` : ''}
            </h2>
            <p>{data.medal.current ?? data.medal.description}</p>
            <p className="muted">
              {data.medal.next ? `Próximo nível: ${data.medal.next}.` : 'Nível máximo atingido.'}
            </p>
          </div>
        </section>
      ) : null}
      {data.resources ? (
        <section className="report-side" aria-label="Recursos">
          <h2>Recursos</h2>
          <ul className="bcard-cost">
            {lootCodes.map(({ code, label }) => (
              <li key={code}>
                <ResourceIcon code={code} label={label} />
                {numbers.format(data.resources![code])}
              </li>
            ))}
            <li className="bcard-time">
              {numbers.format(Object.values(data.resources).reduce((a, b) => a + b, 0))} no total
            </li>
          </ul>
        </section>
      ) : null}
      {data.troops ? (
        <section className="report-side defense" aria-label="Tropas de apoio">
          <h2>
            <Shield size={16} aria-hidden="true" /> Tropas de apoio
          </h2>
          <TroopTable unitTypes={data.unitTypes} counts={data.troops} />
        </section>
      ) : null}
    </div>
  );
}
