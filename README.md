# صالون | Salon App

Women's salon booking platform for Kuwait and the Arab world.

**Tech Stack:** React + Vite + Tailwind CSS + Supabase + Vercel

## Features

- 📱 Mobile-first booking (responsive PWA)
- 🌐 Arabic + English (RTL ready)
- 🔐 Email OTP authentication (Supabase)
- 📅 Booking flow with stylist selection
- 💇‍♀️ Service management for salon owners
- ⭐ Reviews and ratings
- 📊 Owner dashboard

## Deploy

```bash
npm install
npm run build
npx vercel deploy dist/ --prod
```

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Setup

Run `schema.sql` in the Supabase SQL Editor to set up the database.

## Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Auth + Database + Realtime)
- **Hosting:** Vercel

## GitHub

https://github.com/HkDavdB7/saloon-app
