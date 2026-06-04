import { ICustomerSupport } from './customerSupport.interface';
import { CustomerSupport } from './customerSupport.model';

const createOrUpdateCustomerSupportToDB = async (
  payload: ICustomerSupport,
): Promise<ICustomerSupport> => {
  // Since there should typically only be one support contact entry
  const isExist = await CustomerSupport.findOne();

  if (isExist) {
    const result = await CustomerSupport.findOneAndUpdate({}, payload, {
      new: true,
      runValidators: true,
    });
    return result as ICustomerSupport;
  }

  const result = await CustomerSupport.create(payload);
  return result;
};

const getCustomerSupportFromDB = async (): Promise<ICustomerSupport | null> => {
  const result = await CustomerSupport.findOne();
  return result;
};

export const CustomerSupportService = {
  createOrUpdateCustomerSupportToDB,
  getCustomerSupportFromDB,
};
