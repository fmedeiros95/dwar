import { Fragment } from 'react';
import type { MessageNode } from '@dwar/api-client';

export function MailContent({
  nodes,
  onTarget,
}: {
  nodes: MessageNode[];
  onTarget: (type: 'player' | 'village', id: number) => void;
}) {
  return nodes.map((node, index) => {
    if (node.type === 'text') return <Fragment key={index}>{node.text}</Fragment>;
    if (node.type === 'image')
      return (
        <img
          key={index}
          src={node.src}
          alt="Imagem da mensagem"
          className="mail-inline-image"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      );
    if ('label' in node)
      return (
        <button key={index} className="text-button" onClick={() => onTarget(node.type, node.id)}>
          {node.label}
        </button>
      );
    if (node.type === 'link')
      return (
        <a
          key={index}
          className="mail-external-link"
          href={node.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MailContent nodes={node.children} onTarget={onTarget} />
        </a>
      );
    const children = <MailContent nodes={node.children} onTarget={onTarget} />;
    return node.type === 'b' ? (
      <b key={index}>{children}</b>
    ) : node.type === 'i' ? (
      <i key={index}>{children}</i>
    ) : node.type === 'u' ? (
      <u key={index}>{children}</u>
    ) : (
      <s key={index}>{children}</s>
    );
  });
}
