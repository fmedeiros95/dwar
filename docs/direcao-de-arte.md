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

### A produzir (raster)

1. **Aldeias abandonadas em PNG com transparência.** Os arquivos atuais
   (`/legacy/map/new/left_*n.jpg`) trazem a grama embutida, o que impede filtros e contornos
   limpos. Exportar em 60×60 px, com a mesma perspectiva e luz das aldeias de jogador
   (`vil_*n.png`) e seis faixas de pontos.
2. **Retratos de unidade com moldura única.** Hoje cada retrato tem fundo diferente. Recortar em
   64×64 px, busto a três quartos voltado para a direita, fundo couro escuro e filete de 1 px.
3. **Ícone de recurso em 3 tamanhos** (16, 20 e 24 px), desenhados para cada tamanho em vez de
   reduzidos, com silhuetas distintas: toras, tijolos e lingote.

## 8. Retorno e movimento

| Evento | Resposta | Duração | Intensidade |
| --- | --- | --- | --- |
| Passar o mouse num edifício | Sprite clareia e o cartão de foco sobe | 0,18 s | Baixa |
| Comando aceito (obra, recrutamento, envio) | Aviso verde no alto do palco | 4,2 s | Média |
| Recurso gasto | Pílula dourada "−N" desce do recurso | 1,6 s | Média |
| Recurso ganho fora do ritmo (saque, comércio) | Pílula musgo "+N" | 1,6 s | Média |
| Obra em andamento | Contorno do brasão preenche em tempo real | Contínuo | Baixa |
| Obra concluída | Comemoração no cenário (já existia) | cerca de 2 s | Alta |
| Ataque inimigo a caminho | Trilho e marcador do mapa pulsam em carmesim | Contínuo | Máxima |
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
