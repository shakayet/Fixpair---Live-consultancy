# Flutter Integration Guide for Google & Apple Login

This guide provides step-by-step instructions on how to integrate the Google and Apple login functionality provided by the backend into your Flutter application.

## Overview

The backend uses a **Redirect-based OAuth flow**. This means:
1. The Flutter app opens a secure web session to the backend login endpoint.
2. The user authenticates on the Google/Apple website.
3. The backend processes the login and redirects back to a URL you specify.
4. The Flutter app intercepts this redirect and extracts the authentication tokens.

---

## 1. Backend Configuration

Before starting with Flutter, ensure your backend is correctly configured in the `.env` file.

### Environment Variables
For mobile integration, the `FRONTEND_OAUTH_CALLBACK_URL` should use a **Custom Scheme** (e.g., `my-app://auth-callback`) so the mobile OS knows to send the redirect back to your app.

```env
# OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_CALLBACK_URL=http://your-backend-api.com/api/v1/oauth/google/callback

APPLE_OAUTH_CLIENT_ID=your_apple_service_id
APPLE_OAUTH_TEAM_ID=your_apple_team_id
APPLE_OAUTH_KEY_ID=your_apple_key_id
APPLE_OAUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_OAUTH_CALLBACK_URL=https://your-backend-api.com/api/v1/oauth/apple/callback

# CRITICAL: This must match your Flutter app's custom scheme
FRONTEND_OAUTH_CALLBACK_URL=com.example.app://auth-callback
```

---

## 2. Flutter Implementation

### Required Package
We recommend using [flutter_web_auth_2](https://pub.dev/packages/flutter_web_auth_2) as it handles the secure web session and redirect interception across Android and iOS.

Add to your `pubspec.yaml`:
```yaml
dependencies:
  flutter_web_auth_2: ^3.0.0
```

### Integration Logic

Create an `AuthService` to handle the login process:

```dart
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

class AuthService {
  static const String baseUrl = 'http://your-backend-api.com/api/v1/oauth';
  static const String callbackScheme = 'com.example.app'; // Must match .env

  Future<Map<String, String>?> signInWithSocial(String provider) async {
    try {
      // 1. Construct the login URL
      final url = '$baseUrl/$provider';

      // 2. Open secure web session
      final result = await FlutterWebAuth2.authenticate(
        url: url,
        callbackUrlScheme: callbackScheme,
      );

      // 3. Extract tokens from the redirect URL
      // The result will be: com.example.app://auth-callback?accessToken=...&refreshToken=...&userId=...
      final Uri uri = Uri.parse(result);
      
      final String? accessToken = uri.queryParameters['accessToken'];
      final String? refreshToken = uri.queryParameters['refreshToken'];
      final String? userId = uri.queryParameters['userId'];

      if (accessToken != null && refreshToken != null) {
        return {
          'accessToken': accessToken,
          'refreshToken': refreshToken,
          'userId': userId ?? '',
        };
      }
    } catch (e) {
      print('OAuth Error: $e');
    }
    return null;
  }

  Future<Map<String, String>?> signInWithGoogle() => signInWithSocial('google');
  Future<Map<String, String>?> signInWithApple() => signInWithSocial('apple');
}
```

---

## 3. Platform Configuration

### Android Setup
In your `android/app/src/main/AndroidManifest.xml`, register the callback intent filter inside the `<activity>` tag of your main activity:

```xml
<intent-filter android:label="flutter_web_auth_2">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.example.app" />
</intent-filter>
```

### iOS Setup
In Xcode, go to **Info** tab of your project settings and add a new **URL Type**:
- **Identifier**: `com.example.app`
- **URL Schemes**: `com.example.app`

---

## 4. Backend Endpoints Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/oauth/google` | `GET` | Initiates Google Login |
| `/api/v1/oauth/apple` | `GET` | Initiates Apple Login |
| `/api/v1/oauth/status` | `GET` | Check if providers are configured |
| `/api/v1/oauth/profile` | `GET` | Get user profile (Requires JWT) |

---

## 5. Security Notes

1. **HTTPS**: For Apple Login, Apple requires the callback URL to be `https`. Ensure your backend is served over HTTPS in production.
2. **Token Storage**: Use `flutter_secure_storage` to store the `accessToken` and `refreshToken` securely on the device.
3. **Session Management**: The backend uses `express-session` for temporary state during the OAuth flow, but the final authentication is stateless via JWT.

---

## Troubleshooting

- **Redirect not working on Android**: Ensure the `scheme` in `AndroidManifest.xml` matches the `callbackUrlScheme` in Dart and the `FRONTEND_OAUTH_CALLBACK_URL` in the backend `.env`.
- **Apple Login fails**: Verify that your Apple Developer Service ID is correctly configured and the redirect URI is added to the Apple Developer Portal.
- **Tokens missing**: Check the backend logs to see if the user was successfully created/found in the database.
