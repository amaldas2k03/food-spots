import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { HttpError } from '../utils/asyncHandler.js';

function readToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/** Rejects the request if there is no valid token. */
export async function requireAuth(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) throw new HttpError(401, 'Authentication required');

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, avatarUrl: true, points: true, badges: true },
    });
    if (!user) throw new HttpError(401, 'User no longer exists');

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new HttpError(401, 'Invalid or expired token'));
    }
    next(err);
  }
}

/**
 * Populates req.user when a token is present but never rejects.
 * Used by feed/spot routes that personalise output for signed-in users.
 */
export async function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, avatarUrl: true, points: true, badges: true },
    });
  } catch {
    // An invalid token on an optional route is treated as signed-out.
  }
  next();
}
