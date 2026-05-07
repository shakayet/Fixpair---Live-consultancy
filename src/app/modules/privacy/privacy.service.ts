import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IPrivacy } from './privacy.interface';
import { Privacy } from './privacy.model';

const createPrivacy = async (payload: IPrivacy): Promise<IPrivacy> => {
  const result = await Privacy.create(payload);
  return result;
};

const getAllPrivacies = async (query: Record<string, unknown>) => {
  const privacyQuery = new QueryBuilder(Privacy.find(), query)
    .search(['title', 'content'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await privacyQuery.modelQuery;
  const meta = await privacyQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

const getSinglePrivacy = async (id: string): Promise<IPrivacy | null> => {
  const result = await Privacy.findById(id);
  return result;
};

const updatePrivacy = async (
  id: string,
  payload: Partial<IPrivacy>,
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

const deletePrivacy = async (id: string): Promise<IPrivacy | null> => {
  const isExist = await Privacy.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Privacy Policy not found');
  }

  const result = await Privacy.findByIdAndDelete(id);
  return result;
};

export const PrivacyService = {
  createPrivacy,
  getAllPrivacies,
  getSinglePrivacy,
  updatePrivacy,
  deletePrivacy,
};
