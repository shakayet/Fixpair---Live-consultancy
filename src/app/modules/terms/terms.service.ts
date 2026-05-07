import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ITerms } from './terms.interface';
import { Terms } from './terms.model';

const createTerms = async (payload: ITerms): Promise<ITerms> => {
  const result = await Terms.create(payload);
  return result;
};

const getAllTerms = async (query: Record<string, unknown>) => {
  const termsQuery = new QueryBuilder(Terms.find(), query)
    .search(['title', 'content'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await termsQuery.modelQuery;
  const meta = await termsQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

const getSingleTerms = async (id: string): Promise<ITerms | null> => {
  const result = await Terms.findById(id);
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
  return result;
};

const deleteTerms = async (id: string): Promise<ITerms | null> => {
  const isExist = await Terms.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Terms & Conditions not found');
  }

  const result = await Terms.findByIdAndDelete(id);
  return result;
};

export const TermsService = {
  createTerms,
  getAllTerms,
  getSingleTerms,
  updateTerms,
  deleteTerms,
};
