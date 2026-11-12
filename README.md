# Shortlet Stay admin

For Shortlet Stay staff (accounts with `is_staff` in the API). Next.js 16, the same stack as the website.

- **Support inbox** (`/`): chats people start from the help bot on the website and app. Reply, mark solved, reopen.
  People see replies in their chat, and get them by email when they left an address.
- **Help bot answers** (`/topics`): the questions and answers the bot offers before people message the team.

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
