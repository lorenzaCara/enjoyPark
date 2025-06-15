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
import prisma from "./prisma/prismaClient.js"; // <--- Import di Prisma
import notificationRouter from "./routes/notification.route.js";
import profileRouter from "./routes/profile.route.js";
import fileUpload from "express-fileupload";
import { startExpireTicketsJob } from "./config/expiredTickets.js";

// Install npm i dotenv + insert this line. Useful if .env is not read
dotenv.config();

// *** INIZIO DELLE NUOVE RIGHE DI LOGGING ***
console.log('*** STARTING BACKEND ***');
console.log('DATABASE_URL letto dall\'ambiente:', process.env.DATABASE_URL); // LOGGA L'URL DEL DB

// Test della connessione a Prisma/Database all'avvio
async function testDbConnection() {
    try {
        await prisma.$connect();
        console.log('*** Connessione a Prisma/Database AVVENUTA CON SUCCESSO! ***');
    } catch (e) {
        console.error('*** ERRORE NELLA CONNESSIONE A PRISMA/DATABASE: ***');
        console.error(e); // Stampa l'oggetto errore completo
    } finally {
        // Non disconnettere qui se il server deve rimanere connesso
        // await prisma.$disconnect(); 
    }
}

// Chiama la funzione di test subito dopo aver inizializzato dotenv e Prisma
testDbConnection();
// *** FINE DELLE NUOVE RIGHE DI LOGGING ***


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
    console.log('Job cron attivato alle', new Date().toISOString()); // Questo già c'era

    try {
        console.log('Tentativo di leggere le notifiche dalla tabella Notification...'); // AGGIUNGI QUESTA RIGA
        const notifications = await prisma.notification.findMany({
            where: {
                sendAt: { lte: localNow },
                sent: false
            },
            include: { user: true }
        });

        console.log(`Notifications found: ${notifications.length}`); // Questo già c'era

        for (const notification of notifications) {
            await prisma.notification.update({
                where: { id: notification.id },
                data: { sent: true }
            });
        }

        if (notifications.length === 0) {
            console.log('No notifications to send at the moment.'); // Questo già c'era
        }

    } catch (error) {
        console.error('Error in notifications cron job:', error); // Questo già c'era, ma ora avrai più contesto
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

startExpireTicketsJob(); // Questa funzione in './config/expiredTickets.js' dovrebbe avere log simili

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});