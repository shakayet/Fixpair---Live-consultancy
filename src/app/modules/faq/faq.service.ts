import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IFaq } from './faq.interface';
import { Faq } from './faq.model';
import { cacheHelper } from '../../utils/cache';

const createFaq = async (payload: IFaq): Promise<IFaq> => {
  const result = await Faq.create(payload);
  cacheHelper.clearByPrefix('faq:list');
  return result;
};

const getAllFaqs = async (query: Record<string, unknown>) => {
  const cacheKey = `faq:list:${JSON.stringify(query)}`;
  const cachedData = cacheHelper.get<any>(cacheKey);
  if (cachedData) return cachedData;

  const faqQuery = new QueryBuilder(Faq.find({ status: 'active' }), query)
    .search(['question', 'answer'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await faqQuery.modelQuery.lean();
  const meta = await faqQuery.getPaginationInfo();

  const response = {
    meta,
    result,
  };

  cacheHelper.set(cacheKey, response, 1800); // 30 mins
  return response;
};

const getSingleFaq = async (id: string): Promise<IFaq | null> => {
  const result = await Faq.findById(id).lean();
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
  
  if (result) {
    cacheHelper.clearByPrefix('faq:list');
  }
  
  return result;
};

const deleteFaq = async (id: string): Promise<IFaq | null> => {
  const isExist = await Faq.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }

  const result = await Faq.findByIdAndDelete(id);
  if (result) {
    cacheHelper.clearByPrefix('faq:list');
  }
  return result;
};

export const FaqService = {
  createFaq,
  getAllFaqs,
  getSingleFaq,
  updateFaq,
  deleteFaq,
};
