# Direção de arte: Heráldica de campanha

Este documento define a identidade visual do DWar e registra o redesign da cena principal.
O código vive em `apps/web/src/art.css` (carregado por último) e nos componentes citados abaixo.
Os comparativos ficam em `docs/direcao-de-arte/`.

## 1. O jogo

| Aspecto | Leitura |
| --- | --- |
| Gênero | Estratégia de construção e guerra em tempo real persistente, no estilo Tribal Wars. |
| Plataforma | Navegador. Notebook de 1366×768 é o alvo principal; celular é secundário. |
| Controles | Mouse: clique em edifício abre janela, arrasto move o cenário, roda dá zoom. Toque no celular. Teclado com foco visível. |
| Ação repetida | Olhar recursos, decidir o que evoluir, recrutar, mandar ataques e ler relatórios. Sessões curtas, várias vezes ao dia. |
| Emoção | Domínio paciente: ver a aldeia crescer sob controle, com tensão quando chega um ataque. |

## 2. Três problemas do visual anterior

1. **Os selos do cenário não diziam o que fazer.** Os 15 selos eram círculos escuros iguais com
   um número. Para saber o que podia evoluir, o jogador abria o Edifício principal e lia uma lista
   de cartões. O cenário era decoração e cada decisão custava duas telas.
2. **O vermelho tinha quatro significados.** Era o botão primário (Construir, Nível N, OK, Entrar),
   o botão Atacar, o alerta de armazém cheio e a cor de destaque dentro das janelas. Uma ação de
   rotina parecia hostil e o alerta de ataque perdia força.
3. **O mapa escondia quem é dono de cada aldeia.** A cor do dono ficava atrás de uma imagem opaca.
   A aldeia atual era um ponto branco de 6 px. Escolher alvo e reconhecer vizinhos exigia passar
   o mouse em cada aldeia.

Problemas menores corrigidos junto: a fila de 50 vagas desenhava 50 bolinhas e vazava do cartão,
os rótulos do trilho se sobrepunham no celular e o aviso de sucesso cobria o cartão de Obras.

## 3. Direção

**Heráldica de campanha.** O emblema do jogo é um escudo. Esse escudo vira o sinal de tudo o que
pertence a alguém ou pede decisão: brasões sobre os edifícios, brasões de dono no mapa e o selo
das janelas. Uma captura de tela do DWar se reconhece pela pintura da aldeia pontuada por escudos
nítidos, os dourados chamando o olhar, sobre um HUD escuro com filete de ouro e janelas de
pergaminho seladas.

## 4. Cena de referência: a aldeia com a fila de obras

O momento escolhido é a decisão mais repetida da partida: **"o que eu evoluo agora?"**.

**Para onde o olhar vai.**

1. Brasões dourados. Só eles são cheios de ouro e só eles têm a aba com seta. Significam "pode
   evoluir agora".
2. Cartão de Obras, no canto inferior direito, com o que já está em andamento.
3. Recursos na barra superior.

**O que sustenta a decisão.** Ao passar o mouse sobre um edifício, o cartão central mostra:

- o estado na mesma cor do brasão;
- o ganho do próximo nível (por exemplo, "Produção: 118 → 133 por hora");
- o custo, com cada recurso faltante em âmbar e quanto falta;
- quando os recursos chegam ("Recursos suficientes em 4:41:48") ou o motivo do bloqueio.

**Como a tela comunica o resultado.**

1. Comando aceito: o botão mostra o carregamento e o aviso "Obra iniciada" aparece no alto do palco.
2. O que afetou: um número dourado "−681" desce de cada recurso gasto.
3. Resultado: o brasão vira tracejado (na fila) ou ganha um contorno de progresso (em obra), a
   obra entra no cartão de Obras e os outros brasões se reavaliam. Os que deixaram de caber no
   orçamento passam de ouro para âmbar.

Veja `docs/direcao-de-arte/retorno-de-obra.jpg`.

### Estados do brasão de edifício

Escudo de 30×34 unidades do cenário (cerca de 24×27 px na escala padrão em 1366×768).

| Estado | Preenchimento | Contorno | Sinal | Quando |
| --- | --- | --- | --- | --- |
| Pode evoluir | Ouro `#e8be6a`, número escuro | Marfim, brilho suave | Aba redonda com ↑ | `canBuild` |
| Aguardando recursos | Escuro | Âmbar `#f0a24b` | Número creme quente | Falta recurso que chega com o tempo |
| Indisponível | Escuro translúcido | Bege apagado | Número a 55% | Requisito, fila cheia, população |
| Na fila | Escuro | Ouro tracejado 4/3 | Nenhum | Na fila, não começou |
| Em obra | Escuro | Trilho preto e progresso ouro | Pílula com tempo restante | Obra em andamento |
| Máximo | Prata `#d7dadf`, número grafite | Branco | Coroa | Nível máximo |

A forma muda junto com a cor. A aba, a coroa, o tracejado e o anel de progresso distinguem os
estados mesmo para quem não separa as cores.

## 5. Regras de arte

### Paleta funcional

Cada cor de destaque tem uma única função. Não usar fora dela.

| Cor | Hex | Função |
| --- | --- | --- |
| Ouro | `#e8be6a` (claro `#ffd98a`) | Seu, ação disponível, foco, progresso. Botão primário. |
| Bronze | `#8a5a14` (fundo `#5e3c0c`) | O ouro sobre pergaminho. Seleção, links e títulos nas janelas. |
| Carmesim | `#d8402f` (fundo `#8e2219`) | Hostil: atacar, inimigo, ataque chegando, derrota. |
| Âmbar | `#f0a24b` (tinta `#93520b`) | Aviso econômico: falta recurso, armazém cheio. |
| Musgo | `#86b46a` (tinta `#3f6b26`) | Suficiente, concluído, ganho. |
| Aço | `#4f86d9` (fundo `#2c5a9a`) | Tribo, aliados, apoio. |
| Prata | `#c9cdd2` | Completo, nível máximo, neutro. |

Neutros: carvão `#100b07`, couro escuro `rgb(30 22 15)`, pergaminho `#eadfc6`, tinta `#2a2017`.

### Tipografia

- **Cinzel** nos títulos: barra das janelas, cartões do HUD, chamadas da entrada.
- **Inter** em toda a interface, com algarismos tabulares em recursos, custos e tempos.
- **IM Fell** só no logotipo.

### Formas e materiais

- Escudo heráldico com topo levemente curvo e ponta inferior. É a única forma de marcador.
- Duas superfícies apenas. Couro escuro translúcido para o HUD sobre o cenário. Pergaminho
  liso para janelas de leitura.
- Filete dourado de 1 px nas bordas. Raio de 8 px nos controles e 10 a 12 px nos painéis.
- Sem textura em ladrilhos.

### Luz

- O cenário tem luz pintada vinda da esquerda e do alto.
- Marcadores do HUD usam sombra curta para baixo, de 2 px.
- O brilho externo é reservado a "pode evoluir", ao foco e à aldeia atual no mapa.

### Composição

- O centro do palco é do cenário. O HUD fica nas bordas: o painel da aldeia embaixo à esquerda,
  Obras embaixo à direita, ferramentas à direita e o cartão de foco embaixo ao centro.
- Avisos aparecem no alto do palco, longe dos cartões.
- Nada pisca sem motivo. Só o ataque inimigo chegando pulsa.

## 6. UI e navegação

| Tela | O que mudou |
| --- | --- |
| Entrada e mundos | Títulos em Cinzel e botão principal em ouro. |
| Aldeia | Brasões de estado, cartão de foco com custo e prazo, retorno de gasto nos recursos. Na rodada 3, o brasão abre a mesa de obras e o cartão de Obras virou a própria mesa. |
| Janelas | Título em Cinzel com selo de escudo, pergaminho menos ofuscante e bronze no lugar do vermelho. |
| Edifício principal e construções | Botões "Nível N" em ouro e recurso faltante em âmbar. Na rodada 3, o Edifício principal mostra a mesa de obras. |
| Praça | "Atacar" e "Confirmar ataque" em carmesim, "Apoiar" e "Confirmar apoio" em aço. |
| Mercado | Indicador dos mercadores: livres em musgo, indo em ouro, voltando em prata. |
| Mapa | Brasão de dono por aldeia, anel dourado na aldeia atual e anel carmesim em inimigos. Na rodada 3, selecionar uma aldeia abre o painel de ordem no lugar do anel de ícones. |
| Celular | Trilho sem sobreposição e itens com no mínimo 52 px de altura. Ferramentas com 44 px em telas de toque. Avisos acima do trilho. |

## 7. Assets

### Feitos neste redesign (vetoriais, no código)

| Asset | Tamanho em jogo | Arquivo |
| --- | --- | --- |
| Brasão de edifício (6 estados) | cerca de 24×27 px | `overview/village-scene.tsx` |
| Brasão de dono no mapa (7 tipos) | 15×17 px; aldeia atual 19×21 | `map/map-legend.tsx` |
| Selo de janela | 12×14 px | `art.css` (`.gw-title::before`) |
| Pílula de gasto ou ganho | 13 px de texto | `art.css` (`.resource-delta`) |

Sinais do brasão de dono: estrela para a aldeia atual, liso para suas aldeias, faixa no alto para
tribo e aliados, traço horizontal para pacto, xis para inimigo e liso bronze para outros jogadores.
Abandonadas não têm brasão.

### Raster, produzidos na rodada 2

Os três scripts regeneram as peças a partir das fontes do Tribul que já estão no projeto. A prancha
`direcao-de-arte/rodada-2/assets.jpg` mostra cada peça no tamanho real, ampliada 2x.

| Peça | Arquivos | Script | Onde aparece |
| --- | --- | --- | --- |
| Ícones de recurso em 16, 20 e 24 px, 1x e 2x | `public/game/resources/icons/` | `scripts/make-resource-icons.py` | Barra superior (24), painéis e cartão de foco (20), chips de custo (16) |
| Retratos com moldura única, 28 e 56 px | `public/game/troops/framed/` | `scripts/make-unit-portraits.py` | Painel da aldeia, Praça, quartel e relatórios |
| Aldeias do mapa em PNG com transparência, 60 px | `public/legacy/map/cut/` | `scripts/make-map-villages.py` | Mapa |

- **Ícones de recurso.** Partem dos ícones pintados de 36 px, que já têm as silhuetas da
  especificação: toras, tijolos de argila e lingotes. Cada tamanho é recortado pela área pintada,
  para os três ocuparem o mesmo espaço. Quanto menor o tamanho, mais contraste, saturação e
  nitidez recebe. Um contorno escuro proporcional separa o ícone das barras escuras e do papel. O
  ferro recebe 20% a mais de brilho, porque some sobre a barra escura. Armazém e população
  continuam vetoriais, em tom apagado, porque são medidas da aldeia e não recursos que se gastam.
- **Retratos.** O busto original de 24 px entra em 1:1 sobre couro com luz do alto à esquerda e
  filete bronze. Antes, a ampliação para 30 px o borrava. Os bustos ficaram menores, mas nítidos e
  com a mesma moldura.
- **Aldeias do mapa.** A grama sai por cor e as bordas recebem meio pixel de suavização. Uma sombra
  de contato curta vem da mesma luz. As aldeias de jogador perdem o círculo de dono antigo, que o
  brasão substitui. Nos dois níveis menores, parte da terra batida esmaeceu junto com a grama.

### Ainda a produzir: retrato pintado de 64 px

O único retrato existente tem 24 px, e ampliar não cria detalhe. Nas telas que mostram o retrato
grande, como os cartões do quartel com cerca de 64 px, ele continua borrado. Briefing para
ilustração:

- **Peças.** São 10, uma por unidade: lanceiro, espadachim, bárbaro, arqueiro, explorador,
  cavalaria leve, cavalaria pesada, aríete, catapulta e nobre.
- **Formato.** PNG de 128×128 px com fundo transparente, exibido a 64 px e a 28 px. Gerar também
  56×56 px para o painel em telas 2x.
- **Composição.**
  - Soldados aparecem em busto a três quartos, voltados para a direita, que é para onde as ordens
    partem na revisão.
  - A cabeça fica no terço superior, e a arma característica cruza o quadro na diagonal, da base
    esquerda ao topo direito.
  - Aríete e catapulta aparecem em perspectiva de três quartos, com o mesmo enquadramento.
- **Luz e material.**
  - A luz vem do alto à esquerda, quente e de fim de tarde, como na aldeia.
  - Metal tem brilho contido e couro e madeira saem foscos.
  - A paleta é a mesma dos edifícios: madeira mel, pedra cinza-azulada e telhados ocre.
- **Silhueta.** Cada unidade precisa ser reconhecível a 28 px só pelo contorno. Lança vertical,
  espada curta, machado de lâmina larga, arco, capuz, elmo com crina, elmo fechado, viga do
  aríete, braço da catapulta e chapéu de nobre.
- **Moldura.** Não vai na arte. O script `make-unit-portraits.py` aplica a moldura de couro e
  filete bronze, então basta trocar a fonte e rodar o script.

**Situação na rodada 3: pendente.** A sessão não tinha ferramenta de ilustração. Desenhar os bustos
em código não atenderia ao briefing de pintura com luz e material, então a peça de 24 px continua
em uso e não há comparativo em tamanho real. O briefing acima segue válido.

## 8. Retorno e movimento

| Evento | Resposta | Duração | Intensidade |
| --- | --- | --- | --- |
| Passar o mouse num edifício | Sprite clareia e o cartão de foco sobe | 0,18 s | Baixa |
| Comando aceito (obra, recrutamento, envio) | Aviso verde no alto do palco | 4,2 s | Média |
| Recurso gasto | Pílula dourada "−N" desce do recurso | 1,6 s | Média |
| Recurso ganho fora do ritmo (saque, comércio) | Pílula musgo "+N" | 1,6 s | Média |
| Obra em andamento | Contorno do brasão preenche em tempo real | Contínuo | Baixa |
| Obra concluída | Comemoração no cenário (já existia) | cerca de 2 s | Alta |
| Ataque inimigo aparece | Bordas do palco pulsam duas vezes e um cartão desce do selo | 2,6 s e 8 s | Máxima |
| Ataque inimigo a caminho | Selo carmesim na barra superior, trilho e marcador do mapa | Contínuo, parado | Alta |
| Ataque a menos de 5 minutos | Selo pulsa com halo crescente | Ciclo de 1,1 s | Máxima |
| Armazém cheio | Barra e número em âmbar, sem pulsar | Estático | Baixa |

Com `prefers-reduced-motion`, as pílulas aparecem sem deslocamento e os pulsos param.

## 9. Validação

Feita em Chrome headless a 1366×768 e 390×844, com uma aldeia de meio de partida. A aldeia tinha
15 edifícios, 437 tropas, 3 obras na fila e recursos parciais.

- Antes e depois da mesma cena: `aldeia.jpg`, `aldeia-foco.jpg`, `mapa.jpg`,
  `edificio-principal.jpg`, `praca.jpg`, `entrada.jpg` e `celular.jpg`.
- Fluxo real de obra pela interface: clique em "Nível 4" no Estábulo, pílulas de gasto, brasão
  na fila e aviso no alto. Ver `retorno-de-obra.jpg`.
- Varredura automática de 14 telas em busca de botões com texto escuro sobre fundo transparente.
  Dois foram achados e corrigidos.
- `pnpm lint`, `pnpm --filter @dwar/web typecheck` e `pnpm --filter @dwar/web build` passaram.

Não testado: Firefox e Safari, leitor de tela, telas de 4K e um ataque inimigo real chegando.

## 10. Rodada 2: identidade da aldeia, ordem militar e ataque chegando

O "antes" desta rodada é o commit `60ea8d5`. Os comparativos estão em `direcao-de-arte/rodada-2/`.

### A aldeia sem marcadores

Com brasões e painéis ocultos, a identidade do DWar está no terreno pintado: montanhas, lago,
estradas de terra e luz quente de fim de tarde.

Destoavam dois elementos. O primeiro, e o de maior impacto, era a muralha. No nível 8 ela aparecia
como 14 cilindros cinzentos soltos, sem textura nem luz, dominando a composição. Não era a arte da
muralha, que tem paliçada e torres. Era um defeito do cenário: qualquer obra na fila, mesmo sem ter
começado, trocava o edifício pelo andaime do estágio seguinte. A aldeia parecia demolida sempre que
o jogador usava a fila, e o mesmo acontecia com o Quartel e o Estábulo.

A correção está em `overview/village-scene.tsx`. O cenário mostra o que está de pé. O andaime só
aparece quando a obra já começou e muda o estágio da arte, ou num edifício novo. Com a paliçada e as
torres, a aldeia passa a ter silhueta de vila fortificada. Ver `aldeia-sem-marcadores.jpg`.

O segundo elemento era a moldura da interface: ícones vetoriais chapados ao lado de uma pintura. Os
ícones pintados e os retratos com moldura resolvem isso. Ver `aldeia-antes-depois.jpg`.

Com os brasões de volta, eles continuam fáceis de achar. Os dourados, que pedem ação, chamam o olhar
sem competir entre si. O da muralha fica na torre do portão.

### Decisão militar

O percurso vai da aldeia ao mapa, depois ao menu da aldeia escolhida, a "Enviar tropas", à escolha
de tropas e à revisão. O ponto de maior dúvida era o formulário da Praça. O destino aparecia só como
X e Y, e o jogador apertava "Atacar com 100" sem ver de quem era a aldeia. Ela podia ser abandonada,
da própria tribo ou do próprio jogador.

- **Formulário.** Logo abaixo das coordenadas, um quadro identifica a aldeia. Ele traz o brasão de
  dono do mapa, o nome, a relação ("Aldeia abandonada", "Sua tribo", "Tribo inimiga"…), o dono e os
  pontos. Se a ordem for ataque contra a própria aldeia, a tribo ou um aliado, aparece um aviso em
  âmbar. A consulta usa o mesmo recorte de mapa que o mapa usa, com raio 1.
- **Revisão.** No topo entra uma faixa que responde às três perguntas de relance. Primeiro, o tipo
  de ordem: "ATAQUE" com espadas em carmesim ou "APOIO" com escudo em aço, por palavra, símbolo e
  cor. Depois, o destino com brasão e relação. Por fim, quem vai, com os retratos e o total. "Ficam
  na aldeia" passou a ser informação secundária. No celular, a faixa entra à vista ao abrir a
  revisão.
- **Mapa no celular.** O painel de coordenadas cobria um quarto do mapa e escondia "Enviar tropas".
  Agora é uma faixa só com X e Y.

Ver `ordem-formulario.jpg` e `ordem-revisao.jpg`.

### Ataque chegando

Antes, com o jogador na fila de obras, o único sinal era um "1" vermelho de 12 px no trilho. Não
aparecia a aldeia afetada nem o tempo restante, e os detalhes ficavam numa tabela de seis colunas.

1. **Chegada.** Na primeira vez que um ataque aparece, as bordas do palco pulsam em carmesim duas
   vezes, por 2,6 s no total. Um cartão desce do selo com a aldeia, as coordenadas, o tempo
   restante, a hora, a origem e o botão "Ver ataques". Ele some em 8 s, recolhendo-se no selo, e
   não volta ao recarregar a página.
2. **Selo.** Fica na barra superior, que nenhuma janela cobre, com "Ataque em 0:23:03" e o nome da
   aldeia. Fica parado enquanto o ataque está longe e pulsa a menos de 5 minutos.
3. **Detalhes.** O selo abre "Ataques chegando" numa janela própria, e a janela da fila continua
   aberta. A tabela virou cartões com o tempo restante em destaque, o alvo e o atacante. Eles
   funcionam também em 390 px.

O carmesim continua reservado ao hostil. O aviso usa a mesma família de forma, o escudo, no ícone
do selo. Ver `alerta-ataque.jpg` e `celular.jpg`.

### Situações reproduzidas

Ambiente de desenvolvimento, Chrome headless, 1366×768 e 390×844.

| Situação | Como | Notebook | Celular |
| --- | --- | --- | --- |
| Aldeia com obras na fila e na obra | Estado de meio de partida no banco local | Sim | Sim |
| Mapa, menu da aldeia e "Enviar tropas" | Clique real no mapa | Sim | Sim |
| Ataque a outro jogador e apoio a abandonada até a revisão | Formulário real, sem confirmar | Sim | Ataque |
| Ataque real a caminho com o jogador na fila de obras | Conta "invasor" a 2 campos, ataque enviado pela API do jogo | Sim | Sim |
| Selo urgente, abaixo de 5 minutos | Atributo forçado no navegador, porque adiantar o ataque o faria chegar | Visual | Não |

Não reproduzido: a chegada efetiva do ataque, com batalha e relatório. O ataque de teste foi
removido do banco antes de chegar e as tropas voltaram ao invasor. Também não foram reproduzidos
vários ataques simultâneos contra aldeias diferentes, ataque contra a própria tribo e leitor de
tela.

## 11. Rodada 3: estrutura das decisões

O "antes" desta rodada é o commit `bf7df49`. As capturas estão em `direcao-de-arte/rodada-3/`. A
rodada mexe na estrutura das telas, e a direção de arte só dá unidade ao resultado.

### Fluxo 1: escolher a próxima obra

**O que o jogo pedia de memória.** O cenário com uma obra na fila tinha 1.500 de madeira, 1.900 de
argila e 3.000 de ferro. Para decidir entre o Bosque e o Armazém, o jogador:

1. passava o mouse no Bosque e guardava "+48 por hora, 0:43:08";
2. passava o mouse no Armazém, e o cartão do Bosque sumia;
3. abria o Edifício principal para ver a fila, numa janela que cobre a aldeia;
4. abria a janela do Armazém para saber quando o armazém enche.

Nenhuma tela dizia quando cada obra ficaria pronta depois da fila. No celular não há "passar o
mouse": eram duas janelas, cada uma com rolagem, fechar e reabrir.

**Duas estruturas consideradas.**

- **Comparação no cenário.** Cada brasão fixa um cartão flutuante perto do edifício. É espacial e
  leve, mas os cartões cobrem a pintura, mudam de lugar conforme o edifício e não cabem no celular.
  Também não mostram a fila, que é o que define quando a obra começa.
- **Mesa de obras (escolhida).** O cartão de Obras do canto inferior direito vira um painel
  recolhível ao lado do cenário. Ele junta a fila, uma tabela de comparação e a lista de todas as
  obras. Os brasões passam a ser clicáveis e levam a obra para a mesa. O clique no edifício
  continua abrindo a tela dele. A aldeia segue visível à esquerda.

**Como ficou.**

- **Brasão é planejamento, edifício é função.** Clicar no brasão põe a obra na comparação e abre a
  mesa. Clicar no edifício abre o Quartel, o Mercado e os demais, como antes. O brasão em comparação
  ganha um anel claro. O cartão de foco diz isso em uma linha.
- **Tabela lado a lado.** São até três colunas, uma por obra, com as mesmas linhas: ganho, quando
  fica pronta, efeito, custo e o que sobra depois de pagar. "Fica pronta" junta o início, já
  descontando a fila e a espera por recursos, e a duração. As marcas "primeira a ficar pronta" e
  "mais barata" apontam a diferença. O efeito traz o que costuma decidir. No Armazém, quando ele
  enche antes e depois. Nos produtores, em quanto tempo o ganho paga o custo.
- **Bloqueio na própria coluna.** Recurso faltante sai em âmbar com quanto falta. O botão da obra
  sem recursos vira "Recursos em 1:21:52" e fica desativado. Requisito ou fila cheia aparecem com o
  motivo.
- **Efeito da escolha.** A obra escolhida entra na fila com a etiqueta "Nova" e um realce musgo. A
  coluna mostra "Nível 14 entrou na fila · pronta hoje às 20:22" e passa a comparar o nível
  seguinte. As outras colunas se reavaliam na hora. As pílulas de gasto e o aviso continuam.
- **Edifício principal.** A janela mostra a mesma mesa sobre pergaminho, para quem chega pelo mapa
  ou usa a visão clássica. Na aldeia, ele abre a mesa acoplada em vez de uma janela.
- **Celular.** A mesa é uma faixa sobre o cenário e, aberta, uma folha a meia altura que deixa os
  brasões tocáveis acima dela. Um botão amplia a folha. Como o próximo brasão costuma ficar sob a
  folha, a linha "Comparar com" oferece seis obras da mesma família, como economia com economia, a
  um toque. A arte some do cabeçalho das colunas para caber duas colunas em 390 px. Todos os
  controles têm 44 px.

Ver `obra-notebook.jpg`, `obra-celular.jpg` e `obra-janela.jpg`.

### Fluxo 2: escolher um alvo e enviar tropas

**O que o jogo pedia.** No mapa, o clique abria um anel de seis ícones sem rótulo. "Enviar tropas"
abria a Praça numa janela que cobria o mapa, e o alvo saía de vista. No celular a Praça ocupava a
tela inteira, o destino ficava abaixo da lista de tropas e "Confirmar" ficava abaixo da dobra. O
teste também mostrou que, no celular, o toque no ícone do anel atravessava até o mapa e reabria a
aldeia em vez de enviar tropas.

**Duas estruturas consideradas.**

- **Praça como mesa de guerra.** A Praça ganha um minimapa para escolher o destino. Isso mantém
  tudo numa janela, mas duplica o mapa num tamanho pequeno e continua cobrindo o mapa de verdade.
- **Ordem no mapa (escolhida).** Selecionar uma aldeia abre um painel ao lado, ou uma folha
  embaixo no celular. O painel avança por etapas sem sair do mapa: alvo, tropas, revisão e
  enviado. O mapa realça o alvo e desenha a rota da sua aldeia até ele, em ouro tracejado ao
  escolher, carmesim no ataque e aço no apoio.

**Como ficou.**

- **Alvo.** Mostra brasão, relação, dono, tribo, pontos, distância, viagem da unidade mais rápida à
  mais lenta e moral. Avisa sobre proteção de iniciante e proporção de pontos. Lista as suas ordens
  já a caminho deste alvo. Os botões grandes "Atacar" e "Apoiar" vêm primeiro. Aldeia, perfil,
  mensagem e recursos, que estavam no anel, viram botões com rótulo.
- **Tropas.** O cabeçalho com o alvo fica fixo, e a troca entre ataque e apoio fica no alto. Cada
  unidade tem "−", campo, "+" e "todas", e mostra o tempo de viagem dela. O rodapé fixo diz quantas
  tropas vão e quando chegam, calculado ao vivo pela unidade mais lenta.
- **Revisão.** Responde em blocos ao tipo da ordem, por palavra, cor e símbolo, à rota com origem e
  destino, ao dono e à relação, às tropas com a mais lenta, à saída, chegada e volta, e à moral, ao
  saque e ao alvo das catapultas. "Ajustar tropas" volta com tudo preenchido. "Confirmar ataque"
  ou "Confirmar apoio" é o único caminho para enviar.
- **Trocar de alvo sem perder nada.** Clicar em outra aldeia com o painel aberto mantém tipo e
  tropas. Uma revisão pronta volta para "tropas", porque valia só para o alvo anterior. Arrastar o
  mapa não fecha o painel, e o clique no campo vazio não descarta uma ordem em montagem.
- **Onde acompanhar.** Depois de confirmar, o painel diz "Ataque a caminho", lista a ordem com a
  contagem regressiva e o "Cancelar" enquanto vale, e explica que o ícone sobre o alvo no mapa e
  "Comandos em andamento" na Praça seguem a ordem. Se for cancelada, mostra "tropas voltando" e a
  hora da volta.
- **Alvo sempre à vista.** Ao abrir o painel ou mudar de etapa, o mapa se move só se o alvo ficaria
  sob o painel. Abrir uma janela a partir do mapa, como o perfil, não recentraliza mais o mapa na
  sua aldeia.
- **Celular.** A folha do alvo ocupa no máximo 48% da altura. Nas etapas seguintes ela deixa uma
  faixa de mapa com o alvo e a rota, e as caixas de coordenadas e setas saem de cima dela. O "Revisar"
  e o "Confirmar" ficam no rodapé fixo, sempre à vista.

A Praça continua existindo para digitar coordenadas, ver todos os comandos e retirar apoios.

Ver `ordem-notebook.jpg` e `ordem-celular.jpg`.

### Antes e depois, contados nas tarefas

Mesmo cenário nos dois códigos, em 1366×768 e 390×844.

| Tarefa | Trocas de tela | Informação reaberta | Escolha redigitada |
| --- | --- | --- | --- |
| Obra, notebook, antes | 2 janelas: Edifício principal e Armazém | 1: voltar ao Bosque após ver o Armazém | 0 |
| Obra, notebook, depois | 0 | 0 | 0 |
| Obra, celular, antes | 3 janelas: Bosque, Armazém e Bosque de novo para evoluir | 2 rolagens repetidas | 0 |
| Obra, celular, depois | 0 | 0 | 0 |
| Ordem com ajuste para apoio, notebook, antes | 1 janela que tira o alvo de vista | 0 | 0 |
| Ordem com ajuste para apoio, notebook, depois | 0 | 0 | 0 |
| Ordem com ajuste para apoio, celular, antes | 1 janela de tela cheia e 1 aberta por engano | 2 rolagens até destino e confirmar | 0 |
| Ordem com ajuste para apoio, celular, depois | 0 | 0 | 0 |

No antes, a Praça já guardava as tropas ao voltar da revisão, e isso foi mantido. No depois, as
ações da obra foram 3 cliques no notebook: dois brasões e "Evoluir". No celular foram 5 toques:
arrastar o cenário, o brasão, "Armazém" em "Comparar com", rolar a folha e "Evoluir". A ordem com
ajuste para apoio levou 8 decisões nos dois tamanhos, sem digitar nada. Para chegar a 108
lanceiros foram 6 toques no "+", que sobe 10% das tropas da aldeia por vez.

### Ataque até o relatório

Ambiente de desenvolvimento com o worker do jogo resolvendo as batalhas. Dois ataques reais da
conta "invasor" contra a aldeia do "diretor" foram enviados com cerca de dois minutos de
diferença. A mesa de obras ficou aberta durante todo o teste. Três navegadores acompanharam:
notebook, celular e notebook com movimento reduzido.

| Momento | O que aconteceu |
| --- | --- |
| Envio do 1º ataque | As bordas pulsaram e o cartão desceu do selo: "Chega em 0:05:49". |
| 5:02 restantes | Selo parado, sem pulso. |
| 5:00 | O selo virou urgente e pulsou (`threat-urgent`). |
| Movimento reduzido | Mesmo momento, sem animação no selo nem no halo. A urgência fica no carmesim e no texto. |
| Envio do 2º ataque | O selo passou a mostrar "2" e o ataque mais próximo. |
| Chegada do 1º | A batalha foi resolvida. O selo passou ao 2º, com "Ataque em 0:01:59", e ao lado entrou "Defesa vencida". |
| Chegada do 2º | O selo de ataque saiu, e ficou só "Defesa vencida · ver relatório". |
| Clique no resultado | Abriu o relatório da batalha: vitória, atacante perdeu 40 de 40 e defensor perdeu 11 de 365. |

**O que mudou por causa do teste.** Antes, o selo sumia na chegada e nada levava ao resultado. O
jogador precisava notar o número em "Relatórios" e achar a batalha na lista. Agora o alerta guarda
os ataques vistos. Por três minutos depois da chegada, um selo mostra "Batalha agora", enquanto o
servidor resolve, e depois o resultado: "Defesa vencida" em musgo ou "Defesa perdida" em carmesim.
O clique abre o relatório exato (na rodada 3, achado pelo horário; ver a rodada 4). O selo pós-batalha não pulsa.

Ver `alerta-ate-relatorio.jpg` e `alerta-celular-reduzido.jpg`.

### Simulado e pendente

- **Velocidade do mundo.** Construção e produção ficaram em 1× durante os testes. As tropas
  ficaram em 0,1× para um ataque a 2 campos levar cerca de 6 minutos. Depois o mundo voltou aos
  valores anteriores.
- **Recursos e fila.** O cenário de obra foi montado pela API com recursos fixados no banco.
- **Ataques.** Os ataques são reais, enviados pela API do jogo com a conta "invasor". A conta de
  teste da rodada 2 tinha população inconsistente: as tropas foram inseridas sem contar população.
  Isso travava o processamento de eventos na resolução da batalha. A população dela foi corrigida
  no banco local.
- **Arrasto no celular.** O cenário foi arrastado com eventos de ponteiro de toque, porque o
  simulador de toque do navegador headless não move o cenário.
- **Pendente.** Retrato pintado de 64 px, ver a seção 7. Firefox, Safari e leitor de tela não foram testados.

## Rodada 4: fechamento de obras, ordens e pós-batalha (desktop)

Só desktop, 1366×768, com mouse e teclado.

- **Brasão e edifício.** Na primeira visita, um guia no cenário mostra as duas ações e some quando o
  jogador usa ambas. Depois, o cartão do edifício diz primeiro o que o clique faz no ponto apontado.
  Brasões recebem foco e respondem a Enter. Com a mesa aberta, clicar de novo tira da comparação, e
  quem já está nela não muda de coluna.
- **Ganho da próxima obra.** `details[].plan` conta a partir do nível já na fila. Antes a coluna
  "15 → 16" mostrava o ganho do 15.
- **Edifício principal.** Com a mesa já aberta, chama o foco e o olhar para ela. O cenário desliza
  para descobrir o que a mesa cobre, e custo e sobra aparecem sem rolar na comparação de duas obras.
- **Uma revisão só.** `orders/order-review.tsx` e `orders/use-order-flow.ts` servem o mapa e a Praça.
  A confirmação envia a resposta revisada, nunca o rascunho. O rascunho sobrevive a fechar a Praça ou
  sair do mapa. Sem resposta do servidor, só dá para conferir e repetir o mesmo pedido.
- **Selo pós-batalha.** `IncomingOverview.resolved` liga o comando ao relatório por `movement_id`.
  Duas batalhas viram duas linhas; as demais ficam em "+N". Ataque cancelado e relatório apagado não
  aparecem. A vitória do defensor é "Sua aldeia resistiu", no selo e no relatório.
- **Segundos.** Chegadas de tropas e batalhas mostram segundos.

Pendente: retrato de 64 px.

## Rodada 5: celular e três obras lado a lado

O "antes" é o commit `486062d`. Comparativos em `direcao-de-arte/rodada-5/`, antes à esquerda.

- **Três obras.** Com três colunas, o custo e o que sobra ou falta ficam na mesma linha, e o estado
  fica na cor da coluna e no botão. No notebook, com uma obra na fila, a comparação cabe sem rolar.
  No celular, cabe com a mesa ampliada e a fila vazia.
- **Toque no mapa.** O painel de ordem abria no `pointerup` e o `click` do mesmo toque caía em
  "Atacar". A seleção passou para o `click`, e o dedo tolera 8 px antes de virar arrasto.
- **Ataque e batalha juntos.** A regra de recursos numa linha alargava a página no celular e tirava o
  aviso de ataque da tela. Agora ela vale só no desktop.
- **Duas batalhas.** No celular, cada selo mostra o horário e tem altura de toque. No notebook, os
  recursos continuam numa linha.
- **Relatório.** Não passa mais da largura. No celular, só aparecem as unidades que participaram.
- **Revisão.** No celular, a chegada aparece sem rolar.
- **Praça e folhas.** Uma linha por tropa com alvos de 44 px, e folhas opacas.

Testado em Chromium headless, 390×844 com toque e 1366×768, num banco isolado e com ataques reais.

Pendente: retrato de 64 px, Firefox, Safari e leitor de tela. Com vários itens na fila, a comparação
de três obras ainda rola. O "×" das três colunas tem 30 px de largura no celular. Com ataque e duas
batalhas ao mesmo tempo, a barra superior do celular ocupa 247 px por até três minutos.

## Rodada 6: fila cheia, tribo, mapa e mensagens

O "antes" é o commit `1f021ef`. Comparativos em `direcao-de-arte/rodada-6/`, antes à esquerda.

- **Fila de obras.** Com comparação aberta e mais de duas obras, a fila mostra a obra em andamento e
  um resumo que abre o resto. Com a fila cheia, as três obras cabem no notebook e, com a mesa
  ampliada, no celular.
- **Barra do celular.** Com ataque a caminho, as batalhas recentes viram um selo e "+N" na mesma linha.
- **Tribo.** Membros e guerras encerradas viraram listas, sem rolagem lateral no celular. O cargo
  abre sob o próprio membro.
- **Mapa.** Legenda e opções sem tabelas; a legenda vazava do painel até no notebook.
- **Mensagens.** Regras legadas cortavam a lista em duas colunas, estreitavam a leitura e deixavam o
  cabeçalho ilegível. Foram removidas.
- **Relatórios em duas colunas.** Ações em massa só aparecem com algo selecionado.

Testado em Chromium headless, 390×844 e 1366×768, com cargo, expulsão, marca e opções salvas de verdade.

Pendente: retrato de 64 px, Firefox, Safari e leitor de tela. No notebook, dois selos de batalha ao
lado de um ataque ainda não mostram o horário. O "×" das três colunas segue com 30 px no celular.
