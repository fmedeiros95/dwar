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

## Próximos passos (ordem de impacto)

1. **Feedback de ações:** toasts de sucesso/erro, estados de carregamento nos botões, animação ao
   concluir uma obra. Hoje o erro aparece como faixa fixa no topo.
2. **Recrutamento e pesquisa:** quartel, estábulo, oficina e ferraria ainda usam tabelas legadas.
   Cartões de unidade com ataque/defesa, custo e campo de quantidade com "máximo".
3. **Mensagens, relatórios e ranking:** lista e leitura em duas colunas, filtros, estado vazio.
4. **Mercado e praça de reunião:** fluxo de envio com resumo antes de confirmar.
5. **Acessibilidade e desempenho:** contraste, foco visível, `prefers-reduced-motion`, imagens
   do cenário em tamanho adequado.
6. **Identidade:** o logo ainda é "Gods of War"; o jogo se chama DWar.

## Mecânicas

Nenhuma alteração ainda. Proposta de Tesouraria e Moleiro em `docs/proposta-novas-construcoes.md`. Qualquer mudança de regra deve ser aditiva (novas colunas/tabelas com
valores padrão), nunca destrutiva, e passar por `packages/game-core` com testes das fórmulas.
