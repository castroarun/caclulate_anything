# CalcEverything - Product Requirements Document

**Status:** Draft v1.0
**Version:** 1.0
**Last Updated:** 2026-01-09
**Designer Agent:** Active

---

## 1. Objective

### Problem Statement
Financial and utility calculators online are either:
- Cluttered with ads and poor UX (calculator.net style)
- Scattered across multiple apps/sites
- Don't persist user data or history
- Miss the "comparison" and "planning" aspects

**CalcEverything** solves this by providing a premium, unified calculator platform with persistence, personalization, and intelligent insights.

### Target Users
| Persona | Description | Key Needs |
|---------|-------------|-----------|
| Young Professional | 25-35, planning finances | EMI, SIP, Tax optimization |
| Family Planner | 30-45, managing household | Net Worth, Budget, Goals |
| Investor | Any age, tracking portfolio | CAGR, XIRR, Comparisons |
| Global Worker | Remote/traveling professional | Time zones, currency |
| Student | Learning finance | Simple calculators, education |

### Success Metrics
- 10,000 MAU within 6 months
- 50% return user rate
- <2s page load time
- 4.5+ app store rating (future)

---

## 2. Features

### Core Features (MVP - Phase 1)

| Feature | Description | Priority |
|---------|-------------|----------|
| EMI Calculator | Loan EMI with amortization schedule | High |
| SIP Calculator | Systematic investment returns | High |
| FD Calculator | Fixed deposit maturity | High |
| Lumpsum Calculator | One-time investment growth | High |
| Compound Interest | Interest calculations | High |
| Simple Calculator | Basic arithmetic | High |
| Unit Converter | Universal conversions | Medium |

### Phase 2 Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Time Calculator Suite** | World clock, time zones, duration | High |
| Home EMI + Bank Rates | Location-based interest rates | High |
| Google Authentication | Sign-in for data persistence | High |
| Calculation History | Store past calculations | High |
| Net Worth Calculator | Assets - Liabilities tracker | High |
| Comparison Tool | Compare investment options | Medium |

### Phase 3 Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Tax Planner (India/NRI)** | CTC to take-home with Old/New regime comparison | High |
| **Cost of Living Comparator** | Compare cities, salary equivalents, trip budgets | High |
| **Smart Document Import** | Upload bank statements/screenshots for auto-parsing | High |
| Trip Planner | Travel budget with CoL integration | Medium |
| Family Budget Templates | Pre-built allocation templates | Medium |
| Retirement Planner | FIRE calculator | Medium |
| Health Calculators | BMI, Calories, Ideal Weight | Low |
| Currency Converter | Real-time exchange rates | Low |

---

## 3. Feature Deep Dives

### 3.1 Time Calculator Suite

**Purpose:** Comprehensive time utility for global professionals

#### Sub-Features:

| Calculator | Description | Inputs | Outputs |
|------------|-------------|--------|---------|
| **World Clock** | Current time in multiple cities | City selection | Live time display |
| **Time Zone Converter** | Convert time between zones | Time, source TZ, target TZ | Converted time |
| **Meeting Planner** | Find optimal meeting time | Participants' cities | Best overlap times |
| **Duration Calculator** | Time between events | Start time, End time | Duration (hrs/mins/days) |
| **Age Calculator** | Exact age calculation | Birth date | Years, months, days, hours |
| **Date Calculator** | Days between/add dates | Start date, operation | Result date/duration |
| **Countdown Timer** | Time until event | Target date/time | Countdown display |
| **Work Hours Calculator** | Track work time | Clock in/out times | Total hours, overtime |

#### UI Concept - World Clock:
```
+----------------------------------------------------------+
|  World Clock                              [+ Add City]   |
+----------------------------------------------------------+
|                                                          |
|  Your Location (Auto-detected)                           |
|  Mumbai, India                                           |
|  10:45:32 PM  IST (UTC+5:30)         Thu, Jan 9, 2026   |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  [New York]        [London]          [Tokyo]             |
|  12:15 PM          5:15 PM           2:15 AM (+1)        |
|  -10:30 hrs        -5:15 hrs         +3:30 hrs           |
|                                                          |
|  [Sydney]          [Dubai]           [Singapore]         |
|  4:15 AM (+1)      8:45 PM           1:15 AM (+1)        |
|  +5:30 hrs         +2:15 hrs         +2:30 hrs           |
|                                                          |
+----------------------------------------------------------+
|  Meeting Planner: When is 9 AM Mumbai?                   |
|  - New York: 10:30 PM (prev day)                        |
|  - London: 3:30 AM                                       |
|  - Tokyo: 12:30 PM                                       |
+----------------------------------------------------------+
```

#### Data Requirements:
- Timezone database (IANA tz database)
- City-to-timezone mapping
- DST rules by region
- User's saved cities (requires auth)

---

### 3.2 Home EMI Calculator with Location-Based Rates

**Purpose:** Help users compare home loan options with real bank rates

#### Features:
1. **Location Detection** - Auto-detect or manual country/city selection
2. **Bank Rate Database** - Current interest rates from major banks
3. **Rate Comparison** - Side-by-side bank comparison
4. **EMI Calculation** - Standard EMI with amortization
5. **Affordability Check** - Based on income (optional)

#### UI Concept:
```
+----------------------------------------------------------+
|  Home Loan EMI Calculator                                |
+----------------------------------------------------------+
|                                                          |
|  Your Location: [Mumbai, India  v]                       |
|                                                          |
|  Loan Amount         Interest Rate         Tenure        |
|  [₹ 50,00,000  ]    [8.50 %      ]       [20 years ]    |
|                                                          |
+----------------------------------------------------------+
|  Current Bank Rates in India                [Refresh]    |
|  +----------------+----------+----------+---------------+|
|  | Bank           | Rate     | Type     | Action        ||
|  +----------------+----------+----------+---------------+|
|  | SBI            | 8.40%    | Floating | [Apply Rate]  ||
|  | HDFC           | 8.50%    | Floating | [Apply Rate]  ||
|  | ICICI          | 8.55%    | Floating | [Apply Rate]  ||
|  | Axis           | 8.60%    | Floating | [Apply Rate]  ||
|  | Bank of Baroda | 8.35%    | Floating | [Apply Rate]  ||
|  +----------------+----------+----------+---------------+|
|  Rate Range: 8.35% - 9.25%    Last Updated: Jan 9, 2026  |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  Your EMI: ₹43,391/month                                |
|                                                          |
|  Total Payment: ₹1,04,13,840                            |
|  Total Interest: ₹54,13,840                             |
|  Interest %: 52%                                         |
|                                                          |
|  [View Amortization] [Compare Banks] [Download PDF]      |
|                                                          |
+----------------------------------------------------------+
```

#### Supported Regions (Initial):
| Country | Banks | Rate Source |
|---------|-------|-------------|
| India | SBI, HDFC, ICICI, Axis, BoB, PNB | RBI data / Web scraping |
| USA | Chase, Wells Fargo, BoA, Citi | Bankrate API |
| UK | Barclays, HSBC, Lloyds, NatWest | Bank APIs |
| UAE | Emirates NBD, ADCB, DIB | Central Bank |

#### Data Update Strategy:
- Weekly automated scraping/API calls
- Manual override for accuracy
- User can report outdated rates

---

### 3.3 Google Authentication + Data Persistence

**Purpose:** Allow users to save calculations, track net worth over time, sync across devices

#### Auth Features:
| Feature | Description | Storage |
|---------|-------------|---------|
| Google Sign-In | One-click authentication | Supabase Auth |
| Guest Mode | Use without login (local storage) | localStorage |
| Data Migration | Migrate guest data to account | On first login |
| Profile | Name, location, currency preference | Supabase |

#### Persisted Data:
| Data Type | Description | Use Case |
|-----------|-------------|----------|
| Calculation History | Past 100 calculations | Quick re-access |
| Net Worth Snapshots | Monthly net worth tracking | Trend visualization |
| Saved Scenarios | Named calculation sets | "Home Purchase Plan" |
| User Preferences | Theme, currency, location | Personalization |
| Favorite Calculators | Pinned calculators | Quick access |
| World Clock Cities | Saved cities | Time zone tracking |

#### Database Schema:
```sql
-- Users (from Supabase Auth)
users
  - id: uuid (PK)
  - email: string
  - name: string
  - avatar_url: string
  - preferred_currency: string
  - preferred_location: string
  - theme: 'light' | 'dark' | 'system'
  - created_at: timestamp

-- Calculations
calculations
  - id: uuid (PK)
  - user_id: uuid (FK)
  - calculator_type: string
  - inputs: jsonb
  - outputs: jsonb
  - name: string (optional)
  - is_favorite: boolean
  - created_at: timestamp

-- Net Worth
net_worth_entries
  - id: uuid (PK)
  - user_id: uuid (FK)
  - snapshot_date: date
  - assets: jsonb
  - liabilities: jsonb
  - total_assets: decimal
  - total_liabilities: decimal
  - net_worth: decimal
  - created_at: timestamp

-- World Clock
saved_cities
  - id: uuid (PK)
  - user_id: uuid (FK)
  - city_name: string
  - timezone: string
  - display_order: int
```

---

### 3.4 Smart Document Import (AI-Powered)

**Purpose:** Allow users to upload bank statements, amortization schedules, or screenshots and auto-populate calculators

#### Supported Document Types:
| Document Type | Source | Extracted Data |
|---------------|--------|----------------|
| Bank Statement (PDF) | Any bank | Transactions, balances, dates |
| Amortization Schedule | Loan documents | EMI, principal, interest breakdown |
| Screenshot | Any app/website | Numbers, dates via OCR |
| Loan Offer Letter | Banks | Rate, tenure, processing fees |
| Investment Statement | MF/Broker | Holdings, NAV, returns |

#### Processing Flow:
```
Upload Document → OCR/PDF Parse → AI Extraction → User Confirmation → Auto-fill Calculator
```

#### UI Concept:
```
+----------------------------------------------------------+
|  Smart Import                                   [Close]  |
+----------------------------------------------------------+
|                                                          |
|  ┌──────────────────────────────────────────────────┐   |
|  │                                                  │   |
|  │     📄 Drag & drop your document here           │   |
|  │        or click to browse                       │   |
|  │                                                  │   |
|  │     Supported: PDF, PNG, JPG, JPEG              │   |
|  │     Max size: 10MB                              │   |
|  │                                                  │   |
|  └──────────────────────────────────────────────────┘   |
|                                                          |
+----------------------------------------------------------+
|  Processing: Analyzing document...  [████████░░] 80%     |
+----------------------------------------------------------+
|                                                          |
|  Detected: Home Loan Amortization Schedule               |
|                                                          |
|  Extracted Values:                                       |
|  ┌────────────────────┬─────────────┬──────────────┐    |
|  │ Field              │ Value       │ Confidence   │    |
|  ├────────────────────┼─────────────┼──────────────┤    |
|  │ Loan Amount        │ ₹50,00,000  │ ✓ 98%       │    |
|  │ Interest Rate      │ 8.5%        │ ✓ 95%       │    |
|  │ Tenure             │ 240 months  │ ✓ 99%       │    |
|  │ EMI                │ ₹43,391     │ ✓ 97%       │    |
|  │ Total Interest     │ ₹54,13,840  │ ✓ 92%       │    |
|  └────────────────────┴─────────────┴──────────────┘    |
|                                                          |
|  [Edit Values]                [Apply to EMI Calculator]  |
|                                                          |
+----------------------------------------------------------+
```

#### Technical Implementation:
| Component | Technology | Purpose |
|-----------|------------|---------|
| PDF Parser | pdf-parse / pdf.js | Extract text from PDFs |
| OCR Engine | Tesseract.js / Google Vision API | Image to text |
| AI Extraction | OpenAI GPT-4 / Claude API | Intelligent field mapping |
| Validation | Zod + business rules | Sanity checks on values |

#### AI Prompt Strategy:
```
Given the following extracted text from a {document_type}:
{extracted_text}

Identify and extract:
1. Loan/Investment amount
2. Interest rate (annual)
3. Tenure (months/years)
4. EMI amount (if applicable)
5. Total payment/maturity value
6. Bank/Institution name
7. Date of document

Return as JSON with confidence scores.
```

#### Privacy Considerations:
- Documents processed client-side when possible (Tesseract.js)
- Server processing only with user consent
- No document storage (process and discard)
- Option to use local-only mode

---

### 3.5 Tax Planner (India / NRI)

**Purpose:** Calculate net take-home salary from CTC/gross package with full tax breakdown

#### Tax Regimes Supported:
| Regime | Description | Best For |
|--------|-------------|----------|
| Old Regime | Deductions (80C, 80D, HRA, etc.) | High deductions users |
| New Regime | Lower rates, no deductions | Simple, fewer investments |
| NRI Taxation | Special rules for non-residents | Indians abroad |

#### Input Fields:
| Field | Type | Notes |
|-------|------|-------|
| Annual CTC / Gross Salary | Currency | Primary input |
| Residential Status | Dropdown | Resident / NRI / RNOR |
| Age Group | Dropdown | <60, 60-80, 80+ (senior citizen slabs) |
| Metro/Non-Metro | Toggle | Affects HRA calculation |
| Employer Type | Dropdown | Private / Govt / PSU |

#### Deductions (Old Regime):
| Section | Limit | Examples |
|---------|-------|----------|
| 80C | ₹1,50,000 | PPF, ELSS, LIC, EPF |
| 80D | ₹25,000-₹1,00,000 | Health insurance |
| 80E | No limit | Education loan interest |
| 80G | 50-100% | Donations |
| HRA | Calculated | Rent paid vs 40/50% of basic |
| LTA | Actual | Travel allowance |
| Standard Deduction | ₹50,000 | Flat deduction |

#### UI Concept:
```
+----------------------------------------------------------+
|  Tax Planner 2025-26                    [Old ◉] [New ○]  |
+----------------------------------------------------------+
|                                                          |
|  Annual CTC: [₹ 15,00,000        ]                      |
|                                                          |
|  [Resident ○]  [NRI ◉]  [RNOR ○]     Age: [Below 60 v]  |
|                                                          |
+----------------------------------------------------------+
|  SALARY BREAKDOWN                                        |
|  ├── Basic Salary          ₹6,00,000   (40% of CTC)     |
|  ├── HRA                   ₹2,40,000   (40% of Basic)   |
|  ├── Special Allowance     ₹4,80,000                    |
|  ├── EPF (Employer)        ₹72,000                      |
|  └── Other Benefits        ₹1,08,000                    |
|                                                          |
+----------------------------------------------------------+
|  DEDUCTIONS (Old Regime)                                 |
|  ├── 80C Investments       [₹ 1,50,000 ] Max: ₹1.5L     |
|  ├── 80D Health Insurance  [₹ 25,000   ] Max: ₹25K      |
|  ├── HRA Exemption         ₹1,44,000   (Calculated)     |
|  └── Standard Deduction    ₹50,000                      |
|                            ─────────────                 |
|  Total Deductions          ₹3,69,000                    |
|                                                          |
+----------------------------------------------------------+
|  TAX CALCULATION                                         |
|                                                          |
|  Gross Income              ₹15,00,000                   |
|  (-) Exemptions            ₹1,44,000                    |
|  (-) Deductions            ₹2,25,000                    |
|  ─────────────────────────────────────                   |
|  Taxable Income            ₹11,31,000                   |
|                                                          |
|  Tax (Old Regime)          ₹1,44,120                    |
|  (+) Cess (4%)             ₹5,765                       |
|  ─────────────────────────────────────                   |
|  Total Tax                 ₹1,49,885                    |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  ┌─────────────────────────────────────────────────┐    |
|  │  YOUR TAKE-HOME                                 │    |
|  │                                                 │    |
|  │  Monthly: ₹1,04,176    Annual: ₹12,50,115     │    |
|  │                                                 │    |
|  │  Tax Rate: 10.0%       Savings: ₹37,000*      │    |
|  │  * vs New Regime                               │    |
|  └─────────────────────────────────────────────────┘    |
|                                                          |
|  [Compare Regimes] [Download Tax Report] [Save]          |
|                                                          |
+----------------------------------------------------------+
```

#### NRI-Specific Features:
- DTAA (Double Taxation Avoidance Agreement) calculator
- Country-specific treaty benefits
- TDS rates for NRI income
- Form 15CA/15CB guidance

---

### 3.6 Cost of Living Comparator

**Purpose:** Compare living costs across cities/countries to help with relocation, salary negotiation, and trip planning

#### Comparison Modes:
| Mode | Use Case | Example |
|------|----------|---------|
| **Salary Equivalent** | "What salary in NYC = ₹20L in Mumbai?" | Relocation |
| **City vs City** | Compare expenses side-by-side | Moving cities |
| **Trip Budget** | Daily costs in destination | Travel planning |
| **Expat Planning** | Long-term cost projection | NRI planning |

#### Cost Categories:
| Category | Items Included | Weight |
|----------|----------------|--------|
| Housing | Rent, utilities, internet | 35% |
| Food | Groceries, dining out | 20% |
| Transport | Public transit, fuel, car | 15% |
| Healthcare | Insurance, medical | 10% |
| Lifestyle | Entertainment, clothing | 10% |
| Education | School, courses | 5% |
| Miscellaneous | Services, personal care | 5% |

#### UI Concept:
```
+----------------------------------------------------------+
|  Cost of Living Comparator                               |
+----------------------------------------------------------+
|                                                          |
|  Compare: [Mumbai, India  v]  vs  [London, UK  v]       |
|                                                          |
|  Your Mumbai Salary: [₹ 20,00,000 /year]                |
|                                                          |
+----------------------------------------------------------+
|  EQUIVALENT SALARY IN LONDON                             |
|                                                          |
|       £72,400 / year  (~₹75,00,000)                     |
|                                                          |
|       To maintain same lifestyle, you need 3.75x        |
|                                                          |
+----------------------------------------------------------+
|  DETAILED COMPARISON                                     |
|                                                          |
|  Category        Mumbai        London        Diff        |
|  ─────────────────────────────────────────────────────   |
|  🏠 Rent (1BHK)  ₹35,000/mo   £1,800/mo    +390%       |
|  🍽️ Groceries    ₹8,000/mo    £400/mo      +280%       |
|  🚇 Transport    ₹3,000/mo    £150/mo      +260%       |
|  🍔 Meal Out     ₹500         £15          +170%       |
|  ☕ Coffee       ₹200         £4           +100%       |
|  🏋️ Gym          ₹2,000/mo    £50/mo       +125%       |
|  📱 Mobile       ₹500/mo      £20/mo       +200%       |
|                                                          |
|  Overall Index:  Mumbai = 100   London = 375            |
|                                                          |
+----------------------------------------------------------+
|  TRIP PLANNING MODE                                      |
|                                                          |
|  Duration: [7 days]    Style: [Mid-range v]             |
|                                                          |
|  Estimated Daily Budget in London:                       |
|  ├── Accommodation     £120/night                       |
|  ├── Food              £50/day                          |
|  ├── Transport         £15/day                          |
|  ├── Activities        £40/day                          |
|  └── Miscellaneous     £25/day                          |
|                        ──────────                        |
|  Total Trip Cost:      £1,750  (~₹1,82,000)            |
|                                                          |
|  [Save Trip Budget] [Export to Trip Planner]            |
|                                                          |
+----------------------------------------------------------+
```

#### Data Sources:
| Source | Data Type | Update Frequency |
|--------|-----------|------------------|
| Numbeo API | Cost indices, prices | Monthly |
| Expatistan | Detailed price data | Monthly |
| XE / Exchange Rate API | Currency conversion | Real-time |
| User submissions | Price corrections | Ongoing |

#### Integration with Trip Planner:
- Auto-populate daily budget estimates
- Currency conversion for all expenses
- Adjust for travel style (budget/mid-range/luxury)
- Factor in seasonality (peak vs off-peak)

---

### 3.7 Additional Calculator Ideas

Based on the blueprint and common user needs, here are additional calculators to consider:

#### Financial - Additional
| Calculator | Description | Value Add |
|------------|-------------|-----------|
| **Salary Calculator** | CTC to In-hand breakdown | Very common need |
| **Rent vs Buy** | Should you rent or buy? | Major life decision |
| **Step-Up SIP** | SIP with yearly increase | More realistic planning |
| **Car Loan EMI** | With depreciation view | Shows true cost of car |
| **Credit Card Payoff** | Debt payoff planner | Common pain point |
| **Inflation Impact** | Future value of money | Educational |

#### Lifestyle - New Category
| Calculator | Description | Value Add |
|------------|-------------|-----------|
| **Tip Calculator** | Bill splitting with tip | Restaurant use |
| **Fuel Cost Calculator** | Trip fuel expenses | Travel planning |
| **Electricity Bill** | Usage to cost estimate | Household planning |
| **Shopping Discount** | Multiple discounts, GST | E-commerce shopping |
| **Event Budget** | Wedding/party planner | Big events |

#### Productivity
| Calculator | Description | Value Add |
|------------|-------------|-----------|
| **Freelance Rate** | Hourly to annual conversion | Gig workers |
| **Salary Hike** | Percentage increase calculator | Negotiation tool |
| **Leave Balance** | Track PTO/leave days | HR utility |

#### Education
| Calculator | Description | Value Add |
|------------|-------------|-----------|
| **GPA Calculator** | CGPA/percentage conversion | Students |
| **Study Time Planner** | Hours needed for syllabus | Exam prep |

---

## 4. UI/UX Design

### Design System (from Blueprint)

#### Theme Support
- Light Mode (default)
- Dark Mode
- System preference detection

#### Color Palette
```css
/* Primary */
--primary: #2563eb;        /* Trust blue */
--primary-hover: #1d4ed8;

/* Semantic */
--success: #10b981;        /* Gains, positive */
--warning: #f59e0b;        /* Caution */
--danger: #ef4444;         /* Loss, risk */

/* Neutral - Light */
--background: #f8fafc;
--surface: #ffffff;
--border: #e2e8f0;
--text-primary: #0f172a;
--text-secondary: #475569;

/* Neutral - Dark */
--background-dark: #0f172a;
--surface-dark: #1e293b;
--border-dark: #334155;
--text-primary-dark: #f1f5f9;
```

#### Typography
- Headers: Cal Sans / Plus Jakarta Sans
- Body: Inter
- Numbers: JetBrains Mono (tabular figures)

### Key Pages

| Page | Purpose | Components |
|------|---------|------------|
| Home | Landing + quick access | Hero, Category grid, Popular calculators |
| Calculator List | Browse all calculators | Search, filters, category tabs |
| Calculator Page | Individual calculator | Input form, Results, Chart, Tips |
| Compare | Side-by-side comparison | Multi-select, comparison table |
| Time Zone | World clock dashboard | Clock grid, meeting planner |
| Net Worth | Asset/liability tracker | Tree view, pie chart, history |
| Profile | User settings + history | Preferences, saved calculations |
| Auth | Login/signup | Google button, benefits list |

---

## 5. Technical Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14+ (App Router) | SSR, file routing, API routes |
| Language | TypeScript | Type safety, better DX |
| Styling | Tailwind CSS + shadcn/ui | Rapid development, consistency |
| State | Zustand | Simple, performant |
| Charts | Recharts | React-native, customizable |
| Animations | Framer Motion | Smooth micro-interactions |
| Forms | React Hook Form + Zod | Validation, performance |
| Database | Supabase (PostgreSQL) | Free tier, real-time, auth |
| Auth | Supabase Auth (Google) | Easy OAuth integration |
| Hosting | Vercel | Optimal for Next.js |
| Analytics | Vercel Analytics | Built-in, privacy-focused |

### Offline Support (PWA)
- Service worker for caching
- LocalStorage for guest data
- IndexedDB for larger datasets
- Background sync when online

---

## 6. Data Sources

### Bank Interest Rates
| Source | Type | Update Frequency |
|--------|------|------------------|
| RBI Website | Web scrape | Weekly |
| Bankrate API | REST API | Daily |
| Manual entry | Admin panel | As needed |

### Time Zones
| Source | Type | Notes |
|--------|------|-------|
| IANA tz database | Static | Updated with releases |
| WorldTimeAPI | REST API | Real-time DST info |

### Currency Rates
| Source | Type | Notes |
|--------|------|-------|
| Exchange Rate API | REST | Free tier available |
| Open Exchange Rates | REST | More currencies |

---

## 7. Recommended UI Skills

Based on this project's needs, here are Claude Code skills that would accelerate development:

### Existing Skills to Leverage

| Skill | Use Case |
|-------|----------|
| `augen-ui` | Premium minimalist landing page design |

### Recommended New Skills to Create

| Skill Name | Description | Templates |
|------------|-------------|-----------|
| `calc-card` | Calculator card component with inputs/outputs/chart | EMI, SIP, FD variations |
| `comparison-table` | Side-by-side comparison layout | 2-4 column responsive |
| `number-input` | Formatted number input with slider | Currency, percentage |
| `result-display` | Big number with breakdown cards | Primary + secondary metrics |
| `chart-viz` | Pre-configured chart components | Line, Pie, Bar for finance |
| `auth-flow` | Google auth with Supabase | Login, signup, profile |
| `world-clock` | Time zone display component | Single clock, grid |

### Skill: `calc-card`
```markdown
Purpose: Generate calculator card UI with consistent styling
Inputs: Calculator name, input fields, output fields, chart type
Output: Complete React component with Tailwind styling

Example invocation:
/calc-card EMI Calculator
  - inputs: principal, rate, tenure
  - outputs: emi, totalInterest, totalPayment
  - chart: pie (principal vs interest)
```

### Skill: `number-input`
```markdown
Purpose: Currency/number input with formatting and slider
Features:
  - Auto-format with commas
  - Currency symbol prefix
  - Optional range slider sync
  - Min/max validation
  - Keyboard-friendly
```

---

## 8. Project Structure

```
calc-everything/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Homepage
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/page.tsx       # OAuth callback
│   ├── calculators/
│   │   ├── page.tsx                # All calculators
│   │   ├── [category]/
│   │   │   └── [calculator]/
│   │   │       └── page.tsx
│   ├── time/
│   │   ├── page.tsx                # World clock dashboard
│   │   ├── converter/page.tsx      # Time zone converter
│   │   └── meeting/page.tsx        # Meeting planner
│   ├── compare/page.tsx
│   ├── net-worth/page.tsx
│   ├── profile/page.tsx
│   └── api/
│       ├── auth/[...supabase]/
│       ├── bank-rates/
│       └── calculations/
├── components/
│   ├── ui/                         # shadcn components
│   ├── calculators/
│   │   ├── CalculatorCard.tsx
│   │   ├── NumberInput.tsx
│   │   ├── ResultDisplay.tsx
│   │   └── ChartDisplay.tsx
│   ├── time/
│   │   ├── WorldClock.tsx
│   │   ├── TimeZonePicker.tsx
│   │   └── MeetingPlanner.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── AuthButton.tsx
├── lib/
│   ├── calculations/               # Pure calculation functions
│   │   ├── emi.ts
│   │   ├── sip.ts
│   │   ├── time.ts
│   │   └── index.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── formatters.ts
│   └── validators.ts
├── data/
│   ├── bank-rates.json
│   ├── timezones.json
│   └── cities.json
├── stores/
│   ├── userStore.ts
│   └── calculatorStore.ts
└── types/
    └── index.ts
```

---

## 9. Test Cases

| Test ID | Scenario | Expected Result | Priority |
|---------|----------|-----------------|----------|
| TC-001 | EMI calculation accuracy | Match known EMI formula | High |
| TC-002 | SIP with 0% return | Returns = Invested | High |
| TC-003 | Time zone conversion across DST | Correct offset applied | High |
| TC-004 | Google sign-in flow | User created in Supabase | High |
| TC-005 | Offline calculation | Works without network | Medium |
| TC-006 | Currency formatting by locale | Correct symbol/position | Medium |
| TC-007 | Bank rates API failure | Fallback to cached data | Medium |

---

## 10. Development Phases

### Phase 1: Foundation (MVP)
- [ ] Project setup (Next.js 14, Tailwind, shadcn)
- [ ] Design system implementation
- [ ] 5 core calculators (EMI, SIP, FD, Lumpsum, Compound)
- [ ] Basic UI components
- [ ] Deploy to Vercel

### Phase 2: Time + Auth
- [ ] Time calculator suite (World clock, converter, meeting planner)
- [ ] Google authentication with Supabase
- [ ] Calculation history storage
- [ ] User preferences

### Phase 3: Location Intelligence
- [ ] Home EMI with bank rates
- [ ] Location detection
- [ ] Bank rate database + API
- [ ] Rate comparison UI

### Phase 4: Net Worth + Planning
- [ ] Net worth calculator
- [ ] Asset/liability categories
- [ ] Historical tracking
- [ ] Comparison tools

### Phase 5: Polish + PWA
- [ ] Offline support (Service Worker)
- [ ] Mobile optimization
- [ ] Performance tuning
- [ ] SEO optimization

---

## Approval

- [ ] Requirements complete
- [ ] Design reviewed
- [ ] User approved
- [ ] Ready for development

---

## Appendix: Calculator Formulas

### EMI Formula
```
EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
Where:
  P = Principal
  r = Monthly interest rate (annual/12/100)
  n = Number of months
```

### SIP Future Value
```
FV = P × ((1 + r)^n - 1) / r × (1 + r)
Where:
  P = Monthly investment
  r = Monthly return rate
  n = Number of months
```

### CAGR
```
CAGR = ((Ending Value / Beginning Value)^(1/years)) - 1
```
