# EVE SSO Authentication Setup

This guide explains how to set up your application to work with EVE Online's SSO authentication system.

## Prerequisites

1. You need to register an application on the [EVE Developers Portal](https://developers.eveonline.com/)
2. A server capable of receiving the OAuth2 callback

## Register on EVE Developers Portal

1. Log in to the [EVE Developers Portal](https://developers.eveonline.com/)
2. Go to "Applications" and click "Create New Application"
3. Fill out the application details:
   - Name: Your application name
   - Description: A brief description
   - Connection Type: "Authentication & API Access"
   - Callback URL: `http://your-domain.com/auth/callback` (or use localhost for development)
   - Select the required scopes (minimum: `publicData`)

## Environment Configuration

Add the following variables to your `.env` file:

```env
# EVE SSO Authentication
EVE_SSO_CLIENT_ID=your_client_id_from_dev_portal
EVE_SSO_SECRET_KEY=your_secret_key_from_dev_portal
EVE_SSO_CALLBACK_URL=http://your-domain.com/auth/callback
JWT_SECRET=your_secure_random_string_for_jwt_signing
```

## Required Scopes

This application requires the following minimum scopes:

- `publicData`: Required for basic character information
- `esi-killmails.read_killmails.v1`: Required to access character killmails
- `esi-killmails.read_corporation_killmails.v1`: Optional, for corporation killmails

## Auth Flow Overview

1. User clicks "Login with EVE Online" button
2. User is redirected to EVE Online SSO page
3. User authorizes the application with the requested scopes
4. EVE Online redirects back to the callback URL with an authorization code
5. Server exchanges the code for access and refresh tokens
6. User is authenticated in the application

## Testing the Authentication Flow

1. Start your application in development mode
2. Navigate to the login page
3. Click the "Login with EVE Online" button
4. Authorize the application in the EVE SSO screen
5. You should be redirected back to your application and logged in

## Troubleshooting

### Invalid Redirect URI

- Ensure the callback URL in your `.env` file exactly matches the one registered in the EVE Developers Portal

### Authorization Error

- Check that your client ID and secret key are correct
- Verify that the requested scopes are properly registered

### Token Refresh Issues

- Refresh tokens expire if not used for 30 days
- Users will need to re-authenticate if their refresh token has expired
