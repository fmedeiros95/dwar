export const messageTags = [
  'b',
  'i',
  'u',
  's',
  'url',
  'img',
  'village',
  'player',
  'ally',
  'color',
  'size',
  'center',
  'quote',
  'spoiler',
  'list',
] as const;
export type MessageTag = (typeof messageTags)[number];

export type MessageToken =
  | { tag: 'text'; text: string }
  | { tag: MessageTag; value: string; argument?: string; children: MessageToken[] };

const maxDepth = 10;
const marker = new RegExp(`\\[(\\/)?(${messageTags.join('|')}|\\*)(?:=([^\\]\\r\\n]+))?\\]`, 'gi');

type Open = {
  tag: MessageTag;
  argument?: string;
  /** Posição logo depois do "]" de abertura, para recuperar o texto bruto. */
  start: number;
  /** Posição do "[" de abertura, para devolver o texto literal se a tag nunca fechar. */
  from: number;
  children: MessageToken[];
};

function pushText(into: MessageToken[], text: string) {
  if (!text) return;
  const last = into[into.length - 1];
  if (last?.tag === 'text') last.text += text;
  else into.push({ tag: 'text', text });
}

/**
 * Lê o BBCode de uma mensagem. Aceita tags aninhadas (inclusive a mesma tag dentro dela mesma,
 * como uma citação dentro de outra). Tags sem par de fechamento viram texto literal, e o
 * aninhamento é limitado para que um texto malicioso não gere uma árvore gigante.
 */
export function messageTokens(text: string): MessageToken[] {
  const root: MessageToken[] = [];
  const stack: Open[] = [];
  const target = () => (stack.length ? stack[stack.length - 1]!.children : root);
  let cursor = 0;
  for (const match of text.matchAll(marker)) {
    const index = match.index;
    const closing = match[1] === '/';
    const name = match[2]!.toLowerCase();
    if (name === '*') {
      // "[*]" só vale dentro de uma lista; fora dela é texto comum.
      if (closing || stack[stack.length - 1]?.tag !== 'list') continue;
      pushText(target(), text.slice(cursor, index));
      cursor = index + match[0].length;
      pushText(target(), '\u0000item');
      continue;
    }
    pushText(target(), text.slice(cursor, index));
    cursor = index + match[0].length;
    if (!closing) {
      if (stack.length >= maxDepth) {
        pushText(target(), match[0]);
        continue;
      }
      stack.push({
        tag: name as MessageTag,
        argument: match[3],
        start: cursor,
        from: index,
        children: [],
      });
      continue;
    }
    let position = stack.length - 1;
    while (position >= 0 && stack[position]!.tag !== name) position -= 1;
    if (position < 0) {
      pushText(target(), match[0]);
      continue;
    }
    // Tags abertas depois da que está sendo fechada nunca foram fechadas: voltam a ser texto.
    while (stack.length - 1 > position) unwind(stack.pop()!, target);
    const open = stack.pop()!;
    const node: MessageToken = {
      tag: open.tag,
      value: text.slice(open.start, index),
      argument: open.argument,
      children: open.children,
    };
    target().push(node);
  }
  pushText(target(), text.slice(cursor));
  while (stack.length) unwind(stack.pop()!, target);
  return root;
}

function unwind(open: Open, target: () => MessageToken[]) {
  const into = target();
  pushText(into, `[${open.tag}${open.argument ? `=${open.argument}` : ''}]`);
  for (const child of open.children) {
    if (child.tag === 'text') pushText(into, child.text);
    else into.push(child);
  }
}

/** Separa os filhos de uma lista em itens, usando o marcador deixado por "[*]". */
export function messageListItems(children: MessageToken[]): MessageToken[][] {
  const items: MessageToken[][] = [[]];
  for (const child of children) {
    if (child.tag !== 'text') {
      items[items.length - 1]!.push(child);
      continue;
    }
    const parts = child.text.split('\u0000item');
    parts.forEach((part, index) => {
      if (index > 0) items.push([]);
      if (part) items[items.length - 1]!.push({ tag: 'text', text: part });
    });
  }
  // O que vem antes do primeiro "[*]" não é item.
  const result = items.slice(1).filter((item) => item.length > 0);
  return result.length ? result : items.filter((item) => item.length > 0);
}

export function messageHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (/^[a-z][\w+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/\//, '')}`,
    );
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

const namedColors = new Set([
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'brown',
  'gray',
  'grey',
  'black',
  'white',
  'gold',
  'teal',
  'pink',
]);

/** Cor aceita em [color=…]: nome conhecido ou #rgb / #rrggbb. Qualquer outra coisa é ignorada. */
export function messageColor(value: string | undefined): string | null {
  const color = value?.trim().toLowerCase();
  if (!color) return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(color)) return color;
  return namedColors.has(color) ? color : null;
}

/** Tamanho aceito em [size=…]: de 8 a 24 px. */
export function messageSize(value: string | undefined): number | null {
  if (!value || !/^\d{1,2}$/.test(value.trim())) return null;
  const size = Number(value);
  return size >= 8 && size <= 24 ? size : null;
}
