# Shortlet Stay admin

For Shortlet Stay staff (accounts with `is_staff` in the API). Next.js 16, the same stack as the website.

- **Overview** (`/`): the whole platform's numbers, what needs attention, the last six months, newest bookings and accounts.
- **People**: all users, guests, hotel owners, organisers and the support team (`/users`, `/guests`, `/owners`,
  `/organisers`, `/team`). Add accounts (without a password they're emailed a link to choose one), edit names, phone and
  account type, deactivate (signs them out everywhere), send a password link. Only super admins (`is_superuser`) can
  add or remove staff.
- **Hotels & rooms** (`/hotels`): every hotel with its owner and numbers. Edit hotels, give one to an owner or take it
  back for Shortlet Stay, add and edit rooms, prices, amenities, photos and discounts.
- **Bookings** (`/bookings`): every booking; confirm, decline or cancel, internal notes.
- **Payments** (`/payments`): stay and ticket payments, each payment's Flutterwave timeline, and the refund queue
  (record a refund once it's been paid back).
- **Reviews** (`/reviews`): hide or show guests' reviews.
- **Events** (`/events`): every event and ticket order; publish, unpublish, cancel, edit, confirm or decline orders,
  attendees.
- **Amenities** (`/amenities`): the list rooms pick from.
- **Support inbox** (`/support`): chats people start from the help bot on the website and app. Reply, assign to a team
  member, mark solved, reopen. People see replies in their chat, and get them by email when they left an address.
- **Help bot answers** (`/topics`): the questions and answers the bot offers before people message the team.

The admin-only API lives at `/api/admin/` (the backend's `staff` app); everything else uses the same `/api/dashboard/`
endpoints as the website, which show staff every hotel and event.

## Run it

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL
npm run dev                    # http://localhost:3001
```

The API must allow this app's address: add it to `CORS_ALLOWED_ORIGINS` (e.g. `http://localhost:3001`, and the
admin's real address in production). Sign in with a staff account; hotel owners and organisers are turned away.

New chats are also emailed to `SUPPORT_EMAIL` (support@shortletstay.com by default). The WhatsApp number shown in the
chat is `SUPPORT_WHATSAPP` (+447487260934). Both are API settings.

After changing the API: copy `openapi.yaml` from the website (or regenerate it) and run `npm run api:types`.
