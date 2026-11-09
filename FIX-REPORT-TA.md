# 24Adz.com — Targeted fixes in this package

## Fixed
- Monthly free-ad quota is 3 per mobile number, across multiple email accounts.
- Quota is checked by the Worker on every new client ad, not just hidden in the UI.
- Client dashboard now displays the mobile-wide monthly usage.
- Homepage image validation is aligned with the Worker limit: 5 MB.
- Homepage free-plan copy now states 3 ads per mobile number per calendar month.
- Existing category hierarchy rules are retained: only six fixed parent categories; Admin can manage direct subcategories; invalid/nested/circular parent assignments are rejected.
- Existing subcategory values are passed through the client and homepage posting payloads; public API filtering supports `subcategory`.
- Added migration `0008_seed_homepage_subcategories.sql` to seed the exact 27 subcategories shown in the approved homepage screenshots (Cars 4, Bikes 3, Mobiles 4, Jobs 4, Houses 5, Personals 7).
- Fixed homepage D1 category mapping so the Personals parent is never shown as its own subcategory, and main-category selectors contain only the six parent categories.
- The migration is repeat-safe, reuses existing matching category rows by slug, activates the approved subcategories, and deactivates obsolete subcategories without deleting old category rows or ads.
- A subcategory in use by ads cannot be deleted; Admin must deactivate it instead, preventing orphaned ad records.
- Existing Homepage, Admin Panel, D1 database and R2 bucket identifiers are preserved.

## Not included / needs owner setup
- Razorpay live payment flow is not enabled in this ZIP. It requires the account's Razorpay Key ID, Key Secret and webhook secret to be configured as Cloudflare secrets, plus live/test mode selection. Do not paste secret values into chat or source files.
- Coin package prices currently remain ₹1 per coin (e.g. 1,000 coins = ₹1,000) as already defined in the project. Confirm pricing before enabling checkout.
- Production D1 migrations, email delivery, R2 upload and live browser testing must be verified after deployment.

## Deploy safely
1. Back up the production D1 database.
2. Confirm the configured D1 and R2 names/IDs in `wrangler.toml` match the existing Cloudflare resources. Do not rename them based only on this package.
3. Inspect remote migration history and apply only unapplied migrations (0001–0008).
4. Run `npm install` and `npm run check`.
5. Deploy the API Worker and test `/api/health`.
6. Test 3 ads on one mobile number using separate email accounts; the 4th free attempt must be rejected.
7. Test Admin and Client category/subcategory creation, edit, selection, search filtering, and safe deactivation.
