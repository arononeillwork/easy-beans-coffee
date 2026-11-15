# Instagram on the site

**The home page's post grid reads the café's posts from the Business Agent**, not from Instagram:
the agent holds the Instagram connection (its Connections page) and keeps its token renewed, and the
site reads `GET https://businesssagent.com/api/site/1/posts` (Website & SEO → *Your Instagram posts on
your website*, contract in the business-agent repo, `docs/WEBSITE.md`). The grid needs no token here:
reconnect Instagram in the agent if it ever lapses. Until the agent answers with posts, the grid shows
four of the café's own photos linking to the profile.

Code: [`src/server/businessAgent/postsFeed.ts`](../src/server/businessAgent/postsFeed.ts),
[`src/server/social/feed.ts`](../src/server/social/feed.ts) and
[`src/components/home/InstagramGrid.tsx`](../src/components/home/InstagramGrid.tsx).

The site's own Instagram token, below, is now used only by the café TV's poster mode that follows the
newest post (`SHOW_NEWEST_POST` on `/display-menu`, off while the TV shows the agent's screen). TikTok
is no longer read by the site.

## The honest summary first

Neither network lets a website read a public profile without credentials any
more, and **both tokens expire**. This is the part that is not "set once and
forget":

| | Token life | Renewal |
| --- | --- | --- |
| Instagram | 60 days | Refreshable indefinitely, but something must call the refresh endpoint before it lapses |
| TikTok | 24 h access token, 365-day refresh token | The refresh token must be exchanged before a year of no use |

If a token does lapse the site does not break — the grid falls back to our own
photos and logs a warning. But the feed stops updating until it is renewed, so
plan for the renewal rather than being surprised by it (see *Keeping the tokens
alive* below).

## Instagram

Requires a **Business or Creator** account. (The Basic Display API that used to
serve personal accounts was switched off in December 2024.)

1. Convert @easy.beans.coffee to a Business or Creator account in the Instagram
   app if it is not one already: Settings → Account type and tools.
2. Create an app at <https://developers.facebook.com/apps> → type **Business**.
3. Add the **Instagram** product → *API setup with Instagram login*.
4. Add the Instagram account as a tester and accept the invite from the
   Instagram app (Settings → Apps and websites → Tester invites).
5. Generate a token with the `instagram_business_basic` scope, then exchange it
   for a long-lived one. The dashboard will do both for you.
6. Put the long-lived token in the environment:

```bash
INSTAGRAM_ACCESS_TOKEN=IGAA...
```

## TikTok

1. Register an app at <https://developers.tiktok.com> and add the **Display
   API** product.
2. Request the `user.info.basic` and `video.list` scopes. This step is reviewed
   by TikTok and is not instant — days, sometimes longer.
3. Run the OAuth flow once as @easybeanscoffee and keep both tokens.
4. Put the access token in the environment:

```bash
TIKTOK_ACCESS_TOKEN=act.xxxxx
```

Because TikTok's access token only lasts 24 hours, the feed will go quiet after
a day unless the refresh token is used to mint a new one — see below.

## Keeping the tokens alive

Two options, in order of preference:

1. **A scheduled refresh.** A daily Vercel cron route that swaps each refresh
   token for a fresh access token and stores it (Supabase is already available
   for this). This is the only arrangement that genuinely never needs touching.
   It is not built yet — say the word and it is a small addition.
2. **A calendar reminder.** Re-paste the Instagram token every other month and
   re-run the TikTok flow when it lapses. Fine for Instagram, poor for TikTok.

## Caching and freshness

Both feeds revalidate hourly. That is deliberate rather than arbitrary: the
image URLs both networks return are signed and expire after a few hours, so a
long cache would eventually point the page at dead images. The hosts are
allow-listed for the Next image optimizer in `next.config.ts`.
