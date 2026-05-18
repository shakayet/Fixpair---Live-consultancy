import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { jwtHelper } from './jwtHelper';
import config from '../config';
import { Secret } from 'jsonwebtoken';

const userSocketMap = new Map<string, string>();

const socket = (io: Server) => {
  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      // Remove 'Bearer ' if present
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwtHelper.verifyToken(cleanToken, config.jwt.jwt_secret as Secret);
      
      if (!decoded || !decoded.id) {
        return next(new Error('Authentication error: Invalid token'));
      }

      // @ts-ignore
      socket.userId = decoded.id;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', socket => {
    // @ts-ignore
    const userId = socket.userId;
    
    if (userId) {
      userSocketMap.set(userId, socket.id);
      logger.info(colors.blue(`User connected: ${userId} (Socket: ${socket.id})`));
    }

    //disconnect
    socket.on('disconnect', () => {
      if (userId) {
        userSocketMap.delete(userId);
        logger.info(colors.red(`User disconnected: ${userId}`));
      }
    });
  });
};

const emitToUser = (userId: string, event: string, data: any) => {
  //@ts-ignore
  const io = global.io as Server;
  const socketId = userSocketMap.get(userId);
  if (io && socketId) {
    io.to(socketId).emit(event, data);
  }
};

export const socketHelper = { socket, emitToUser };
