import admin from 'firebase-admin';

// Leggi il service account dalla variabile d'ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;

