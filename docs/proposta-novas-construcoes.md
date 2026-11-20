# Proposta: novas construções com a arte do Tribul

A arte já está importada (`apps/web/public/game/buildings/`) e a cena da aldeia já sabe desenhar
os 18 edifícios (`scene-model.ts` mapeia `main, house, place, storage, stone, wood, iron, farm,
mill, treasury, smith, hide, market, barracks, stable, wall, workshop, noble`). Falta só a
**regra de jogo** dos que o DWar não tem. Nenhuma mudança de regra foi feita ainda.

## O que existe hoje

- 15 edifícios em `packages/game-config/src/buildings.ts`.
- Os níveis ficam no JSON `villages.buildings` (tipo `BuildingLevels = Record<BuildingCode, number>`),
  então **não precisa de migração de esquema**: basta ler chaves ausentes como nível 0.
- Arte sem regra: `house` (2), `mill` (9, campo de trigo do Moleiro) e `treasury` (10).
  O Moinho (8) já é usado pela `farm`.

## Proposta 1: Tesouraria (`treasury`)

Encaixe natural: a Academia cunha moedas de nobre com `coinCost = 18000/20000/20000`
(`game-config/src/units.ts`). A Tesouraria **reduz esse custo**.

| Item | Valor sugerido |
| --- | --- |
| Requisitos | Edifício principal 10, Mercado 5 |
| Nível máximo | 15 |
| Efeito | −2% por nível no custo de cunhagem (máximo −30%) |
| Custo base | 600 / 700 / 500 (madeira / argila / ferro), fator de custo como o Mercado |

Pontos de código: `game-config/src/buildings.ts` (definição), `world-defaults.ts` (nível inicial 0),
`game-server/src/academy.ts` (3 usos de `coinCost`: validação de capacidade, de recursos e
pagamento), `building-details.ts` (linha "Redução no custo de moedas"), `game-core/src/academy.ts`
(função pura do custo com desconto). A arte e a posição na cena já existem.

## Proposta 2: Moleiro (`mill`)

O DWar usa a Fazenda para limitar população (`farmCapacity`). O Moleiro **amplia essa capacidade**.

| Item | Valor sugerido |
| --- | --- |
| Requisitos | Fazenda 10 |
| Nível máximo | 15 |
| Efeito | +2% por nível na população máxima (máximo +30%) |

Pontos de código: `game-core/src/index.ts` (cálculo de capacidade, linha ~89), `building-details.ts`,
definição em `game-config`.

## Riscos e como mitigar

1. Aldeias existentes não têm as chaves novas. Ler sempre com `levels[code] ?? 0` e, opcionalmente,
   uma migração SQL aditiva que preenche `treasury` e `mill` com 0.
2. Não há testes automatizados. As funções de custo e capacidade são puras em `game-core`;
   vale cobri-las com testes antes de ligar o efeito.
3. Balanceamento: os números acima são ponto de partida, não validados em jogo.

## Outras ideias que dispensam regra nova

- **Retratos de tropas:** o sprite tem 20 retratos para 10 unidades. A segunda metade pode ser
  usada como variante de facção/cosmética.
- **Música:** há duas trilhas (`theme-1.mp3`, `theme-2.mp3`, 8,7 MB) e ícones de liga/desliga.
  Não importadas; dá para adicionar um botão discreto no cenário.
- **Figuras de marcha e navios** (`public/game/map/route-figures.webp`): animar tropas e
  comerciantes no mapa.

## Origem dos assets

Os arquivos vieram de uma pasta local (`Downloads/Tribul.net/tribul`). Antes de publicar o
repositório, confirme que você tem direito de redistribuir essa arte; o projeto é AGPL, e a
licença do código não cobre as imagens.
