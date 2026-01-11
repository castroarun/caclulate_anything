# Project Requirements

**Status:** Complete
**Last Updated:** 2026-01-09
**Designer Agent:** Invoked

---

## Purpose

This file captures structured requirements gathered by the **Designer Agent** before architecture design begins.

---

## Requirements Summary

### 1. Project Overview
- **Name:** CalcEverything
- **Type:** PWA (Web App with offline support, future mobile app)
- **Description:** Premium universal calculator platform with financial, time, and utility calculators with data persistence and personalization

### 2. User Requirements
| User Story | Priority | Notes |
|------------|----------|-------|
| As a user, I want to calculate EMI for home loans | High | Include bank rate comparison |
| As a user, I want to track time across zones | High | World clock + meeting planner |
| As a user, I want to save my calculations | High | Google auth required |
| As a user, I want to track my net worth | High | Assets - Liabilities |
| As a user, I want to compare investment options | Medium | SIP vs FD vs PPF |
| As a user, I want offline access | Medium | PWA with service worker |

### 3. Technical Requirements
- **Framework:** Next.js 14+ (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth Method:** Google OAuth via Supabase Auth
- **Hosting:** Vercel

### 4. UI/UX Requirements
- **Theme:** Light/Dark/System
- **Color Palette:** Trust blue (#2563eb), semantic colors for gains/loss
- **Key Pages:** Home, Calculator List, Individual Calc, Time Zone, Net Worth, Profile
- **Components Needed:** CalculatorCard, NumberInput, ResultDisplay, ChartDisplay, WorldClock

### 5. Data Model (High Level)
| Entity | Key Fields | Relationships |
|--------|------------|---------------|
| Users | id, email, preferences | 1:N with calculations |
| Calculations | id, user_id, type, inputs, outputs | N:1 with users |
| NetWorth | id, user_id, assets, liabilities | N:1 with users |
| SavedCities | id, user_id, city, timezone | N:1 with users |

### 6. Integrations
- [x] Authentication (Google OAuth)
- [x] External APIs (Bank rates, Time zones, Currency)
- [ ] Payment processing (Not needed)
- [x] Analytics (Vercel Analytics)

---

## Key Features by Phase

### Phase 1: MVP
- EMI, SIP, FD, Lumpsum, Compound Interest calculators
- Basic UI components
- Vercel deployment

### Phase 2: Time + Auth
- World Clock, Time Zone Converter, Meeting Planner
- Google authentication
- Calculation history

### Phase 3: Location Intelligence
- Home EMI with bank rates by location
- Location detection
- Bank comparison

### Phase 4: Net Worth + Planning
- Net worth tracker
- Goal planning
- Comparison tools

### Phase 5: Polish + PWA
- Offline support
- Mobile optimization
- Performance tuning

---

## Approval

- [x] Requirements reviewed by user
- [ ] Ready for @architect to design system

---

## Full PRD Location
See: [docs/APP_PRD.md](../docs/APP_PRD.md)
