import { Types } from 'mongoose';

export type IMessage = {
  sender: 'user' | 'consultant';
  text: string;
  timestamp: Date;
};

export type IReport = {
  consultation: Types.ObjectId;
  user: Types.ObjectId;
  consultant: Types.ObjectId;
  conversation: IMessage[];
  notes?: string;
  images?: string[];
  links?: string[];
  pdfUrl?: string;
};
