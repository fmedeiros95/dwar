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
- Telas públicas de aldeia e de jogador (`public.css`): cabeçalho, fatos rápidos, ações e
  `PanelCard` (relatórios, nota, aldeias, perfil, medalhas). Ranking de jogadores em linhas de
  grade (`.rank-list`, com `role="table"`) no lugar da tabela legada. O ranking de tribos e a
  lista de membros do perfil da tribo usam a mesma peça (`.rank-tribes`, `.rank-members`).

## Próximos passos (ordem de impacto)

1. **Tabelas legadas restantes** (matrizes com ações ou muitas colunas): gestão de membros
   (`tribe-sections.tsx`), histórico de guerras (`tribe-diplomacy.tsx`), unidades do relatório
   (`report-parts.tsx`, `rally-units`) e opções/legenda do mapa. Reaproveitar `.rank-list`
   quando fizer sentido; a grade de unidades pode continuar tabela.
2. **Mensagens e relatórios:** lista e leitura em duas colunas, filtros, estado vazio (conferir
   o que já existe antes de refazer).
3. **Acessibilidade e desempenho:** contraste, foco visível, `prefers-reduced-motion`, imagens
   do cenário em tamanho adequado.
4. **Testes:** não há nenhum; começar pelas fórmulas de `packages/game-core`.

## Mecânicas

Tesouraria (reduz o custo de moedas) e Moleiro (amplia a população) já estão implementados;
a proposta original está em `docs/proposta-novas-construcoes.md`. Qualquer mudança de regra deve
ser aditiva (novas colunas/tabelas com valores padrão), nunca destrutiva, e passar por
`packages/game-core` com testes das fórmulas.
