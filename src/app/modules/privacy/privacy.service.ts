/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IPrivacy } from './privacy.interface';
import { Privacy } from './privacy.model';
import { cacheHelper } from '../../utils/cache';

const createPrivacy = async (payload: IPrivacy): Promise<IPrivacy> => {
  const result = await Privacy.create(payload);
  cacheHelper.clearByPrefix('privacy:list');
  return result;
};

const getAllPrivacies = async (query: Record<string, unknown>) => {
  const cacheKey = `privacy:list:${JSON.stringify(query)}`;
  const cachedData = cacheHelper.get<any>(cacheKey);
  if (cachedData) return cachedData;

  const privacyQuery = new QueryBuilder(Privacy.find(), query)
    .search(['title', 'content'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await privacyQuery.modelQuery.lean();
  const meta = await privacyQuery.getPaginationInfo();

  const response = {
    meta,
    result,
  };

  cacheHelper.set(cacheKey, response, 3600); // 1 hour
  return response;
};

const getSinglePrivacy = async (id: string): Promise<IPrivacy | null> => {
  const result = await Privacy.findById(id).lean();
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

  if (result) {
    cacheHelper.clearByPrefix('privacy:list');
  }
  return result;
};

const deletePrivacy = async (id: string): Promise<IPrivacy | null> => {
  const isExist = await Privacy.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Privacy Policy not found');
  }

  const result = await Privacy.findByIdAndDelete(id);
  if (result) {
    cacheHelper.clearByPrefix('privacy:list');
  }
  return result;
};

export const PrivacyService = {
  createPrivacy,
  getAllPrivacies,
  getSinglePrivacy,
  updatePrivacy,
  deletePrivacy,
};
