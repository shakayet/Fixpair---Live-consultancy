import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ITerms } from './terms.interface';
import { Terms } from './terms.model';
import { cacheHelper } from '../../utils/cache';

const createTerms = async (payload: ITerms): Promise<ITerms> => {
  const result = await Terms.create(payload);
  cacheHelper.clearByPrefix('terms:list');
  return result;
};

const getAllTerms = async (query: Record<string, unknown>) => {
  const cacheKey = `terms:list:${JSON.stringify(query)}`;
  const cachedData = cacheHelper.get<any>(cacheKey);
  if (cachedData) return cachedData;

  const termsQuery = new QueryBuilder(Terms.find(), query)
    .search(['title', 'content'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await termsQuery.modelQuery.lean();
  const meta = await termsQuery.getPaginationInfo();

  const response = {
    meta,
    result,
  };

  cacheHelper.set(cacheKey, response, 3600); // 1 hour
  return response;
};

const getSingleTerms = async (id: string): Promise<ITerms | null> => {
  const result = await Terms.findById(id).lean();
  return result;
};

const updateTerms = async (
  id: string,
  payload: Partial<ITerms>,
): Promise<ITerms | null> => {
  const isExist = await Terms.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Terms & Conditions not found');
  }

  const result = await Terms.findByIdAndUpdate(id, payload, {
    new: true,
  });

  if (result) {
    cacheHelper.clearByPrefix('terms:list');
  }
  return result;
};

const deleteTerms = async (id: string): Promise<ITerms | null> => {
  const isExist = await Terms.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Terms & Conditions not found');
  }

  const result = await Terms.findByIdAndDelete(id);
  if (result) {
    cacheHelper.clearByPrefix('terms:list');
  }
  return result;
};

export const TermsService = {
  createTerms,
  getAllTerms,
  getSingleTerms,
  updateTerms,
  deleteTerms,
};
