import prisma from '../prisma/prismaClient.js';
import { TicketStatus } from '@prisma/client';

export async function updateExpiredTickets() {
  const now = new Date();
  await prisma.ticket.updateMany({
    where: {
      status: TicketStatus.ACTIVE,
      validFor: {
        lt: now,
      },
    },
    data: {
      status: TicketStatus.EXPIRED,
    },
  });
}

export async function ticketStatusMiddleware(req, res, next) {
  try {
    await updateExpiredTickets();
  } catch (error) {
    console.error('Errore aggiornando ticket scaduti:', error);
    // Non bloccare la richiesta se fallisce l'update
  }
  next();
}
