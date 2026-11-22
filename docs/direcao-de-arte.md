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
| Aldeia | Brasões de estado, cartão de foco com custo e prazo, retorno de gasto nos recursos e fila com contagem em texto. |
| Janelas | Título em Cinzel com selo de escudo, pergaminho menos ofuscante e bronze no lugar do vermelho. |
| Edifício principal e construções | Botões "Nível N" em ouro e recurso faltante em âmbar. |
| Praça | "Atacar" e "Confirmar ataque" em carmesim, "Apoiar" e "Confirmar apoio" em aço. |
| Mercado | Indicador dos mercadores: livres em musgo, indo em ouro, voltando em prata. |
| Mapa | Brasão de dono por aldeia, anel dourado na aldeia atual e anel carmesim em inimigos. Legenda com os mesmos brasões. |
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
