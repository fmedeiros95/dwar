# Plano: internacionalização (i18n)

O DWar foi escrito só em português: não há biblioteca de i18n e o texto está fixo em todas as
camadas, do JSX ao banco. Este plano leva o jogo a **quatro idiomas** — português (pt-BR, idioma
de origem), inglês (en), espanhol (es) e alemão (de) — com o **idioma escolhido por conta**.
Nenhuma mudança de código foi feita ainda.

## Decisões

| Tema | Decisão |
| --- | --- |
| Idiomas | `pt-BR` (origem), `en`, `es`, `de` |
| Escopo da escolha | Por conta (`accounts.locale`). Antes do login, idioma do navegador. |
| Biblioteca | `i18next` + `react-i18next`, recursos JSON tipados |
| Quem traduz | **O front.** O servidor envia códigos e parâmetros, nunca frases. |
| Fallback | `es`, `de` → `en` → `pt-BR`; `en` → `pt-BR` |
| Ordem | Base → piloto no Mercado → resto, tela por tela |
| Conteúdo de jogador | Não se traduz (cartas, notas, nomes de aldeia, texto do perfil) |
| Fuso horário | Continua o do mundo (`America/Sao_Paulo`). Muda só o formato da data. |

**Por que o front traduz:** o servidor fica sem estado de idioma, o cache por usuário não muda e
um mesmo relatório aparece em idiomas diferentes para atacante e defensor sem duplicar dados. Os
relatórios e avisos já são guardados como payload estruturado (`battle_reports`, `notice_reports`),
então o modelo já está quase pronto.

## Onde o texto está hoje

Contagem aproximada de frases distintas, para dimensionar o trabalho.

| Camada | Frases | Forma atual |
| --- | --- | --- |
| `apps/web/src` | ~375 | Texto direto no JSX, `title`/`alt`/`placeholder`, constantes |
| `packages/game-server/src` | ~150 | 116 `throw new GameError('frase', status)`, títulos e rótulos |
| `packages/game-config/src` | ~75 | `name`/`description` de edifícios, tecnologias, unidades, medalhas |
| `packages/game-core/src` | ~45 | `message-format.ts`, patentes de `military-rank.ts` (hoje em inglês) |
| `apps/api/src` | ~25 | `security.middleware.ts`, `auth`, mensagem genérica do `exception.filter.ts` |
| `packages/api-client/src` | 4 | Mensagens de falha de conexão em `ApiError` |
| Banco | — | `activity.message` grava a frase pronta |

Formatação fixa: `'pt-BR'` em `shared/format.ts`, `note-box.tsx`, `village-page.tsx`,
`ranking-screen.tsx`, `map-legend.tsx`, `medals.ts`, `player-notes.ts`, `combat.ts:78`;
`'en-GB'` em `shared/night.ts`; `lang="pt-BR"` fixo em `apps/web/index.html`.

Pontos de atenção no servidor:

- `building-details.ts` monta rótulos ("Produção no nível 5") — vira `{ kind, level, value }`.
- `reports.ts` monta títulos (`noticeTitle`, "X ataca Y") — passa para o front, o payload já basta.
- `medals.ts` usa modelos com `{n}` e `toLocaleString('pt-BR')`.
- `combat.ts:78` formata a data da proteção de iniciante dentro da mensagem de erro.
- Erros do Zod saem com a mensagem padrão em inglês (`path: message`).

## Arquitetura

### Arquivos de tradução

```
apps/web/src/i18n/
  index.ts              # init do i18next, detecção, carregamento sob demanda
  locale.ts             # type Locale = 'pt-BR' | 'en' | 'es' | 'de', normalização
  format.ts             # números, datas, durações com o idioma atual (substitui shared/format.ts)
  types.d.ts            # CustomTypeOptions: chaves tipadas a partir de pt-BR
  locales/
    pt-BR/ common.json game.json errors.json activity.json reports.json
           market.json rally.json map.json mail.json ranking.json ...
    en/ es/ de/         # mesmos arquivos
```

- Um namespace por área (`market`, `rally`...) mais `common` (botões, recursos, tempo),
  `game` (edifícios, unidades, tecnologias, medalhas, patentes) e `errors`.
- `pt-BR` é carregado junto com o app; os outros idiomas por `import()` dinâmico do Vite,
  para que quem joga em português não baixe os outros três.
- Plurais no formato nativo do i18next (`_one`/`_other`, via `Intl.PluralRules`), interpolação
  `{{nome}}`. Sem ICU por enquanto: as quatro línguas têm só `one`/`other`.
- O tipo `Locale` e a lista de idiomas suportados ficam em `@dwar/api-client`, porque a API
  valida `accounts.locale` com a mesma lista.

### Escolha do idioma

1. Sem sessão: `localStorage['dwar.locale']`, senão `navigator.languages` reduzido ao idioma mais
   próximo (`pt-*` → `pt-BR`, `es-*` → `es`, `de-*` → `de`, resto → `en`).
2. Com sessão: `accounts.locale` prevalece e é copiado para o `localStorage`.
3. Troca: seletor em **Configurações** e no rodapé do `pregame-shell` (login/cadastro). Com sessão,
   grava via API; sem sessão, só no `localStorage`.
4. Ao trocar: `i18next.changeLanguage`, `document.documentElement.lang`, sem recarregar a página.

### Banco

Migração `0025_account_locale.sql`:

```sql
ALTER TABLE accounts ADD COLUMN locale text NOT NULL DEFAULT 'pt-BR';
ALTER TABLE accounts ADD CONSTRAINT accounts_locale_check
  CHECK (locale IN ('pt-BR','en','es','de'));
```

No cadastro, a conta nasce com o idioma em uso na tela. `profile` ganha o campo no `GET` e um
`PATCH` validado pelo Zod com a lista de `Locale`.

### Erros com código

`GameError` passa a carregar um código estável e parâmetros:

```ts
export class GameError extends Error {
  constructor(
    public readonly code: string,            // 'rally.ownVillage'
    public readonly status = 400,
    public readonly params: Record<string, string | number> = {},
    fallback?: string,                       // frase pt-BR, só durante a transição
  ) {
    super(fallback ?? code);
  }
}
```

- `exception.filter.ts` responde `{ code, params, message }`. Erro sem código vira
  `code: 'generic'`; Zod vira `code: 'validation'` com `issues: [{ path, code }]`.
- `security.middleware.ts` e `auth` usam o mesmo formato (`'security.origin'`, `'rateLimit'`).
- `ApiError` em `api-client` ganha `code` e `params`; falha de rede vira `code: 'network'`.
- No front, um único ponto traduz: `t(\`errors:${code}\`, { ...params, defaultValue: message })`.
  O `defaultValue` garante que um código ainda sem tradução mostre a frase antiga.
- Datas em parâmetros vão como ISO (`until: '2026-11-21T15:00:00Z'`) e o front formata.
- Convenção de código: `<módulo>.<caso>` em camelCase, um por frase distinta
  (`market.insufficientResources`, `world.notFound`).

### Dados do jogo

- `name`/`description` saem de `game-config` (que vira regra pura) e passam para
  `game.json`: `buildings.main.name`, `units.spear.name`, `technologies.spear.name`,
  `medals.<code>.name`/`description`/`goal`, `ranks.<índice>`.
- A API deixa de enviar `name` em `buildings[]`, `unitTypes[]` etc.; o front usa
  `t(\`game:buildings.${code}.name\`)`. Durante a transição os dois convivem.
- Utilitário `useGameNames()` no front para não repetir as chaves em cada tela.

### Tabela `activity`

Hoje grava frases como `'A aldeia foi conquistada.'` (`combat.ts`, `market.ts`, `rally.ts`).

Migração `0026_activity_keys.sql`:

```sql
ALTER TABLE activity ADD COLUMN message_key text;
ALTER TABLE activity ADD COLUMN params jsonb NOT NULL DEFAULT '{}';
ALTER TABLE activity ALTER COLUMN message DROP NOT NULL;
-- frases fixas conhecidas → chave
UPDATE activity SET message_key = 'combat.conquered' WHERE message = 'A aldeia foi conquistada.';
UPDATE activity SET message_key = 'market.shipmentArrived'
  WHERE message = 'Uma remessa de recursos chegou à aldeia.';
-- frases com valor ('O ataque a X foi concluído.') → regexp_match para extrair o parâmetro
```

O código passa a gravar só `message_key` + `params`. Linhas que nenhuma regra converter mantêm
`message` e aparecem como estão (legado em pt-BR). A API devolve `{ key, params, message }`.

### Formatação

`i18n/format.ts` substitui `shared/format.ts` usando o idioma atual em `Intl.NumberFormat`,
`Intl.DateTimeFormat` e `Intl.RelativeTimeFormat` (com cache por idioma). O fuso continua o do
mundo (`America/Sao_Paulo`, hoje fixo em `night.ts` e `map-legend.tsx`): o bônus noturno e os
horários de chegada são regra do mundo e todos os jogadores precisam ver o mesmo relógio.
Exibir o horário com o rótulo "hora do servidor" evita confusão para quem joga de outro fuso.

## Fases

Cada fase é um PR independente; o jogo continua funcionando em pt-BR ao fim de cada uma.

### Fase 1 — Base

- Dependências: `i18next`, `react-i18next` em `@dwar/web`.
- `apps/web/src/i18n/` com init, detecção, tipos, `format.ts`, namespace `common`.
- `<html lang>` dinâmico; seletor de idioma em Configurações e no `pregame-shell`.
- Migração `0025_account_locale.sql`, campo no perfil e no cadastro, tipo `Locale` no `api-client`.
- `GameError` com código, `exception.filter.ts` e `ApiError` no formato novo, com fallback.
- Fonte: nada a fazer para estes quatro idiomas. Os caracteres de es/de (`ä ö ü ß ñ ¿ ¡`) estão
  no subset `latin` (U+0000–00FF), que todas as fontes têm; a IM Fell English só tem `latin`,
  então um idioma futuro fora do latino básico (polonês, turco, russo) exigiria trocar essa fonte.

Pronto quando: trocar o idioma muda `lang`, persiste na conta e números/datas mudam de formato.

### Fase 2 — Piloto: Mercado

Escolhido porque passa por todas as camadas num escopo pequeno: ~48 frases no web
(`features/village/market`), ~23 no servidor (`game-server/src/market.ts`), linhas de
`activity` ("Uma remessa de recursos chegou à aldeia."), títulos de aviso de mercado
(`noticeTitle`), nomes de recursos e formatação de números.

- Extrair as frases do Mercado para `market.json` nos quatro idiomas.
- Converter os `GameError` de `market.ts` para códigos.
- Gravar `activity` de mercado com chave (inclui a migração `0026`).
- Montar no front os títulos dos avisos de mercado.
- Revisar o layout em alemão (textos 30–40% mais longos) nas tabelas compactas e janelas.

Pronto quando: o fluxo completo de oferta, envio e chegada funciona nos quatro idiomas sem
texto em português vazando e sem quebra de layout. **Revisar o padrão antes de seguir.**

### Fase 3 — Dados do jogo

- `game.json` com edifícios, unidades, tecnologias, medalhas e patentes.
- Remover `name`/`description` de `game-config` e das respostas da API.
- `building-details.ts` devolve `{ kind, level, value }` em vez de rótulos.
- Modelos de medalha (`goal: 'Chegue a {n} pontos'`) com `{{n, number}}` no lugar de `{n}` +
  `toLocaleString('pt-BR')`.
- Patentes de `military-rank.ts`: hoje em inglês para todos; passam a ser traduzidas.

### Fase 4 — Restante da interface

Um PR por grupo, em ordem de uso. Contagem aproximada de frases:

| Grupo | Frases |
| --- | --- |
| `components/` (shell, janelas, toast, editor BBCode) + `app.tsx`, `world-route.tsx`, `features/worlds` | ~45 |
| `overview`, `village-page.tsx`, `building`, `building-screen.tsx`, `use-village-actions.ts` | ~80 |
| `rally` | ~37 |
| `map` | ~71 |
| `reports` (inclui títulos de batalha e avisos montados no front) | ~43 |
| `mail`, `notes` | ~35 |
| `ranking`, `public-info`, `medals` | ~60 |
| `academy`, `recruitment`, `research`, `settings`, `shared` | ~53 |

### Fase 5 — Servidor

- Converter os `GameError` restantes por módulo (`rally.ts` 21, `village-engine.ts` 14,
  `academy.ts` 14, `recruitment.ts` 13, `mail.ts` 11, `research.ts` 8, `combat.ts` 8, ...).
- `activity` de `combat.ts` e `rally.ts` com chave; regras de conversão das linhas antigas.
- Mensagens de `apps/api` (segurança, autenticação) e do Zod.
- Remover o `fallback` em pt-BR do `GameError` quando todos os códigos estiverem traduzidos.

### Fase 6 — Trava

- `eslint-plugin-i18next` com `no-literal-string` em `apps/web/src` (modo `jsx-text-only` no
  início, ampliando depois), para impedir texto novo fixo.
- Script `pnpm i18n:check`: compara as chaves de `pt-BR` com `en`/`es`/`de` e aponta chaves
  faltando, sobrando ou com interpolações diferentes.
- Nota no README sobre como adicionar texto (chave em `pt-BR` + os outros três idiomas).

## Tradução

`pt-BR` é a fonte. Os três outros idiomas podem ser rascunhados por IA a partir do glossário e
revisados por falantes nativos antes de abrir para jogadores. O glossário vem primeiro, para que
os termos do jogo sejam iguais em todas as telas.

| pt-BR | en | es | de |
| --- | --- | --- | --- |
| Aldeia | Village | Aldea | Dorf |
| Madeira / Argila / Ferro | Wood / Clay / Iron | Madera / Barro / Hierro | Holz / Lehm / Eisen |
| Edifício principal | Headquarters | Edificio principal | Hauptgebäude |
| Quartel / Estábulo / Oficina | Barracks / Stable / Workshop | Cuartel / Establo / Taller | Kaserne / Stall / Werkstatt |
| Praça de reunião | Rally point | Plaza de reuniones | Versammlungsplatz |
| Fazenda / Armazém / Esconderijo / Muralha | Farm / Warehouse / Hiding place / Wall | Granja / Almacén / Escondite / Muralla | Bauernhof / Speicher / Versteck / Wall |
| Lanceiro / Espadachim / Arqueiro | Spearman / Swordsman / Archer | Lancero / Espadachín / Arquero | Speerträger / Schwertkämpfer / Bogenschütze |
| Cavalaria leve / pesada | Light / Heavy cavalry | Caballería ligera / pesada | Leichte / Schwere Kavallerie |
| Aríete / Catapulta | Ram / Catapult | Ariete / Catapulta | Rammbock / Katapult |
| Nobre | Nobleman | Noble | Adelsgeschlecht |
| Bárbaro (aldeia abandonada) | Barbarian | Bárbaro | Barbar |
| Relatório / Aviso | Report / Notice | Informe / Aviso | Bericht / Mitteilung |

Tratamento: `en` neutro, `es` com "tú", `de` com "du" (comum em jogos de navegador).

## Riscos

- **Layout:** alemão é o idioma mais longo; tabelas compactas, botões e títulos de janela
  precisam de `text-overflow`/quebra controlada. Testar cada fase em `de`.
- **Frases montadas por concatenação** (`\`${place(a)} ataca ${place(b)}\``): a ordem das palavras
  muda entre idiomas; sempre usar uma chave com interpolação, nunca juntar pedaços traduzidos.
- **Gênero e plural:** o perfil já guarda `gender`; se algum texto depender disso, usar
  `context` do i18next (`_m`/`_f`) em vez de lógica no código.
- **Transição:** enquanto o `fallback` existir, frases em português podem aparecer em outros
  idiomas; o `pnpm i18n:check` e o lint das fases finais fecham isso.
- **Sem testes automatizados:** a validação é manual; cada PR deve listar as telas revisadas
  nos quatro idiomas.
