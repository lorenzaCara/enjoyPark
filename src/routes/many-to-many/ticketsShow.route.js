import express from 'express';
import prisma from '../../prisma/prismaClient.js';

const ticketShowRouter = express.Router();

// Associa un biglietto a uno spettacolo
ticketShowRouter.post('/ticket-shows', async (req, res) => {
  const { ticketTypeId, showId } = req.body;

  try {
    const ticketShow = await prisma.ticketTypeShow.create({
      data: {
        ticketTypeId,
        showId,
      },
    });

    res.status(201).json(ticketShow);
  } catch (error) {
    console.error("Errore durante l'associazione del biglietto allo spettacolo:", error);
    res.status(500).json({ message: "Errore del server durante l'associazione" });
  }
});

// Rimuovi l'associazione tra un biglietto e uno spettacolo
ticketShowRouter.delete('/ticket-shows', async (req, res) => {
  const { ticketTypeId, showId } = req.body;

  try {
    await prisma.ticketTypeShow.delete({
      where: {
        ticketTypeId_showId: {
          ticketTypeId,
          showId,
        },
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Errore durante la rimozione dell'associazione:", error);
    res.status(500).json({ message: "Errore del server durante la rimozione dell'associazione" });
  }
});

// Recupera tutte le associazioni tra biglietti e spettacoli
ticketShowRouter.get('/ticket-shows', async (req, res) => {
  try {
    const ticketShows = await prisma.ticketTypeShow.findMany({
      include: {
        ticketType: true,
        show: true,
      },
    });

    res.json(ticketShows);
  } catch (error) {
    console.error("Errore durante il recupero delle associazioni:", error);
    res.status(500).json({ message: "Errore del server durante il recupero delle associazioni" });
  }
});

export default ticketShowRouter;
