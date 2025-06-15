import express from 'express';
import prisma from '../prisma/prismaClient.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import validatorMiddleware from '../middlewares/validator.middleware.js';
import { subMinutes, isAfter, parseISO } from 'date-fns';
import { createServiceBookingValidator, deleteServiceBookingValidator, updateServiceBookingValidator } from '../validators/servicesBooking.validator.js';

const serviceBookingRouter = express.Router();

serviceBookingRouter.post('/service-bookings', authMiddleware, validatorMiddleware(createServiceBookingValidator), async (req, res) => {
  const { serviceId, bookingTime, numberOfPeople, specialRequests } = req.body;
  const userId = req.user.id;

  try {
    // Retrieve planner
    const planner = await prisma.planner.findFirst({
      where: { /* your planner logic */ },
      include: { user: true }
    });

    if (!planner) {
      return res.status(400).json({ message: 'No available planner.' });
    }

    const bookingDate = parseISO(bookingTime);
    if (isNaN(bookingDate)) {
      return res.status(400).json({ message: 'Invalid booking date.' });
    }

    // Retrieve the service name
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { name: true } // or title, depending on your schema
    });
    const serviceName = service?.name || "service";

    // Create the booking
    const booking = await prisma.serviceBooking.create({
      data: {
        userId,
        plannerId: planner.id,
        serviceId,
        bookingTime: bookingDate,
        numberOfPeople: numberOfPeople ?? null,
        specialRequests: specialRequests?.trim() || null,
      }
    });

    // Calculate notification time (10 minutes before)
    const notifyAt = new Date(bookingDate.getTime() - 10 * 60000);
    const now = new Date();

    const plannerUser = await prisma.user.findUnique({
      where: { id: planner.user.id },
      select: { allowNotifications: true },
    });

    if (plannerUser?.allowNotifications && isAfter(notifyAt, now)) {
      await prisma.notification.create({
        data: {
          userId: planner.user.id,
          title: 'Service Reminder',
          message: `Your service "${serviceName}" will start in 10 minutes.`,
          sendAt: notifyAt,
          sent: false,
        },
      });
    }

    res.status(201).json(booking);

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error during booking creation' });
  }
});

// Get all service bookings
serviceBookingRouter.get('/service-bookings', async (req, res) => {
  try {
    const bookings = await prisma.serviceBooking.findMany({
      include: {
        service: true,
        planner: {
          include: {
            user: true,  // Include the user via the planner
          }
        },
      },
    });

    res.json(bookings);
  } catch (error) {
    console.error('Error retrieving bookings:', error);
    res.status(500).json({ message: 'Server error while retrieving bookings' });
  }
});

// Get a booking by ID
serviceBookingRouter.get('/service-bookings/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        service: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error retrieving booking:', error);
    res.status(500).json({ message: 'Server error while retrieving booking' });
  }
});

// Update a booking
serviceBookingRouter.put(
  '/service-bookings/:id',
  authMiddleware,
  validatorMiddleware(updateServiceBookingValidator),
  async (req, res) => {
    const { id } = req.params;
    const { bookingTime, numberOfPeople, specialRequests } = req.body;

    try {
      const updatedBooking = await prisma.serviceBooking.update({
        where: { id: parseInt(id) },
        data: {
          bookingTime: bookingTime ? new Date(bookingTime) : undefined,
          numberOfPeople: numberOfPeople ?? undefined,
          specialRequests: specialRequests?.trim() || undefined,
        },
      });

      res.json(updatedBooking);
    } catch (error) {
      console.error('Error updating booking:', error);
      res.status(500).json({ message: 'Server error while updating booking' });
    }
  }
);

// Delete a booking
serviceBookingRouter.delete('/service-bookings/:id', authMiddleware, validatorMiddleware(deleteServiceBookingValidator), async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.serviceBooking.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Server error while deleting booking' });
  }
});

export default serviceBookingRouter;
