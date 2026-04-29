import { Types } from 'mongoose';

export type IReview = {
  user: Types.ObjectId;
  consultant: Types.ObjectId;
  consultation: Types.ObjectId;
  rating: number;
  comment: string;
};
