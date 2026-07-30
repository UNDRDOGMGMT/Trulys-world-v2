# Email templates

Paste these into **Supabase → Authentication → Email Templates**.

| File | Template slot | Subject |
|------|---------------|---------|
| `magic-link.html` | **Magic Link** (used by `signInWithOtp`) | `Your Truly's World code` |
| `confirm-signup.html` | Confirm signup (optional) | `Your Truly's World code` |

**Must use `{{ .Token }}` only** — remove every `{{ .ConfirmationURL }}` or users get a link instead of a 6-digit code.

Full steps: [../AUTH_SETUP.md](../AUTH_SETUP.md)
