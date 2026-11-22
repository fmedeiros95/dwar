# Roadmap de UI/UX

Direção: **medieval-moderno**. Painéis escuros e translúcidos, moldura dupla com cantoneiras
douradas, tipografia Cinzel (títulos) e Inter (interface), a arte da aldeia e do mapa preservada.

O tema vive em `apps/web/src/theme.css`, carregado depois de `styles.css`. Ele sobrescreve as
texturas legadas, então telas ainda não redesenhadas herdam cores e superfícies novas.

## Feito

- Tema, tokens (cores, raios, sombras) e fontes locais.
- Estrutura do jogo (`GameShell`): barra superior, trilho lateral (barra inferior no celular),
  cenário da aldeia centralizado sobre a própria arte desfocada.
- Aldeia: HUD com obras em andamento e detalhe do edifício ao passar o mouse.
- Construções: cartões com custo (destaca o recurso que falta) e fila de obras com progresso.
- Entrada: login e cadastro em abas. Mundos e fundação da aldeia redesenhados (`PregameShell`).
- Assets do Tribul importados e otimizados (`scripts/import-tribul-assets.py`): cenários de verão,
  inverno e Halloween, 18 edifícios com fases de obra, ícones de recursos e retratos de tropas.
- Aldeia em tela cheia, arrastável e com zoom; seletor de estação.
- Mapa em tela cheia com painéis flutuantes (arrasto 1:1).
- Ultrawide: cenário centralizado com laterais desfocadas; mapa pede ao servidor o raio visível
  (`span`).
- Feedback de ações: notificações (`ToastProvider`), aviso de obra concluída, botão com carregamento.
- Recrutamento: cartões de unidade com custo total e fila de treinamento com progresso.
- Aldeia viva (`overview/scene-life.tsx`, `scene-life.css`): aldeões nas estradas, fumaça nas
  chaminés (brasas na forja), sombras de nuvem, pássaros, brilho na água, amanhecer/entardecer,
  tochas e vaga-lumes à noite, neve no inverno, névoa e morcegos no Halloween, poeira e martelo
  nas obras, barra de progresso no selo e comemoração ao subir de nível. Só transform/opacity
  numa camada própria; botão para desligar e `prefers-reduced-motion` respeitado.
- Sem madeira: barras e painéis escuros lisos com filete dourado, janelas em marfim liso (a
  textura em ladrilhos mostrava emendas), sem cantoneiras sobre o conteúdo.
- HUD: painel da aldeia (produção com barra do armazém, tropas em grade com retrato) e obras
  (miniatura, vagas da fila, hora de término, barra com brilho).
- Interface com movimento (`ui.css`): janelas abrem com animação, badges pulam, alerta pulsante
  de ataque no trilho, recursos avisam armazém quase cheio/cheio, estados vazios explicativos
  (`EmptyState`), listas de relatórios e mensagens limpas com não lidos destacados.
- Controles únicos (`controls.css`, carregado por último): botão primário (sem classe, `.green`,
  `.bcard-action`), secundário (`.button`), perigo (`.button.danger`) e texto (`.text-button`);
  campos, select com seta própria, caixas de marcar e opções desenhadas, abas segmentadas
  (`.report-tabs`, `.mail-tabs`, `.rank-subtabs`, `.auth-tabs`) e barra de formatação. Mesma
  altura (36px) e raio; só as cores mudam entre o contexto escuro e o papel das janelas. As
  regras antigas por tela foram reduzidas a layout (larguras).
- Mercado reformulado em duas seções: **Enviar** (carga por recurso com "Máx" limitado à
  capacidade dos mercadores livres, barra de capacidade, destino X|Y, remessas em trânsito com
  progresso) e **Trocas** (nova oferta abre no lugar, suas ofertas e as dos outros em cartões
  "recebe → paga" com proporção). "Situação dos mercadores" virou o indicador do cabeçalho; os
  endereços antigos (`create_offer`, `other_offer`, `own_offer`, `status`) continuam abrindo.
- Praça de reunião em página única: tropas da aldeia em cartões, ordem Atacar/Apoiar com
  ícones, comandos em andamento com progresso e uma seção de apoios só quando existe algo.
  Peças compartilhadas: `SegmentedTabs`, `PanelHead`/`PanelCard`, `TransitRow` (`trade.css`).
- Arte dos edifícios na interface (`buildingArt`): cabeçalhos, cartões e filas usam o sprite
  renderizado da aldeia, no estágio do nível atual, no lugar das ilustrações rabiscadas.

- Ferraria (pesquisa) em cartões `tech-tile` e Academia em cartões `academy-card`.
- Menu de contexto do mapa (opção `contextMenu`) com atalhos para aldeia e perfil.
- Identidade: logo e título já são "DWar".
- Testes de `packages/game-core` (`pnpm test`): economia, Tesouraria e Moleiro, recrutamento,
  mercado, viagem, combate (perdas exatas, muralha, aríetes, catapultas, espiões, saque, apoio),
  patentes, permissões da tribo, formatação de mensagens, posicionamento e crescimento bárbaro.
  Validados com mutação manual das fórmulas principais: nenhum mutante sobrevive.
- Acessibilidade e desempenho (`a11y.css`): anéis de foco no mapa, minimapa, pontos de relatório
  e edifícios; contorno em modo de alto contraste (`forced-colors`); `decoding="async"` e
  `loading="lazy"` nas imagens de listas. Já estavam bons: `prefers-reduced-motion` global
  (`ui.css`), contraste dos tokens de texto (6,1 a 13,3:1, acima de AA), `lang="pt-BR"`, papéis
  ARIA nas janelas e notificações, sprites WebP de ~150×113 px e preload do fundo da aldeia.
- Telas públicas de aldeia e de jogador (`public.css`): cabeçalho, fatos rápidos, ações e
  `PanelCard` (relatórios, nota, aldeias, perfil, medalhas). Ranking de jogadores em linhas de
  grade (`.rank-list`, com `role="table"`) no lugar da tabela legada. O ranking de tribos e a
  lista de membros do perfil da tribo usam a mesma peça (`.rank-tribes`, `.rank-members`).

## Próximos passos (ordem de impacto)

1. **Tabelas legadas restantes** (matrizes com ações ou muitas colunas): gestão de membros
   (`tribe-sections.tsx`), histórico de guerras (`tribe-diplomacy.tsx`), unidades do relatório
   (`report-parts.tsx`, `rally-units`) e opções/legenda do mapa. Reaproveitar `.rank-list`
   quando fizer sentido; a grade de unidades pode continuar tabela.
2. **Mensagens e relatórios, visão em duas colunas (opcional):** as telas já têm lista moderna,
   abas/filtros, não lidos destacados, seleção em massa, paginação e estado vazio; a leitura
   abre no lugar da lista. A janela abre com 860 px, apertado para lista + leitura lado a lado:
   se for feito, usar container query (só a partir de ~1000 px) e manter a leitura em tela
   cheia abaixo disso.
3. **Acessibilidade, o que sobra:** auditar com leitor de tela e só teclado (tab order das
   janelas, armadilha de foco no diálogo, restaurar foco ao fechar), e medir com Lighthouse.
4. **Testes, o que sobra:** `packages/game-core` já tem 78 testes (`pnpm test`). Faltam
   `packages/game-server` (casos de uso, precisam de banco) e um fluxo E2E mínimo.
   Decisão: a Tesouraria nível 1 continua valendo 15 pontos (não 14), por arredondamento de
   ponto flutuante herdado do Speed Wars em `buildingPoints`; o teste documenta o quirk.

## Mecânicas

Tesouraria (reduz o custo de moedas) e Moleiro (amplia a população) já estão implementados;
a proposta original está em `docs/proposta-novas-construcoes.md`. Qualquer mudança de regra deve
ser aditiva (novas colunas/tabelas com valores padrão), nunca destrutiva, e passar por
`packages/game-core` com testes das fórmulas.
