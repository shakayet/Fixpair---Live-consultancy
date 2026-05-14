/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import unlinkFile from '../../../shared/unlinkFile';
import generateOTP from '../../../util/generateOTP';
import QueryBuilder from '../../builder/QueryBuilder';
import { IUser } from './user.interface';
import { User } from './user.model';
import { ReviewService } from '../review/review.service';

const getAllUsersToDB = async (query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(
    User.find().select('-authentication -password -paymentMethods'),
    query,
  )
    .search(['name', 'email', 'contact'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery.lean();
  const meta = await userQuery.getPaginationInfo();

  // If fetching consultants, attach their stats
  const resultWithStats = await Promise.all(
    result.map(async (user: any) => {
      if (user.role === USER_ROLES.CONSULTANT) {
        const stats = await ReviewService.getConsultantStats(
          user._id.toString(),
        );
        return { ...user, stats };
      }
      return user;
    }),
  );

  return { result: resultWithStats, meta };
};

const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  //set role
  payload.role = payload.role || USER_ROLES.USER;
  const createUser = await User.create(payload);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  //send email
  const otp = generateOTP();
  const values = {
    name: createUser.name,
    otp: otp,
    email: createUser.email!,
  };
  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  await User.findOneAndUpdate(
    { _id: createUser._id },
    {
      $set: {
        'authentication.oneTimeCode': otp,
        'authentication.expireAt': new Date(Date.now() + 3 * 60000),
      },
    },
  );

  return createUser;
};

const getUserProfileFromDB = async (
  user: JwtPayload,
): Promise<Partial<IUser>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const userObj = isExistUser.toObject();

  // If user is a consultant, attach stats
  if (userObj.role === USER_ROLES.CONSULTANT) {
    const stats = await ReviewService.getConsultantStats(id);
    (userObj as any).stats = stats;
  }

  return userObj;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //unlink file here
  if (payload.image) {
    unlinkFile(isExistUser.image);
  }

  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  return updateDoc;
};

const deleteAccountFromDB = async (user: JwtPayload) => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (isExistUser.role === USER_ROLES.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Super Admin account cannot be deleted!',
    );
  }

  //unlink file here
  if (isExistUser.image) {
    unlinkFile(isExistUser.image);
  }

  const deleteDoc = await User.findByIdAndDelete(id);
  return deleteDoc;
};

const deleteUserFromDB = async (adminId: string, targetId: string) => {
  const adminUser = await User.findById(adminId);
  const targetUser = await User.findById(targetId);

  if (!targetUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  // Requirement: Super Admin cannot be deleted by anyone
  if (targetUser.role === USER_ROLES.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Super Admin account cannot be deleted!',
    );
  }

  if (adminUser?.role === USER_ROLES.ADMIN) {
    // Admin cannot delete other Admins
    if (targetUser.role === USER_ROLES.ADMIN) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Admin cannot delete another Admin account!',
      );
    }
  }

  // Unlink image if exists
  if (targetUser.image) {
    unlinkFile(targetUser.image);
  }

  const result = await User.findByIdAndDelete(targetId);
  return result;
};

const getSingleUserFromDB = async (id: string): Promise<Partial<IUser>> => {
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  const userObj = isExistUser.toObject();

  // If user is a consultant, attach stats
  if (userObj.role === USER_ROLES.CONSULTANT) {
    const stats = await ReviewService.getConsultantStats(id);
    (userObj as any).stats = stats;
  }

  return userObj;
};

const getConsultantsFromDB = async (query: Record<string, unknown>) => {
  // Use searchTerm for name filtering if name is provided in query
  const queryData = { ...query };
  if (queryData.name) {
    queryData.searchTerm = queryData.name;
    delete queryData.name;
  }

  // Add hardcoded filter for role: CONSULTANT
  const consultantQuery = new QueryBuilder(
    User.find({ role: USER_ROLES.CONSULTANT, status: 'active' }).select(
      '-authentication -password -paymentMethods',
    ),
    queryData,
  )
    .search(['name', 'email', 'expertise'])
    .filter() // This will handle ?consultancyType=doctor etc
    .sort()
    .paginate()
    .fields();

  const result = await consultantQuery.modelQuery.lean();
  const meta = await consultantQuery.getPaginationInfo();

  // Attach stats for all found consultants
  const resultWithStats = await Promise.all(
    result.map(async (user: any) => {
      const stats = await ReviewService.getConsultantStats(user._id.toString());
      return { ...user, stats };
    }),
  );

  return { result: resultWithStats, meta };
};

export const UserService = {
  getAllUsersToDB,
  createUserToDB,
  getUserProfileFromDB,
  updateProfileToDB,
  deleteAccountFromDB,
  deleteUserFromDB,
  getSingleUserFromDB,
  getConsultantsFromDB,
};
