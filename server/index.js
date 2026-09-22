import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import { Server as SocketServer } from 'socket.io';

import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { registerSocketServer } from './services/notifications.service.js';

const PORT = process.env.PORT || 4000;
// CLIENT_ORIGIN may be a single origin or a comma-separated list, e.g.
// "http://localhost:5173,https://foodspots.vercel.app".
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy server/.env.example to server/.env first.');
  process.exit(1);
}

const app = express();

app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: CLIENT_ORIGINS, credentials: true } });

// Each socket joins a room keyed by user id so notify() can target one user.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.userId = jwt.verify(token, process.env.JWT_SECRET).sub;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  socket.on('disconnect', () => socket.leave(`user:${socket.userId}`));
});

registerSocketServer(io);

server.listen(PORT, () => {
  console.log(`FoodSpots API listening on http://localhost:${PORT}`);
  console.log(`Accepting browser requests from ${CLIENT_ORIGINS.join(', ')}`);
});
