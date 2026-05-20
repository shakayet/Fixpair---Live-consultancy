import { Types } from 'mongoose';

export type IVideoSession = {
  consultation: Types.ObjectId;
  user: Types.ObjectId;
  consultant: Types.ObjectId;
  channelName: string;
  token: string;
  status: 'pending' | 'ongoing' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // Duration in minutes or seconds
  sttResourceId?: string;
  sttTaskId?: string;
  isTranscriptionActive?: boolean;
};
