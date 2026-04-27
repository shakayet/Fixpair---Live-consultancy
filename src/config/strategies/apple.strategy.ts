/* eslint-disable @typescript-eslint/no-explicit-any */
import AppleStrategy from 'passport-apple';
import config from '../index';
import { User } from '../../app/modules/user/user.model';

/**
 * Apple OAuth Strategy
 * Configures Passport to use Apple as an OAuth provider
 * Creates or updates user profile on successful authentication
 *
 * Note: Strategy will only be initialized if credentials are configured
 */

let appleStrategy: AppleStrategy | null = null;

// Only initialize strategy if credentials are provided
if (
  config.oauth.apple.clientID &&
  config.oauth.apple.teamID &&
  config.oauth.apple.keyID &&
  config.oauth.apple.privateKeyString
) {
  appleStrategy = new AppleStrategy(
    {
      clientID: config.oauth.apple.clientID,
      teamID: config.oauth.apple.teamID,
      keyID: config.oauth.apple.keyID,
      privateKeyString: config.oauth.apple.privateKeyString,
      callbackURL: config.oauth.apple.callbackURL,
      passReqToCallback: true,
      scope: ['name', 'email'],
    },
    async (
      req: any,
      accessToken: string,
      refreshToken: string,
      idToken: string,
      profile: any,
      done: any,
    ) => {
      try {
        // Apple profile might be empty on subsequent logins
        // idToken contains the 'sub' (providerId) and 'email'
        const id = profile?.id || profile?.sub;
        const email = profile?.email;
        const name = profile?.name;

        if (!id) {
          return done(new Error('No provider ID provided by Apple'));
        }

        let user = await User.findOne({
          $or: [
            { providerId: id, provider: 'apple' },
            ...(email ? [{ email }] : []),
          ],
        });

        if (!user) {
          if (!email) {
            return done(new Error('No email provided by Apple for new user'));
          }

          // Create new user from Apple profile
          const firstName = name?.firstName || 'User';
          const lastName = name?.lastName || '';

          user = await User.create({
            email,
            name: `${firstName} ${lastName}`.trim() || 'User',
            role: 'USER',
            firstName,
            lastName,
            provider: 'apple',
            providerId: id,
            verified: true, // Apple verified the email
            status: 'active',
            contact: '',
            location: '',
            password: null,
          });
        } else {
          // Update existing user with Apple provider info if not set
          if (!user.providerId || user.provider !== 'apple') {
            user.provider = 'apple';
            user.providerId = id;
            await user.save();
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  );
}

export { appleStrategy };
