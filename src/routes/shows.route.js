import express from 'express';
import prisma from '../prisma/prismaClient.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import validatorMiddleware from '../middlewares/validator.middleware.js';
import { createShowValidator, updateShowValidator } from '../validators/shows.validator.js';
import { ShowStatus } from '@prisma/client';
import { subMinutes, isAfter } from 'date-fns';

const showsRouter = express.Router();

// Function to determine show status based on timing
function calculateShowStatus(start, end) {
    const now = new Date();

    if (now < start) {
        return ShowStatus.SCHEDULED;
    } else if (now >= start && now <= end) {
        return ShowStatus.ONGOING;
    } else {
        return ShowStatus.FINISHED;
    }
}

showsRouter.post('/shows', authMiddleware, validatorMiddleware(createShowValidator), async (req, res) => {
    const { title, description, date, startTime, endTime, location, plannerId } = req.body;

    try {
        const start = new Date(`${date.split('T')[0]}T${startTime}`);
        const end = new Date(`${date.split('T')[0]}T${endTime}`);
        const status = calculateShowStatus(start, end);

        // Fetch planner with user
        const planner = await prisma.planner.findUnique({
            where: { id: plannerId },
            include: { user: true }
        });

        if (!planner || !planner.user) {
            return res.status(400).json({ message: 'Planner or associated user not found' });
        }

        const newShow = await prisma.show.create({
            data: {
              title,
              description,
              date: new Date(date),
              startTime: start,
              endTime: end,
              location,
              status,
              planners: {
                connect: { id: plannerId } 
              }
            },
          });

        // Create notification for 10 minutes before start
        const notifyAt = subMinutes(start, 10);
        const now = new Date();

        const plannerUser = await prisma.user.findUnique({
            where: { id: planner.user.id },
            select: { allowNotifications: true },
          });

          if (plannerUser?.allowNotifications && isAfter(notifyAt, now)) {
            await prisma.notification.create({
                data: {
                    userId: planner.user.id,
                    title: 'Show Reminder',
                    message: `The show "${title}" will start in 10 minutes.`,
                    sendAt: notifyAt,
                    sent: false,
                    showId: newShow.id,
                },
            });
        }

        res.status(201).json(newShow);
    } catch (error) {
        console.error("Error creating the show:", error);
        res.status(500).json({ message: 'Server error while creating the show' });
    }
});

// Get all shows
showsRouter.get('/shows', async (req, res) => {
    try {
        const shows = await prisma.show.findMany();
        const now = new Date();

        const updated = shows.map(show => {
            const start = new Date(show.startTime);
            const end = new Date(show.endTime);

            let status = show.status;

            // Only recalculate if it's a temporal status
            if ([ShowStatus.SCHEDULED, ShowStatus.ONGOING, ShowStatus.FINISHED].includes(status)) {
                status = calculateShowStatus(start, end);
            }

            return { ...show, status };
        });

        res.json(updated);
    } catch (error) {
        console.error("Error fetching shows:", error);
        res.status(500).json({ message: 'Server error while fetching shows' });
    }
});

// Get a show by ID
showsRouter.get('/shows/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const show = await prisma.show.findUnique({
            where: { id: parseInt(id) },
        });

        if (!show) {
            return res.status(404).json({ message: 'Show not found' });
        }

        const start = new Date(show.startTime);
        const end = new Date(show.endTime);

        let status = show.status;

        if ([ShowStatus.SCHEDULED, ShowStatus.ONGOING, ShowStatus.FINISHED].includes(status)) {
            status = calculateShowStatus(start, end);
        }

        res.json({ ...show, status });
    } catch (error) {
        console.error("Error fetching the show:", error);
        res.status(500).json({ message: 'Server error while fetching the show' });
    }
});

// Update a show
showsRouter.put('/shows/:id', authMiddleware, validatorMiddleware(updateShowValidator), async (req, res) => {
    const { id } = req.params;
    const { title, description, date, startTime, endTime, location } = req.body;

    try {
        const start = new Date(`${date.split('T')[0]}T${startTime}`);
        const end = new Date(`${date.split('T')[0]}T${endTime}`);
        const status = calculateShowStatus(start, end);

        const updatedShow = await prisma.show.update({
            where: { id: parseInt(id) },
            data: {
                title,
                description,
                date: new Date(date),
                startTime: start,
                endTime: end,
                location,
                status,
            },
        });

        res.json(updatedShow);
    } catch (error) {
        console.error("Error updating the show:", error);
        res.status(500).json({ message: 'Server error while updating the show' });
    }
});

// Delete a show
showsRouter.delete('/shows/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.show.delete({
            where: { id: parseInt(id) },
        });

        res.status(204).send();
    } catch (error) {
        console.error("Error deleting the show:", error);
        res.status(500).json({ message: 'Server error while deleting the show' });
    }
});

// Manually update status (for CANCELLED / DELAYED)
showsRouter.put('/shows/:id/status', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (![ShowStatus.CANCELLED, ShowStatus.DELAYED].includes(status)) {
        return res.status(400).json({ message: 'Only CANCELLED or DELAYED are allowed for manual status update' });
    }

    try {
        const updated = await prisma.show.update({
            where: { id: parseInt(id) },
            data: { status },
        });

        res.json(updated);
    } catch (error) {
        console.error("Error updating status manually:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default showsRouter;
