# 24Adz.com New Project — Updated Functional Plan

## Account and advertisement permissions
- Admin can create, edit, publish, pause and delete any advertisement.
- Registered, email-verified clients can create advertisements.
- Clients can edit and delete only advertisements owned by their own account.
- Public visitors can browse, search and filter published advertisements.
- No mobile OTP / SMS verification will be implemented. Do not request or store an OTP.
- Email verification remains required before client login; password reset is by email link.

## Required features (except mobile OTP)
1. Email verification and resend-verification flow.
2. Forgot password / password reset.
3. Client profile edit and account deletion.
4. Client-owned ad create / edit / delete; Admin retains full ad management.
5. Complete client chat inbox, conversation threads and replies.
6. Real-time-like chat updates using polling (or a supported realtime service if later configured).
7. Spam / fake-account protection, input validation and abuse controls.
8. API rate limiting on sensitive endpoints.
9. End-to-end browser testing on mobile and desktop.
10. Production D1 migration, backup, deploy and live verification.

## Business rules retained from the supplied project
- First 3 free ads per email account, subject to the monthly mobile-number cap of 3.
- VIP plans use wallet coins: 3 days = 300, 5 days = 500, 7 days = 700.
- Coin purchases are requested through WhatsApp and credited only after Admin confirmation.
- Existing homepage design, categories, district/area data, Admin Panel, D1 and R2 bindings must be preserved.
- No Razorpay or MSG91 integration.

## Implementation status for this working copy
- Inspected the uploaded ZIP and confirmed migrations 0001–0005 are included.
- Worker already contains email verification, password reset, profile edit/delete, owner-checked ad edit/delete, basic chat endpoints and D1 rate limiting; provider configuration and full UI/testing remain required.
- Updated client ad-create API to permit authenticated clients, enforce the free-ad quota, charge wallet coins for VIP plans, and attach ownership to the account.
- Updated homepage client ad submission to call the API and R2 image-upload endpoint; added owned-ad Edit/Delete controls in the client dashboard.
- Mobile OTP is not used.
- Not yet production verified: migrations, email delivery, client chat inbox/thread UX, real-time polling, comprehensive anti-abuse testing, browser testing and live deployment.
