# DWar

Jogo de estratégia em navegador: construção de aldeias, produção de recursos, pesquisa, recrutamento de tropas, mercado, mapa mundial, combate e ranking de jogadores. Interface em React e TypeScript, API em NestJS, executor de eventos próprio e PostgreSQL.

A interface usa uma identidade visual própria: texturas de tijolo e madeira, paleta marrom e dourada, fonte Verdana, moldura com correntes e tabelas compactas. O cenário da aldeia mostra as posições dos edifícios com indicadores de nível e um quadro de produção sobreposto.

## Executar

Requisitos: Node.js 22.12 ou superior, pnpm 12 e Docker Desktop em execução.

```powershell
Copy-Item .env.example .env
pnpm install
pnpm db:up
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Copie `.env.example` apenas se ainda não existir `.env`. Os valores do exemplo são para desenvolvimento local.

- Jogo: [http://localhost:5180](http://localhost:5180).
- API: [http://localhost:3100/api/health](http://localhost:3100/api/health).
- Documentação da API: [http://localhost:3100/api/docs](http://localhost:3100/api/docs).
- PostgreSQL: porta local 55432.

Crie uma conta na interface, entre no Mundo Beta e confirme em **Construir** para fundar uma aldeia.

`WEB_ORIGIN` define o endereço da interface. Reinicie a API ao alterar `.env`. Em desenvolvimento, `localhost` e `127.0.0.1` na mesma porta são aceitos; cada endereço tem sua própria sessão no navegador.

## Organização

| Caminho | Responsabilidade |
| --- | --- |
| `apps/web` | Interface React e funcionalidades do jogador |
| `apps/api` | API NestJS, autenticação, entrada e validação das solicitações |
| `apps/worker` | Conclusão e recuperação de eventos persistidos |
| `packages/game-config` | Configuração inicial e definições do jogo |
| `packages/game-core` | Fórmulas e regras independentes de banco e interface |
| `packages/game-server` | Casos de uso e transações compartilhados pela API e executor |
| `packages/database` | Esquema Drizzle, migrações SQL e dados iniciais |
| `packages/api-client` | Cliente HTTP e tipos do contrato |

`pnpm dev` compila os pacotes antes de abrir os processos. Alterações em `apps/` têm recarga automática. Após editar pacotes compartilhados, execute `pnpm build:packages` para atualizar sua saída compilada; reinicie os processos se necessário.

## Comandos

```powershell
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm test` roda os testes unitários de `packages/game-core` (`node:test` com `tsx`, sem dependências novas e sem banco). O restante é validação funcional manual; não há testes E2E nem Playwright.

Para executar os processos compilados separadamente, depois de `pnpm build`:

```powershell
pnpm start:api
pnpm start:worker
```

O executor usa o banco como fonte de verdade. Construções continuam agendadas quando ele para e são retomadas ao reiniciar. Ao abrir a aldeia, a API também resolve construções vencidas antes de devolver o estado.

## Mundos e aldeias abandonadas

Para adicionar aldeias abandonadas em um mundo já existente, após compilar os pacotes: `pnpm db:barbarians br1 100`. O primeiro argumento é o slug do mundo e o segundo é a quantidade a criar. O comando usa as regras de fundação, posiciona cada aldeia no raio crescente do mapa e não reutiliza coordenadas ocupadas. Sem a quantidade, cria apenas a diferença entre fundações e abandonadas existentes.

O Mundo Beta usa o código público `br1`: [abrir o jogo](http://localhost:5180/br1/game).

## Licença

[GNU AGPL v3](LICENSE). Quem rodar uma versão modificada como serviço público precisa disponibilizar o código dessa versão.
