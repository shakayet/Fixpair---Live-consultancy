import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';

const userSocketMap = new Map<string, string>();

const socket = (io: Server) => {
  io.on('connection', socket => {
    logger.info(colors.blue('A user connected'));

    const userId = socket.handshake.query.userId as string;
    if (userId) {
      userSocketMap.set(userId, socket.id);
    }

    //disconnect
    socket.on('disconnect', () => {
      logger.info(colors.red('A user disconnect'));
      if (userId) {
        userSocketMap.delete(userId);
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
