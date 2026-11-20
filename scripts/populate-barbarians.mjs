import { db, worlds, pool } from '../packages/database/dist/index.js';
import { populateBarbarianVillages } from '../packages/game-server/dist/index.js';

try {
  const slug = process.argv[2];
  const quantityArgument = process.argv[3];
  if (!slug) throw new Error('Informe o mundo: pnpm db:barbarians br1 100');
  if (process.argv.length > 4) throw new Error('Uso: pnpm db:barbarians <mundo> <quantidade>');

  let quantity;
  if (quantityArgument !== undefined) {
    if (!/^[1-9]\d*$/.test(quantityArgument))
      throw new Error('A quantidade deve ser um inteiro positivo.');
    quantity = Number(quantityArgument);
    if (!Number.isSafeInteger(quantity))
      throw new Error('A quantidade excede o limite seguro do JavaScript.');
  }

  const world = (await db.select().from(worlds)).find((row) => row.slug === slug);
  if (!world) throw new Error('Mundo não encontrado.');
  const created = await populateBarbarianVillages(world.id, quantity);
  console.log(
    JSON.stringify(
      {
        world: world.name,
        requested: quantity ?? null,
        created: created.map(({ id, name, x, y }) => ({ id, name, x, y })),
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
