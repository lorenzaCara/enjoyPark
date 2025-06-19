import express from 'express';
import prisma from '../prisma/prismaClient.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import validatorMiddleware from '../middlewares/validator.middleware.js';
import { createPlannerValidator, deletePlannerValidator, updatePlannerValidator } from '../validators/planners.validator.js';

const plannerRouter = express.Router();

// Create a new planner
plannerRouter.post('/planners', authMiddleware, validatorMiddleware(createPlannerValidator) , async (req, res) => {
  const { title, description, ticketId, date, attractionIds = [], showIds = [], serviceIds = [] } = req.body;
  const userId = req.user.id;

  try {
    // Validate date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    // Check that the ticket belongs to the user and is active
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId,
        status: 'USED',
      },
      include: {
        ticketType: true,
      },
    });

    if (!ticket) {
      console.error('Ticket not found or not active:', { userId, ticketId });
      return res.status(400).json({ message: 'The ticket must be validated before creating a planner.' });
    }

    const ticketTypeId = ticket.ticketTypeId;

    // Filter activities based on the ticket type
    const validAttractions = await prisma.ticketTypeAttraction.findMany({
      where: { ticketTypeId },
      select: { attractionId: true },
    });
    const validShows = await prisma.ticketTypeShow.findMany({
      where: { ticketTypeId },
      select: { showId: true },
    });
    const validServices = await prisma.ticketTypeService.findMany({
      where: { ticketTypeId },
      select: { serviceId: true },
    });

    const filteredAttractionIds = attractionIds.filter((id) =>
      validAttractions.some((a) => a.attractionId === id)
    );
    const filteredShowIds = showIds.filter((id) =>
      validShows.some((s) => s.showId === id)
    );
    const filteredServiceIds = serviceIds.filter((id) =>
      validServices.some((s) => s.serviceId === id)
    );

    // Create the planner
    const planner = await prisma.planner.create({
      data: {
        userId,
        ticketId,
        title,
        description,
        date: parsedDate,
        attractions: {
          connect: filteredAttractionIds.map((id) => ({ id })),
        },
        shows: {
          connect: filteredShowIds.map((id) => ({ id })),
        },
        services: {
          connect: filteredServiceIds.map((id) => ({ id })),
        },
      },
      include: {
        attractions: true,
        shows: true,
        services: true,
      },
    });

    res.status(201).json(planner);
  } catch (error) {
    console.error('Error creating planner:', error);
    res.status(500).json({ message: 'Server error during planner creation' });
  }
});

// GET - Get all planners
plannerRouter.get('/planners', async (req, res) => {
  try {
    const planners = await prisma.planner.findMany({
      include: {
        attractions: true,
        shows: true,
        services: true,
        user: true,
        ticket: {
          include: { ticketType: true },
        },
      },
    });
    res.json(planners);
  } catch (error) {
    console.error('Error retrieving planners:', error);
    res.status(500).json({ message: 'Server error while retrieving planners' });
  }
});

// GET - Get a planner by ID
plannerRouter.get('/planners/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const planner = await prisma.planner.findUnique({
      where: { id: parseInt(id) },
      include: {
        attractions: true,
        shows: true,
        services: true,
        user: true,
        ticket: {
          include: { ticketType: true },
        },
      },
    });

    if (!planner) {
      return res.status(404).json({ message: 'Planner not found' });
    }

    res.json(planner);
  } catch (error) {
    console.error('Error retrieving the planner:', error);
    res.status(500).json({ message: 'Server error while retrieving the planner' });
  }
});

// PUT - Update a planner
plannerRouter.put(
  "/planners/:id",
  authMiddleware,
  validatorMiddleware(updatePlannerValidator(true)),
  async (req, res) => {
    const { id } = req.params;
    const {
      title,
      description,
      date,
      attractionIds = [],
      showIds = [],
      serviceIds = [],
    } = req.body;

    try {
      const planner = await prisma.planner.findUnique({
        where: { id: parseInt(id) },
        include: {
          ticket: true,
        },
      });

      if (!planner) {
        return res.status(404).json({ message: "Planner not found" });
      }

      const ticketTypeId = planner.ticket.ticketTypeId;

      const validAttractions = await prisma.ticketTypeAttraction.findMany({
        where: { ticketTypeId },
        select: { attractionId: true },
      });
      const validShows = await prisma.ticketTypeShow.findMany({
        where: { ticketTypeId },
        select: { showId: true },
      });
      const validServices = await prisma.ticketTypeService.findMany({
        where: { ticketTypeId },
        select: { serviceId: true },
      });

      // Filtra solo gli ID validi in base al tipo di ticket
      const filteredAttractionIds = attractionIds.filter((id) =>
        validAttractions.some((a) => a.attractionId === id)
      );
      const filteredShowIds = showIds.filter((id) =>
        validShows.some((s) => s.showId === id)
      );
      const filteredServiceIds = serviceIds.filter((id) =>
        validServices.some((s) => s.serviceId === id)
      );

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
      }

      const updatedPlanner = await prisma.planner.update({
        where: { id: parseInt(id) },
        data: {
          title,
          description,
          date: parsedDate,
          attractions: {
            set: filteredAttractionIds.map((id) => ({ id })),
          },
          shows: {
            set: filteredShowIds.map((id) => ({ id })),
          },
          services: {
            set: filteredServiceIds.map((id) => ({ id })),
          },
        },
        include: {
          attractions: true,
          shows: true,
          services: true,
          ticket: {
            include: { ticketType: true },
          },
        },
      });

      res.json(updatedPlanner);
    } catch (error) {
      console.error("Error updating planner:", error);
      res.status(500).json({ message: "Server error during planner update" });
    }
  }
);


// DELETE - Delete a planner
plannerRouter.delete('/planners/:id', authMiddleware, validatorMiddleware(deletePlannerValidator), async (req, res) => {
  const { id } = req.params;

  try {
    // First delete any bookings (if you have ON DELETE RESTRICT)
    await prisma.serviceBooking.deleteMany({
      where: { plannerId: parseInt(id) },
    });

    await prisma.planner.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting planner:", error);
    res.status(500).json({ message: "Server error during planner deletion" });
  }
});

export default plannerRouter;
