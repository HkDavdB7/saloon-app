# Salon App — Specification

Women's salon booking platform for Kuwait and the Arab world.

## Overview

A mobile-first booking app that lets women find and book appointments at local salons. Salon owners manage their services, stylists, and bookings from a dedicated portal.

**Stack:** React + Vite + Tailwind CSS + Supabase + Vercel
**GitHub:** github.com/HkDavdB7/saloon-app
**Production:** https://saloon-app.vercel.app (placeholder — Supabase pending)

## Features

### Customer App
- [x] Email OTP authentication (Arabic + English)
- [x] Browse salons
- [x] View salon services + prices
- [x] Select stylist + time slot
- [x] Book appointment
- [x] View booking history
- [x] Cancel/reschedule bookings
- [x] Reviews and ratings

### Owner/Stylist Portal
- [x] Salon registration
- [x] Service management
- [x] Staff/stylist management
- [x] Weekly schedule per stylist
- [x] Booking management (confirm, cancel)
- [x] Owner dashboard with stats

### Platform
- [x] Arabic RTL (default)
- [x] English available
- [x] Mobile-first responsive design
- [x] Email OTP via Supabase

## Design

**Theme:** Rose/pink (women's salon aesthetic)
- Primary: `#e11d72` (rose-500 equivalent)
- Rose gradient backgrounds
- Soft shadows and rounded corners
- Arabic-first UI

**Icons:** Lucide React
- Landing: Sparkles icon
- Navigation: Home, Calendar, User

## Pages

| Route | Description |
|-------|-------------|
| `/welcome` | Splash/landing page |
| `/auth` | Login/OTP |
| `/setup` | New user onboarding |
| `/` | Customer home (browse salons) |
| `/shop/:id` | Salon detail |
| `/book/:shopId/:step` | Booking flow |
| `/bookings` | My bookings |
| `/owner/dashboard` | Owner stats |
| `/owner/shop` | Shop profile |
| `/owner/services` | Manage services |
| `/owner/stylists` | Manage staff |
| `/owner/schedule` | Stylist schedules |
| `/admin` | Platform admin |

## Supabase Setup

1. Create project at supabase.com
2. Run `schema.sql` in SQL Editor
3. Copy Project URL + anon key
4. Add to Vercel environment variables:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Deploy

## Deploy

```bash
npm install
npm run build
npx vercel deploy dist/ --prod
```

With env vars:
```bash
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npx vercel deploy dist/ --prod --yes --name saloon-app
```

## Schema Overview

**Tables:**
- `profiles` — user accounts (role: customer, stylist_admin, stylist, owner, admin)
- `shops` — salon listings
- `stylists` — staff within a salon
- `services` — services offered
- `stylist_schedules` — weekly hours per stylist
- `bookings` — appointments
- `reviews` — customer ratings

**Auth:** Supabase Auth (email OTP)

## TODO

- [ ] Deploy with real Supabase keys
- [ ] WhatsApp integration for booking notifications
- [ ] Push notifications
- [ ] KNET payment (HyperPay)
- [ ] Loyalty/wallet system
- [ ] QR code booking (scan at salon)
- [ ] Loyalty points
- [ ] IOS/Android app (Capacitor)
