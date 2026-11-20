export type MessageToken =
  | { tag: 'text'; text: string }
  | {
      tag: 'b' | 'i' | 'u' | 's' | 'url' | 'img' | 'village' | 'player' | 'ally';
      value: string;
      argument?: string;
      children: MessageToken[];
    };
export function messageTokens(text: string, depth = 0): MessageToken[] {
  if (depth >= 10) return [{ tag: 'text', text }];
  const pattern = /\[(b|i|u|s|url|img|village|player|ally)(?:=([^\]\r\n]+))?\]([\s\S]*?)\[\/\1\]/gi;
  const result: MessageToken[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) result.push({ tag: 'text', text: text.slice(cursor, match.index) });
    result.push({
      tag: match[1]!.toLowerCase() as Exclude<MessageToken['tag'], 'text'>,
      value: match[3]!,
      argument: match[2],
      children: messageTokens(match[3]!, depth + 1),
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) result.push({ tag: 'text', text: text.slice(cursor) });
  return result;
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
