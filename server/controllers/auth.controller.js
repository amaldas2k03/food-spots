import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { signToken } from '../middleware/auth.js';
import { HttpError } from '../utils/asyncHandler.js';

const PUBLIC_USER = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  tasteProfile: true,
  points: true,
  badges: true,
  createdAt: true,
};

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tasteProfile: z.array(z.string()).default([]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export async function register(req, res) {
  const { name, email, password, tasteProfile } = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'An account with that email already exists');

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      tasteProfile,
    },
    select: PUBLIC_USER,
  });

  res.status(201).json({ user, token: signToken(user.id) });
}

export async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password so the endpoint
  // can't be used to enumerate registered addresses.
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const { passwordHash, googleId, ...safe } = user;
  res.json({ user: safe, token: signToken(user.id) });
}

export async function googleAuth(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new HttpError(503, 'Google sign-in is not configured on this server');

  const { credential } = z.object({ credential: z.string().min(1) }).parse(req.body);

  const ticket = await new OAuth2Client(clientId)
    .verifyIdToken({ idToken: credential, audience: clientId })
    .catch(() => {
      throw new HttpError(401, 'Invalid Google credential');
    });

  const { sub, email, name, picture } = ticket.getPayload();

  // Link by googleId first, then fall back to email so an existing
  // password account can add Google sign-in without duplicating.
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: sub }, { email }] },
  });

  if (user) {
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: sub, avatarUrl: user.avatarUrl ?? picture },
      });
    }
  } else {
    user = await prisma.user.create({
      data: { googleId: sub, email, name: name ?? email.split('@')[0], avatarUrl: picture },
    });
  }

  const { passwordHash, googleId, ...safe } = user;
  res.json({ user: safe, token: signToken(user.id) });
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: PUBLIC_USER,
  });
  res.json({ user });
}
