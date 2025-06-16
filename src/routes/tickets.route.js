import express from "express";
import prisma from "../prisma/prismaClient.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import validatorMiddleware from "../middlewares/validator.middleware.js";
import {
  createTicketValidator,
  updateTicketValidator,
} from "../validators/tickets.validator.js";
import QRCode from "qrcode";
import { TicketStatus } from "@prisma/client";
import { ticketStatusMiddleware } from "../middlewares/ticketStatus.middleware.js";
import { staffMiddleware } from "../middlewares/staff.middleware.js";
import { validateQrCodeValidator } from "../validators/qrCode.validator.js";

const ticketsRouter = express.Router();

const formatTicketWithPrice = (ticket) => ({
  ...ticket,
  ticketType: {
    ...ticket.ticketType,
    price: ticket.ticketType.price,
  },
});

ticketsRouter.get("/ticket-types", async (req, res) => {
  try {
    const ticketTypes = await prisma.ticketType.findMany({
      include: {
        attractions: {
          include: { attraction: true },
        },
        services: {
          include: { service: true },
        },
        shows: {
          include: { show: true },
        },
      },
    });
    res.json(ticketTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving ticket types" });
  }
});

ticketsRouter.get(
  "/tickets",
  authMiddleware,
  ticketStatusMiddleware,
  async (req, res) => {
    try {
      const tickets = await prisma.ticket.findMany({
        where: { userId: req.user.id },
        include: {
          ticketType: {
            include: {
              attractions: { include: { attraction: true } },
              services: { include: { service: true } },
              shows: { include: { show: true } },
            },
          },
          user: true,
          discount: true,
        },
      });
      res.json(tickets.map(formatTicketWithPrice));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error retrieving tickets" });
    }
  }
);

ticketsRouter.get(
  "/tickets/:id",
  authMiddleware,
  ticketStatusMiddleware,
  async (req, res) => {
    // Aggiunto authMiddleware qui
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ticket ID" });

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          ticketType: {
            include: {
              attractions: { include: { attraction: true } },
              services: { include: { service: true } },
              shows: { include: { show: true } },
            },
          },
          user: true,
          discount: true,
        },
      });
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (ticket.userId !== req.user.id)
        return res.status(403).json({ error: "Permission denied" });
      res.json(formatTicketWithPrice(ticket));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error retrieving the ticket" });
    }
  }
);

ticketsRouter.post(
  "/tickets",
  authMiddleware,
  ticketStatusMiddleware,
  validatorMiddleware(createTicketValidator),
  async (req, res) => {
    const { ticketTypeId, validFor, discountId, status, paymentMethod } =
      req.body;
    try {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: ticketTypeId },
      });
      if (!ticketType)
        return res.status(404).json({ error: "Ticket type not found" }); // IMPORTANT: Ensure process.env.FRONTEND_URL is set correctly in your backend's hosting environment (e.g., Render) // It must be 'https://heptapod.vercel.app'

      const baseUrl = process.env.FRONTEND_URL;
      const rawCode = `TICKET-${req.user.id}-${ticketTypeId}-${Date.now()}`;
      const ticketUrl = `${baseUrl}/validate-ticket?code=${encodeURIComponent(
        rawCode
      )}`;

      const qrCodeImage = await QRCode.toDataURL(ticketUrl); // --- INIZIO MODIFICHE PER GESTIONE DATE E SCADENZA (POST /tickets) --- // validFor dovrebbe arrivare come "YYYY-MM-DD" dal frontend grazie a Zod

      const inputDateString = validFor; // Crea un oggetto Date che rappresenta la FINE del giorno IN UTC // Se l'input è "2025-06-16", questo sarà 2025-06-16T23:59:59.999Z

      const validForEndOfDayUTC = new Date(inputDateString + "T23:59:59.999Z"); // Ottieni la data odierna a mezzanotte UTC per il confronto "nel passato"

      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0); // Imposta a mezzanotte UTC // Controlla se la data di validità (fine del giorno) è antecedente all'inizio del giorno corrente (UTC) // Questo previene la creazione di biglietti già scaduti.

      if (validForEndOfDayUTC.getTime() < todayUTC.getTime()) {
        return res
          .status(400)
          .json({ error: "Validity date cannot be in the past" });
      } // Ora corrente in UTC

      const nowUTC = new Date();
      const isExpired = nowUTC.getTime() > validForEndOfDayUTC.getTime(); // Se l'ora attuale è dopo la fine del giorno del ticket

      const computedStatus = isExpired
        ? TicketStatus.EXPIRED
        : status || TicketStatus.ACTIVE;

      const ticket = await prisma.ticket.create({
        data: {
          userId: req.user.id,
          ticketTypeId,
          qrCode: qrCodeImage,
          rawCode,
          validFor: validForEndOfDayUTC, // <-- SALVA LA FINE DEL GIORNO INVECE DELL'INIZIO
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
      }); // --- FINE MODIFICHE PER GESTIONE DATE E SCADENZA ---
      res.status(201).json(formatTicketWithPrice(ticket));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error creating the ticket" });
    }
  }
);

ticketsRouter.put(
  "/tickets/:id",
  authMiddleware,
  ticketStatusMiddleware,
  validatorMiddleware(updateTicketValidator(false)),
  staffMiddleware,
  async (req, res) => {
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId))
      return res.status(400).json({ error: "Invalid ticket ID" });

    const { ticketTypeId, validFor, discountId, status, paymentMethod } =
      req.body;
    try {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: ticketTypeId },
      });
      if (!ticketType)
        return res.status(404).json({ error: "Ticket type not found" });

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });
      if (!ticket) return res.status(404).json({ error: "Ticket not found" }); // Prepara validFor per Prisma

      let updatedValidFor = validFor;
      if (
        typeof validFor === "string" &&
        validFor.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        // Se validFor è una stringa YYYY-MM-DD, convertila in una data UTC di FINE giornata
        updatedValidFor = new Date(validFor + "T23:59:59.999Z"); // MODIFICATO: Fine giorno UTC
      } else if (validFor instanceof Date) {
        // Se è già un oggetto Date, usalo così com'è (assumendo sia già UTC o sarà gestito da Prisma)
        updatedValidFor = validFor;
      } // else: se è null/undefined, non lo tocchiamo e Prisma userà il valore esistente se non presente in data:
      const now = new Date(); // Questa è la data e ora locale del server // Calcola lo status basandosi sulla data di validità (fine giornata UTC per consistenza) // Se updatedValidFor è stato settato a fine giornata, usalo direttamente
      const validForForStatusCheck =
        updatedValidFor instanceof Date ? updatedValidFor : null; // Usa direttamente updatedValidFor
      const computedStatus =
        status ||
        (validForForStatusCheck &&
        now.getTime() > validForForStatusCheck.getTime()
          ? TicketStatus.EXPIRED
          : TicketStatus.ACTIVE);

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          ticketTypeId,
          validFor: updatedValidFor, // Utilizza la data preparata (fine giorno UTC)
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
          user: true,
          discount: true,
        },
      });
      res.json(formatTicketWithPrice(updatedTicket));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error updating the ticket" });
    }
  }
);

ticketsRouter.delete(
  "/tickets/:id",
  authMiddleware,
  ticketStatusMiddleware,
  async (req, res) => {
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId))
      return res.status(400).json({ error: "Invalid ticket ID" });

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          ticketType: {
            include: {
              attractions: { include: { attraction: true } },
              services: { include: { service: true } },
              shows: { include: { show: true } },
            },
          },
          user: true,
          discount: true,
        },
      });
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (ticket.userId !== req.user.id)
        return res.status(403).json({ error: "Permission denied" });

      await prisma.ticket.delete({ where: { id: ticketId } });
      res.json({
        message: "Ticket successfully deleted",
        ticket: formatTicketWithPrice(ticket),
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Error deleting the ticket" });
    }
  }
);

ticketsRouter.post(
  "/tickets/validate",
  authMiddleware,
  staffMiddleware,
  async (req, res) => {
    const { qrCode: rawCode } = req.body;

    if (!rawCode) {
      return res
        .status(400)
        .json({ error: "rawCode is required for validation" });
    }

    try {
      const ticket = await prisma.ticket.findUnique({ where: { rawCode } });

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      if (ticket.status === "USED") {
        return res.status(400).json({ error: "Ticket already used" });
      } // --- INIZIO MODIFICHE PER LOGICA DATA VALIDAZIONE (POST /tickets/validate) --- // `ticket.validFor` ora dovrebbe essere la fine del giorno in UTC (es. 2025-06-16T23:59:59.999Z)

      const ticketValidUntilUTC = new Date(ticket.validFor);
      const nowUTC = new Date(); // Ora corrente in UTC // 1. Controlla se il biglietto è già scaduto (l'ora attuale è dopo la fine della validità)

      if (nowUTC.getTime() > ticketValidUntilUTC.getTime()) {
        return res.status(400).json({ error: "Ticket is expired" });
      } // 2. Controlla se il biglietto può essere validato nel giorno corrente (ignora l'ora) // Converti entrambe le date all'inizio del loro rispettivo giorno in UTC per il confronto diretto

      const ticketDayStartUTC = new Date(
        ticketValidUntilUTC.toISOString().split("T")[0] + "T00:00:00.000Z"
      );
      const todayStartUTC = new Date(
        nowUTC.toISOString().split("T")[0] + "T00:00:00.000Z"
      );

      if (ticketDayStartUTC.getTime() !== todayStartUTC.getTime()) {
        return res
          .status(400)
          .json({
            error: "Ticket can only be validated on the indicated date.",
          });
      } // --- FINE MODIFICHE PER LOGICA DATA VALIDAZIONE ---
      const updatedTicket = await prisma.ticket.update({
        where: { rawCode },
        data: { status: "USED" },
      });

      return res.json({
        message: "Ticket successfully validated",
        ticket: updatedTicket,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error during ticket validation" });
    }
  }
);

ticketsRouter.get(
  "/tickets/code/:rawCode",
  authMiddleware,
  async (req, res) => {
    const { rawCode } = req.params;

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { rawCode },
        include: {
          ticketType: {
            include: {
              attractions: {
                include: {
                  attraction: true,
                },
              },
            },
          },
          user: true,
          discount: true,
        },
      });

      if (!ticket) return res.status(404).json({ error: "Ticket not found" });

      res.json(formatTicketWithPrice(ticket));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error retrieving ticket by code" });
    }
  }
);

export default ticketsRouter;
