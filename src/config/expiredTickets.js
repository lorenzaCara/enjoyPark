import cron from 'node-cron';
import prisma from '../prisma/prismaClient.js';

export function startExpireTicketsJob() {
  cron.schedule('* * * * *', async () => {  // runs every minute
    console.log('Cron job triggered at', new Date().toISOString());
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // reset time to start of the day

      const result = await prisma.ticket.updateMany({
        where: {
          validFor: { lt: today },
          status: { in: ['ACTIVE', 'USED'] },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      console.log(`[${new Date().toISOString()}] Expired tickets updated: ${result.count}`);
    } catch (err) {
      console.error('Error while updating expired tickets:', err);
    }
  });
}


