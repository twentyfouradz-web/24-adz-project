# 24Adz Category and Subcategory Fixes

## Fixed category structure
The only main categories are Cars, Bikes, Houses, Mobiles, Jobs and Personals. Main categories are seeded by migration `0007_fixed_main_categories_and_hierarchy.sql`. The exact 27 homepage subcategories are seeded by `0008_seed_homepage_subcategories.sql` and cannot be created, renamed, deactivated or deleted through the Admin API. Admins can create, edit, deactivate and delete subcategories under one of those six main categories.

## Safety rules added
- Subcategories must have a valid main-category parent; nested subcategories are rejected.
- Parent must be one of the six approved main categories and must be active.
- Duplicate subcategory names under the same parent and duplicate slugs are rejected.
- A subcategory cannot be deleted while existing ads use it; deactivate it instead.
- Ads must use one of the six main categories. If active subcategories exist for that category, a valid subcategory is required.
- Subcategory is stored in `ads.details_json` and returned as `subcategory` in public ad responses.
- Public ad API supports the `subcategory` query parameter.

## Deployment (Cloudflare)
1. Back up the existing D1 database before applying migrations.
2. Upload these updated project files to the connected GitHub repository.
3. Apply migrations in order, including migrations 0007 and 0008, to the existing D1 database:
   `npx wrangler d1 migrations apply hey-mr-database --remote`
4. Deploy the API Worker using the existing `wrangler.toml` configuration.
5. Verify `GET /api/public/categories` returns six active root categories and their active subcategories.
6. Verify that the 27 approved subcategories are active and visible in the Admin Panel, then test Client and Admin ad posting and Homepage filtering. Do not recreate the seeded subcategories manually.

Do not create a new D1 database or change existing database/bucket IDs for this update.
