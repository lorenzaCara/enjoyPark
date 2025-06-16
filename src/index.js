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
import profileRouter from "./routes/profile.route.js"; // Presumo che questa route gestirà l'upload
import fileUpload from "express-fileupload";
import { startExpireTicketsJob } from "./config/expiredTickets.js";
import { Storage } from '@google-cloud/storage'; // Importa la libreria GCS
import path from 'path'; // Necessario per path.extname
import { v4 as uuidv4 } from 'uuid'; // Per generare nomi file unici, assicurati di installare 'uuid' (npm install uuid)

// Install npm i dotenv + insert this line. Useful if .env is not read
dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL, // Your main Vercel app domain (e.g., https://enjoypark.vercel.app)
  /^https:\/\/.*\.vercel\.app$/, // Allows any subdomain of .vercel.app (for preview deployments)
  // Add other specific origins if needed, e.g., for local development: 'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern || origin === pattern.replace(/\/$/, '');
      }
      return pattern.test(origin);
    })) {
      return callback(null, true);
    }
    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Middleware for parsing JSON
app.use(express.json());
app.use(fileUpload());

// --- INIZIO INTEGRAZIONE GOOGLE CLOUD STORAGE ---
let storage;
let gcsBucket;

try {
  if (process.env.GCS_KEYFILE_JSON) {
    const gcsKeyfile = JSON.parse(process.env.GCS_KEYFILE_JSON);
    storage = new Storage({
      projectId: gcsKeyfile.project_id,
      credentials: {
        client_email: gcsKeyfile.client_email,
        private_key: gcsKeyfile.private_key.replace(/\\n/g, '\n'), // Sostituisci \\n con \n
      },
    });
    if (process.env.GCS_BUCKET_NAME) {
      gcsBucket = storage.bucket(process.env.GCS_BUCKET_NAME);
      console.log(`✅ Google Cloud Storage bucket '${process.env.GCS_BUCKET_NAME}' initialized.`);
    } else {
      console.error("ERRORE: Variabile d'ambiente GCS_BUCKET_NAME non definita.");
    }
  } else {
    console.error("ERRORE: Variabile d'ambiente GCS_KEYFILE_JSON non definita. GCS non inizializzato.");
  }
} catch (error) {
  console.error("ERRORE: Impossibile inizializzare Google Cloud Storage. Controlla GCS_KEYFILE_JSON:", error);
}
// --- FINE INTEGRAZIONE GOOGLE CLOUD STORAGE ---


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

app.post('/upload-test', async (req, res) => {
  if (!gcsBucket) {
    return res.status(500).json({ error: "Google Cloud Storage non è configurato correttamente sul server." });
  }

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: 'Nessun file caricato.' });
  }

  const uploadedFile = req.files.image; // Assumendo che il nome del campo input sia 'image'
  const userId = req.body.userId || 'temp_user'; // Dovresti ottenere l'ID utente dall'autenticazione

  // Genera un nome file univoco e includi una "cartella" per l'utente o il tipo di risorsa
  const fileExtension = path.extname(uploadedFile.name);
  const fileName = `${userId}/${uuidv4()}${fileExtension}`;
  const file = gcsBucket.file(fileName);

  try {
    const stream = file.createWriteStream({
      metadata: {
        contentType: uploadedFile.mimetype,
      },
      resumable: false, // Per file più piccoli e deploy su Render, spesso aiuta
    });

    stream.end(uploadedFile.data);

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Rende il file pubblicamente leggibile. Richiede che la "Public access prevention" del bucket sia DISABILITATA.
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;


    res.status(200).json({
      message: 'File caricato con successo su Google Cloud Storage!',
      url: publicUrl,
    });

  } catch (error) {
    console.error('Errore durante l\'upload del file su GCS:', error);
    res.status(500).json({ error: 'Errore durante l\'upload del file: ' + error.message });
  }
});

// Tutte le tue altre routes
app.use(profileRouter); // Assicurati che questa route non contenga più il salvataggio locale dei file!
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