import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import path from 'path'; // Ancora utile per path.extname
import { v4 as uuid } from 'uuid';
// Non useremo più fs
// import fs from 'fs'; 
import prisma from '../prisma/prismaClient.js';
import bcrypt from 'bcrypt';
// Non importiamo più Storage qui, lo riceviamo come argomento

const acceptedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

// Cambiamo l'export per essere una funzione che accetta il bucket GCS
export const createProfileRouter = (gcsBucket, isGcsConfigured) => {
    const profileRouter = express.Router();

    // Rimuovi DIRNAME se non usato per altre logiche legate al filesystem locale
    // const DIRNAME = path.resolve(); 

    // --- MODIFICA DELL'ENDPOINT DI UPLOAD DELL'IMMAGINE PROFILO ---
    profileRouter.post('/profile/image', authMiddleware, async (req, res) => {
        if (!isGcsConfigured || !gcsBucket) {
            return res.status(500).json({ message: "Google Cloud Storage non è configurato correttamente sul server." });
        }

        if (!req.files || !req.files.image) {
            return res.status(400).json({ message: 'Nessun file fornito.' });
        }

        if (Array.isArray(req.files.image)) {
            return res.status(400).json({ message: 'È consentito caricare un solo file.' });
        }

        if (!acceptedTypes.includes(req.files.image.mimetype)) {
            return res.status(400).json({ message: 'Formato non supportato. Sono accettati solo ' + acceptedTypes.join(', ') + '.' });
        }
        
        const ext = path.extname(req.files.image.name); // Usa path.extname per l'estensione
        // Genera un nome file unico per GCS
        // Usa una "cartella" all'interno del bucket per organizzare (es. 'profile-images')
        const filename = `profile-images/${req.user.id}-${uuid()}${ext}`; 
        
        // Ottieni il "blob" di GCS (l'oggetto file all'interno del bucket)
        const blob = gcsBucket.file(filename);
        const blobStream = blob.createWriteStream({
            resumable: false,
            contentType: req.files.image.mimetype,
            public: true, // Rende il file pubblicamente leggibile all'upload
            predefinedAcl: 'publicRead' // Richiede che la "Public access prevention" del bucket sia DISABILITATA.
        });

        blobStream.on('error', (err) => {
            console.error('Errore durante l\'upload su Google Cloud Storage:', err);
            return res.status(500).json({ message: 'Errore durante il caricamento dell\'immagine su cloud storage.' });
        });

        blobStream.on('finish', async () => {
            const publicUrl = `https://storage.googleapis.com/${gcsBucket.name}/${filename}`; // Usa gcsBucket.name

            try {
                // Se l'utente aveva già un'immagine, elimina quella vecchia da GCS
                if (req.user.profileImageUrl) { 
                    // Estrai il percorso del file dal vecchio URL GCS
                    const oldFilePath = req.user.profileImageUrl.replace(`https://storage.googleapis.com/${gcsBucket.name}/`, '');
                    const oldBlob = gcsBucket.file(oldFilePath);
                    try {
                        await oldBlob.delete();
                        console.log(`Vecchia immagine ${req.user.profileImageUrl} eliminata da GCS.`);
                    } catch (deleteError) {
                        // Ignora l'errore se il file non esiste o non può essere eliminato
                        console.warn(`Impossibile eliminare la vecchia immagine da GCS: ${deleteError.message}`);
                    }
                }

                // Aggiorna il database con il nuovo URL pubblico di GCS
                const updatedUser = await prisma.user.update({
                    where: { id: req.user.id },
                    data: {
                        profileImageUrl: publicUrl 
                    },
                    select: { 
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        profileImageUrl: true, // Restituisci il nuovo URL al frontend
                        // ... altri campi che vuoi inviare al frontend
                    }
                });

                res.status(200).json({ 
                    message: 'Immagine caricata con successo!',
                    imageUrl: publicUrl,
                    user: updatedUser 
                });
            } catch (dbError) {
                console.error('Errore durante l\'aggiornamento del database o eliminazione vecchia immagine:', dbError);
                return res.status(500).json({ message: 'Errore durante l\'aggiornamento del profilo con l\'URL dell\'immagine.' });
            }
        });

        blobStream.end(req.files.image.data);
    });

    // --- MODIFICA DELL'ENDPOINT DI RECUPERO DELL'IMMAGINE PROFILO ---
    profileRouter.get('/profile/image', authMiddleware, async (req, res) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { profileImageUrl: true } 
            });

            if (user && user.profileImageUrl) {
                return res.status(200).json({ imageUrl: user.profileImageUrl });
            } else {
                return res.status(404).json({ message: 'Immagine del profilo non trovata.' });
            }
        } catch (error) {
            console.error('Errore durante il recupero dell\'URL dell\'immagine:', error);
            return res.status(500).json({ message: 'Errore interno del server.' });
        }
    });

    // Add this route below the others in your profileRouter
    profileRouter.put('/profile/update', authMiddleware, async (req, res) => {
        try {
            const { firstName, lastName, email } = req.body; // Rimossa password, gestita da updateUserPassword

            if (!req.user || !req.user.id) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const updatedUser = await prisma.user.update({
                where: { id: req.user.id },
                data: { firstName, lastName, email },
                select: { 
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    profileImageUrl: true, // Includi profileImageUrl
                    // ... altri campi
                }
            });

            res.json({ message: 'Profile updated', user: updatedUser });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: 'Internal error during profile update' });
        }
    });

    profileRouter.put('/profile/password', authMiddleware, async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ message: 'Please provide current and new passwords.' });
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
            });

            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect.' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { id: req.user.id },
                data: { password: hashedPassword },
            });

            res.json({ message: 'Password successfully updated!' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ message: 'Internal server error.' });
        }
    });

    profileRouter.patch('/profile/notifications-toggle', authMiddleware, async (req, res) => {
        try {
            const userId = req.user.id;
            const { allowNotifications } = req.body;

            if (typeof allowNotifications !== 'boolean') {
                return res.status(400).json({ message: 'Invalid allowNotifications value' });
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { allowNotifications },
                select: { id: true, allowNotifications: true }
            });

            res.json({ message: 'Notification setting updated', user: updatedUser });
        } catch (error) {
            console.error('Error updating notification settings:', error);
            res.status(500).json({ message: 'Server error' });
        }
    });

    return profileRouter; // Restituisci l'istanza del router
};