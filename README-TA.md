# 24Adz.com — Project Package

இந்த ZIP என்பது 24Adz.com website மற்றும் API project. கொடுக்கப்பட்ட homepage design, categories, district/area interfaces, Admin Panel, D1 migration history மற்றும் R2 image upload இணைப்புகளைப் பாதுகாத்து, பழைய project references மற்றும் Client posting தடைகளைச் சரிசெய்துள்ளேன்.

## Ad Posting அனுமதிகள்

- **Admin:** எந்த விளம்பரத்தையும் Create, Edit, Publish, Pause, Delete செய்யலாம்.
- **Client:** Register செய்து Email Verification முடித்த பிறகு விளம்பரம் போடலாம்.
- **Client:** தன்னுடைய account-ல் உருவாக்கிய Ads மட்டும் Edit/Delete செய்யலாம்.
- **Visitor:** Published Ads பார்க்கலாம்; Search மற்றும் Filter பயன்படுத்தலாம்.
- **Email Verification கட்டாயம்.**
- **Mobile OTP / SMS Verification இல்லை.** Mobile number தொடர்பு கொள்ளும் எண்ணாக மட்டும் பயன்படுத்தப்படும்.
- Client login மற்றும் Client API requests அனைத்துக்கும் email verified account தேவை.

## இந்த ZIP-ல் திருத்தியவை

- `package.json` project பெயர் 24Adz API-க்கு மாற்றப்பட்டது.
- `README-TA.md`, `API-ROUTES.txt`, project plan ஆகியவற்றில் பழைய Admin-only posting தகவல் திருத்தப்பட்டது.
- `workers/index.js`-ல் Client Ad Create/Edit/Delete-ஐத் தடுத்த பழைய தடைகள் நீக்கப்பட்டன.
- Admin API-கள் Admin bearer token பாதுகாப்புடன் தொடர்கின்றன.
- Client API-கள் email-verified Client token மூலம் மட்டுமே செயல்படும்.
- Homepage-ல் Client Register/Login, My Ads, Post Ad செயல்பாடுகள் கிடைக்கும்.
- பழைய Admin configuration மற்றும் client localStorage/sessionStorage keys மாற்றப்பட்டன.
- Client Post Ad action இல்லாத `client.html` பக்கத்துக்கு redirect ஆகாமல் Homepage-ல் உள்ள Post Ad form-ஐ திறக்கும்.
- Homepage design மற்றும் தற்போதைய features-ஐ மாற்றாமல் வைத்துள்ளேன்.

## ஏற்கனவே உள்ள அமைப்புகள்

- Free Ads Limit மற்றும் Period Admin Panel > Website Settings-ல் மாற்றலாம். Default 3 Ads / 30 Days. ஒரே Mobile Number-ஐ வேறு Email account-ல் பயன்படுத்தினாலும் அனைத்து client accounts-ஐ சேர்த்து quota கணக்கிடப்படும். Limit முடிந்த பிறகு Free plan மறுக்கப்படும்; VIP plan-க்கு Coin wallet பயன்படுத்தலாம்.
- VIP: 3 நாட்கள் = 300 Coins; 5 நாட்கள் = 500 Coins; 7 நாட்கள் = 700 Coins.
- Coin package endpoint மற்றும் wallet ledger உள்ளன. ஆனால் இந்த ZIP-ல் Razorpay live order creation / signature verification / webhook integration இல்லை. Gateway credentials மற்றும் webhook அமைக்காமல் online payment enable செய்ய வேண்டாம். தற்போதைய manual WhatsApp coin request fallback மட்டுமே.
- D1 மற்றும் R2 bindings பாதுகாக்கப்பட்டுள்ளன.

## Cloudflare Resource பாதுகாப்பு

`wrangler.toml`-ல் Worker பெயர் `24adz-api` என மாற்றப்பட்டுள்ளது. ஆனால் கொடுக்கப்பட்ட ZIP-ல் இருந்த D1 `database_name` + `database_id`, R2 `bucket_name` ஆகியவற்றை மாற்றவில்லை. Cloudflare-ல் உண்மையில் இருக்கும் Database/Bucket பெயர்களை உறுதி செய்யாமல் அவற்றை மாற்றினால் deployment அல்லது database இணைப்பு பாதிக்கப்படலாம்.

Cloudflare Worker Secrets-ல் அமைக்க வேண்டியவை:
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `CLIENT_SESSION_SECRET` (தனி Client token secret பரிந்துரைக்கப்படுகிறது)
- `RESEND_API_KEY`
- `RESEND_FROM`
- `PUBLIC_SITE_URL` (உங்கள் live 24Adz URL)

Email verification link அனுப்ப Resend API key மற்றும் verified sender கட்டாயம். அவை அமைக்கப்படாவிட்டால் Client account unverified ஆகவே இருக்கும்; login மற்றும் ad posting அனுமதிக்கப்படாது.

## சரிபார்ப்பு

இந்த ZIP உருவாக்கும்போது:
- Worker JavaScript syntax check வெற்றி.
- Homepage மற்றும் Admin Panel inline JavaScript syntax checks வெற்றி.
- Migration 0001–0009 அனைத்தும் புதிய SQLite test database-ல் வரிசையாக execute ஆனது.

இவை source-code checks மட்டுமே. Live Cloudflare deployment, production D1 migration, Resend email delivery, R2 upload, DNS மற்றும் real-device browser testing ஆகியவை இந்த ZIP உருவாக்கும் பணியில் இயக்கப்படவில்லை.

## Admin Website Settings

Admin > Website Settings மூலம் Site Name, Tagline, Logo URL, Footer Message, Scam Alert copy, Homepage promotion banner copy/visibility, SEO title/description/keywords, Maintenance Mode, WhatsApp purchase number, support phone/email, Free Ads quota/period, VIP prices, coin package rupee amounts, adult-word list/toggle மற்றும் browser image-safety toggle ஆகியவற்றை நிர்வகிக்கலாம். Admin > Area Management மூலம் D1 `areas` table-ல் உள்ளூர் பகுதிகளை நிர்வகிக்கலாம். Categories, Districts, Ads, VIP, Clients & Coins மற்றும் Post Ad Form Builder ஆகிய பழைய Admin sections தொடர்கின்றன.

**Image moderation limitation:** image classification browser-side only. Direct API/R2 upload-ஐ AI மூலம் server-side scan செய்ய இந்த package-ல் தனி moderation provider இல்லை. Text-word moderation Worker API-ல் enforced.

## Deploy செய்வதற்கு முன்

1. Production D1 database backup எடுக்கவும்.
2. Remote migration history பார்த்து apply ஆகாத migration-களை மட்டும் வரிசையாக apply செய்யவும். புதிய `0009_area_management.sql`-ஐ அது இன்னும் apply ஆகவில்லை என்றால் மட்டும் இயக்கவும். ஏற்கனவே apply ஆன migration-ஐ மீண்டும் இயக்க வேண்டாம்.
3. `npm install` இயக்கவும்.
4. `npm run check` இயக்கவும்.
5. முதலில் staging Worker + test D1 + test R2 மூலம் சோதிக்கவும்.
6. Admin post, Client email verification, Client post/edit/delete, image upload, homepage search ஆகியவற்றைச் சோதித்த பிறகே production deploy செய்யவும்.

**கவனம்:** ZIP உருவாக்கியதால் live website தானாக மாறாது. Cloudflare-ல் deploy செய்ய வேண்டும். D1/R2 resource பெயர்களை மாற்றாமல் பாதுகாத்துள்ளேன்; production-ல் deploy செய்வதற்கு முன் அவை சரியான resources என்பதை உறுதி செய்யவும்.


## புதிய Main Categories – Migration 0010

இந்த update-ல் Hotel Rooms, Real Estate, Fashion & Beauty ஆகிய 3 புதிய Main Categories மற்றும் அவற்றின் Subcategories சேர்க்கப்பட்டுள்ளன. Deploy செய்வதற்கு முன் Cloudflare D1-ல் `migrations/0010_add_hotel_realestate_fashion_categories.sql`-ஐ ஒருமுறை இயக்கவும். இந்த migration-ஐ மீண்டும் இயக்கினாலும் ஏற்கெனவே உள்ள category rows-ஐ duplicate செய்யாது. Worker-ஐ deploy செய்த பிறகு Homepage, Client Post Ad, Admin Category Manager ஆகியவற்றில் புதிய categories தோன்ற வேண்டும்.


## Migration 0011 – Houses main category removal

Run `migrations/0011_remove_houses_main_category.sql` on the existing D1 database before/with the Worker deployment. Existing ads categorized as `Houses` are preserved and reclassified as `Real Estate`; the old Houses category and its subcategories are deactivated. The homepage main-category tile now shows Real Estate instead of Houses. Hotel Rooms and Fashion & Beauty remain available. No homepage layout redesign or R2 change is included.
