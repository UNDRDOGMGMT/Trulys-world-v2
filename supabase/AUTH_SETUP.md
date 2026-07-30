# Supabase auth setup (6-digit email codes)

The gate uses `signInWithOtp` + `verifyOtp`. Supabase still labels the email
template **Magic Link**, but the body decides what users get:

- If the template includes `{{ .ConfirmationURL }}` → they get a link (current bug)
- If it includes **only** `{{ .Token }}` → they get a **6-digit code**

## 1. Swap the Magic Link template (required)

1. Open [Authentication → Email Templates](https://supabase.com/dashboard/project/_/auth/templates)
2. Select **Magic Link**
3. Subject: `Your Truly's World code`
4. Paste the HTML from [`email-templates/magic-link.html`](email-templates/magic-link.html)
5. Save — **do not** leave `{{ .ConfirmationURL }}` in the body

Optional: update **Confirm signup** the same way using `confirm-signup.html`.

## 2. Sender name (Truly's World, not “Supabase Auth”)

Default mail is `Supabase Auth <noreply@mail.app.supabase.io>`.

To brand the From line:
1. **Project Settings → Authentication → SMTP Settings** (or Auth → SMTP)
2. Connect custom SMTP (Resend / SendGrid / etc.)
3. Set sender name to `Truly's World` and a from-address you own

Until SMTP is set, the body still says Truly's World; only the From header stays Supabase.

## 3. URL config

Site URL + Redirect URLs should include your preview/prod origins. OTP entry
does not need a redirect, but keep them correct for safety.
