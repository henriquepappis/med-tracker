# MOBILE-2 — Authentication Flow (Register/Login/Logout)

## Goal
Implement the authentication flow in the mobile app:
- register
- login
- logout
- token persistence

## Scope
- Auth screens (Register, Login)
- API client
- Store token securely (Expo SecureStore)
- Route guarding (unauthenticated users cannot access private screens)

## Backend Contract
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout` (auth required)

## Constraints
- Token-based auth only
- Store token securely (do not use AsyncStorage for tokens)
- Error states must be handled gracefully
- No advanced session refresh in this milestone

## Acceptance Criteria
- User can register and is redirected to logged-in area
- User can login and stays logged in after app restart
- User can logout and token is removed
