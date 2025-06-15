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

ticketsRouter.get('/tickets/:id', ticketStatusMiddleware, async (req, res) => {
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

      const baseUrl = process.env.FRONTEND_URL; // your frontend URL here
      const rawCode = `TICKET-${req.user.id}-${ticketTypeId}-${Date.now()}`;
      const ticketUrl = `${baseUrl}/validate-ticket?code=${encodeURIComponent(
        rawCode
      )}`;

      const qrCodeImage = await QRCode.toDataURL(ticketUrl);

      const parsedValidFor = new Date(validFor);
      const year = parsedValidFor.getFullYear();
      const month = parsedValidFor.getMonth() + 1;
      const day = parsedValidFor.getDate();

      // Check if date is in the past (day only, ignoring time)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // midnight
      const validForDay = new Date(year, month - 1, day);
      if (validForDay < today) {
        return res.status(400).json({ error: 'Validity date cannot be in the past' });
      }

      // Set time to 23:59:59 of the selected day
      const validForDateLocal = new Date(year, month - 1, day, 23, 59, 59);

      // Check if expired
      const now = new Date();
      const isExpired = now.getTime() > validForDateLocal.getTime();

      const computedStatus = isExpired ? TicketStatus.EXPIRED : status || TicketStatus.ACTIVE;

      const ticket = await prisma.ticket.create({
        data: {
          userId: req.user.id,
          ticketTypeId,
          qrCode: qrCodeImage,
          rawCode,
          validFor: validForDateLocal,
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
    if (ticket.userId !== req.user.id) return res.status(403).json({ error: 'Permission denied' });

    const now = new Date();
    const validForDate = new Date(validFor);
    const computedStatus = status || (now > validForDate ? TicketStatus.EXPIRED : TicketStatus.ACTIVE);

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ticketTypeId,
        validFor,
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

// authMiddleware verifies the token, staffMiddleware verifies if user is staff
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const validForDate = new Date(ticket.validFor);
    validForDate.setHours(0, 0, 0, 0);

    if (validForDate.getTime() !== today.getTime()) {
      return res.status(400).json({ error: 'Ticket can only be validated on the indicated date' });
    }

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
