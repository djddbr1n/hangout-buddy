# hangout buddy

Some hangouts are people-first — you want to spend time with specific friends, and the plan comes second. But a lot of the time it goes the other way. You just finished finals. You want to run a poker night tonight. You want to get matcha in an hour. The activity is decided; the open question is just who's free.

The current solution is calling or texting a bunch of people individually to check. Hangout Buddy skips that. You post what you want to do, a notification goes out to your friends, and whoever's down can RSVP. That's it.

**Live:** https://hangout-buddy-inky.vercel.app

---

## what it does

- Post hangouts with a title, date/time, duration, location, and headcount
- Surprise mode: hide the location and spin a wheel of activity ideas instead
- Friends see your hangouts in their feed and can RSVP going or maybe
- Set your weekly availability so friends know when you're generally free
- Filter the feed by time block, today only, friends going, or spots left
- My events section shows everything you're hosting or attending at a glance
- Past hangouts get archived automatically once the end time passes
- PWA — add to home screen and it works like a native app, auto-updates on deploy

---

## stack

- Next.js (App Router) + Tailwind CSS + Framer Motion
- Supabase (Postgres, Auth, RLS, Realtime)
- Deployed on Vercel

---

## running locally

```bash
npm install
cp .env.example .env.local   # add your Supabase keys
npm run dev
```

Open http://localhost:3000.
