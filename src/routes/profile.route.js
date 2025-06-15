import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import path from 'path';
import { v4 as uuid } from 'uuid'; // import uuid to generate a unique id for images
import fs from 'fs'; // import fs to create folders if they don't exist
import prisma from '../prisma/prismaClient.js';
import bcrypt from 'bcrypt';

const acceptedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

const profileRouter = express.Router();

const DIRNAME = path.resolve(); 
// used to get the absolute path of the folder where this file is located.
// If using Node modules, __dirname is not defined, so this is a workaround.

profileRouter.post('/profile/image', authMiddleware, (req, res) => {
    console.log(req.files);

    // in req.files.image, "image" is the form field name
    if (Array.isArray(req.files.image)) {
        return res.status(400).json({ message: 'You must upload only one file' });
    }

    if (!acceptedTypes.includes(req.files.image.mimetype)) {
        return res.status(400).json({ message: 'Unsupported format, only ' + acceptedTypes.join(', ') + ' are accepted' });
    }
    
    const ext = req.files.image.name.split('.').pop(); // pop() removes and returns the last element of the array
    const filename = uuid() + '.' + ext;
    // uuid() generates a unique id. Without the extension the file won't upload correctly.

    // req.user.id is the logged-in user's id, used to create a unique folder for each user.
    const uploadPath = path.join(
        DIRNAME,
        'uploads',
        'user' + req.user.id,
        filename
    );

    // fs is a Node.js module for interacting with the file system.
    // if the folder exists, it adds the file; if the folder doesn't exist, it creates it and then adds the file.
    fs.mkdirSync(path.join(
        DIRNAME,
        'uploads',
        'user' + req.user.id
    ), { recursive: true }); // recursive: true creates the folder if it doesn't exist, including parent folders.

    // mv stands for move (method to move files inside our machine)
    
    try {
        // if the user already has a profile image, delete it first
        !!req.user.profileImage && fs.rmSync(path.join(DIRNAME, req.user.profileImage))
    } catch (error) {
        // ignore errors on delete
    }

    try {
        // mv is a method of fileUpload to move files from one folder to another.
        req.files.image.mv(uploadPath, async (err) => {
            if (err) {
                throw new Error(err);
            }

            await prisma.user.update({
                where: { id: req.user.id },
                data: {
                    profileImage: uploadPath.replace(DIRNAME, '') // remove absolute path, leave relative path
                }
            });

            res.sendFile(uploadPath);
            /* res.json({ message: 'File uploaded!' }); */
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// The img tag cannot set headers, so it cannot make an authenticated request.
// So we cannot use authMiddleware here.
profileRouter.get('/profile/image', authMiddleware, (req, res) => {
    try {
        res.sendFile(path.join(DIRNAME, req.user.profileImage));
    } catch (error) {
        res.status(400).json({});
    }
});

// Add this route below the others in your profileRouter
profileRouter.put('/profile/update', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body; // fields to update

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Basic example: update only provided fields
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { firstName, lastName, email }, // you can also include password if you want to update it, with hashing!
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

// Route to update push notification preference
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

export default profileRouter;
