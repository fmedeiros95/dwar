import { and, eq, sql } from 'drizzle-orm';
import { accounts, players, tribes, villages, type Transaction } from '@dwar/database';
import {
  messageColor,
  messageHttpUrl,
  messageListItems,
  messageSize,
  messageTokens,
  type MessageToken,
} from '@dwar/game-core';
import type { MessageNode } from '@dwar/api-client';

async function nodes(
  tx: Transaction,
  worldId: number,
  tokens: MessageToken[],
): Promise<MessageNode[]> {
  const result: MessageNode[] = [];
  for (const token of tokens) {
    if (token.tag === 'text') {
      result.push({ type: 'text', text: token.text });
      continue;
    }
    if (token.tag === 'b' || token.tag === 'i' || token.tag === 'u' || token.tag === 's') {
      result.push({ type: token.tag, children: await nodes(tx, worldId, token.children) });
      continue;
    }
    if (token.tag === 'center' || token.tag === 'quote') {
      result.push({ type: token.tag, children: await nodes(tx, worldId, token.children) });
      continue;
    }
    if (token.tag === 'spoiler') {
      result.push({
        type: 'spoiler',
        title: token.argument?.trim().slice(0, 60) || 'Spoiler',
        children: await nodes(tx, worldId, token.children),
      });
      continue;
    }
    if (token.tag === 'color' || token.tag === 'size') {
      const color = token.tag === 'color' ? messageColor(token.argument) : null;
      const size = token.tag === 'size' ? messageSize(token.argument) : null;
      const children = await nodes(tx, worldId, token.children);
      // Valor inválido: mostra o texto sem o efeito, em vez de perder o conteúdo.
      if (color) result.push({ type: 'color', color, children });
      else if (size) result.push({ type: 'size', size, children });
      else result.push(...children);
      continue;
    }
    if (token.tag === 'list') {
      const items: MessageNode[][] = [];
      for (const item of messageListItems(token.children))
        items.push(await nodes(tx, worldId, item));
      result.push({ type: 'list', items });
      continue;
    }
    if (token.tag === 'url') {
      const href = messageHttpUrl(token.argument ?? token.value);
      result.push(
        ...(href
          ? [{ type: 'link' as const, href, children: await nodes(tx, worldId, token.children) }]
          : [{ type: 'text' as const, text: token.value }]),
      );
      continue;
    }
    if (token.tag === 'img') {
      const src = messageHttpUrl(token.value);
      result.push(src ? { type: 'image', src } : { type: 'text', text: token.value });
      continue;
    }
    if (token.tag === 'player') {
      const [row] = await tx
        .select({ id: players.id, username: accounts.username })
        .from(players)
        .innerJoin(accounts, eq(accounts.id, players.accountId))
        .where(
          and(
            eq(players.worldId, worldId),
            sql`lower(${accounts.username})=lower(${token.value.trim()})`,
          ),
        );
      result.push(
        row
          ? { type: 'player', id: row.id, label: row.username }
          : { type: 'text', text: token.value },
      );
      continue;
    }
    if (token.tag === 'ally') {
      const [row] = await tx
        .select({ id: tribes.id, tag: tribes.tag })
        .from(tribes)
        .where(
          and(
            eq(tribes.worldId, worldId),
            sql`lower(${tribes.tag}) = lower(${token.value.trim()})`,
          ),
        );
      result.push(
        row ? { type: 'tribe', id: row.id, label: row.tag } : { type: 'text', text: token.value },
      );
      continue;
    }
    if (token.tag === 'village') {
      const coordinates = /^\s*\(?\s*(\d{1,3})\s*\|\s*(\d{1,3})\s*\)?\s*$/.exec(token.value);
      if (coordinates) {
        const [row] = await tx
          .select({ id: villages.id, name: villages.name, x: villages.x, y: villages.y })
          .from(villages)
          .where(
            and(
              eq(villages.worldId, worldId),
              eq(villages.x, Number(coordinates[1])),
              eq(villages.y, Number(coordinates[2])),
            ),
          );
        if (row) {
          result.push({
            type: 'village',
            id: row.id,
            label: `${row.name} (${row.x}|${row.y}) K${Math.floor(row.y / 100)}${Math.floor(row.x / 100)}`,
          });
          continue;
        }
      }
    }
    result.push({ type: 'text', text: token.value });
  }
  return result;
}

/** Converte o BBCode em nós já resolvidos (jogadores e aldeias existentes viram links). */
export function renderBBCode(tx: Transaction, worldId: number, text: string) {
  return nodes(tx, worldId, messageTokens(text));
}
