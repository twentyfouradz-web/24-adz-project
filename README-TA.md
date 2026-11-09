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

- Free Ads மற்றும் VIP Coin விதிகள் ZIP-ல் இருந்தபடியே பாதுகாக்கப்பட்டுள்ளன.
- VIP: 3 நாட்கள் = 300 Coins; 5 நாட்கள் = 500 Coins; 7 நாட்கள் = 700 Coins.
- Coin வாங்க Admin-ஐ WhatsApp மூலம் தொடர்பு கொள்ளும் நடைமுறை தொடர்கிறது.
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
- Migration 0001–0005 அனைத்தும் புதிய SQLite test database-ல் வரிசையாக execute ஆனது.

இவை source-code checks மட்டுமே. Live Cloudflare deployment, production D1 migration, Resend email delivery, R2 upload, DNS மற்றும் real-device browser testing ஆகியவை இந்த ZIP உருவாக்கும் பணியில் இயக்கப்படவில்லை.

## Deploy செய்வதற்கு முன்

1. Production D1 database backup எடுக்கவும்.
2. Remote migration history பார்த்து apply ஆகாத migration-களை மட்டும் வரிசையாக apply செய்யவும். ஏற்கனவே apply ஆன migration-ஐ மீண்டும் இயக்க வேண்டாம்.
3. `npm install` இயக்கவும்.
4. `npm run check` இயக்கவும்.
5. முதலில் staging Worker + test D1 + test R2 மூலம் சோதிக்கவும்.
6. Admin post, Client email verification, Client post/edit/delete, image upload, homepage search ஆகியவற்றைச் சோதித்த பிறகே production deploy செய்யவும்.

**கவனம்:** ZIP உருவாக்கியதால் live website தானாக மாறாது. Cloudflare-ல் deploy செய்ய வேண்டும். D1/R2 resource பெயர்களை மாற்றாமல் பாதுகாத்துள்ளேன்; production-ல் deploy செய்வதற்கு முன் அவை சரியான resources என்பதை உறுதி செய்யவும்.
