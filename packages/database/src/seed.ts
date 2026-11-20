import { db, pool, worlds } from './index.js';
import { worldDefaults } from '@dwar/game-config';

try {
  await db.insert(worlds).values(worldDefaults).onConflictDoNothing({ target: worlds.slug });
  console.log('Mundo Beta disponível.');
} finally {
  await pool.end();
}
