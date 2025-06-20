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
// import profileRouter from "./routes/profile.route.js"; // Lo importeremo e gli passeremo il bucket
import fileUpload from "express-fileupload";
import { startExpireTicketsJob } from "./config/expiredTickets.js";
import { Storage } from '@google-cloud/storage';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
// IMPORTA E USA profileRouter PASSANDOGLI L'ISTANZA DEL BUCKET
import { createProfileRouter } from "./routes/profile.route.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  /^https:\/\/.*\.vercel\.app$/,
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

app.use(express.json());
app.use(fileUpload());

// Google Cloud Storage setup
let gcsBucketInstance;
let isGcsConfigured = false; 

try {
  if (process.env.GCS_KEYFILE_JSON && process.env.GCS_BUCKET_NAME) {
    const gcsKeyfile = JSON.parse(process.env.GCS_KEYFILE_JSON);
    const storageClient = new Storage({
      projectId: gcsKeyfile.project_id,
      credentials: {
        client_email: gcsKeyfile.client_email,
        private_key: gcsKeyfile.private_key.replace(/\\n/g, '\n'),
      },
    });
    gcsBucketInstance = storageClient.bucket(process.env.GCS_BUCKET_NAME);
    isGcsConfigured = true;
    console.log(`Google Cloud Storage bucket '${process.env.GCS_BUCKET_NAME}' initialized.`);
  } else {
    console.error("ERRORE: Variabili d'ambiente GCS_KEYFILE_JSON o GCS_BUCKET_NAME non definite. GCS non inizializzato.");
  }
} catch (error) {
  console.error("ERRORE: Impossibile inizializzare Google Cloud Storage. Controlla GCS_KEYFILE_JSON:", error);
}-


// Test route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

console.log('Cron active - current time:', new Date().toISOString());

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const localNow = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Questo potrebbe essere influenzato dal fuso orario del server
  console.log(`Checking notifications at ${now.toISOString()}`);

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

// Questo endpoint di test va bene per testare GCS, poi cancello.
app.post('/upload-test', async (req, res) => {
  if (!isGcsConfigured || !gcsBucketInstance) {
    return res.status(500).json({ error: "Google Cloud Storage is not properly configured on the server." });
  }

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const uploadedFile = req.files.image;
  const userId = req.body.userId || 'temp_user'; 

  const fileExtension = path.extname(uploadedFile.name);
  const fileName = `${userId}/${uuidv4()}${fileExtension}`;
  const file = gcsBucketInstance.file(fileName);

  try {
    const stream = file.createWriteStream({
      metadata: {
        contentType: uploadedFile.mimetype,
      },
      resumable: false,
      public: true, // Makes the file publicly accessible upon upload
      predefinedAcl: 'publicRead' // Requires the bucket's "Public access prevention" to be DISABLED
    });

    stream.end(uploadedFile.data);

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        reject(err);
      });
    });

    const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;

    res.status(200).json({
      message: 'File successfully uploaded to Google Cloud Storage!',
      url: publicUrl,
    });

  } catch (error) {
    console.error('Error during file upload to GCS:', error);
    res.status(500).json({ error: 'Error during file upload: ' + error.message });
  }
});


// Tutte le tue altre routes
app.use(attractionsRouter);
app.use(ticketsRouter);
app.use(plannerRouter);
app.use(showsRouter);
app.use(servicesRouter);
app.use(serviceBookingRouter);
app.use(notificationRouter);
app.use(createProfileRouter(gcsBucketInstance, isGcsConfigured));

// Many-to-many associations
app.use(ticketsAttractionRouter);
app.use(ticketServiceRouter);
app.use(ticketShowRouter);

startExpireTicketsJob();

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});