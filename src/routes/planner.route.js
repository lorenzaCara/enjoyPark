import express from 'express';
import prisma from '../prisma/prismaClient.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import validatorMiddleware from '../middlewares/validator.middleware.js';
import { createPlannerValidator, deletePlannerValidator, updatePlannerValidator } from '../validators/planners.validator.js';

const plannerRouter = express.Router();

// Create a new planner
plannerRouter.post('/planners', authMiddleware, validatorMiddleware(createPlannerValidator), async (req, res) => {
  const { title, description, ticketId, date, attractionIds = [], showIds = [], serviceIds = [] } = req.body;
  const userId = req.user.id; //

  try {
    // Validate date
    const parsedDate = new Date(date); //
    if (isNaN(parsedDate.getTime())) { //
      return res.status(400).json({ message: 'Invalid date' }); //
    }

    // Check that the ticket belongs to the user and is active
    const ticket = await prisma.ticket.findFirst({ //
      where: { //
        id: ticketId, //
        userId, //
        status: 'USED', // Ensure ticket is used before creating a planner
      },
      include: { //
        ticketType: true, //
      },
    });

    if (!ticket) { //
      console.error('Ticket not found or not active for user:', { userId, ticketId }); //
      return res.status(400).json({ message: 'The ticket must be validated before creating a planner.' }); //
    }

    const ticketTypeId = ticket.ticketTypeId; //

    // Filter activities based on the ticket type allowed activities
    const validAttractions = await prisma.ticketTypeAttraction.findMany({ //
      where: { ticketTypeId }, //
      select: { attractionId: true }, //
    });
    const validShows = await prisma.ticketTypeShow.findMany({ //
      where: { ticketTypeId }, //
      select: { showId: true }, //
    });
    const validServices = await prisma.ticketTypeService.findMany({ //
      where: { ticketTypeId }, //
      select: { serviceId: true }, //
    });

    const filteredAttractionIds = attractionIds.filter((id) => //
      validAttractions.some((a) => a.attractionId === id) //
    );
    const filteredShowIds = showIds.filter((id) => //
      validShows.some((s) => s.showId === id) //
    );
    const filteredServiceIds = serviceIds.filter((id) => //
      validServices.some((s) => s.serviceId === id) //
    );

    // Create the planner
    const planner = await prisma.planner.create({ //
      data: { //
        userId, //
        ticketId, //
        title, //
        description, //
        date: parsedDate, //
        attractions: { //
          connect: filteredAttractionIds.map((id) => ({ id })), //
        },
        shows: { //
          connect: filteredShowIds.map((id) => ({ id })), //
        },
        services: { //
          connect: filteredServiceIds.map((id) => ({ id })), //
        },
      },
      include: { // Include related data in the response
        attractions: true, //
        shows: true, //
        services: true, //
      },
    });

    res.status(201).json(planner); //
  } catch (error) {
    console.error('Error creating planner:', error); //
    res.status(500).json({ message: 'Server error during planner creation' }); //
  }
});

// GET - Get all planners for the authenticated user
plannerRouter.get('/planners', authMiddleware, async (req, res) => { //
  const userId = req.user.id; // Get user ID from authenticated request

  try {
    const planners = await prisma.planner.findMany({ //
      where: { userId }, // Filter planners by the authenticated user
      include: { //
        attractions: true, //
        shows: true, //
        services: true, //
        user: true, // You might not need to include the full user object in every response
        ticket: { //
          include: { ticketType: true }, //
        },
      },
      orderBy: { createdAt: 'desc' }, // Optional: order by creation date
    });
    res.json(planners); //
  } catch (error) {
    console.error('Error retrieving planners:', error); //
    res.status(500).json({ message: 'Server error while retrieving planners' }); //
  }
});

// GET - Get a planner by ID for the authenticated user
plannerRouter.get('/planners/:id', authMiddleware, async (req, res) => { //
  const { id } = req.params; //
  const userId = req.user.id; //

  try {
    const planner = await prisma.planner.findUnique({ //
      where: { //
        id: parseInt(id), //
        userId, // Ensure the planner belongs to the authenticated user
      },
      include: { //
        attractions: true, //
        shows: true, //
        services: true, //
        user: true, //
        ticket: { //
          include: { ticketType: true }, //
        },
      },
    });

    if (!planner) { //
      return res.status(404).json({ message: 'Planner not found or unauthorized access' }); //
    }

    res.json(planner); //
  } catch (error) {
    console.error('Error retrieving the planner:', error); //
    res.status(500).json({ message: 'Server error while retrieving the planner' }); //
  }
});

// PUT - Update a planner (Corrected Logic for Many-to-Many Relationships)
plannerRouter.put(
  "/planners/:id",
  authMiddleware,
  validatorMiddleware(updatePlannerValidator(true)), // Assuming this validator confirms required fields
  async (req, res) => {
    const { id } = req.params; //
    const userId = req.user.id; // Get user ID from authenticated request
    const {
      title,
      description,
      date,
      attractionIds = [], // These are the desired final IDs from the frontend
      showIds = [], //
      serviceIds = [], //
    } = req.body; //

    try {
      const planner = await prisma.planner.findUnique({ //
        where: { id: parseInt(id), userId }, // Ensure planner exists and belongs to the user
        include: { //
          ticket: true, // Needed to validate against ticketType's allowed activities
        },
      });

      if (!planner) { //
        return res.status(404).json({ message: "Planner not found or unauthorized access" }); //
      }

      // Validate date (if provided in update payload)
      let parsedDate = planner.date; // Default to existing date
      if (date) { // Only parse if date is provided in the request body
        const newDate = new Date(date); //
        if (isNaN(newDate.getTime())) { //
          return res.status(400).json({ message: "Invalid date" }); //
        }
        parsedDate = newDate; //
      }
      
      const ticketTypeId = planner.ticket.ticketTypeId; //

      // Filter incoming activity IDs against the allowed activities for this ticket type
      const validAttractions = await prisma.ticketTypeAttraction.findMany({ //
        where: { ticketTypeId }, //
        select: { attractionId: true }, //
      });
      const validShows = await prisma.ticketTypeShow.findMany({ //
        where: { ticketTypeId }, //
        select: { showId: true }, //
      });
      const validServices = await prisma.ticketTypeService.findMany({ //
        where: { ticketTypeId }, //
        select: { serviceId: true }, //
      });

      // Filter the *incoming* IDs (from req.body) based on validity
      // These filtered IDs will be used by Prisma's 'set' to replace current relations.
      const filteredAttractionIds = attractionIds.filter((id) => //
        validAttractions.some((a) => a.attractionId === id) //
      );
      const filteredShowIds = showIds.filter((id) => //
        validShows.some((s) => s.showId === id) //
      );
      const filteredServiceIds = serviceIds.filter((id) => //
        validServices.some((s) => s.serviceId === id) //
      );

      const updatedPlanner = await prisma.planner.update({ //
        where: { id: parseInt(id) }, //
        data: { //
          title, //
          description, //
          date: parsedDate, //
          attractions: { //
            set: filteredAttractionIds.map((id) => ({ id })), // Use 'set' to replace
          },
          shows: { //
            set: filteredShowIds.map((id) => ({ id })), // Use 'set' to replace
          },
          services: { //
            set: filteredServiceIds.map((id) => ({ id })), // Use 'set' to replace
          },
        },
        include: { // Include related data in the response
          attractions: true, //
          shows: true, //
          services: true, //
          ticket: { //
            include: { ticketType: true }, //
          },
        },
      });

      res.json(updatedPlanner); //
    } catch (error) {
      console.error("Error updating planner:", error); //
      res.status(500).json({ message: "Server error during planner update" }); //
    }
  }
);

// DELETE - Delete a planner
plannerRouter.delete('/planners/:id', authMiddleware, validatorMiddleware(deletePlannerValidator), async (req, res) => { //
  const { id } = req.params; //
  const userId = req.user.id; // Get user ID from authenticated request

  try {
    // Find the planner to ensure it belongs to the user
    const plannerToDelete = await prisma.planner.findUnique({ //
      where: { id: parseInt(id), userId }, //
    });

    if (!plannerToDelete) { //
      return res.status(404).json({ message: 'Planner not found or unauthorized access' }); //
    }

    // First delete any associated service bookings, if they exist
    // This is important for referential integrity if you have ON DELETE RESTRICT/NO ACTION
    await prisma.serviceBooking.deleteMany({ //
      where: { plannerId: parseInt(id) }, //
    });

    // Then delete the planner itself
    await prisma.planner.delete({ //
      where: { id: parseInt(id) }, //
    });

    res.status(204).send(); // 204 No Content for successful deletion
  } catch (error) {
    console.error("Error deleting planner:", error); //
    res.status(500).json({ message: "Server error during planner deletion" }); //
  }
});

// --- NEW ENDPOINTS FOR ADDING INDIVIDUAL ITEMS (OPTIONAL, BASED ON YOUR UI NEEDS) ---
// These are for scenarios where you add a single item without the full planner edit dialog.

// POST - Add a single attraction to a planner
plannerRouter.post('/planners/:id/attractions', authMiddleware, async (req, res) => { //
  const { id } = req.params; // Planner ID
  const { attractionId } = req.body; // Attraction ID to add
  const userId = req.user.id; //

  try {
    const planner = await prisma.planner.findUnique({ //
      where: { id: parseInt(id), userId }, //
      include: { ticket: true }, //
    });

    if (!planner) { //
      return res.status(404).json({ message: 'Planner not found or unauthorized access' }); //
    }

    // Validate if the attraction is allowed for this planner's ticket type
    const isValid = await prisma.ticketTypeAttraction.findFirst({ //
      where: { //
        ticketTypeId: planner.ticket.ticketTypeId, //
        attractionId: attractionId, //
      },
    });

    if (!isValid) { //
      return res.status(400).json({ message: 'Attraction not allowed for this ticket type.' }); //
    }

    const updatedPlanner = await prisma.planner.update({ //
      where: { id: parseInt(id) }, //
      data: { //
        attractions: { //
          connect: { id: attractionId }, // Use 'connect' for adding
        },
      },
      include: { attractions: true, shows: true, services: true }, // Include all for consistent response
    });
    res.json(updatedPlanner); //
  } catch (error) {
    console.error('Error adding attraction to planner:', error); //
    res.status(500).json({ message: 'Server error adding attraction' }); //
  }
});

// POST - Add a single show to a planner
plannerRouter.post('/planners/:id/shows', authMiddleware, async (req, res) => { //
  const { id } = req.params; // Planner ID
  const { showId } = req.body; // Show ID to add
  const userId = req.user.id; //

  try {
    const planner = await prisma.planner.findUnique({ //
      where: { id: parseInt(id), userId }, //
      include: { ticket: true }, //
    });

    if (!planner) { //
      return res.status(404).json({ message: 'Planner not found or unauthorized access' }); //
    }

    // Validate if the show is allowed for this planner's ticket type
    const isValid = await prisma.ticketTypeShow.findFirst({ //
      where: { //
        ticketTypeId: planner.ticket.ticketTypeId, //
        showId: showId, //
      },
    });

    if (!isValid) { //
      return res.status(400).json({ message: 'Show not allowed for this ticket type.' }); //
    }

    const updatedPlanner = await prisma.planner.update({ //
      where: { id: parseInt(id) }, //
      data: { //
        shows: { //
          connect: { id: showId }, // Use 'connect' for adding
        },
      },
      include: { attractions: true, shows: true, services: true }, //
    });
    res.json(updatedPlanner); //
  } catch (error) {
    console.error('Error adding show to planner:', error); //
    res.status(500).json({ message: 'Server error adding show' }); //
  }
});

// POST - Add a single service to a planner
plannerRouter.post('/planners/:id/services', authMiddleware, async (req, res) => { //
  const { id } = req.params; // Planner ID
  const { serviceId } = req.body; // Service ID to add
  const userId = req.user.id; //

  try {
    const planner = await prisma.planner.findUnique({ //
      where: { id: parseInt(id), userId }, //
      include: { ticket: true }, //
    });

    if (!planner) { //
      return res.status(404).json({ message: 'Planner not found or unauthorized access' }); //
    }

    // Validate if the service is allowed for this planner's ticket type
    const isValid = await prisma.ticketTypeService.findFirst({ //
      where: { //
        ticketTypeId: planner.ticket.ticketTypeId, //
        serviceId: serviceId, //
      },
    });

    if (!isValid) { //
      return res.status(400).json({ message: 'Service not allowed for this ticket type.' }); //
    }

    const updatedPlanner = await prisma.planner.update({ //
      where: { id: parseInt(id) }, //
      data: { //
        services: { //
          connect: { id: serviceId }, // Use 'connect' for adding
        },
      },
      include: { attractions: true, shows: true, services: true }, //
    });
    res.json(updatedPlanner); //
  } catch (error) {
    console.error('Error adding service to planner:', error); //
    res.status(500).json({ message: 'Server error adding service' }); //
  }
});
// --- END NEW ENDPOINTS ---

export default plannerRouter;