import { processWorldEvents } from '@dwar/game-server';
import { pool } from '@dwar/database';
import { setTimeout } from 'node:timers/promises';

let stopping = false;
process.on('SIGINT', () => {
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});
console.log('Executor do mundo iniciado. Intervalo: 1 segundo.');
try {
  while (!stopping) {
    try {
      const count = await processWorldEvents();
      if (count > 0)
        console.log(
          JSON.stringify({ message: 'Eventos processados', count, time: new Date().toISOString() }),
        );
    } catch (error) {
      console.error('Falha ao processar eventos. Nova tentativa no próximo ciclo.', error);
    }
    if (!stopping) await setTimeout(1000);
  }
} finally {
  await pool.end();
}
