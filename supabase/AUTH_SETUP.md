# Supabase auth setup (6-digit email codes + password login)

**Member flow**
1. **Join:** list form → email OTP → create `members` row → **set password**
2. **Login:** email + password (no email sent), or “email me a code” OTP fallback

Password flag is stored in Supabase `user_metadata.password_set` (no extra table).

The gate uses `signInWithOtp` + `verifyOtp` for signup / OTP login, then
`updateUser({ password })` and `signInWithPassword` for everyday access.

Supabase still labels the email template **Magic Link**, but the body decides what users get:

- If the template includes `{{ .ConfirmationURL }}` → they get a link
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

## 3. Email rate limits

Supabase’s built-in mailer is strict (easy to hit while testing). You’ll see
`email rate limit exceeded`.

What to do:
1. Wait ~10–60 minutes, then use **resend code** (or join again)
2. If you already received a code earlier, enter it on the gate — don’t keep
   requesting new emails
3. For production / heavy testing, add **custom SMTP** (higher limits + From:
   Truly's World)
4. Prefer **password login** after signup so repeat visits don’t burn email quota

Do **not** spam join — each attempt burns the shared email quota.
