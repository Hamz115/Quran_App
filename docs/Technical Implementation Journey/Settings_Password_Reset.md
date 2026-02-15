# Settings & Password Reset Implementation

## Overview

This document covers the implementation of the Settings page and password reset functionality in QuranTrack. These features allow users to manage their profile information and securely reset their passwords.

## Features Implemented

### 1. Forgot Password Flow

Users who forget their password can request a reset email from the login page.

**Flow:**
1. User clicks "Forgot Password?" link on Login page
2. User enters their email on `/forgot-password` page
3. Supabase sends a password reset email with a secure link
4. User clicks the link in email, which redirects to `/reset-password`
5. User enters new password
6. Password is updated and user is redirected to login

**Technical Details:**
- Uses Supabase Auth's `resetPasswordForEmail()` method
- Reset link contains an `access_token` in the URL hash
- Token is validated by checking `window.location.hash` on the ResetPassword page

### 2. Settings Page

A unified settings page accessible from the user dropdown menu at `/settings`.

**Sections:**

1. **Profile Information**
   - Edit first name and last name
   - Uses `updateProfile()` from AuthContext
   - Updates the `profiles` table in Supabase

2. **Account Information** (Read-only)
   - Email address
   - Role badge (Teacher/Student)
   - Member since date

3. **Change Password**
   - New password input with 8+ character requirement
   - Confirm password validation
   - Uses Supabase Auth's `updateUser()` method

## Files Created

| File | Purpose |
|------|---------|
| `src/pages/ForgotPassword.tsx` | Email form to request password reset |
| `src/pages/ResetPassword.tsx` | New password form (from email link) |
| `src/pages/Settings.tsx` | Profile & settings page |

## Files Modified

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Added `resetPassword`, `updatePassword`, `updateProfile` methods |
| `src/App.tsx` | Added routes for `/forgot-password`, `/reset-password`, `/settings` |
| `src/pages/Login.tsx` | Added "Forgot Password?" link |
| `src/components/Layout.tsx` | Added Settings link in user dropdown menu |

## AuthContext Methods

### resetPassword(email: string)
```typescript
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new Error(error.message);
};
```

### updatePassword(newPassword: string)
```typescript
const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
};
```

### updateProfile(firstName: string, lastName: string)
```typescript
const updateProfile = async (firstName: string, lastName: string) => {
  const fullName = `${firstName} ${lastName}`.trim();
  const { error } = await supabase
    .from('profiles')
    .update({ name: fullName })
    .eq('id', session.user.id);
  if (error) throw new Error(error.message);

  // Update local state
  setUser(prev => prev ? { ...prev, first_name: firstName, last_name: lastName } : null);
};
```

## Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/forgot-password` | ForgotPassword | Public |
| `/reset-password` | ResetPassword | Public |
| `/settings` | Settings | Protected |

## UI Design

### Forgot Password & Reset Password Pages
- Same background image as Login/Signup (background.jpg)
- Centered card with form
- Loading states with spinner
- Success/error message displays
- Supports light/dark mode

### Settings Page
- Three card-based sections
- Color-coded icons:
  - Profile: Cyan
  - Account: Purple
  - Security: Amber/Orange
- Responsive layout (1-2 columns on mobile/desktop)
- Success/error notifications per section
- Gradient buttons matching app theme

## Supabase Email Templates

Supabase sends password reset emails automatically. To customize the email template:

1. Go to Supabase Dashboard > Authentication > Email Templates
2. Select "Reset Password" template
3. Customize the email content
4. The `{{ .ConfirmationURL }}` variable contains the reset link

**Default redirect URL format:**
```
https://your-app.com/reset-password#access_token=xxx&refresh_token=xxx&type=recovery
```

## ProtectedRoute Component

The `ProtectedRoute` component (`src/components/ProtectedRoute.tsx`) wraps all authenticated routes to enforce access control.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | required | The page component to render |
| `requireVerified` | `boolean` | `false` | If true, also requires email verification |

**Behavior:**
1. **Loading** (`isLoading = true`): Renders a centered spinner with "Loading..." text on a dark background
2. **Not authenticated** (`isAuthenticated = false`): Redirects to `/login` using `<Navigate>`, preserving the current location in `state.from` for redirect-after-login
3. **Verification required** (`requireVerified = true` and `isVerified = false`): Shows a "Verification Required" card with a message to check email and a "Go to Dashboard" button
4. **Authenticated**: Renders `children` normally

**Usage in App.tsx:**
```tsx
<Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
  <Route index element={<Dashboard />} />
  <Route path="settings" element={<Settings />} />
  {/* ... other routes */}
</Route>
```

Public routes (`/login`, `/signup`, `/forgot-password`, `/reset-password`) are defined outside the `ProtectedRoute` wrapper.

## Security Considerations

1. **Token Validation**: ResetPassword page checks for `access_token` in URL hash before showing the form
2. **Password Requirements**: Minimum 8 characters enforced on both client and server
3. **Timeout Handling**: All auth operations have 10-second timeouts to prevent hanging
4. **Session Handling**: Password changes work within existing Supabase session context
5. **Route Protection**: All authenticated pages are wrapped with `ProtectedRoute` which redirects unauthenticated users to `/login`

## Error Handling

- Invalid/expired reset links show an error state with link to request a new one
- Password mismatch errors shown inline
- Network/timeout errors displayed with user-friendly messages
- All forms have loading states to prevent double-submission

## Testing Checklist

- [ ] Request password reset email
- [ ] Receive email and click reset link
- [ ] Reset password with valid new password
- [ ] Test password mismatch validation
- [ ] Test minimum length validation
- [ ] Update profile name and verify persistence
- [ ] Change password from settings page
- [ ] Verify all pages work in light mode
- [ ] Verify all pages work in dark mode
- [ ] Test on mobile viewport
