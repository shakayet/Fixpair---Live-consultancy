/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

export type IUser = {
  name: string;
  firstName?: string;
  lastName?: string;
  role: USER_ROLES;
  contact?: string;
  email: string;
  password?: string;
  location?: string;
  image?: string;
  avatar?: string;
  status: 'active' | 'blocked' | 'deleted';
  verified: boolean;
  firebaseUid?: string;
  provider?: 'local' | 'google' | 'facebook' | 'github' | 'apple';
  providerId?: string;
  consultancyType?: 'lawyer' | 'advisor' | 'doctor';
  experience?: string;
  languages?: string[];
  expertise?: string;
  tags?: string;
  visitFee?: number;
  perMinuteRate?: number;
  activeStatus?: boolean;
  stripeCustomerId?: string;
  paypalPayerId?: string;
  paymentMethods?: {
    provider: 'stripe' | 'paypal';
    methodId: string;
    last4?: string;
    brand?: string;
    isDefault: boolean;
  }[];
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number | null;
    expireAt: Date;
    otpRequestCount: number;
    lastOtpRequestTime: Date | null;
  };
  fcmTokens: string[];
  deviceType?: 'android' | 'ios';
  averageRating?: number;
  totalReviews?: number;
  totalConsultations?: number;
};

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
