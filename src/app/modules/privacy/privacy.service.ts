import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IPrivacy } from './privacy.interface';
import { Privacy } from './privacy.model';

const createPrivacy = async (payload: IPrivacy): Promise<IPrivacy> => {
  const existingPrivacy = await Privacy.findOne();
  if (existingPrivacy) {
    const result = await Privacy.findByIdAndUpdate(existingPrivacy._id, payload, {
      new: true,
    });
    return result!;
  }

  const result = await Privacy.create(payload);
  return result;
};

const getPrivacy = async (): Promise<IPrivacy | null> => {
  const result = await Privacy.findOne();
  return result;
};

const updatePrivacy = async (
  id: string,
  payload: Partial<IPrivacy>
): Promise<IPrivacy | null> => {
  const isExist = await Privacy.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Privacy Policy not found');
  }

  const result = await Privacy.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return result;
};

export const PrivacyService = {
  createPrivacy,
  getPrivacy,
  updatePrivacy,
};
