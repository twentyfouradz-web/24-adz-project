# 24Adz.com — Updated Project Plan

## Confirmed access rules
- Admin can post and manage all advertisements.
- Clients can register, verify their email, log in, and post advertisements.
- Clients can edit/delete only their own advertisements.
- Visitors can browse and search published advertisements.
- Email verification is required. Mobile number OTP/SMS verification is excluded; mobile is a contact field only.

## Implemented in this package
- Homepage and Admin Panel remain in place; legacy branding/configuration references have been cleaned from active website code.
- Client registration, email verification, login, password reset, profile, dashboard, ad creation, owner-scoped edit/delete, image upload, chat and coin request routes are present.
- Client ad create/edit/delete API restrictions that incorrectly blocked all clients have been removed.
- Client API authentication now requires an email-verified account.
- Admin APIs remain protected by the Admin bearer token.
- Client and Admin browser storage keys use the 24Adz namespace.
- Client Post Ad action opens the existing homepage posting modal and does not redirect to a missing `client.html`.

## Retained settings
- Free quota is enforced server-side as 3 ads per mobile number per calendar month across multiple email accounts.
- The 4th ad and later ads require a paid VIP plan using wallet coins.
- Coin package requests remain manual; Razorpay checkout, signature verification and webhook crediting still require gateway credentials and setup.
- Existing homepage appearance, D1 schema history and R2 bindings are preserved.
- No SMS OTP, MSG91 or Razorpay is configured.

## Not verified by creating this ZIP
- Production D1 migration state and production database contents.
- Resend email sender/domain verification and actual delivery.
- Cloudflare production secrets, D1/R2 binding availability, DNS and deployment.
- Full browser/device end-to-end testing and production chat behavior.

## Deployment caution
The D1 and R2 physical resource identifiers were intentionally retained. Back up D1 and test with staging resources before deployment. Do not apply migrations blindly; inspect the remote migration history first.
