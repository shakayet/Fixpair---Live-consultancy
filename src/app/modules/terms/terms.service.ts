import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { ITerms } from './terms.interface';
import { Terms } from './terms.model';

const createTerms = async (payload: ITerms): Promise<ITerms> => {
  // Since terms are usually unique, we might want to update the existing one or create if not exists
  const existingTerms = await Terms.findOne();
  if (existingTerms) {
    const result = await Terms.findByIdAndUpdate(existingTerms._id, payload, {
      new: true,
    });
    return result!;
  }

  const result = await Terms.create(payload);
  return result;
};

const getTerms = async (): Promise<ITerms | null> => {
  const result = await Terms.findOne();
  return result;
};

const updateTerms = async (
  id: string,
  payload: Partial<ITerms>
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

export const TermsService = {
  createTerms,
  getTerms,
  updateTerms,
};
