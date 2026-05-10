import { Types } from 'mongoose';

export type IReport = {
  consultation: Types.ObjectId;
  user: Types.ObjectId;
  consultant: Types.ObjectId;
  conversation: string;
  notes?: string;
  images?: string[];
  links?: string[];
  pdfUrl?: string;
};
