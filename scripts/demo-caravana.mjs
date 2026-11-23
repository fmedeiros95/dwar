// Partida de teste da Partilha da Caravana, num banco separado (dwar_caravana).
//   pnpm demo:caravana            prepara (se preciso) e sobe o jogo em http://localhost:5200
//   pnpm demo:caravana nova       encerra a partilha aberta e chama outra, com os papéis trocados
//   pnpm demo:caravana prazo      vence o prazo da etapa atual
//   pnpm demo:caravana trocar     troca as necessidades das duas aldeias
//   pnpm demo:caravana recomecar  volta ao início (apaga só o banco de teste)
import { randomBytes, scryptSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const name = 'dwar_caravana';
const password = 'caravana';
const base = new URL(process.env.DATABASE_URL);
const { Pool } = createRequire(new URL('../packages/database/package.json', import.meta.url))('pg');
const env = {
  ...process.env,
  DATABASE_URL: Object.assign(new URL(base), { pathname: `/${name}` }).href,
  API_PORT: '3120',
  WEB_PORT: '5200',
  WEB_ORIGIN: 'http://localhost:5200',
};

const admin = new Pool({
  connectionString: Object.assign(new URL(base), { pathname: '/postgres' }).href,
});
if (process.argv[2] === 'recomecar')
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
const found = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
if (!found.rowCount) await admin.query(`CREATE DATABASE ${name}`);
await admin.end();

async function run(file) {
  const child = spawn(process.execPath, [file], { cwd: root, env, stdio: 'inherit' });
  const [code] = await once(child, 'exit');
  if (code) throw new Error(`${file} falhou (${code}).`);
}
await run('packages/database/dist/migrate.js');
await run('packages/database/dist/seed.js');

const pool = new Pool({ connectionString: env.DATABASE_URL });
const q = async (text, values) => (await pool.query(text, values)).rows;
const levels = {
  main: 10,
  barracks: 6,
  stable: 3,
  workshop: 0,
  noble: 0,
  smith: 5,
  place: 1,
  market: 5,
  wood: 12,
  stone: 12,
  iron: 11,
  farm: 13,
  storage: 10,
  hide: 3,
  wall: 4,
  treasury: 0,
  mill: 0,
};
/** Duas economias: uma parada por falta de argila, outra por falta de madeira e ferro. */
const needs = [
  { buildings: { ...levels, wood: 14, stone: 11, main: 11 }, wood: 2300, stone: 300, iron: 1300 },
  { buildings: { ...levels, smith: 8, barracks: 8, wall: 7 }, wood: 500, stone: 2200, iron: 400 },
];
async function applyNeeds(order) {
  for (const [index, village] of [
    ['Iara', 0],
    ['Tomé', 1],
  ].map(([u], i) => [order[i], u]))
    await q(
      `UPDATE villages v SET buildings=$1, wood=$2, stone=$3, iron=$4, population_used=600, updated_at=now()
       FROM players p JOIN accounts a ON a.id=p.account_id WHERE v.player_id=p.id AND a.username=$5`,
      [needs[index].buildings, needs[index].wood, needs[index].stone, needs[index].iron, village],
    );
}
const [world] = await q('SELECT id FROM worlds ORDER BY id LIMIT 1');
if (!(await q('SELECT 1 FROM accounts')).length) {
  for (const [username, x, y] of [
    ['Iara', 500, 500],
    ['Tomé', 504, 502],
  ]) {
    const salt = randomBytes(16).toString('hex');
    const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
    const [account] = await q(
      'INSERT INTO accounts (username,email,password_hash) VALUES ($1,$2,$3) RETURNING id',
      [username, `${x}@caravana.local`, hash],
    );
    const [player] = await q(
      'INSERT INTO players (account_id, world_id) VALUES ($1,$2) RETURNING id',
      [account.id, world.id],
    );
    await q(
      `INSERT INTO villages (world_id,player_id,name,x,y,wood,stone,iron,population_used,points,buildings,updated_at)
       VALUES ($1,$2,$3,$4,$5,500,500,500,600,300,$6,now())`,
      [world.id, player.id, username === 'Iara' ? 'Pedra Alta' : 'Vau do Moinho', x, y, levels],
    );
  }
  await applyNeeds([0, 1]);
}
process.env.DATABASE_URL = env.DATABASE_URL;
const { openCaravan } = await import('../packages/game-server/dist/index.js');
const pair = await q('SELECT id FROM villages WHERE player_id IS NOT NULL ORDER BY id LIMIT 2');
async function call() {
  // O jogo só chama outra caravana com o portão livre: descarrega o que ficou da partida anterior.
  await q(
    `UPDATE villages v SET wood=v.wood+(c."left"->>'wood')::int, stone=v.stone+(c."left"->>'stone')::int,
       iron=v.iron+(c."left"->>'iron')::int FROM caravan_carts c WHERE c.village_id=v.id AND c.emptied_at IS NULL`,
  );
  await q('UPDATE caravan_carts SET emptied_at=now() WHERE emptied_at IS NULL');
  await q('DELETE FROM caravans WHERE resolved_at IS NULL');
  const caravan = await openCaravan(world.id, pair[0].id, pair[1].id);
  const [who] = await q(
    'SELECT a.username FROM players p JOIN accounts a ON a.id=p.account_id WHERE p.id=$1',
    [caravan.dividerPlayerId],
  );
  console.log(`Caravana em ${caravan.x}|${caravan.y}. Quem divide: ${who.username}.`);
}
const command = process.argv[2] ?? 'jogar';
if (command === 'nova') await call();
else if (command === 'prazo') {
  const rows = await q(
    `UPDATE caravans SET divide_by = CASE WHEN sun IS NULL THEN now() ELSE divide_by END,
       choose_by = CASE WHEN sun IS NULL THEN NULL ELSE now() END
     WHERE resolved_at IS NULL RETURNING id`,
  );
  console.log(rows.length ? 'Prazo da etapa vencido.' : 'Nenhuma partilha aberta.');
} else if (command === 'trocar') {
  const [done] = await q(
    "SELECT (buildings->>'smith')::int AS smith FROM villages ORDER BY id LIMIT 1",
  );
  await applyNeeds(done.smith >= 8 ? [0, 1] : [1, 0]);
  console.log('Necessidades trocadas.');
} else if (!(await q('SELECT 1 FROM caravans WHERE resolved_at IS NULL')).length) await call();
await pool.end();
const { pool: shared } = await import('../packages/database/dist/index.js');
await shared.end();

if (command === 'jogar' || command === 'recomecar') {
  console.log(`\nAbra http://localhost:5200/br1/game — contas Iara e Tomé, senha "${password}".`);
  console.log('Use uma janela anônima para a segunda conta.\n');
  const tsx = `${root}node_modules/tsx/dist/cli.mjs`;
  const children = [
    spawn(process.execPath, [tsx, 'src/main.ts'], {
      cwd: `${root}apps/api`,
      env,
      stdio: 'inherit',
    }),
    spawn(process.execPath, [tsx, 'src/main.ts'], {
      cwd: `${root}apps/worker`,
      env,
      stdio: 'inherit',
    }),
    spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
      cwd: `${root}apps/web`,
      env,
      stdio: 'inherit',
    }),
  ];
  const stop = () => children.forEach((child) => child.kill('SIGTERM'));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
