import cron from 'node-cron';
import prisma from '../prisma/prismaClient.js';

export function startExpireTicketsJob() {
  cron.schedule('* * * * *', async () => {  // ogni minuto
    console.log('Job cron attivato alle', new Date().toISOString());
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await prisma.ticket.updateMany({
        where: {
          validFor: { lt: today },
          status: { in: ['ACTIVE', 'USED'] },
        },
        data: {
          status: 'EXPIRED',
        },
      });


      console.log(`[${new Date().toISOString()}] Biglietti scaduti aggiornati: ${result.count}`);
    } catch (err) {
      console.error('Errore nell’aggiornamento dei biglietti scaduti:', err);
    }
  });
}

