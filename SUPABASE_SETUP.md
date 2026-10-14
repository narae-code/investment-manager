# Supabase setup for GitHub Pages

## 1. Create the shared table

In the Supabase project `datvpasbuccpxdgnfxbr`, open **SQL Editor**, paste `supabase-setup.sql`, and run it. The policies allow any authenticated account in this Supabase project to read and change the same shared portfolio. Keep account creation restricted: add or invite only intended users in Supabase Auth; the dashboard intentionally has no public sign-up button.

## 2. Configure the browser key

The supplied **Publishable key** is configured in `app.js`. If it is rotated, replace it with a new `sb_publishable_...` key. Never use a Secret key (`sb_secret_...`) or a legacy `service_role` key in GitHub Pages.

## 3. Configure Auth URLs

In **Authentication → URL Configuration**, set the Site URL to:

`https://narae-code.github.io/investment-manager/`

Add the same URL to the allowed redirect URLs. If email confirmation is required, users must confirm their invitation before logging in.

## 4. Publish

Commit and push `index.html`, `app.js`, `styles.css`, `supabase-setup.sql`, and this setup note to the repository branch used by GitHub Pages. Wait for the Pages deployment, then test using an invited account.

## Existing browser data

The app only reads the old `vibe-coding-investments` localStorage value after login. It never deletes or automatically uploads it. The user sees a preview and must confirm import. Rows whose names already exist in the shared database are skipped (case-insensitive); a database uniqueness constraint also prevents duplicates if two imports race. Skipping migration leaves the old value untouched.
