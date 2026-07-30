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

## 4. Email rate limits

Supabase’s built-in mailer is strict (easy to hit while testing). You’ll see
`email rate limit exceeded`.

What to do:
1. Wait ~10–60 minutes, then use **resend code** (or join again)
2. If you already received a code earlier, enter it on the gate — don’t keep
   requesting new emails
3. For production / heavy testing, add **custom SMTP** (higher limits + From:
   Truly's World)

Do **not** spam join — each attempt burns the shared email quota.
