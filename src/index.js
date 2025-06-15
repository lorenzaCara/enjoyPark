import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import attractionsRouter from "./routes/attractions.route.js";
import ticketsRouter from "./routes/tickets.route.js";
import authRouter from "./routes/auth.route.js";
import plannerRouter from "./routes/planner.route.js";
import showsRouter from "./routes/shows.route.js";
import servicesRouter from "./routes/services.route.js";
import ticketServiceRouter from "./routes/many-to-many/ticketsService.route.js";
import ticketsAttractionRouter from "./routes/many-to-many/ticketsAttraction.route.js";
import ticketShowRouter from "./routes/many-to-many/ticketsShow.route.js";
import serviceBookingRouter from "./routes/serviceBooking.route.js";
import cron from 'node-cron';
import prisma from "./prisma/prismaClient.js";
import notificationRouter from "./routes/notification.route.js";
import profileRouter from "./routes/profile.route.js";
import fileUpload from "express-fileupload";
import { startExpireTicketsJob } from "./config/expiredTickets.js";

// Install npm i dotenv + insert this line. Useful if .env is not read
dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Middleware with cors
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: '*'
}));

// Middleware for parsing JSON
app.use(express.json());
app.use(fileUpload());

// Test route
app.get("/", (req, res) => {
    res.json({ message: "Server is running!" });
});

console.log('✅ Cron active - current time:', new Date().toISOString());

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const localNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  console.log(`🔁 Checking notifications at ${now.toISOString()}`);

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        sendAt: { lte: localNow },
        sent: false
      },
      include: { user: true }
    });

    console.log(`Notifications found: ${notifications.length}`);

    for (const notification of notifications) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { sent: true }
      });
    }

    if (notifications.length === 0) {
      console.log('No notifications to send at the moment.');
    }

  } catch (error) {
    console.error('Error in notifications cron job:', error);
  }
});

// Routes
app.use(authRouter);
app.use(profileRouter);
app.use(attractionsRouter);
app.use(showsRouter);
app.use(servicesRouter);
app.use(ticketsRouter);
app.use(plannerRouter);
app.use(serviceBookingRouter);
app.use(notificationRouter);

// Many-to-many associations
app.use(ticketsAttractionRouter);
app.use(ticketServiceRouter);
app.use(ticketShowRouter);

startExpireTicketsJob();

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
