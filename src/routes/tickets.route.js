import express from 'express';
import prisma from '../prisma/prismaClient.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import validatorMiddleware from '../middlewares/validator.middleware.js';
import { createTicketValidator, updateTicketValidator } from '../validators/tickets.validator.js';
import QRCode from 'qrcode';
import { TicketStatus } from '@prisma/client';
import { ticketStatusMiddleware } from '../middlewares/ticketStatus.middleware.js';
import { staffMiddleware } from '../middlewares/staff.middleware.js';
import { validateQrCodeValidator } from '../validators/qrCode.validator.js';

const ticketsRouter = express.Router();

const formatTicketWithPrice = (ticket) => ({
  ...ticket,
  ticketType: {
    ...ticket.ticketType,
    price: ticket.ticketType.price,
  },
});

ticketsRouter.get('/ticket-types', async (req, res) => {
  try {
    const ticketTypes = await prisma.ticketType.findMany({
      include: {
        attractions: {
          include: { attraction: true }
        },
        services: {
          include: { service: true }
        },
        shows: {
          include: { show: true }
        }
      }
    });
    res.json(ticketTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving ticket types' });
  }
});

ticketsRouter.get('/tickets', authMiddleware, ticketStatusMiddleware, async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: req.user.id },
      include: {
        ticketType: {
          include: {
            attractions: { include: { attraction: true } },
            services: { include: { service: true } },
            shows: { include: { show: true } }
          }
        },
        user: true,
        discount: true,
      },
    });
    res.json(tickets.map(formatTicketWithPrice));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving tickets' });
  }
});

ticketsRouter.get('/tickets/:id', authMiddleware, ticketStatusMiddleware, async (req, res) => { // Aggiunto authMiddleware qui
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ticket ID' });

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        ticketType: 
        { include: 
          { 
            attractions: { include: { attraction: true } },
            services: { include: { service: true } },
            shows: { include: { show: true } }
           }
        },
        user: true,
        discount: true,
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.userId !== req.user.id) return res.status(403).json({ error: 'Permission denied' });
    res.json(formatTicketWithPrice(ticket));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving the ticket' });
  }
});

ticketsRouter.post(
  '/tickets',
  authMiddleware,
  ticketStatusMiddleware,
  validatorMiddleware(createTicketValidator),
  async (req, res) => {
    const { ticketTypeId, validFor, discountId, status, paymentMethod } = req.body;
    try {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: ticketTypeId },
      });
      if (!ticketType)
        return res.status(404).json({ error: 'Ticket type not found' });

      const baseUrl = process.env.FRONTEND_URL;
      const rawCode = `TICKET-${req.user.id}-${ticketTypeId}-${Date.now()}`;
      const ticketUrl = `${baseUrl}/validate-ticket?code=${encodeURIComponent(
        rawCode
      )}`;

      const qrCodeImage = await QRCode.toDataURL(ticketUrl);

      // --- INIZIO NUOVA LOGICA DATA CREAZIONE (POST /tickets) ---
      // validFor dovrebbe arrivare come "YYYY-MM-DD" dal frontend grazie a Zod
      const inputDateString = validFor; 

      // Crea un oggetto Date che rappresenta l'inizio del giorno IN UTC
      // Es: "2025-06-16" -> Date object per 2025-06-16T00:00:00.000Z
      const validForStartOfDayUTC = new Date(inputDateString + 'T00:00:00.000Z');

      // Ottieni la data odierna a mezzanotte UTC per il confronto "nel passato"
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0); // Imposta a mezzanotte UTC

      // Controlla se la data di validità è antecedente all'inizio del giorno corrente (UTC)
      if (validForStartOfDayUTC.getTime() < todayUTC.getTime()) {
        return res.status(400).json({ error: 'Validity date cannot be in the past' });
      }

      // Per la validità effettiva del ticket, lo facciamo scadere alla fine del giorno specificato (UTC)
      const validForEndOfDayUTC = new Date(inputDateString + 'T23:59:59.999Z');
      
      const nowUTC = new Date(); // Ora corrente in UTC
      const isExpired = nowUTC.getTime() > validForEndOfDayUTC.getTime(); // Se l'ora attuale è dopo la fine del giorno del ticket

      const computedStatus = isExpired ? TicketStatus.EXPIRED : status || TicketStatus.ACTIVE;

      const ticket = await prisma.ticket.create({
        data: {
          userId: req.user.id,
          ticketTypeId,
          qrCode: qrCodeImage,
          rawCode,
          validFor: validForStartOfDayUTC, // Salviamo l'inizio del giorno UTC nel DB per consistenza con validazione
          discountId: discountId || null,
          paymentMethod: paymentMethod || null,
          status: computedStatus,
        },
        include: {
          ticketType: {
            include: {
              attractions: { include: { attraction: true } },
              services: { include: { service: true } },
              shows: { include: { show: true } },
            },
          },
        },
      });
      // --- FINE NUOVA LOGICA DATA CREAZIONE ---

      res.status(201).json(formatTicketWithPrice(ticket));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error creating the ticket' });
    }
  }
);

ticketsRouter.put('/tickets/:id', authMiddleware, ticketStatusMiddleware, validatorMiddleware(updateTicketValidator(false)), staffMiddleware, async (req, res) => {
  const ticketId = parseInt(req.params.id);
  if (isNaN(ticketId)) return res.status(400).json({ error: 'Invalid ticket ID' });

  const { ticketTypeId, validFor, discountId, status, paymentMethod } = req.body;
  try {
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType) return res.status(404).json({ error: 'Ticket type not found' });

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    // Rimosso controllo ticket.userId !== req.user.id per permettere allo staff di aggiornare
    // Se la permissione è solo per il proprietario, la riga era corretta.
    // staffMiddleware dovrebbe gestire i permessi.

    // Prepara validFor per Prisma (questo era già stato corretto)
    let updatedValidFor = validFor;
    if (typeof validFor === 'string' && validFor.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Se validFor è una stringa YYYY-MM-DD, convertila in una data UTC di inizio giornata
      updatedValidFor = new Date(validFor + "T00:00:00.000Z"); // Salviamo inizio giorno UTC
    } else if (validFor instanceof Date) {
      // Se è già un oggetto Date, usalo così com'è (assumendo sia già UTC o sarà gestito da Prisma)
      updatedValidFor = validFor;
    } 
    // else: se è null/undefined, non lo tocchiamo e Prisma userà il valore esistente se non presente in data:

    const now = new Date(); // Questa è la data e ora locale del server
    // Calcola lo status basandosi sulla data di validità (fine giornata UTC per consistenza)
    const validForForStatusCheck = updatedValidFor instanceof Date ? new Date(updatedValidFor.toISOString().split('T')[0] + 'T23:59:59.999Z') : null;
    const computedStatus = status || (validForForStatusCheck && now.getTime() > validForForStatusCheck.getTime() ? TicketStatus.EXPIRED : TicketStatus.ACTIVE);

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ticketTypeId,
        validFor: updatedValidFor, // Utilizza la data preparata
        discountId: discountId || null,
        paymentMethod: paymentMethod || null,
        status: computedStatus,
      },
      include: {
        ticketType: { include: { 
            attractions: { include: { attraction: true } },
            services: { include: { service: true } },
            shows: { include: { show: true } } } },
        user: true,
        discount: true,
      }
    });
    res.json(formatTicketWithPrice(updatedTicket));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating the ticket' });
  }
});

ticketsRouter.delete('/tickets/:id', authMiddleware, ticketStatusMiddleware, async (req, res) => {
  const ticketId = parseInt(req.params.id);
  if (isNaN(ticketId)) return res.status(400).json({ error: 'Invalid ticket ID' });

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketType: { include: { 
            attractions: { include: { attraction: true } },
            services: { include: { service: true } },
            shows: { include: { show: true } } } },
        user: true,
        discount: true,
      }
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.userId !== req.user.id) return res.status(403).json({ error: 'Permission denied' });

    await prisma.ticket.delete({ where: { id: ticketId } });
    res.json({ message: 'Ticket successfully deleted', ticket: formatTicketWithPrice(ticket) });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error deleting the ticket' });
  }
});

ticketsRouter.post('/tickets/validate', authMiddleware, staffMiddleware, async (req, res) => {
  const { qrCode: rawCode } = req.body;

  if (!rawCode) {
    return res.status(400).json({ error: 'rawCode is required for validation' });
  }

  try {
    const ticket = await prisma.ticket.findUnique({ where: { rawCode } });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'USED') {
      return res.status(400).json({ error: 'Ticket already used' });
    }

    if (ticket.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Ticket not valid, status: ${ticket.status}` });
    }

    // --- INIZIO NUOVA LOGICA DATA VALIDAZIONE (POST /tickets/validate) ---
    const ticketValidForDB = new Date(ticket.validFor); // Ottieni la data come salvata nel DB (sarà UTC)

    // Crea un oggetto Date per l'inizio del giorno (UTC) della data di validità del ticket
    // Es: data dal DB 2025-06-16T00:00:00.000Z -> 2025-06-16T00:00:00.000Z
    const ticketValidDayUTC = new Date(ticketValidForDB.toISOString().split('T')[0] + 'T00:00:00.000Z');

    // Crea un oggetto Date per l'inizio del giorno (UTC) di oggi
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0); // Questo assicura che sia l'inizio del giorno UTC

    // Confronta i timestamp UTC degli inizi dei giorni per verificare se è lo stesso giorno
    if (ticketValidDayUTC.getTime() !== todayUTC.getTime()) {
      return res.status(400).json({ error: 'Ticket can only be validated on the indicated date.' });
    }
    // --- FINE NUOVA LOGICA DATA VALIDAZIONE ---

    const updatedTicket = await prisma.ticket.update({
      where: { rawCode },
      data: { status: 'USED' }
    });

    return res.json({ message: 'Ticket successfully validated', ticket: updatedTicket });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error during ticket validation' });
  }
});


ticketsRouter.get('/tickets/code/:rawCode', authMiddleware, async (req, res) => {
  const { rawCode } = req.params;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { rawCode },
      include: {
        ticketType: {
          include: {
            attractions: {
              include: {
                attraction: true
              }
            }
          }
        },
        user: true,
        discount: true
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    res.json(formatTicketWithPrice(ticket));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving ticket by code' });
  }
});

export default ticketsRouter;