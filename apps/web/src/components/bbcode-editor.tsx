import { useRef, type ReactNode } from 'react';

type Action = {
  label: string;
  title: string;
  open: string;
  close: string;
  /** Texto usado quando nada está selecionado. */
  sample?: string;
};

const actions: Action[] = [
  { label: 'N', title: 'Negrito', open: '[b]', close: '[/b]' },
  { label: 'I', title: 'Itálico', open: '[i]', close: '[/i]' },
  { label: 'S', title: 'Sublinhado', open: '[u]', close: '[/u]' },
  { label: 'T', title: 'Tachado', open: '[s]', close: '[/s]' },
  { label: 'Centro', title: 'Centralizar', open: '[center]', close: '[/center]' },
  { label: 'Citar', title: 'Citação', open: '[quote]', close: '[/quote]' },
  {
    label: 'Spoiler',
    title: 'Texto escondido',
    open: '[spoiler=Título]',
    close: '[/spoiler]',
  },
  { label: 'Lista', title: 'Lista', open: '[list]\n[*]', close: '\n[/list]', sample: 'item' },
  { label: 'Link', title: 'Link', open: '[url=https://]', close: '[/url]', sample: 'texto' },
  { label: 'Imagem', title: 'Imagem', open: '[img]', close: '[/img]', sample: 'https://' },
  {
    label: 'Aldeia',
    title: 'Link para aldeia',
    open: '[village]',
    close: '[/village]',
    sample: '500|500',
  },
  {
    label: 'Jogador',
    title: 'Link para jogador',
    open: '[player]',
    close: '[/player]',
    sample: 'nome',
  },
];

const colors = [
  ['Vermelho', '#c0392b'],
  ['Laranja', '#d9822b'],
  ['Dourado', '#b8860b'],
  ['Verde', '#2e7d32'],
  ['Azul', '#1f6fb2'],
  ['Roxo', '#7b3fa0'],
] as const;
const sizes = [10, 12, 14, 18, 22] as const;

/** Campo de texto com barra de formatação BBCode, usado em mensagens, notas e descrições. */
export function BBEditor({
  value,
  onChange,
  label,
  rows = 12,
  maxLength = 16000,
  minLength,
  required,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  rows?: number;
  maxLength?: number;
  minLength?: number;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}): ReactNode {
  const field = useRef<HTMLTextAreaElement>(null);

  function wrap(open: string, close: string, sample = 'texto') {
    const element = field.current;
    if (!element) return;
    const { selectionStart: start, selectionEnd: end } = element;
    const selected = value.slice(start, end) || sample;
    const next = value.slice(0, start) + open + selected + close + value.slice(end);
    if ([...next].length > maxLength) return;
    onChange(next);
    // Depois do React atualizar o valor, mantém o texto marcado para continuar editando.
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + open.length, start + open.length + selected.length);
    });
  }

  return (
    <div className="bb-editor">
      <div className="bb-toolbar" role="toolbar" aria-label="Formatação do texto">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            className={`bb-tool bb-tool-${action.title === 'Negrito' ? 'bold' : action.title === 'Itálico' ? 'italic' : action.title === 'Sublinhado' ? 'underline' : action.title === 'Tachado' ? 'strike' : 'text'}`}
            title={action.title}
            aria-label={action.title}
            disabled={disabled}
            onClick={() => wrap(action.open, action.close, action.sample)}
          >
            {action.label}
          </button>
        ))}
        <span className="bb-swatches" role="group" aria-label="Cor do texto">
          {colors.map(([name, color]) => (
            <button
              key={color}
              type="button"
              className="bb-swatch"
              style={{ background: color }}
              title={`Cor ${name.toLowerCase()}`}
              aria-label={`Cor ${name.toLowerCase()}`}
              disabled={disabled}
              onClick={() => wrap(`[color=${color}]`, '[/color]')}
            />
          ))}
        </span>
        <select
          className="bb-size"
          aria-label="Tamanho do texto"
          value=""
          disabled={disabled}
          onChange={(event) => {
            if (event.target.value) wrap(`[size=${event.target.value}]`, '[/size]');
          }}
        >
          <option value="">Tamanho</option>
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size} px
            </option>
          ))}
        </select>
      </div>
      <textarea
        id={id}
        ref={field}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        minLength={minLength}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}
