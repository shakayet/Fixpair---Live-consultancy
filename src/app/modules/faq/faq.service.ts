import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IFaq } from './faq.interface';
import { Faq } from './faq.model';

const createFaq = async (payload: IFaq): Promise<IFaq> => {
  const result = await Faq.create(payload);
  return result;
};

const getAllFaqs = async (query: Record<string, unknown>) => {
  const faqQuery = new QueryBuilder(Faq.find(), query)
    .search(['question', 'answer'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await faqQuery.modelQuery;
  const meta = await faqQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

const getSingleFaq = async (id: string): Promise<IFaq | null> => {
  const result = await Faq.findById(id);
  return result;
};

const updateFaq = async (
  id: string,
  payload: Partial<IFaq>
): Promise<IFaq | null> => {
  const isExist = await Faq.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }

  const result = await Faq.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return result;
};

const deleteFaq = async (id: string): Promise<IFaq | null> => {
  const isExist = await Faq.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }

  const result = await Faq.findByIdAndDelete(id);
  return result;
};

export const FaqService = {
  createFaq,
  getAllFaqs,
  getSingleFaq,
  updateFaq,
  deleteFaq,
};
