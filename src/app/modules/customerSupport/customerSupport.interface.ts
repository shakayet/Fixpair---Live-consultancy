import { Model } from 'mongoose';

export type ICustomerSupport = {
  email: string;
  phoneNumber?: string;
};

export type CustomerSupportModel = Model<ICustomerSupport, Record<string, unknown>>;
