import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelper } from '../../helpers/jwtHelper';

const auth =
  (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenWithBearer = req.headers.authorization;
      if (!tokenWithBearer || !tokenWithBearer.startsWith('Bearer')) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
      }

      const token = tokenWithBearer.split(' ')[1];
      if (!token) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
      }

      const secret = config.jwt.jwt_secret;
      if (!secret) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'JWT Secret is not defined in configuration',
        );
      }

      //verify token
      const verifyUser = jwtHelper.verifyToken(token, secret as Secret);
      //set user to header
      req.user = verifyUser;

      //guard user
      if (roles.length && !roles.includes(verifyUser.role)) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this api",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default auth;
