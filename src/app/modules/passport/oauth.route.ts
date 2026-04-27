import express, { Router } from 'express';
import passport from 'passport';
import { OAuthController } from './oauth.controller';
import auth from '../../middlewares/auth';

/**
 * OAuth Routes
 * Handles OAuth login initiation, callbacks, and profile retrieval
 * Supports multiple providers through a clean, extensible structure
 */

const router: Router = express.Router();

/**
 * Google OAuth Routes
 */

// Initiate Google OAuth login
// Redirects user to Google login page
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  }),
);

// Google OAuth callback
// Called by Google after user authorization
// Generates JWT tokens and redirects to frontend
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/v1/oauth/login-failed',
    session: true,
  }),
  OAuthController.googleCallback,
);

/**
 * Apple OAuth Routes
 */

// Initiate Apple OAuth login
// Redirects user to Apple login page
router.get(
  '/apple',
  passport.authenticate('apple', {
    scope: ['name', 'email'],
  }),
);

// Apple OAuth callback
// Called by Apple after user authorization
router.post(
  '/apple/callback',
  passport.authenticate('apple', {
    failureRedirect: '/api/v1/oauth/login-failed',
    session: true,
  }),
  OAuthController.appleCallback,
);

/**
 * Profile Routes
 */

// Get authenticated user profile
// Requires valid JWT token
router.get('/profile', auth(), OAuthController.getProfile);

/**
 * OAuth Status Route
 */

// Check which OAuth providers are configured
router.get('/status', OAuthController.getOAuthStatus);

/**
 * Error Handling
 */

// Login failure redirect
router.get('/login-failed', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'OAuth login failed',
    error: 'Authentication was not successful',
  });
});

export const OAuthRoutes = router;
