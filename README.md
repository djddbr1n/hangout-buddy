# hangout buddy

Coordinating plans with friends is annoying. Group chats devolve into "sounds good!" and then nothing happens. Hangout Buddy fixes that.

You post a hangout — a time, a place, a vibe — and your friends can see it and RSVP. No polls, no back-and-forth, no "lmk." Just a feed of things actually happening that you can join.

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
