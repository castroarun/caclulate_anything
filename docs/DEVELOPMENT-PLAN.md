# AnyCalc - Development Plan

---

## Overview

AnyCalc is a comprehensive financial calculator suite built for the Indian market. One workspace, 19+ calculators, covering investments, tax, loans, health, and real estate.

**Core Problem:** Users juggle 5-10 different calculator apps for financial planning. None of them talk to each other, none save your context, and none are designed for Indian tax/investment rules.

**Solution:** A single, elegant workspace with interlinked calculators, persistent data, and India-specific defaults (old/new tax regime, CII indexation, PPF rates, etc.)

---

## Phase 1: Foundation (Dec 15-18)

### 1.1 Project Setup
- [x] Initialize Next.js 14 with App Router
- [x] Configure TypeScript 5.7 strict mode
- [x] Set up Tailwind CSS with custom color palette
- [x] Configure ESLint + Prettier
- [x] Set up project folder structure (`/app`, `/components`, `/lib`, `/hooks`)
- [x] Configure path aliases (`@/components`, `@/lib`)

### 1.2 Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14 (App Router) | SSR for SEO, file-based routing |
| State | Zustand | Lightweight, no boilerplate, persist middleware |
| Charts | Recharts | React-native, responsive, composable |
| UI Primitives | Radix UI | Accessible, unstyled, composable |
| Auth | Supabase Auth | Google OAuth, magic links, free tier |
| Database | Supabase (PostgreSQL) | Cloud sync, RLS, real-time |
| Styling | Tailwind CSS | Utility-first, dark mode, responsive |

### 1.3 Component Architecture

```
src/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Home / calculator grid
│   └── workspace/
│       └── page.tsx            # Workspace mode
├── components/
│   ├── calculators/
│   │   ├── CalculatorCard.tsx  # Reusable calculator wrapper
│   │   ├── InputField.tsx      # Formatted number input
│   │   ├── ResultDisplay.tsx   # Result with breakdown
│   │   ├── ChartContainer.tsx  # Recharts wrapper
│   │   ├── sip/               # SIP calculator
│   │   ├── fd/                # FD calculator
│   │   ├── tax/               # Tax calculator
│   │   └── ...                # 19 total calculators
│   ├── workspace/
│   │   ├── Sidebar.tsx         # Calculator navigation
│   │   ├── Favorites.tsx       # Pinned calculators
│   │   └── ExportPanel.tsx     # PDF/Excel export
│   └── ui/                     # Shared UI components
├── lib/
│   ├── calculations/           # Pure calculation functions
│   │   ├── investment.ts       # SIP, FD, RD, PPF, CAGR, Lumpsum
│   │   ├── tax.ts              # Old/New regime, HRA, Gratuity
│   │   ├── loan.ts             # EMI, Compound Interest
│   │   ├── realestate.ts       # Capital gains, CII
│   │   └── health.ts           # BMI
│   ├── formatters.ts           # INR formatting, percentage
│   └── constants.ts            # Tax slabs, CII index, PPF rates
├── hooks/
│   ├── useCalculator.ts        # Shared calculator state logic
│   └── useExport.ts            # Export functionality
└── store/
    └── index.ts                # Zustand store (favorites, history, notes)
```

---

## Phase 2: Core Calculators (Dec 18 - Jan 5)

### 2.1 Investment Calculators (6)

| Calculator | Features | Dual-Mode | Status |
|-----------|----------|-----------|--------|
| SIP | Growth chart, step-up SIP, goal planner | Yes (Calculate / Plan for Goal) | Done |
| Lumpsum | Maturity breakdown, comparison chart | Yes | Done |
| FD | Interest options (quarterly/monthly/cumulative) | Yes | Done |
| RD | Monthly deposit projections | No | Done |
| PPF | 15-year projection with yearly breakdown | No | Done |
| CAGR | Returns calculator with period comparison | Yes | Done |

**Dual-Mode:** Five calculators support two modes:
1. **Calculate** — Enter inputs, get the result
2. **Plan for Goal** — Enter your target amount, get the required investment

### 2.2 Tax Calculators (4)

| Calculator | Features | Status |
|-----------|----------|--------|
| Income Tax | Old vs New regime comparison, slab visualization | Done |
| HRA Exemption | Metro/non-metro, rent receipt calculator | Done |
| Gratuity | Years of service, last drawn salary | Done |
| TDS | Section-wise TDS rates, threshold check | Done |

**Key complexity:** Budget 2024 changed the new tax regime slabs. Both old and new regime must be supported with side-by-side comparison.

### 2.3 Loan Calculators (3)

| Calculator | Features | Status |
|-----------|----------|--------|
| EMI | Amortization schedule, prepayment analysis | Done |
| Compound Interest | Annual/quarterly/monthly compounding | Done |
| Simple Interest | Basic SI calculator | Done |

### 2.4 Utility Calculators (4)

| Calculator | Features | Status |
|-----------|----------|--------|
| Currency Converter | Live rates via API, 150+ currencies | Done |
| Trip Splitter | Multi-person expense splitting | Done |
| Percentage | 3 modes (% of, % change, find %) | Done |
| Age Calculator | Years/months/days with next birthday | Done |

### 2.5 Health & Real Estate (2)

| Calculator | Features | Status |
|-----------|----------|--------|
| BMI | WHO categories, visual scale | Done |
| Real Estate Capital Gains | STCG/LTCG, CII indexation, Section 54/54EC/54F, Budget 2024 dual regime | Done |

---

## Phase 3: Workspace Features (Jan 5-10)

### 3.1 Workspace Mode
- [x] Sidebar navigation with calculator categories
- [x] Favorites system (pin frequently used calculators)
- [x] Calculator history (last 10 calculations per type)
- [x] Notes section per calculator (remember why you chose those inputs)

### 3.2 Export Functionality
- [x] PDF export with visual charts and formatted results
- [x] Excel export with raw data for further analysis
- [x] HTML export for sharing via email

### 3.3 Data Persistence
- [x] Local cache (works without login)
- [x] Optional Google login via Supabase Auth
- [x] Cloud sync across devices (when logged in)
- [x] Clear cache option in settings

### 3.4 Interlinked Calculators
- [x] Salary breakdown feeds into tax calculator
- [x] SIP results link to CAGR for returns comparison
- [x] EMI results show total interest (links to FD for opportunity cost)

---

## Phase 4: Real Estate Capital Gains (Jan 10-17)

This was the most complex calculator — built as a dedicated feature:

### Design Doc
[REAL-ESTATE-CG-CALCULATOR-DESIGN.md](./Design/REAL-ESTATE-CG-CALCULATOR-DESIGN.md)

### Key Features
- **Capital gains computation** — STCG (<24 months) and LTCG (>=24 months)
- **CII indexation** — Cost Inflation Index from 2001-02 to 2025-26
- **Reinvestment planner** — Section 54 (residential), 54EC (bonds), 54F (non-residential)
- **Tax exemption comparison** — Side-by-side comparison of exemption strategies
- **Budget 2024 dual regime** — Old: 20% with indexation vs New: 12.5% without indexation

### Complexity Notes
- CII index values change yearly — hardcoded with easy update path
- Section 54 has time limits (2 years purchase / 3 years construction)
- 54EC bonds capped at Rs 50 lakhs
- Surcharge and cess calculations differ by income bracket

---

## Phase 5: Testing & QA (Jan 10-12)

### Test Strategy
- **Unit tests** — Pure calculation functions (investment.ts, tax.ts, loan.ts)
- **Manual testing** — Each calculator against known values
- **Cross-browser** — Chrome, Firefox, Safari, Edge
- **Responsive** — Mobile (375px), tablet (768px), desktop (1440px)

### Test Cases (Sample)

| Calculator | Input | Expected Output | Verified |
|-----------|-------|----------------|----------|
| SIP | Rs 5,000/mo, 12% pa, 10 yrs | ~Rs 11.6L | Yes |
| FD | Rs 1L, 7% pa, 5 yrs, quarterly | ~Rs 1.41L | Yes |
| Income Tax (New) | Rs 15L gross, FY 2024-25 | ~Rs 1.5L tax | Yes |
| EMI | Rs 50L, 8.5%, 20 yrs | ~Rs 43,391/mo | Yes |
| LTCG (Old) | Buy 2015 Rs 40L, Sell 2024 Rs 1.2Cr | Computed with CII | Yes |

---

## Phase 6: Deployment & Ship (Jan 12-17)

### Hosting
- **Platform:** Vercel (auto-deploy from GitHub)
- **Domain:** [anycalc.in](https://anycalc.in) (GoDaddy → Vercel DNS)
- **SSL:** Auto via Vercel

### Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Lighthouse Performance | >90 | 94 |
| First Contentful Paint | <1.5s | 1.2s |
| Largest Contentful Paint | <2.5s | 2.1s |
| Bundle Size (gzipped) | <200KB | 178KB |

### SEO
- [x] Meta tags for each calculator page
- [x] Open Graph images
- [x] Structured data (JSON-LD) for calculator pages
- [x] Sitemap.xml generation

---

## Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| next | Framework | 14.2.x |
| typescript | Language | 5.7.x |
| tailwindcss | Styling | 3.4.x |
| zustand | State management | 4.5.x |
| recharts | Charts & visualizations | 2.12.x |
| @radix-ui/react-* | UI primitives | Latest |
| @supabase/supabase-js | Auth & database | 2.x |
| jspdf | PDF export | 2.5.x |
| xlsx | Excel export | 0.18.x |
| date-fns | Date utilities | 3.x |

---

## Phase 2 Roadmap (Future)

### Real Estate Enhancements
- [ ] Capital Gains Account Scheme (CGAS) tracking
- [ ] Joint ownership calculator
- [ ] NRI-specific TDS calculator (20% + surcharge)
- [ ] DTAA benefits for NRIs
- [ ] Property portfolio tracker

### New Calculators
- [ ] Retirement planner (corpus needed + SWP)
- [ ] Education planning (inflation-adjusted cost)
- [ ] Insurance premium comparison
- [ ] Gold investment tracker

### Platform Features
- [ ] Dark mode
- [ ] Calculator comparison view (side-by-side)
- [ ] Shareable calculation links
- [ ] Offline PWA mode

---

**Document Version:** 2.0
**Created:** 2025-12-15
**Updated:** 2026-01-17
**Author:** Arun Castro
