# Continuação do redesign

Escrito em 23/11/2026, com as rodadas 7 a 11 na `main` (PRs #11 a #15) e `public/legacy/buildings`
removida (#16). O que cada rodada mudou está em `docs/direcao-de-arte.md`.

**A rodada 12 é uma proposta: foi discutida, mas ainda não aprovada nem iniciada.**

## Rodada 12, proposta

1. **Ataque com o jogo aberto, no celular.** O aviso que surge durante o jogo empurra o cenário. Ao abrir o
   jogo isso já não acontece. Reservar o lugar na barra ou mostrar o aviso por cima.
   Onde: `features/village/incomings/threat.tsx` e as regras `.threat` em `flows.css`.
2. **Painéis do mapa no celular.** Setas e controles cobrem aldeias e pontos de relatório. É a única
   violação que o axe-core ainda acusa (`target-size` em `.map-report-dot`). Recolher os painéis.
   Onde: `features/village/map/world-map.tsx`, `.map-arrows` e `.map-hud-top`.
3. **Cenário mais leve no celular.** `backing.webp` (1600×1000, 388 kB) leva 6,5 s para aparecer em 4G
   simulado. Servir uma versão menor em telas pequenas, sem perder nitidez ao ampliar.
   Onde: `features/village/overview/scene-theme.ts` (inclui o pré-carregamento).

Como aceitar: aldeia e mapa com CLS perto de 0 quando um ataque chega durante o jogo, axe-core sem
violações no mapa do celular e LCP da aldeia abaixo dos 6,5 s.

## Depois da 12

4. **Testes de tela no repositório.** Levar os scripts de auditoria para o projeto. Adiciona dependências
   de desenvolvimento (Playwright e axe-core): **precisa de aprovação.**
5. **CSS acumulado.** As rodadas empilharam regras que anulam outras, e isso causou o defeito da barra na
   rodada 9. É arriscado: fazer só depois do item 4, comparando capturas de todas as telas.
6. Encerrar o redesign e seguir para mecânicas ou testes de `packages/game-server`.

## Depende de outra pessoa ou aparelho

- Retratos de unidade em 64 px: ilustração. Briefing em `docs/direcao-de-arte.md`, seção 7.
- Safari num iPhone ou Mac. O motor foi testado pelo WebKitGTK, que não é o Safari.
- Leitor de tela com alguém ouvindo. O Orca está instalado na máquina de desenvolvimento.

## Como testar

- **Banco separado.** Criar um banco só do teste no mesmo container (`createdb -U dwar dwar_rN`) e um `.env`
  próprio no worktree, com outras portas (3107 na API e 5187 na web). Apagar no fim.
- **Números reais.** Muitos defeitos só aparecem com recursos de cinco dígitos, ataque a caminho, batalha
  recente e obra na fila ao mesmo tempo. Auditar com esses estados ativos: a rodada 9 declarou zero
  violações sem ter obra nem dois ataques, e estava errada.
- **População.** Ao inserir tropas por SQL, aumentar `population_used` junto. Sem isso, a resolução da
  batalha viola `villages_nonnegative_state` e a aldeia passa a responder 500.
- **Build de produção.** Medir carga no build, não no Vite. Cenário das medições: celular 390×844, 1,6 Mbps,
  150 ms, CPU 2× mais lenta, mediana de três. Comparar sempre no mesmo estado de jogo.
- **Navegadores.** Chromium headless pelo Playwright, Firefox pelo Puppeteer (BiDi) e WebKitGTK por Python
  com `gtk4-broadwayd`, sem abrir janela na sessão.
- **Larguras.** 390, 920, 1024, 1200, 1366, 1500, 1501, 1600 e 1920 px para a barra superior.

Os scripts usados estão em `.local/redesign-scripts/`, fora do Git e só na máquina de desenvolvimento. Os
caminhos apontam para a pasta temporária e o worktree da sessão original e precisam de ajuste.

## Fluxo

Um branch e um PR em rascunho por rodada. O merge é por squash e só com autorização explícita em cada PR.
Empilhar uma rodada sobre outra ainda não mergeada gera conflito depois do squash: nesse caso, conferir que
a `main` é igual ao branch de baixo e manter o conteúdo do branch de cima.
