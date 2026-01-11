# 🧮 CalcEverything - Universal Calculator Platform

## Project Vision

A beautifully designed, comprehensive calculator platform that makes financial planning accessible to everyone. Think **"Figma meets Excel meets Groww"** - premium design with powerful calculations.

---

## 🎨 Design Philosophy

### Aesthetic Direction: **"Refined Clarity"**
Inspired by the best of:
- **Linear.app** - Clean, minimal, premium feel
- **Stripe** - Clear hierarchy, excellent typography
- **Groww** - Friendly, approachable finance
- **Notion** - Organized, flexible layouts

### Core Design Principles

1. **Breathing Space** - Generous whitespace, no cramped layouts
2. **Visual Hierarchy** - Clear distinction between inputs, calculations, results
3. **Instant Feedback** - Real-time calculations as users type
4. **Progressive Disclosure** - Show complexity only when needed
5. **Celebration** - Make results feel rewarding with subtle animations

### Color System

```css
/* Light Mode */
--primary: #2563eb;        /* Trust blue */
--success: #10b981;        /* Positive/gains */
--warning: #f59e0b;        /* Caution/moderate */
--danger: #ef4444;         /* Risk/loss */
--neutral-900: #0f172a;    /* Primary text */
--neutral-600: #475569;    /* Secondary text */
--neutral-200: #e2e8f0;    /* Borders */
--surface: #ffffff;        /* Cards */
--background: #f8fafc;     /* Page background */

/* Dark Mode */
--background-dark: #0f172a;
--surface-dark: #1e293b;
--neutral-100-dark: #f1f5f9;
```

### Typography

```css
/* Headers */
font-family: 'Cal Sans', 'Plus Jakarta Sans', system-ui;

/* Body & Numbers */
font-family: 'Inter', system-ui;

/* Monospace (for calculations) */
font-family: 'JetBrains Mono', monospace;

/* Big Numbers */
font-feature-settings: 'tnum' 1; /* Tabular numbers */
```

---

## 📐 Component Design System

### Calculator Card Layout

```
┌────────────────────────────────────────────────────────┐
│  [Icon] Calculator Title                    [i] Info   │
│  Brief description of what this calculates             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Input Section                                         │
│  ┌─────────────────────────┐                          │
│  │ Label              ⓘ   │                          │
│  │ ₹ [         10,000    ] │  ← Formatted input       │
│  │ ──────────●────────────  │  ← Range slider         │
│  │ ₹1,000           ₹1L    │                          │
│  └─────────────────────────┘                          │
│                                                        │
│  [More inputs...]                                      │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Results Section                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │       ₹24,00,000                                │  │
│  │       Total Maturity Value                      │  │
│  │                                                 │  │
│  │  ┌─────────┬─────────┬─────────┐               │  │
│  │  │Invested │ Returns │  CAGR   │               │  │
│  │  │₹12,00,000│₹12,00,000│ 12.5%  │               │  │
│  │  └─────────┴─────────┴─────────┘               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  [📊 Chart] [📋 Table] [📥 Export]                    │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │                                                 │  │
│  │              [INTERACTIVE CHART]               │  │
│  │                                                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
├────────────────────────────────────────────────────────┤
│  💡 Pro Tips                                           │
│  • Tip 1 about this calculator                        │
│  • Tip 2 with actionable advice                       │
│                                                        │
│  ⚠️ Risk Level: [Low ●○○] [Medium ○●○] [High ○○●]     │
└────────────────────────────────────────────────────────┘
```

### Comparison View Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Compare: Where should you invest ₹10,000/month?                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  ☑ SIP   │ │  ☑ FD    │ │  ☑ Gold  │ │  ☐ PPF   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  Duration: [====●==========] 10 Years                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │    ₹30L ─┤                                     ●──── SIP    ││
│  │          │                               ●────              ││
│  │    ₹20L ─┤                         ●────      ●──── Gold    ││
│  │          │                    ●────     ●────               ││
│  │    ₹10L ─┤              ●────    ●────        ●──── FD      ││
│  │          │         ●────   ●────                            ││
│  │          └────┬────┬────┬────┬────┬────┬────┬────┬────┬───  ││
│  │              Y1   Y2   Y3   Y4   Y5   Y6   Y7   Y8   Y9   Y10││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Results Table                                                   │
│  ┌────────────┬────────────┬────────────┬────────────┬─────────┐│
│  │ Asset      │ Invested   │ Returns    │ Final      │ CAGR    ││
│  ├────────────┼────────────┼────────────┼────────────┼─────────┤│
│  │ 📈 SIP     │ ₹12,00,000 │ ₹18,00,000 │ ₹30,00,000 │ 15.2%   ││
│  │ 🪙 Gold    │ ₹12,00,000 │ ₹10,00,000 │ ₹22,00,000 │ 10.8%   ││
│  │ 🏦 FD      │ ₹12,00,000 │ ₹4,00,000  │ ₹16,00,000 │ 6.5%    ││
│  └────────────┴────────────┴────────────┴────────────┴─────────┘│
│                                                                  │
│  📊 Insights                                                     │
│  • SIP would have given 2x returns compared to FD                │
│  • Gold shows moderate growth with lower volatility              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Net Worth Calculator Layout

```
┌────────────────────────────────────────────────────────────────┐
│  💰 Net Worth Calculator                        [Save] [Share] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │          Your Net Worth                                 │  │
│  │          ₹1,24,50,000                                   │  │
│  │          ████████████░░░░░░░ 72% Assets                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ASSETS                                          ₹1,72,00,000  │
│  ├── 🏠 Real Estate                                           │
│  │   ├── Primary Home          ₹80,00,000   [Edit] [×]       │
│  │   └── [+ Add Property]                                     │
│  ├── 📈 Investments                                           │
│  │   ├── Stocks               ₹25,00,000   [Edit] [×]        │
│  │   ├── Mutual Funds         ₹35,00,000   [Edit] [×]        │
│  │   ├── PPF                  ₹12,00,000   [Edit] [×]        │
│  │   └── [+ Add Investment]                                   │
│  ├── 🏦 Bank Accounts                                         │
│  │   ├── Savings              ₹8,00,000    [Edit] [×]        │
│  │   ├── Fixed Deposits       ₹10,00,000   [Edit] [×]        │
│  │   └── [+ Add Account]                                      │
│  └── 🚗 Other Assets                                          │
│      ├── Car                   ₹2,00,000    [Edit] [×]        │
│      └── [+ Add Asset]                                        │
│                                                                │
│  LIABILITIES                                     ₹47,50,000   │
│  ├── 🏠 Home Loan              ₹40,00,000   [Edit] [×]        │
│  ├── 🚗 Car Loan               ₹5,00,000    [Edit] [×]        │
│  ├── 💳 Credit Card            ₹2,50,000    [Edit] [×]        │
│  └── [+ Add Liability]                                        │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  📊 Asset Allocation                                    │  │
│  │                                                         │  │
│  │  [======PIE CHART======]    Real Estate  46%           │  │
│  │                              Equity       35%           │  │
│  │                              Debt         13%           │  │
│  │                              Cash          6%           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  💡 Recommendations                                            │
│  ⚠️ Your debt-to-asset ratio is 28% (Healthy: <30%)           │
│  💡 Consider diversifying more into equity                     │
│  ✅ Emergency fund covers 6 months expenses                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🗂 Complete Calculator List

### 📱 Basic Calculators
| Calculator | Description | Key Inputs |
|------------|-------------|------------|
| Simple Calculator | Standard arithmetic | Numbers, operations |
| Scientific Calculator | Advanced math, trigonometry | Functions, angles |
| Percentage Calculator | Percent calculations | Value, percentage |
| Age Calculator | Calculate exact age | Birth date |
| Date Calculator | Days between dates | Start/end dates |
| Unit Converter | Universal conversions | Value, units |

### 💰 Financial Calculators
| Calculator | Description | Key Inputs | Outputs |
|------------|-------------|------------|---------|
| EMI Calculator | Loan EMI calculation | Principal, Rate, Tenure | EMI, Total Interest, Total Payment |
| SIP Calculator | Systematic Investment | Monthly amount, Rate, Years | Future Value, Total Investment, Gains |
| SWP Calculator | Systematic Withdrawal | Corpus, Withdrawal, Rate | Duration, Monthly Income |
| Lumpsum Calculator | One-time investment | Amount, Rate, Years | Maturity, Returns |
| FD Calculator | Fixed Deposit returns | Principal, Rate, Tenure | Maturity, Interest |
| RD Calculator | Recurring Deposit | Monthly, Rate, Tenure | Maturity, Interest |
| PPF Calculator | Public Provident Fund | Yearly deposit, Years | Maturity, Interest, Tax saved |
| EPF Calculator | Employee PF | Basic salary, Contribution | Retirement corpus |
| NPS Calculator | National Pension | Monthly, Years, Return | Corpus, Annuity |
| Gratuity Calculator | Gratuity estimation | Salary, Years | Gratuity amount |

### 📊 Investment Calculators
| Calculator | Description |
|------------|-------------|
| CAGR Calculator | Compound Annual Growth Rate |
| Compound Interest | Interest on interest |
| Simple Interest | Basic interest calculation |
| ROI Calculator | Return on Investment |
| XIRR Calculator | Returns with irregular cashflows |
| Dividend Yield | Dividend returns percentage |
| Rule of 72 | Doubling time estimation |
| Inflation Calculator | Purchasing power change |

### 🧾 Tax Calculators
| Calculator | Description |
|------------|-------------|
| Income Tax Calculator | Tax liability (Old vs New regime) |
| HRA Calculator | House Rent Allowance exemption |
| Capital Gains Tax | LTCG/STCG calculations |
| GST Calculator | Goods & Services Tax |
| TDS Calculator | Tax Deducted at Source |

### 🎯 Planning Tools
| Tool | Description |
|------|-------------|
| Net Worth Calculator | Total assets - liabilities |
| Retirement Planner | Corpus needed for retirement |
| Goal Planner | Savings for specific goals |
| Education Planner | Child's education fund |
| Emergency Fund | 6-month expense buffer |
| Fire Calculator | Financial Independence calc |

### ⚖️ Comparison Tools
| Tool | Description |
|------|-------------|
| Asset Comparator | Compare FD vs MF vs Gold vs PPF |
| Loan Comparator | Compare loan offers |
| Old vs New Tax | Compare tax regimes |
| Rent vs Buy | Housing decision tool |

### 💪 Health & Fitness
| Calculator | Description |
|------------|-------------|
| BMI Calculator | Body Mass Index |
| Calorie Calculator | Daily calorie needs |
| Body Fat | Body fat percentage |
| Ideal Weight | Target weight calculation |

---

## 🏗 Technical Architecture

### Tech Stack (Recommended)

```
Frontend:
├── Framework: Next.js 14 (App Router)
├── Styling: Tailwind CSS + shadcn/ui
├── Charts: Recharts
├── State: Zustand (or React Context)
├── Animations: Framer Motion
└── Forms: React Hook Form + Zod

Backend (Optional, for persistence):
├── API: Next.js API Routes
├── Database: Supabase (PostgreSQL)
├── Auth: Supabase Auth or NextAuth
└── Analytics: Vercel Analytics

Hosting:
├── Platform: Vercel
└── CDN: Vercel Edge
```

### Project Structure

```
calc-everything/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Homepage
│   ├── calculators/
│   │   ├── page.tsx                # Calculator listing
│   │   ├── [category]/
│   │   │   ├── page.tsx            # Category page
│   │   │   └── [calculator]/
│   │   │       └── page.tsx        # Individual calculator
│   ├── compare/
│   │   └── page.tsx                # Comparison tool
│   ├── learn/
│   │   └── page.tsx                # Educational content
│   └── api/
│       └── calculations/
│           └── route.ts            # API for saved calculations
├── components/
│   ├── ui/                         # Base UI components
│   │   ├── input.tsx
│   │   ├── slider.tsx
│   │   ├── button.tsx
│   │   └── card.tsx
│   ├── calculators/                # Calculator components
│   │   ├── CalculatorCard.tsx
│   │   ├── InputField.tsx
│   │   ├── ResultDisplay.tsx
│   │   ├── ChartDisplay.tsx
│   │   └── ComparisonChart.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Sidebar.tsx
├── lib/
│   ├── calculations/               # Calculation logic
│   │   ├── emi.ts
│   │   ├── sip.ts
│   │   ├── compound-interest.ts
│   │   └── index.ts
│   ├── formatters.ts               # Number formatting
│   └── validators.ts               # Input validation
├── data/
│   ├── historical-returns.json     # Market data
│   └── calculators.json            # Calculator metadata
└── styles/
    └── globals.css
```

### Core Calculation Functions

```typescript
// lib/calculations/sip.ts
export function calculateSIP(
  monthlyAmount: number,
  annualRate: number,
  years: number
): SIPResult {
  const monthlyRate = annualRate / 12 / 100;
  const months = years * 12;
  
  const futureValue = monthlyAmount * 
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
    (1 + monthlyRate);
    
  const totalInvested = monthlyAmount * months;
  const returns = futureValue - totalInvested;
  
  return {
    futureValue: Math.round(futureValue),
    totalInvested,
    returns: Math.round(returns),
    cagr: calculateCAGR(totalInvested, futureValue, years),
    yearlyBreakdown: generateYearlyBreakdown(monthlyAmount, annualRate, years)
  };
}

// lib/calculations/emi.ts
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): EMIResult {
  const monthlyRate = annualRate / 12 / 100;
  
  const emi = principal * monthlyRate * 
    Math.pow(1 + monthlyRate, tenureMonths) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;
  
  return {
    emi: Math.round(emi),
    totalPayment: Math.round(totalPayment),
    totalInterest: Math.round(totalInterest),
    amortizationSchedule: generateAmortization(principal, monthlyRate, tenureMonths, emi)
  };
}
```

---

## 🚀 Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Next.js project with Tailwind
- [ ] Create design system components
- [ ] Build calculator card template
- [ ] Implement 5 core calculators (SIP, EMI, FD, Lumpsum, Compound Interest)
- [ ] Deploy MVP to Vercel

### Phase 2: Expansion (Week 3-4)
- [ ] Add remaining financial calculators
- [ ] Implement comparison tool
- [ ] Add charts and visualizations
- [ ] Mobile optimization
- [ ] Basic analytics

### Phase 3: Enhancement (Week 5-6)
- [ ] Net worth calculator
- [ ] Goal planning tools
- [ ] Historical data integration
- [ ] Educational content
- [ ] SEO optimization

### Phase 4: Polish (Week 7-8)
- [ ] User accounts (optional)
- [ ] Save/export functionality
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Launch marketing

---

## 📊 Historical Data Reference

### NIFTY 50 Returns (1995-2024)
```javascript
const niftyReturns = {
  '1Y': { cagr: 12.5, volatility: 20 },
  '3Y': { cagr: 14.2, volatility: 18 },
  '5Y': { cagr: 13.8, volatility: 16 },
  '10Y': { cagr: 12.2, volatility: 14 },
  '15Y': { cagr: 11.5, volatility: 12 },
  '20Y': { cagr: 13.1, volatility: 11 }
};
```

### Asset Class Comparison (20-year CAGR)
| Asset | CAGR | Risk Level | Best For |
|-------|------|------------|----------|
| NIFTY 50 | 12-14% | High | Long-term growth |
| Gold | 10-12% | Medium | Hedge, preservation |
| FD | 6-7% | Low | Safety, liquidity |
| PPF | 7-8% | Very Low | Tax saving, safety |
| Real Estate | 8-10% | Medium | Wealth building |
| Inflation | 5-6% | - | Reference |

---

## 💡 Key Differentiators

1. **Clean, Premium UI** - Not cluttered like calculator.net
2. **Real-time Calculations** - Instant updates as you type
3. **Visual Storytelling** - Charts that explain, not just display
4. **Educational Integration** - Learn while you calculate
5. **Comparison Engine** - Make informed decisions
6. **Indian-First** - Built for Indian investors (₹, tax rules, assets)
7. **Mobile-First** - Perfect on any device
8. **No Ads** - Clean, distraction-free experience

---

## 🔗 Inspiration Links

- [Linear.app](https://linear.app) - Clean, minimal design
- [Stripe](https://stripe.com) - Typography, hierarchy
- [Groww](https://groww.in) - Indian finance UX
- [Shadcn](https://ui.shadcn.com) - Component system
- [Vercel](https://vercel.com) - Modern web aesthetics

---

**Ready to build something exceptional! 🚀**


Additional prompts to be executed:
include a trip planner, a typical portfolio templates (like family expense planner templates with allocations to basics which people miss like emergency funds, health care, insurance, vehicel fuels etc.)

Ultimately it has to be avialable as anmobile app as well (later), both website and mobile app has to work opffline as well