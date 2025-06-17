import express from 'express';
import prisma from '../prisma/prismaClient.js';
import bcrypt from 'bcrypt';
import JsonWebToken from 'jsonwebtoken';
import validatorMiddleware from '../middlewares/validator.middleware.js';
import {
  loginValidator,
  registerValidator,
  requestPasswordRecoveryValidator,
  updatePasswordValidator
} from '../validators/auth.validator.js';
import crypto from "crypto";
import { sendRecoveryEmail } from '../config/mailer.js';
import admin from '../config/firebaseAdmin.js';

const authRouter = express.Router();

// Register route
authRouter.post('/register',
  validatorMiddleware(registerValidator),
  async (req, res) => {
    const { firstName, lastName, email, password, role = 'USER' } = req.body;

    try {
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: bcrypt.hashSync(password, 10),
          role: role.toUpperCase(),
          notifications: {
            create: {
              title: 'Welcome!',
              message: `Hi ${firstName}, your registration was successful!`,
              sendAt: new Date(),
            }
          }
        },
        include: {
          notifications: true,
        }
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Unable to register user' });
    }
  }
);

// Login route
authRouter.post('/login',
  validatorMiddleware(loginValidator),
  async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      const pswCheck = bcrypt.compareSync(password, user?.password || '');
      if (!user || !pswCheck) {
        return res.status(401).json({ message: 'Incorrect email or password' });
      }

      const { password: psw, ...userWithoutPsw } = user;

      const jwt = JsonWebToken.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.json({ jwt, user: userWithoutPsw });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  }
);

// Google login
authRouter.post('/google-login', async (req, res) => {
  const { idToken } = req.body;
  console.log("Request received:", req.body);

  if (!idToken) {
    return res.status(400).json({ message: "Missing idToken" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName: name?.split(' ')[0] || 'GoogleUser',
          lastName: name?.split(' ').slice(1).join(' ') || '',
          email,
          password: '',
          profileImage: picture || null,
          role: 'USER'
        },
      });
    }

    const { password, ...userWithoutPassword } = user;
    const jwt = JsonWebToken.sign(userWithoutPassword, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ jwt, user: userWithoutPassword });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ message: 'Invalid Firebase token or login error' });
  }
});

// Request password recovery
authRouter.post('/request-password-recovery',
  validatorMiddleware(requestPasswordRecoveryValidator),
  async (req, res) => {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const recoveryToken = crypto.randomBytes(20).toString('hex');

    await prisma.user.update({
      where: { email },
      data: {
        recovery_code: recoveryToken,
        recovery_date: new Date()
      }
    });

    try {
      await sendRecoveryEmail(email, recoveryToken);
      res.status(200).json({ message: 'Recovery code sent via email!' });
    } catch (err) {
      console.error('Email sending error:', err);
      res.status(500).json({ message: 'Error while sending recovery email' });
    }
  }
);

// Update password
authRouter.post('/update-password',
  validatorMiddleware(updatePasswordValidator),
  async (req, res) => {
    const { email, recoveryCode, newPassword, newPasswordConfirmation } = req.body;

    if (newPassword !== newPasswordConfirmation) {
      return res.status(400).json({ message: 'Passwords must match' });
    }

    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: 'Email not registered' });
    }

    if (user.recovery_code !== recoveryCode) {
      return res.status(400).json({ message: 'Invalid recovery code' });
    }

    const recoveryDate = new Date(user.recovery_date);
    const currentDate = new Date();
    const expirationTime = 15 * 60 * 1000; // 15 minutes

    if (currentDate - recoveryDate > expirationTime) {
      return res.status(400).json({ message: 'Recovery code has expired' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        recovery_code: null
      }
    });

    res.status(200).json({ message: 'Password successfully updated' });
  }
);

export default authRouter;
