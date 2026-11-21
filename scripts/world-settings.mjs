import { db, worlds, pool } from '../packages/database/dist/index.js';
import {
  updateBarbarianMaxPoints,
  updateWorldBarbarians,
  updateWorldSpeed,
} from '../packages/game-server/dist/index.js';

const usage =
  'Uso: pnpm db:world <mundo> [--barbarians N] [--barbarian-max-points N] [--build N] [--production N] [--unit-speed N]\n' +
  '  --barbarians  aldeias bárbaras criadas a cada jogador novo (0 a 20)\n' +
  '  --barbarian-max-points  pontuação-limite até onde as bárbaras evoluem sozinhas (0 desliga)\n' +
  '  --build       velocidade de construção e recrutamento do mundo\n' +
  '  --production  velocidade de produção de recursos do mundo\n' +
  '  --unit-speed  velocidade das tropas (só o tempo de viagem); 1000 = normal, 500 = metade';

function integer(name, value) {
  if (value === undefined || !/^\d+$/.test(value))
    throw new Error(`${name} exige um inteiro.\n${usage}`);
  return Number(value);
}

try {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug || slug.startsWith('--')) throw new Error(usage);
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    if (
      ![
        '--barbarians',
        '--barbarian-max-points',
        '--build',
        '--production',
        '--unit-speed',
      ].includes(flag)
    )
      throw new Error(`Opção desconhecida: ${flag}\n${usage}`);
    options[flag.slice(2).replace(/-(\w)/g, (_, letter) => letter.toUpperCase())] = integer(
      flag,
      rest[index + 1],
    );
  }
  if (!Object.keys(options).length) throw new Error(usage);

  let world = (await db.select().from(worlds)).find((row) => row.slug === slug);
  if (!world) throw new Error('Mundo não encontrado.');
  if (
    options.build !== undefined ||
    options.production !== undefined ||
    options.unitSpeed !== undefined
  )
    world = await updateWorldSpeed(world.id, {
      buildSpeed: options.build ?? world.buildSpeed,
      productionSpeed: options.production ?? world.productionSpeed,
      unitSpeed: options.unitSpeed ?? world.unitSpeed,
    });
  if (options.barbarians !== undefined)
    world = await updateWorldBarbarians(world.id, options.barbarians);
  if (options.barbarianMaxPoints !== undefined)
    world = await updateBarbarianMaxPoints(world.id, options.barbarianMaxPoints);
  console.log(
    JSON.stringify(
      {
        mundo: world.name,
        velocidadeConstrucao: world.buildSpeed / 1000,
        velocidadeProducao: world.productionSpeed / 1000,
        velocidadeDasTropas: world.unitSpeed / 1000,
        barbarasPorJogador: world.barbarianVillagesPerPlayer,
        limiteDePontosDasBarbaras: world.barbarianMaxPoints,
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
