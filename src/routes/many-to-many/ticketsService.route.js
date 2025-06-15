import express from 'express';
import prisma from '../../prisma/prismaClient.js';

const ticketServiceRouter = express.Router();

// Associa un biglietto a un servizio
ticketServiceRouter.post('/ticket-services', async (req, res) => {
    const { ticketTypeId, serviceId } = req.body;

    try {
        const ticketService = await prisma.ticketTypeService.create({
            data: {
                ticketTypeId,
                serviceId,
            },
        });

        res.status(201).json(ticketService);
    } catch (error) {
        console.error('Errore durante l\'associazione del biglietto al servizio:', error);
        res.status(500).json({ message: 'Errore del server durante l\'associazione del biglietto al servizio' });
    }
});

// Rimuovi l'associazione tra un biglietto e un servizio
ticketServiceRouter.delete('/ticket-services', async (req, res) => {
    const { ticketTypeId, serviceId } = req.body;

    try {
        await prisma.ticketTypeService.delete({
            where: {
                ticketTypeId_serviceId: {
                    ticketTypeId,
                    serviceId,
                },
            },
        });

        res.status(204).send();
    } catch (error) {
        console.error('Errore durante la rimozione dell\'associazione del biglietto dal servizio:', error);
        res.status(500).json({ message: 'Errore del server durante la rimozione dell\'associazione' });
    }
});

// Ottieni tutte le associazioni tra biglietti e servizi
ticketServiceRouter.get('/ticket-services', async (req, res) => {
    try {
        const ticketServices = await prisma.ticketTypeService.findMany({
            include: {
                ticketType: true,
                service: true,
            },
        });

        res.json(ticketServices);
    } catch (error) {
        console.error('Errore durante il recupero delle associazioni tra biglietti e servizi:', error);
        res.status(500).json({ message: 'Errore del server durante il recupero delle associazioni' });
    }
});

export default ticketServiceRouter;
