# Real Estate Capital Gains Calculator - Design Document

**Version:** 1.0
**Created:** 2026-01-15
**Status:** Planning

---

## 1. Overview

A comprehensive calculator for Indian real estate capital gains tax planning, including reinvestment strategies under various Income Tax Act sections to minimize or defer tax liability.

### Problem Statement
Property sellers in India need to understand:
- Capital gains tax liability (STCG vs LTCG)
- Indexation benefits for long-term gains
- Reinvestment options to save tax (Section 54, 54EC, 54F)
- Timeline requirements for exemptions
- Net proceeds after tax

### Target Users
- Property sellers planning to sell residential/commercial property
- Real estate investors
- Tax consultants and CAs
- NRIs selling property in India

---

## 2. Key Features

### 2.1 Capital Gains Calculator
- **Purchase Details**
  - Purchase date
  - Purchase price
  - Stamp duty & registration costs
  - Improvement costs (with dates)

- **Sale Details**
  - Sale date
  - Sale price
  - Brokerage/commission
  - Legal fees

- **Automatic Calculations**
  - Holding period determination (STCG < 24 months, LTCG >= 24 months)
  - Cost Inflation Index (CII) application
  - Indexed cost of acquisition
  - Indexed cost of improvement
  - Capital gains computation

### 2.2 Tax Exemption Planner (Reinvestment Strategies)

#### Section 54 - Residential Property Reinvestment
- For LTCG on sale of residential house
- Reinvest in ONE residential property (from AY 2024-25, limit ₹10Cr)
- Purchase: 1 year before OR 2 years after sale
- Construction: Within 3 years of sale
- Lock-in period: 3 years

#### Section 54EC - Capital Gains Bonds
- Invest in NHAI/REC/PFC bonds
- Maximum investment: ₹50 lakhs per FY
- Lock-in: 5 years
- Must invest within 6 months of sale
- Interest rate: ~5-5.5% (taxable)

#### Section 54F - Sale of Non-Residential Asset
- For LTCG on any asset OTHER than residential house
- Must not own more than one residential house
- Full exemption if entire net consideration reinvested
- Proportionate exemption otherwise

### 2.3 Comparison Mode
- Side-by-side comparison of different strategies
- Tax saved vs opportunity cost analysis
- Net effective returns comparison

### 2.4 Timeline Tracker
- Visual timeline of key deadlines
- Notifications for:
  - 6-month window for 54EC bonds
  - 2-year window for property purchase
  - 3-year window for construction
  - Lock-in period end dates

---

## 3. Data Requirements

### Cost Inflation Index (CII) Table
| Financial Year | CII Value |
|---------------|-----------|
| 2001-02 (Base) | 100 |
| 2013-14 | 220 |
| 2014-15 | 240 |
| 2015-16 | 254 |
| 2016-17 | 264 |
| 2017-18 | 272 |
| 2018-19 | 280 |
| 2019-20 | 289 |
| 2020-21 | 301 |
| 2021-22 | 317 |
| 2022-23 | 331 |
| 2023-24 | 348 |
| 2024-25 | 363 |
| 2025-26 | 378* |

*Estimated, update when announced

### Tax Rates
- **STCG**: Added to income, taxed at slab rate
- **LTCG**: 20% with indexation (properties acquired before July 23, 2024)
- **LTCG (New)**: 12.5% without indexation (properties acquired after July 23, 2024)
- **Surcharge**: Based on income level
- **Cess**: 4% Health & Education Cess

---

## 4. User Interface Design

### 4.1 Calculator Modes (Tab/Toggle)
1. **Calculate Tax** - Enter property details, see tax liability
2. **Plan Exemption** - Explore reinvestment strategies
3. **Compare Options** - Side-by-side strategy comparison

### 4.2 Input Section

```
┌─────────────────────────────────────────────────────────┐
│  Property Type: [Residential ▼] [Commercial ▼]         │
├─────────────────────────────────────────────────────────┤
│  PURCHASE DETAILS                                       │
│  ├─ Purchase Date      [    DD/MM/YYYY    ]            │
│  ├─ Purchase Price     [₹ _______________]             │
│  ├─ Stamp Duty         [₹ _______________]             │
│  └─ Improvements       [+ Add Improvement]              │
├─────────────────────────────────────────────────────────┤
│  SALE DETAILS                                           │
│  ├─ Sale Date          [    DD/MM/YYYY    ]            │
│  ├─ Sale Price         [₹ _______________]             │
│  ├─ Brokerage          [₹ _______________]             │
│  └─ Legal Fees         [₹ _______________]             │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Results Section

```
┌─────────────────────────────────────────────────────────┐
│  CAPITAL GAINS SUMMARY                                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Holding Period: 4 years 3 months (LONG-TERM)       ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Sale Price   │  │ Indexed Cost │  │ Capital Gain │  │
│  │ ₹1.50 Cr     │  │ ₹87.5 L      │  │ ₹62.5 L      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ TAX LIABILITY (Without Exemption)                   ││
│  │ LTCG Tax @ 20%: ₹12,50,000                         ││
│  │ Cess @ 4%:      ₹50,000                            ││
│  │ ─────────────────────────────────────────────────  ││
│  │ Total Tax:      ₹13,00,000                         ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 4.4 Exemption Planner Section

```
┌─────────────────────────────────────────────────────────┐
│  TAX-SAVING STRATEGIES                                  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Section 54 - Buy New House          [RECOMMENDED]  ││
│  │ ─────────────────────────────────────────────────  ││
│  │ Reinvest: ₹62.5L (full capital gain)              ││
│  │ Tax Saved: ₹13,00,000 (100%)                      ││
│  │ Deadline: Buy by [DATE] or Construct by [DATE]    ││
│  │                                                    ││
│  │ [Simulate This Strategy →]                         ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Section 54EC - Capital Gains Bonds                 ││
│  │ ─────────────────────────────────────────────────  ││
│  │ Max Investment: ₹50L (₹12.5L remains taxable)     ││
│  │ Tax Saved: ₹10,40,000 (80%)                       ││
│  │ Deadline: Invest by [DATE]                        ││
│  │ Lock-in: 5 years | Interest: ~5.25% p.a.          ││
│  │                                                    ││
│  │ [Simulate This Strategy →]                         ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Hybrid Strategy (54 + 54EC)                        ││
│  │ ─────────────────────────────────────────────────  ││
│  │ Partial house purchase + Bonds investment          ││
│  │                                                    ││
│  │ [Configure Hybrid →]                               ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 4.5 Comparison Table

| Strategy | Investment | Tax Saved | Lock-in | Liquidity | Net Benefit |
|----------|------------|-----------|---------|-----------|-------------|
| No Action | ₹0 | ₹0 | - | High | -₹13L tax |
| Sec 54 (Full) | ₹62.5L | ₹13L | 3 yrs | Low | Property appreciation |
| Sec 54EC | ₹50L | ₹10.4L | 5 yrs | Low | ₹2.6L interest |
| Hybrid | ₹30L + ₹32.5L | ₹13L | 3-5 yrs | Medium | Diversified |

---

## 5. Technical Implementation

### 5.1 New Route
- `/workspace?calc=realestate` OR
- Dedicated page: `/real-estate-tax` (given complexity)

### 5.2 Component Structure
```
src/
├── components/
│   └── calculators/
│       └── RealEstateCalculator.tsx
│           ├── PropertyDetailsForm
│           ├── CapitalGainsResult
│           ├── ExemptionPlanner
│           ├── StrategyComparison
│           └── TimelineTracker
```

### 5.3 State Management
```typescript
interface PropertyDetails {
  type: 'residential' | 'commercial' | 'land'
  purchaseDate: Date
  purchasePrice: number
  stampDuty: number
  improvements: Array<{date: Date, amount: number}>
  saleDate: Date
  salePrice: number
  brokerage: number
  legalFees: number
}

interface CapitalGains {
  holdingPeriod: { years: number; months: number }
  isLongTerm: boolean
  indexedCost: number
  capitalGain: number
  taxLiability: number
}

interface ExemptionStrategy {
  section: '54' | '54EC' | '54F' | 'hybrid'
  investmentAmount: number
  taxSaved: number
  deadline: Date
  lockInEnd: Date
}
```

### 5.4 Key Calculations

```typescript
// Indexed Cost = (Purchase Cost × CII of Sale Year) / CII of Purchase Year
const indexedCost = (purchaseCost * saleYearCII) / purchaseYearCII

// LTCG = Sale Price - Indexed Cost - Transfer Expenses
const ltcg = salePrice - indexedCost - brokerage - legalFees

// Tax (old regime, pre-July 2024)
const tax = ltcg * 0.20 * 1.04 // 20% + 4% cess

// Tax (new regime, post-July 2024)
const taxNew = ltcg * 0.125 * 1.04 // 12.5% + 4% cess
```

---

## 6. Edge Cases & Validations

1. **Inherited Property**: Use FMV as on 01/04/2001 or actual cost (whichever is higher)
2. **Gifted Property**: Use donor's cost of acquisition
3. **Joint Ownership**: Proportionate calculation
4. **NRI Sellers**: TDS implications (20% + surcharge)
5. **Multiple Improvements**: Each indexed separately
6. **Budget 2024 Changes**: Handle dual regime based on acquisition date

---

## 7. Future Enhancements (Phase 2)

- [ ] Capital Gains Account Scheme (CGAS) tracking
- [ ] Joint ownership calculator
- [ ] NRI-specific TDS calculator
- [ ] DTAA benefits for NRIs
- [ ] Property portfolio tracker
- [ ] PDF report with filled ITR-2 schedule

---

## 8. References

- [Income Tax Act - Capital Gains](https://incometaxindia.gov.in)
- [Section 54, 54EC, 54F](https://www.incometaxindia.gov.in/Acts/Income-tax%20Act,%201961)
- [Cost Inflation Index Notification](https://www.incometaxindia.gov.in/communications/notification/notification_37_2024.pdf)
- [Budget 2024 Capital Gains Changes](https://pib.gov.in/PressReleasePage.aspx?PRID=2035565)

---

## 9. Approval & Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | - | - | Pending |
| Design | - | - | Pending |
| Dev | - | - | Pending |
