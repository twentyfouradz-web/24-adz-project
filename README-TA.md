# 24Adz.com — HEY MR Project Update

இந்த ZIP, தற்போதைய புதிய HEY MR project-ஐ அடிப்படையாகக் கொண்டது. Website brand 24Adz.com என மாற்றப்பட்டுள்ளது. ஏற்கனவே உள்ள Homepage browsing, categories, search, district/area data, Admin Panel, D1 மற்றும் R2 அமைப்புகளைப் பாதுகாக்கும் நோக்கில் additive changes மட்டுமே சேர்க்கப்பட்டுள்ளன.

## இந்த update-ல் உள்ளவை
- Homepage title/heading மற்றும் navigation-ல் 24Adz.com brand.
- Homepage banner-ஐ மறைத்து Post Ad action-ஐ முதன்மைப்படுத்தியது.
- Mobile bottom navigation: Home, My Ads, Post Ad, Messages, My 24Adz.
- Email + Password Client Register/Login API; ஒவ்வொரு account-க்கும் தனி Account ID.
- ஒரே mobile number பல email accounts-ல் பயன்படுத்த அனுமதி; அந்த number-க்கு மாதாந்திர free quota ஒருங்கிணைக்கப்படுகிறது.
- ஒரு email account-க்கு மொத்தம் 3 free ads; அதே mobile number-ல் ஒரு மாதத்தில் மொத்தம் 3 ads வரை free. இரு நிபந்தனைகளும் server-side check செய்யப்படும்.
- 3 / 5 / 7 நாள் VIP listing: 300 / 500 / 700 Coins.
- 1000 / 2000 / 3000 / 4000 / 5000 Coins packages; அதே எண்ணிக்கையிலான ரூபாய். Payment WhatsApp மூலம் Admin-க்கு; Admin confirmation பிறகே wallet credit.
- Client Wallet, transaction ledger, pending purchase requests மற்றும் Admin Panel-ல் Clients & Coins tab.
- Client ad image upload R2 binding மூலம்.
- Standard categories-ல் public API phone/WhatsApp number மறைக்கும்; Massage/Spa category-ல் direct Call/WhatsApp காட்டும். Client-owned ads-க்கு Chat entry point.
- `model_year`, ad expiry, VIP status ஆகிய fields.

## முக்கிய கோப்புகள்
- `public/index.html` — Website homepage மற்றும் client entry UI
- `public/admin.html` — Admin Panel; Clients & Coins management சேர்க்கப்பட்டது
- `workers/index.js` — API Worker
- `migrations/0004_client_accounts_coins.sql` — புதிய client account/wallet/coin schema
- `wrangler.toml` — தற்போதைய Worker, D1, R2 மற்றும் Assets bindings

## Production deploy செய்வதற்கு முன் கட்டாயம்
1. Production D1 database backup எடுக்கவும்.
2. `npx wrangler d1 migrations apply hey-mr-database --remote` இயக்கி migration 0004 ஒருமுறை மட்டும் apply ஆனதா உறுதி செய்யவும். ஏற்கனவே apply செய்திருந்தால் மீண்டும் இயக்க வேண்டாம்.
3. Cloudflare Worker Secrets-ல் வலுவான தனி `CLIENT_SESSION_SECRET` அமைக்கவும். `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` values-ஐ GitHub-ல் சேர்க்க வேண்டாம்.
4. `npm install`, `npm run check` இயக்கவும்.
5. Worker + Assets deploy செய்த பின் `/api/health` சோதிக்கவும்.
6. Test email accounts மூலம் register/login, ஒரே mobile-ஐப் பகிரும் இரண்டு email accounts, 3-free-ad quota, monthly mobile quota, coin purchase request, admin confirmation, VIP debit/expiry, image upload ஆகியவற்றைச் சோதிக்கவும்.

## இன்னும் முழுமையாக முடிக்கப்படாதவை / production checks
- Email verification link/provider integration இல்லை; email verified என்று காட்டக்கூடாது.
- SMS OTP integration இல்லை; phone verified என்று காட்டக்கூடாது.
- Client Chat API மற்றும் basic send-message UI உள்ளது; முழுமையான inbox/thread reply experience மற்றும் real-time updates இன்னும் கூடுதல் integration/test தேவை.
- Client account editing/deleting ads, password reset, rate limiting, abuse controls மற்றும் end-to-end browser testing இன்னும் தேவை.
- Production D1 migration மற்றும் Cloudflare deployment இந்த ZIP உருவாக்கும் பணியில் இயக்கப்படவில்லை.

**பாதுகாப்பு குறிப்பு:** முதலில் staging அல்லது backup எடுத்த production clone-ல் சோதிக்கவும். இந்த ZIP-ஐ upload செய்தவுடன் live website தானாக மாறாது; migration மற்றும் deploy தேவை.
