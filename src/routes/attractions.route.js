import express from 'express';
import prisma from '../prisma/prismaClient.js';
import validatorMiddleware from '../middlewares/validator.middleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { createAttractionValidator, updateAttractionValidator } from '../validators/attractions.validator.js';

const attractionsRouter = express.Router();

// Create a new attraction
attractionsRouter.post('/attractions', authMiddleware, validatorMiddleware(createAttractionValidator),
    async (req, res) => {
        const { name, category, location, description, waitTime } = req.body;

        try {
            const attraction = await prisma.attraction.create({
                data: {
                    name,
                    category,
                    location,
                    description,
                    waitTime,
                },
            });

            res.status(201).json(attraction);
        } catch (error) {
            console.error('Error while creating the attraction:', error);
            res.status(500).json({ message: 'Server error while creating the attraction' });
        }
    }
);

// Get all attractions
attractionsRouter.get('/attractions', async (req, res) => {
    try {
        const attractions = await prisma.attraction.findMany();
        res.json(attractions);
    } catch (error) {
        console.error('Error while retrieving attractions:', error);
        res.status(500).json({ message: 'Server error while retrieving attractions' });
    }
});

// Get a single attraction by ID
attractionsRouter.get('/attractions/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const attraction = await prisma.attraction.findUnique({
            where: { id: parseInt(id) },
        });

        if (!attraction) {
            return res.status(404).json({ message: 'Attraction not found' });
        }

        res.json(attraction);
    } catch (error) {
        console.error('Error while retrieving the attraction:', error);
        res.status(500).json({ message: 'Server error while retrieving the attraction' });
    }
});

// Update an attraction
attractionsRouter.put('/attractions/:id', authMiddleware, validatorMiddleware(updateAttractionValidator),
    async (req, res) => {
        const { id } = req.params;
        const { name, category, location, description, waitTime } = req.body;

        try {
            const updatedAttraction = await prisma.attraction.update({
                where: { id: parseInt(id) },
                data: {
                    name,
                    category,
                    location,
                    description,
                    waitTime,
                },
            });

            res.json(updatedAttraction);
        } catch (error) {
            console.error('Error while updating the attraction:', error);
            res.status(500).json({ message: 'Server error while updating the attraction' });
        }
    }
);

// Delete an attraction
attractionsRouter.delete('/attractions/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.attraction.delete({
            where: { id: parseInt(id) },
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error while deleting the attraction:', error);
        res.status(500).json({ message: 'Server error while deleting the attraction' });
    }
});

export default attractionsRouter;
