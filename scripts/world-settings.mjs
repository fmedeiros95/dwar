import { db, worlds, pool } from '../packages/database/dist/index.js';
import { updateWorldBarbarians, updateWorldSpeed } from '../packages/game-server/dist/index.js';

const usage =
  'Uso: pnpm db:world <mundo> [--barbarians N] [--build N] [--production N]\n' +
  '  --barbarians  aldeias bárbaras criadas a cada jogador novo (0 a 20)\n' +
  '  --build       velocidade de construção e recrutamento do mundo\n' +
  '  --production  velocidade de produção de recursos do mundo';

function integer(name, value) {
  if (value === undefined || !/^\d+$/.test(value)) throw new Error(`${name} exige um inteiro.\n${usage}`);
  return Number(value);
}

try {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug || slug.startsWith('--')) throw new Error(usage);
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    if (!['--barbarians', '--build', '--production'].includes(flag))
      throw new Error(`Opção desconhecida: ${flag}\n${usage}`);
    options[flag.slice(2)] = integer(flag, rest[index + 1]);
  }
  if (!Object.keys(options).length) throw new Error(usage);

  let world = (await db.select().from(worlds)).find((row) => row.slug === slug);
  if (!world) throw new Error('Mundo não encontrado.');
  if (options.build !== undefined || options.production !== undefined)
    world = await updateWorldSpeed(world.id, {
      buildSpeed: options.build ?? world.buildSpeed,
      productionSpeed: options.production ?? world.productionSpeed,
    });
  if (options.barbarians !== undefined)
    world = await updateWorldBarbarians(world.id, options.barbarians);
  console.log(
    JSON.stringify(
      {
        mundo: world.name,
        velocidadeConstrucao: world.buildSpeed,
        velocidadeProducao: world.productionSpeed,
        barbarasPorJogador: world.barbarianVillagesPerPlayer,
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
