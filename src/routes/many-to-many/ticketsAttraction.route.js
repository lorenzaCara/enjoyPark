import express from 'express';
import prisma from '../../prisma/prismaClient.js';

const ticketsAttractionRouter = express.Router();

// Associa un biglietto a un'attrazione
ticketsAttractionRouter.post('/ticket-attractions', async (req, res) => {
    const { ticketTypeId, attractionId } = req.body;

    try {
        const ticketAttraction = await prisma.ticketTypeAttraction.create({
            data: {
                ticketTypeId,
                attractionId,
            },
        });

        res.status(201).json(ticketAttraction);
    } catch (error) {
        console.error('Errore durante l\'associazione del biglietto all\'attrazione:', error);
        res.status(500).json({ message: 'Errore del server durante l\'associazione del biglietto all\'attrazione' });
    }
});

// Rimuovi l'associazione tra un biglietto e un'attrazione
ticketsAttractionRouter.delete('/ticket-attractions', async (req, res) => {
    const { ticketTypeId, attractionId } = req.body;

    try {
        await prisma.ticketTypeAttraction.delete({
            where: {
                ticketTypeId_attractionId: {
                    ticketTypeId,
                    attractionId,
                },
            },
        });

        res.status(204).send();
    } catch (error) {
        console.error('Errore durante la rimozione dell\'associazione del biglietto dall\'attrazione:', error);
        res.status(500).json({ message: 'Errore del server durante la rimozione dell\'associazione' });
    }
});

// Ottieni tutte le associazioni tra biglietti e attrazioni
ticketsAttractionRouter.get('/ticket-attractions', async (req, res) => {
    try {
        const ticketAttractions = await prisma.ticketTypeAttraction.findMany({
            include: {
                ticketType: true,
                attraction: true,
            },
        });

        res.json(ticketAttractions);
    } catch (error) {
        console.error('Errore durante il recupero delle associazioni tra biglietti e attrazioni:', error);
        res.status(500).json({ message: 'Errore del server durante il recupero delle associazioni' });
    }
});

export default ticketsAttractionRouter;
