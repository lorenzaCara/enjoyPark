import express from 'express';
import prisma from '../prisma/prismaClient.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import validatorMiddleware from '../middlewares/validator.middleware.js';
import { createServiceValidator, updateServiceValidator } from '../validators/services.validator.js';

const servicesRouter = express.Router();

// Create a new service
servicesRouter.post('/services', authMiddleware, validatorMiddleware(createServiceValidator), async (req, res) => {
    const { name, location, type } = req.body;

    try {
        const newService = await prisma.service.create({
            data: {
                name,
                location,
                type,
            },
        });

        res.status(201).json(newService);
    } catch (error) {
        console.error("Error creating service:", error);
        res.status(500).json({ message: 'Server error while creating service' });
    }
});

// Get all services
servicesRouter.get('/services', async (req, res) => {
    try {
        const services = await prisma.service.findMany();
        res.json(services);
    } catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).json({ message: 'Server error while fetching services' });
    }
});

// Get a service by ID
servicesRouter.get('/services/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const service = await prisma.service.findUnique({
            where: { id: parseInt(id) },
        });

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json(service);
    } catch (error) {
        console.error("Error fetching service:", error);
        res.status(500).json({ message: 'Server error while fetching service' });
    }
});

// Update a service
servicesRouter.put('/services/:id', authMiddleware, validatorMiddleware(updateServiceValidator()), async (req, res) => {
    const { id } = req.params;
    const { name, location, type } = req.body;

    try {
        const updatedService = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                name,
                location,
                type,
            },
        });

        res.json(updatedService);
    } catch (error) {
        console.error("Error updating service:", error);
        res.status(500).json({ message: 'Server error while updating service' });
    }
});

// Delete a service
servicesRouter.delete('/services/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.service.delete({
            where: { id: parseInt(id) },
        });

        res.status(204).send();
    } catch (error) {
        console.error("Error deleting service:", error);
        res.status(500).json({ message: 'Server error while deleting service' });
    }
});

export default servicesRouter;
