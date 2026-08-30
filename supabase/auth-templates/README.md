# قوالب رسائل المصادقة — Supabase Auth templates

Supabase sends signup-confirmation and password-reset emails itself, not through
our application code. To make those messages Arabic, RTL and on-brand, two things
have to be configured in the Supabase dashboard.

## 1. Route Supabase's auth mail through Resend

**Dashboard → Project Settings → Authentication → SMTP Settings → Enable Custom SMTP**

| Field | Value |
|---|---|
| Sender email | `noreply@manaroasis.com` (must be a Resend-verified domain) |
| Sender name | `واحة د. منار مبارز` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key (the same `RESEND_API_KEY` value) |

Without this, Supabase uses its own low-rate shared sender, which is throttled and
frequently lands in spam.

> **Prerequisite:** the sending domain must be added and DNS-verified in Resend
> first. Until then `onboarding@resend.dev` only delivers to your own account
> address, so customer mail will not arrive.

## 2. Paste the Arabic templates

**Dashboard → Authentication → Email Templates**

Paste each file below into the matching template, and set the subject line:

| Template | File | Subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | `أكدي بريدك الإلكتروني` |
| Reset password | `reset-password.html` | `تغيير كلمة المرور` |
| Magic Link | `magic-link.html` | `رابط الدخول` |
| Change email address | `change-email.html` | `تأكيد تغيير البريد` |

Supabase substitutes `{{ .ConfirmationURL }}` at send time — leave those
placeholders exactly as they are.

## 3. Set the redirect URLs

**Dashboard → Authentication → URL Configuration**

- **Site URL:** `https://manaroasis.com`
- **Redirect URLs:** add both
  - `https://manaroasis.com/auth/callback`
  - `https://manaroasis.com/auth/reset-password`
  - `http://localhost:4321/auth/callback` (for local development)
  - `http://localhost:4321/auth/reset-password`

Links in the emails will not work until these are allow-listed.
