import { Fragment } from 'react';
import type { MessageNode } from '@dwar/api-client';

type Target = (type: 'player' | 'village', id: number) => void;

/** Mostra o BBCode já resolvido pelo servidor (mensagens, notas e descrições). */
export function MailContent({ nodes, onTarget }: { nodes: MessageNode[]; onTarget: Target }) {
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
    if (node.type === 'list')
      return (
        <ul key={index} className="bb-list">
          {node.items.map((item, position) => (
            <li key={position}>
              <MailContent nodes={item} onTarget={onTarget} />
            </li>
          ))}
        </ul>
      );
    const children = <MailContent nodes={node.children} onTarget={onTarget} />;
    switch (node.type) {
      case 'link':
        return (
          <a
            key={index}
            className="mail-external-link"
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        );
      case 'color':
        return (
          <span key={index} style={{ color: node.color }}>
            {children}
          </span>
        );
      case 'size':
        return (
          <span key={index} style={{ fontSize: node.size }}>
            {children}
          </span>
        );
      case 'center':
        return (
          <div key={index} className="bb-center">
            {children}
          </div>
        );
      case 'quote':
        return (
          <blockquote key={index} className="bb-quote">
            {children}
          </blockquote>
        );
      case 'spoiler':
        return (
          <details key={index} className="bb-spoiler">
            <summary>{node.title}</summary>
            <div>{children}</div>
          </details>
        );
      case 'b':
        return <b key={index}>{children}</b>;
      case 'i':
        return <i key={index}>{children}</i>;
      case 'u':
        return <u key={index}>{children}</u>;
      default:
        return <s key={index}>{children}</s>;
    }
  });
}
