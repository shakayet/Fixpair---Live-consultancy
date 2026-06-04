import { Schema, model } from 'mongoose';
import { CustomerSupportModel, ICustomerSupport } from './customerSupport.interface';

const customerSupportSchema = new Schema<ICustomerSupport, CustomerSupportModel>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

export const CustomerSupport = model<ICustomerSupport, CustomerSupportModel>(
  'CustomerSupport',
  customerSupportSchema,
);
