import { z } from "zod";
import prisma from "../prisma/prismaClient.js";

export const registerValidator = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8)
      .regex(/(?=.*\d)/, { message: 'Include at least one number' })
      .regex(/(?=.*[a-z])/, { message: 'Include at least one lowercase letter' })
      .regex(/(?=.*[A-Z])/, { message: 'Include at least one uppercase letter' })
      .regex(/[!?@#*%$:;+\-£\\|]/, { message: 'Include at least one special character' }),
    passwordConfirmation: z.string()
  })
}).superRefine(async (data, ctx) => {
  const user = await prisma.user.findUnique({
    where: {
      email: data.body.email
    }
  });

  if (user) {
    console.log(user);
    ctx.addIssue({
      code: 'custom',
      path: ['body', 'email'],
      message: "Email is already registered"
    });
  }

  if (data.body.password !== data.body.passwordConfirmation) {
    ctx.addIssue({
      code: 'custom',
      path: ['body', 'passwordConfirmation'],
      message: "Passwords must match"
    });
  }
});

export const loginValidator = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

export const requestPasswordRecoveryValidator = z.object({
  body: z.object({
    email: z.string().email(),
  })
});

export const updatePasswordValidator = z.object({
  body: z.object({
    email: z.string().email(),
    recoveryCode: z.string().min(1),
    newPassword: z.string().min(8)
      .regex(/(?=.*\d)/, { message: 'Include at least one number' })
      .regex(/(?=.*[a-z])/, { message: 'Include at least one lowercase letter' })
      .regex(/(?=.*[A-Z])/, { message: 'Include at least one uppercase letter' })
      .regex(/[!?@#*%$:;+\-£\\|]/, { message: 'Include at least one special character' }),
    newPasswordConfirmation: z.string(),
  })
}).superRefine(async (data, ctx) => {
  if (data.body.newPassword !== data.body.newPasswordConfirmation) {
    ctx.addIssue({
      code: 'custom',
      path: ['body', 'newPasswordConfirmation'],
      message: 'Passwords must match'
    });
  }
});
