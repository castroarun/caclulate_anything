# AnyCalc Tech Stack Walkthrough

**Project:** AnyCalc - Universal Calculator Platform
**Version:** 0.1.0
**Last Updated:** January 2026

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack Summary](#tech-stack-summary)
3. [Core Technologies](#core-technologies)
4. [Project Structure](#project-structure)
5. [Key Patterns & Code Examples](#key-patterns--code-examples)
6. [State Management](#state-management)
7. [Styling System](#styling-system)
8. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

AnyCalc follows a **modular calculator architecture** where each calculator is a self-contained component with:
- Pure calculation logic (testable, reusable)
- React UI component (presentation)
- Local storage persistence (optional)

```
User Interface (React Components)
         ↓
    Calculator Components
         ↓
    Pure Calculation Engines
         ↓
    Data Persistence (localStorage)
```

---

## Tech Stack Summary

| Layer | Technology | Why This Choice |
|-------|------------|-----------------|
| **Framework** | Next.js 14 (App Router) | Server-side rendering, file-based routing, API routes, excellent DX |
| **Language** | TypeScript 5.7 | Type safety, better IDE support, catch errors at compile time |
| **Styling** | Tailwind CSS 3.4 | Utility-first, rapid prototyping, zero runtime CSS |
| **UI Components** | Radix UI Primitives | Accessible, unstyled, composable components |
| **State** | React useState + Context | Simple, built-in, sufficient for calculator state |
| **Charts** | Recharts 2.14 | React-friendly, responsive, customizable |
| **Animations** | Framer Motion 11 | Declarative, performant, React-native |
| **Forms** | React Hook Form + Zod | Type-safe validation, minimal re-renders |
| **Icons** | Lucide React | Modern, tree-shakeable, consistent |
| **Testing** | Vitest + Playwright | Fast unit tests, robust E2E tests |

---

## Core Technologies

### 1. Next.js 14 with App Router

**Why:** Next.js provides the foundation for a production-ready React app with minimal configuration.

**Key Features Used:**
- App Router for file-based routing
- Server Components (for static pages)
- Client Components (for interactive calculators)
- URL search params for deep linking

```typescript
// src/app/workspace/page.tsx - Dynamic calculator selection via URL
'use client'

import { useSearchParams } from 'next/navigation'

function WorkspaceContent() {
  const searchParams = useSearchParams()
  const [activeCalc, setActiveCalc] = useState('emi')

  useEffect(() => {
    const calc = searchParams.get('calc')
    if (calc && ALL_CALCULATORS.find((c) => c.id === calc)) {
      setActiveCalc(calc)  // URL: /workspace?calc=realestate
    }
  }, [searchParams])
  // ...
}
```

### 2. TypeScript

**Why:** Type safety prevents runtime errors and enables better tooling.

**Example - Typed Calculation Inputs:**

```typescript
// src/types/index.ts
export interface EMIInput {
  principal: number      // Loan amount
  rate: number          // Annual interest rate (%)
  tenure: number        // Loan tenure
  tenureUnit: 'months' | 'years'
}

export interface EMIResult {
  emi: number
  totalInterest: number
  totalPayment: number
  primary: ResultMetric
  secondary: ResultMetric[]
  breakdown: AmortizationRow[]
  chartData: ChartDataPoint[]
}
```

### 3. Tailwind CSS

**Why:** Utility-first CSS enables rapid UI development without switching between files.

**Example - Responsive Calculator Card:**

```tsx
// Mobile-first responsive design
<div className="grid md:grid-cols-2">
  {/* Inputs - Full width on mobile, 50% on desktop */}
  <div className="p-5 space-y-4 border-r border-slate-100">
    {/* Form inputs */}
  </div>

  {/* Results - Stacks below on mobile, side-by-side on desktop */}
  <div className="p-5 bg-slate-50">
    {/* Results display */}
  </div>
</div>
```

### 4. Radix UI Primitives

**Why:** Accessible, unstyled components that we can style with Tailwind.

```typescript
// Used for: Dialogs, Tabs, Sliders, Selects, Tooltips
import * as Tabs from '@radix-ui/react-tabs'
import * as Slider from '@radix-ui/react-slider'
import * as Select from '@radix-ui/react-select'
```

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, providers)
│   ├── page.tsx                  # Landing page
│   ├── workspace/page.tsx        # Main calculator workspace
│   ├── providers.tsx             # Context providers wrapper
│   └── globals.css               # Global styles + Tailwind
│
├── components/
│   ├── calculators/              # Individual calculator components
│   │   ├── EMICalculator.tsx
│   │   ├── SIPCalculator.tsx
│   │   ├── RealEstateCalculator.tsx
│   │   └── ...
│   └── calculator/               # Shared UI components
│       ├── NumberInput.tsx       # Currency-aware number input
│       ├── ResultDisplay.tsx     # Formatted result display
│       ├── CalculatorCard.tsx    # Common card wrapper
│       └── ChartDisplay.tsx      # Recharts wrapper
│
├── lib/
│   ├── calculations/             # Pure calculation engines
│   │   ├── emi.ts                # EMI formula & amortization
│   │   ├── sip.ts                # SIP compound growth
│   │   ├── fd.ts                 # Fixed deposit maturity
│   │   └── ...
│   └── utils/
│       ├── formatters.ts         # Number/currency formatting
│       └── cn.ts                 # Tailwind class merging
│
├── contexts/
│   └── NumberFormatContext.tsx   # Indian vs International format
│
└── types/
    └── index.ts                  # Shared TypeScript interfaces
```

---

## Key Patterns & Code Examples

### Pattern 1: Pure Calculation Engines

Calculations are extracted into pure functions for testability and reusability.

```typescript
// src/lib/calculations/emi.ts

/**
 * Calculate EMI (Equated Monthly Installment)
 *
 * Formula: EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
 * Where:
 *   P = Principal loan amount
 *   r = Monthly interest rate (annual rate / 12 / 100)
 *   n = Number of months
 */
export function calculateEMI(input: EMIInput): EMIResult {
  const { principal, rate, tenure, tenureUnit } = input

  // Convert tenure to months
  const tenureMonths = tenureUnit === 'years' ? tenure * 12 : tenure
  const monthlyRate = rate / 12 / 100

  // Handle 0% interest edge case
  let emi: number
  if (rate === 0) {
    emi = principal / tenureMonths
  } else {
    const compoundFactor = Math.pow(1 + monthlyRate, tenureMonths)
    emi = (principal * monthlyRate * compoundFactor) / (compoundFactor - 1)
  }

  const totalPayment = emi * tenureMonths
  const totalInterest = totalPayment - principal

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
    // ... result formatting
  }
}
```

### Pattern 2: Smart Number Input Component

Handles Indian number formatting, slider sync, and input validation.

```tsx
// src/components/calculator/NumberInput.tsx

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  prefix?: string      // "₹" for currency
  suffix?: string      // "%" for rates
  showSlider?: boolean
}

export function NumberInput({ label, value, onChange, min, max, prefix, showSlider = true }: NumberInputProps) {
  const [inputValue, setInputValue] = useState(formatIndianNumber(value))
  const [isFocused, setIsFocused] = useState(false)

  // Sync input with slider
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    onChange(val)
    setInputValue(formatIndianNumber(val))
  }, [onChange])

  // Format on blur, show raw on focus
  const handleBlur = useCallback(() => {
    setIsFocused(false)
    setInputValue(formatIndianNumber(value))
  }, [value])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2">{prefix}</span>}
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={cn('w-full py-3 rounded-lg border', prefix ? 'pl-10' : 'pl-4')}
        />
      </div>
      {showSlider && (
        <input type="range" min={min} max={max} value={value} onChange={handleSliderChange} />
      )}
    </div>
  )
}
```

### Pattern 3: Calculator Registry

All calculators are registered in a central location for the workspace.

```typescript
// src/app/workspace/page.tsx

const CALCULATOR_GROUPS = [
  {
    name: 'Financial',
    items: [
      { id: 'emi', name: 'EMI Calculator', icon: '🏠', accent: 'blue' },
      { id: 'sip', name: 'SIP Calculator', icon: '📈', accent: 'emerald' },
      { id: 'fd', name: 'FD Calculator', icon: '🏦', accent: 'amber' },
      // ...
    ],
  },
  {
    name: 'Tax & Planning',
    items: [
      { id: 'tax', name: 'Tax Planner', icon: '🧮', accent: 'cyan' },
      { id: 'realestate', name: 'Real Estate CG', icon: '🏡', accent: 'purple' },
      // ...
    ],
  },
]

// Render selected calculator
function renderCalculator(id: string) {
  switch (id) {
    case 'emi': return <EMICalculator ref={calculatorRef} />
    case 'sip': return <SIPCalculator ref={calculatorRef} />
    case 'realestate': return <RealEstateCalculator ref={calculatorRef} />
    // ...
  }
}
```

### Pattern 4: Cross-Calculator Data Sharing

Calculators can share data via localStorage for integrated experiences.

```typescript
// RealEstateCalculator.tsx - Reading salary data from SalaryCalculator

useEffect(() => {
  const loadSalaryData = () => {
    const saved = localStorage.getItem('calc_salary')
    if (!saved) return

    const data = JSON.parse(saved)
    const ctc = data.ctc || 0
    const isUserModified = data.userModified === true || ctc !== DEFAULT_CTC

    if (ctc > 0 && isUserModified) {
      // Calculate marginal tax rate from salary data
      const taxableIncome = calculateTaxableIncome(data)
      const { marginalRate, roomInBracket } = findCurrentBracket(taxableIncome, data.taxRegime)

      setSalaryData({
        available: true,
        taxableIncome,
        marginalRate,
        roomInBracket,
        regime: data.taxRegime,
        usingSalaryRate: true,
      })
    }
  }

  loadSalaryData()
  window.addEventListener('focus', loadSalaryData) // Re-check on tab focus
}, [])
```

### Pattern 5: Split-Bracket Tax Calculation

Complex tax calculations that span multiple income brackets.

```typescript
// RealEstateCalculator.tsx - Progressive tax calculation

interface SplitBracketParams {
  additionalIncome: number       // New income to tax
  currentTaxableIncome: number   // Existing income level
  regime: 'new' | 'old'
}

function calculateSplitBracketTax(params: SplitBracketParams): SplitBracketResult {
  const { additionalIncome, currentTaxableIncome, regime } = params

  // Tax brackets for New Regime (FY 2024-25)
  const brackets = [
    { limit: 300000, rate: 0 },
    { limit: 700000, rate: 5 },
    { limit: 1000000, rate: 10 },
    { limit: 1200000, rate: 15 },
    { limit: 1500000, rate: 20 },
    { limit: Infinity, rate: 30 },
  ]

  let remainingIncome = additionalIncome
  let totalIncome = currentTaxableIncome
  let totalTax = 0
  const breakdown = []

  // Distribute income across brackets
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break
    if (totalIncome >= bracket.limit) continue

    const roomInBracket = bracket.limit - Math.max(totalIncome, 0)
    const incomeInBracket = Math.min(remainingIncome, roomInBracket)
    const taxInBracket = incomeInBracket * (bracket.rate / 100)

    breakdown.push({ rate: bracket.rate, amount: incomeInBracket, tax: taxInBracket })
    totalTax += taxInBracket
    remainingIncome -= incomeInBracket
    totalIncome += incomeInBracket
  }

  return { tax: Math.round(totalTax * 1.04), breakdown } // +4% cess
}
```

---

## State Management

### Local Component State (useState)

Most calculator state is local - no need for global state.

```typescript
// Simple input state
const [principal, setPrincipal] = useState(5000000)
const [rate, setRate] = useState(8.5)
const [tenure, setTenure] = useState(20)

// Computed results with useMemo
const result = useMemo(() =>
  calculateEMI({ principal, rate, tenure, tenureUnit: 'years' }),
  [principal, rate, tenure]
)
```

### Context for App-Wide Settings

```typescript
// src/contexts/NumberFormatContext.tsx

type NumberFormat = 'indian' | 'international'

interface NumberFormatContextType {
  format: NumberFormat
  setFormat: (format: NumberFormat) => void
  formatNumber: (num: number) => string   // Full format: 1,00,00,000
  formatCompact: (num: number) => string  // Compact: 1Cr
}

// Usage in components
const { formatNumber, formatCompact } = useNumberFormat()
<span>{formatCompact(result.emi)}</span>  // "1.5L" or "150K"
```

### LocalStorage Persistence

```typescript
// Save on input change
useEffect(() => {
  const data = { principal, rate, tenure, propertyType }
  localStorage.setItem('calc_emi', JSON.stringify(data))
}, [principal, rate, tenure, propertyType])

// Load on mount
useEffect(() => {
  const saved = localStorage.getItem('calc_emi')
  if (saved) {
    const data = JSON.parse(saved)
    setPrincipal(data.principal)
    setRate(data.rate)
    // ...
  }
}, [])
```

---

## Styling System

### Tailwind Configuration

```javascript
// tailwind.config.ts
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        display: ['var(--font-jakarta)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
}
```

### Class Merging Utility

```typescript
// src/lib/utils/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage - safely merge conditional classes
<div className={cn(
  'p-4 rounded-lg',
  isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600',
  className  // Allow parent to override
)} />
```

### Responsive Design Patterns

```tsx
// Mobile-first breakpoints
<div className="
  p-3 sm:p-4 md:p-5           // Padding: 12px → 16px → 20px
  text-sm sm:text-base         // Font: 14px → 16px
  grid-cols-2 sm:grid-cols-3 md:grid-cols-4  // Grid columns
"/>

// Hide/show at breakpoints
<span className="hidden sm:inline">Full Label</span>
<span className="sm:hidden">Short</span>
```

---

## Testing Strategy

### Unit Tests (Vitest)

Test pure calculation functions in isolation.

```typescript
// tests/unit/calculations/emi.test.ts
import { describe, it, expect } from 'vitest'
import { calculateEMI } from '@/lib/calculations/emi'

describe('calculateEMI', () => {
  it('calculates correct EMI for standard loan', () => {
    const result = calculateEMI({
      principal: 5000000,
      rate: 8.5,
      tenure: 20,
      tenureUnit: 'years',
    })

    expect(result.emi).toBe(43391)
    expect(result.totalInterest).toBe(5413840)
  })

  it('handles zero interest rate', () => {
    const result = calculateEMI({
      principal: 1200000,
      rate: 0,
      tenure: 12,
      tenureUnit: 'months',
    })

    expect(result.emi).toBe(100000)
    expect(result.totalInterest).toBe(0)
  })
})
```

### E2E Tests (Playwright)

Test complete user flows.

```typescript
// tests/e2e/emi-calculator.spec.ts
import { test, expect } from '@playwright/test'

test('EMI calculator calculates and displays results', async ({ page }) => {
  await page.goto('/workspace?calc=emi')

  // Fill inputs
  await page.fill('[data-testid="principal-input"]', '5000000')
  await page.fill('[data-testid="rate-input"]', '8.5')
  await page.fill('[data-testid="tenure-input"]', '20')

  // Check results
  await expect(page.getByText('₹43,391')).toBeVisible()
  await expect(page.getByText('Total Interest')).toBeVisible()
})
```

---

## Quick Reference

### Adding a New Calculator

1. Create calculation engine: `src/lib/calculations/newcalc.ts`
2. Create UI component: `src/components/calculators/NewCalculator.tsx`
3. Register in workspace: `src/app/workspace/page.tsx`
4. Add types if needed: `src/types/index.ts`

### Key Files to Know

| File | Purpose |
|------|---------|
| `src/app/workspace/page.tsx` | Calculator registry & workspace UI |
| `src/contexts/NumberFormatContext.tsx` | Indian/International number formatting |
| `src/lib/utils/formatters.ts` | Currency & percent formatting functions |
| `src/components/calculator/NumberInput.tsx` | Reusable number input with slider |

---

*This document is auto-generated. For the latest information, check the source code.*
