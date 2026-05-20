import { Types } from 'mongoose';

export type ITranscript = {
  consultation: Types.ObjectId;
  channelName: string;
  speakerUid: number;
  speakerRole: 'user' | 'consultant';
  text: string;
  language: string;
  timestamp: Date;
  isFinal: boolean;
};
