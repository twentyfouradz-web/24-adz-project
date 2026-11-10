# 24Adz Admin controls added

The Admin > Website Settings panel now includes editable site name/tagline/logo/footer, scam alert, homepage promotion copy/visibility, SEO title/description/keywords, maintenance mode, WhatsApp purchase number, free-ad quota and period, VIP prices, adult-word list/toggle, and browser image-safety toggle. Existing category/subcategory, district, ad, VIP, form-field, client wallet and coin request management remains available.

The Worker now reads the Admin-configured free-ad limit and period for both enforcement and client quota display. Adult-word filtering is enforced in the Worker for Cars, Bikes, Houses, Jobs and Mobiles; Personals/Massage/Spa is excluded from this word filter. Image classification is still browser-side and can be bypassed by direct API/image upload; true server-side image moderation requires a separate moderation provider and is not represented as complete.

Maintenance mode hides the public homepage with a message while leaving /admin.html accessible. SEO and content settings are applied client-side after public settings load; search-engine indexing still depends on crawler rendering and sitemap/robots configuration.

Additional controls: support phone/email, editable coin package coin-to-rupee amounts, and configurable general/Massage-Spa image classification thresholds. The homepage coin purchase prompt and client coin package page now read package settings from the API.

An additive migration `0009_area_management.sql` creates the standard areas table only if it is absent. Existing areas tables/data are not overwritten. The migration must be applied to D1 only if it is not already recorded in the remote migration history.
