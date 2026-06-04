/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { model, Schema } from 'mongoose';
import config from '../../../config';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { IUser, UserModal } from './user.interface';

const userSchema = new Schema<IUser, UserModal>(
  {
    name: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      default: null,
    },
    lastName: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      select: 0,
      minlength: 8,
      default: null,
    },
    image: {
      type: String,
      default: 'https://i.ibb.co/z5YHLV9/profile.png',
    },
    avatar: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'delete'],
      default: 'active',
    },
    verified: {
      type: Boolean,
      default: false,
    },
    firebaseUid: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook', 'github', 'apple'],
      default: 'local',
    },
    providerId: {
      type: String,
      default: null,
    },
    consultancyType: {
      type: String,
      enum: ['lawyer', 'advisor', 'doctor'],
      default: null,
    },
    experience: {
      type: String,
      default: null,
    },
    languages: {
      type: [String],
      default: [],
    },
    expertise: {
      type: String,
      default: null,
    },
    tags: {
      type: String,
      default: null,
    },
    visitFee: {
      type: Number,
      default: 0,
    },
    perMinuteRate: {
      type: Number,
      default: 0,
    },
    activeStatus: {
      type: Boolean,
      default: true,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    paypalPayerId: {
      type: String,
      default: null,
    },
    paymentMethods: [
      {
        provider: { type: String, enum: ['stripe', 'paypal'] },
        methodId: { type: String },
        last4: { type: String },
        brand: { type: String },
        isDefault: { type: Boolean, default: false },
      },
    ],
    authentication: {
      isResetPassword: {
        type: Boolean,
        default: false,
      },
      oneTimeCode: {
        type: Number,
        default: null,
      },
      expireAt: {
        type: Date,
        default: null,
      },
      otpRequestCount: {
        type: Number,
        default: 0,
      },
      lastOtpRequestTime: {
        type: Date,
        default: null,
      },
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
    deviceType: {
      type: String,
      enum: ['android', 'ios'],
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalConsultations: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret: any) {
        delete ret.authentication;
        delete ret.password;
        delete ret.paymentMethods;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret: any) {
        delete ret.authentication;
        delete ret.password;
        delete ret.paymentMethods;
        return ret;
      },
    },
  },
);

//exist user check
userSchema.statics.isExistUserById = async (id: string) => {
  const isExist = await User.findById(id);
  return isExist;
};

userSchema.statics.isExistUserByEmail = async (email: string) => {
  const isExist = await User.findOne({ email });
  return isExist;
};

//is match password
userSchema.statics.isMatchPassword = async (
  password: string,
  hashPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

//check user
userSchema.pre('save', async function (next) {
  // Only check for existing email if it's a new user
  if (this.isNew) {
    const isExist = await User.findOne({ email: this.email });
    if (isExist) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exist!');
    }
  }

  //password hash (only for local auth with password)
  if (this.password && this.isModified('password')) {
    this.password = await bcrypt.hash(
      this.password,
      Number(config.bcrypt_salt_rounds),
    );
  }
  next();
});

// Indexes for performance
userSchema.index({ role: 1, status: 1 });
userSchema.index({
  role: 1,
  status: 1,
  averageRating: -1,
  totalConsultations: -1,
});
userSchema.index({ consultancyType: 1 }, { sparse: true });
userSchema.index({ activeStatus: 1 });

export const User = model<IUser, UserModal>('User', userSchema);
