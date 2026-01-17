'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface EMIResult {
  emi: number
  totalInterest: number
  totalPayment: number
  principalPercent: number
  interestPercent: number
}

interface AmortizationRow {
  month: number
  year: number
  emi: number
  principal: number
  interest: number
  balance: number
}

interface YearlyBreakdown {
  year: number
  principal: number
  interest: number
  balance: number
}

function calculateEMI(principal: number, rate: number, tenure: number): EMIResult {
  const monthlyRate = rate / 12 / 100
  const months = tenure * 12

  if (monthlyRate === 0) {
    const emi = principal / months
    return {
      emi: Math.round(emi),
      totalInterest: 0,
      totalPayment: Math.round(principal),
      principalPercent: 100,
      interestPercent: 0,
    }
  }

  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)

  const totalPayment = emi * months
  const totalInterest = totalPayment - principal

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
    principalPercent: Math.round((principal / totalPayment) * 100),
    interestPercent: Math.round((totalInterest / totalPayment) * 100),
  }
}

function formatIndianNumber(num: number): string {
  const str = Math.round(num).toString()
  let result = ''
  let count = 0

  for (let i = str.length - 1; i >= 0; i--) {
    if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
      result = ',' + result
    }
    result = str[i] + result
    count++
  }

  return result
}

function formatCompact(num: number): string {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`
  return `₹${num}`
}

function generateAmortization(
  principal: number,
  rate: number,
  tenure: number,
  emi: number
): { schedule: AmortizationRow[]; yearlyBreakdown: YearlyBreakdown[] } {
  const monthlyRate = rate / 12 / 100
  const months = tenure * 12
  const schedule: AmortizationRow[] = []
  const yearlyBreakdown: YearlyBreakdown[] = []

  let balance = principal
  let yearPrincipal = 0
  let yearInterest = 0

  for (let month = 1; month <= months; month++) {
    const interest = balance * monthlyRate
    const principalPaid = emi - interest
    balance = Math.max(0, balance - principalPaid)

    const year = Math.ceil(month / 12)

    schedule.push({
      month,
      year,
      emi: Math.round(emi),
      principal: Math.round(principalPaid),
      interest: Math.round(interest),
      balance: Math.round(balance),
    })

    yearPrincipal += principalPaid
    yearInterest += interest

    if (month % 12 === 0 || month === months) {
      yearlyBreakdown.push({
        year,
        principal: Math.round(yearPrincipal),
        interest: Math.round(yearInterest),
        balance: Math.round(balance),
      })
      yearPrincipal = 0
      yearInterest = 0
    }
  }

  return { schedule, yearlyBreakdown }
}

interface PrepaymentEntry {
  id: number
  year: number
  amount: number
}

interface PrepaymentResult {
  newTenureMonths: number
  newTotalInterest: number
  newTotalPayment: number
  interestSaved: number
  monthsSaved: number
  yearlyBreakdown: YearlyBreakdown[]
}

function calculateWithPrepayments(
  principal: number,
  rate: number,
  emi: number,
  originalTenure: number,
  prepayments: PrepaymentEntry[]
): PrepaymentResult {
  const monthlyRate = rate / 12 / 100
  let balance = principal
  let totalInterest = 0
  let month = 0
  const yearlyBreakdown: YearlyBreakdown[] = []
  let yearPrincipal = 0
  let yearInterest = 0

  // Sort prepayments by year
  const sortedPrepayments = [...prepayments].sort((a, b) => a.year - b.year)
  const prepaymentMap = new Map<number, number>()
  sortedPrepayments.forEach((p) => {
    prepaymentMap.set(p.year, (prepaymentMap.get(p.year) || 0) + p.amount)
  })

  while (balance > 0) {
    month++
    const currentYear = Math.ceil(month / 12)

    const interest = balance * monthlyRate
    const principalPaid = Math.min(emi - interest, balance)
    balance = Math.max(0, balance - principalPaid)
    totalInterest += interest
    yearPrincipal += principalPaid
    yearInterest += interest

    // Apply prepayment at end of year
    if (month % 12 === 0 && prepaymentMap.has(currentYear)) {
      const prepayAmount = prepaymentMap.get(currentYear)!
      yearPrincipal += Math.min(prepayAmount, balance)
      balance = Math.max(0, balance - prepayAmount)
    }

    // Record yearly breakdown
    if (month % 12 === 0 || balance === 0) {
      yearlyBreakdown.push({
        year: currentYear,
        principal: Math.round(yearPrincipal),
        interest: Math.round(yearInterest),
        balance: Math.round(balance),
      })
      yearPrincipal = 0
      yearInterest = 0
    }
  }

  const originalMonths = originalTenure * 12
  const originalTotalInterest =
    (emi * originalMonths - principal)

  return {
    newTenureMonths: month,
    newTotalInterest: Math.round(totalInterest),
    newTotalPayment: Math.round(principal + totalInterest),
    interestSaved: Math.round(originalTotalInterest - totalInterest),
    monthsSaved: originalMonths - month,
    yearlyBreakdown,
  }
}

export interface EMICalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

// Calculate max loan from EMI budget (reverse calculation)
function calculateAffordability(emi: number, rate: number, tenure: number): number {
  const monthlyRate = rate / 12 / 100
  const months = tenure * 12

  if (monthlyRate === 0) {
    return emi * months
  }

  const principal = emi * (Math.pow(1 + monthlyRate, months) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, months))
  return Math.round(principal)
}

const EMICalculator = forwardRef<EMICalculatorRef>(function EMICalculator(props, ref) {
  const [mode, setMode] = useState<'calculate' | 'affordability'>('calculate')
  const [principal, setPrincipal] = useState(5000000)
  const [emiBudget, setEmiBudget] = useState(50000) // For affordability mode
  const [rate, setRate] = useState(8.5)
  const [tenure, setTenure] = useState(20)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [showPrepayment, setShowPrepayment] = useState(false)
  const [prepayments, setPrepayments] = useState<PrepaymentEntry[]>([
    { id: 1, year: 5, amount: 500000 },
  ])
  const [nextPrepaymentId, setNextPrepaymentId] = useState(2)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Prepayment helpers
  const addPrepayment = () => {
    const usedYears = new Set(prepayments.map((p) => p.year))
    let nextYear = 1
    while (usedYears.has(nextYear) && nextYear <= tenure) nextYear++
    if (nextYear <= tenure) {
      setPrepayments([...prepayments, { id: nextPrepaymentId, year: nextYear, amount: 500000 }])
      setNextPrepaymentId(nextPrepaymentId + 1)
    }
  }

  const removePrepayment = (id: number) => {
    setPrepayments(prepayments.filter((p) => p.id !== id))
  }

  const updatePrepayment = (id: number, field: 'year' | 'amount', value: number) => {
    setPrepayments(
      prepayments.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_emi')
    if (saved) {
      const data = JSON.parse(saved)
      setMode(data.mode || 'calculate')
      setPrincipal(data.principal || 5000000)
      setEmiBudget(data.emiBudget || 50000)
      setRate(data.rate || 8.5)
      setTenure(data.tenure || 20)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage (only after initial load)
  useEffect(() => {
    if (!isLoaded) return
    const data = { mode, principal, emiBudget, rate, tenure, notes }
    localStorage.setItem('calc_emi', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [mode, principal, emiBudget, rate, tenure, notes, isLoaded])

  // Calculate max affordable loan in affordability mode
  const affordableLoan = useMemo(
    () => calculateAffordability(emiBudget, rate, tenure),
    [emiBudget, rate, tenure]
  )

  // Use affordableLoan as principal in affordability mode for result calculation
  const effectivePrincipal = mode === 'affordability' ? affordableLoan : principal
  const result = useMemo(() => calculateEMI(effectivePrincipal, rate, tenure), [effectivePrincipal, rate, tenure])

  const { schedule, yearlyBreakdown } = useMemo(
    () => generateAmortization(effectivePrincipal, rate, tenure, result.emi),
    [effectivePrincipal, rate, tenure, result.emi]
  )

  // Prepayment calculation
  const prepaymentResult = useMemo(() => {
    const validPrepayments = prepayments.filter((p) => p.year <= tenure && p.amount > 0)
    if (validPrepayments.length === 0) return null
    return calculateWithPrepayments(principal, rate, result.emi, tenure, validPrepayments)
  }, [principal, rate, tenure, result.emi, prepayments])

  // Total prepayment amount
  const totalPrepaymentAmount = useMemo(
    () => prepayments.reduce((sum, p) => sum + p.amount, 0),
    [prepayments]
  )

  const handleClear = () => {
    setMode('calculate')
    setPrincipal(5000000)
    setEmiBudget(50000)
    setRate(8.5)
    setTenure(20)
    setNotes('')
    localStorage.removeItem('calc_emi')
  }

  // Export to CSV (Excel compatible)
  const exportToExcel = () => {
    const headers = ['Month', 'Year', 'EMI (₹)', 'Principal (₹)', 'Interest (₹)', 'Balance (₹)']
    const rows = schedule.map((row) => [
      row.month,
      row.year,
      row.emi,
      row.principal,
      row.interest,
      row.balance,
    ])

    const csvContent = [
      `EMI Calculator - Amortization Schedule`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `Loan Amount: ₹${formatIndianNumber(principal)}`,
      `Interest Rate: ${rate}% p.a.`,
      `Tenure: ${tenure} years`,
      `Monthly EMI: ₹${formatIndianNumber(result.emi)}`,
      `Total Interest: ₹${formatIndianNumber(result.totalInterest)}`,
      `Total Payment: ₹${formatIndianNumber(result.totalPayment)}`,
      ``,
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `EMI_Amortization_${principal}_${rate}pct_${tenure}yrs.csv`
    link.click()
  }

  // Generate yearly breakdown chart HTML
  const generateYearlyChartHTML = (breakdown: YearlyBreakdown[], prepaymentsList: PrepaymentEntry[] = []) => {
    const maxTotal = Math.max(...breakdown.map((y) => y.principal + y.interest))
    return breakdown
      .map((y) => {
        const total = y.principal + y.interest
        const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0
        const principalWidth = total > 0 ? (y.principal / total) * 100 : 0
        const hasPrepayment = prepaymentsList.some((p) => p.year === y.year)
        const prepaymentAmount = prepaymentsList.find((p) => p.year === y.year)?.amount || 0
        return `
          <div class="year-row ${hasPrepayment ? 'prepayment-year' : ''}">
            <span class="year-label">Y${y.year}${hasPrepayment ? '*' : ''}</span>
            <div class="bar-container" style="width: ${barWidth}%">
              <div class="bar-principal" style="width: ${principalWidth}%">
                ${principalWidth > 20 ? `<span>${formatCompact(y.principal)}</span>` : ''}
              </div>
              <div class="bar-interest" style="width: ${100 - principalWidth}%">
                ${(100 - principalWidth) > 20 ? `<span>${formatCompact(y.interest)}</span>` : ''}
              </div>
            </div>
            <span class="balance-label">${formatCompact(y.balance)}</span>
            ${hasPrepayment ? `<span class="prepayment-badge">+₹${formatIndianNumber(prepaymentAmount)}</span>` : ''}
          </div>
        `
      })
      .join('')
  }

  // Export to PDF (uses browser print)
  const exportToPDF = () => {
    const hasPrepayments = prepayments.length > 0 && prepayments.some((p) => p.amount > 0)
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>EMI Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #2563eb; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .emi-highlight { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .emi-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
          .emi-value { font-size: 32px; font-weight: bold; color: #0f172a; }

          /* Pie Chart */
          .chart-section { display: flex; align-items: center; gap: 30px; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
          .pie-chart { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#22c55e 0% ${result.principalPercent}%, #3b82f6 ${result.principalPercent}% 100%); flex-shrink: 0; }
          .chart-legend { flex: 1; }
          .legend-item { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 13px; }
          .legend-color { width: 16px; height: 16px; border-radius: 4px; }
          .legend-principal { background: #22c55e; }
          .legend-interest { background: #3b82f6; }

          /* Yearly Chart */
          .yearly-chart { margin: 15px 0; }
          .chart-header { display: flex; font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; padding: 0 5px; }
          .chart-header span:first-child { width: 40px; }
          .chart-header span:nth-child(2) { flex: 1; }
          .chart-header span:last-child { width: 70px; text-align: right; }
          .year-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
          .year-row.prepayment-year .year-label { color: #16a34a; font-weight: bold; }
          .year-label { width: 35px; font-size: 11px; color: #64748b; font-family: monospace; }
          .bar-container { height: 24px; background: #e2e8f0; border-radius: 4px; display: flex; overflow: hidden; flex: 1; }
          .bar-principal { background: #22c55e; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
          .bar-interest { background: #3b82f6; display: flex; align-items: center; justify-content: flex-start; padding-left: 4px; }
          .bar-principal span, .bar-interest span { font-size: 9px; color: white; font-weight: 500; }
          .balance-label { width: 65px; font-size: 10px; color: #64748b; text-align: right; font-family: monospace; }
          .prepayment-badge { font-size: 9px; color: #16a34a; background: #dcfce7; padding: 2px 6px; border-radius: 4px; margin-left: 5px; }
          .chart-footer { display: flex; gap: 20px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; }
          .chart-footer-item { display: flex; align-items: center; gap: 6px; }
          .chart-footer-color { width: 12px; height: 12px; border-radius: 3px; }

          /* Prepayment Summary */
          .prepayment-summary { background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); padding: 15px; border-radius: 10px; margin: 15px 0; }
          .prepayment-title { font-size: 11px; color: #16a34a; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; }
          .prepayment-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .prepayment-item { text-align: center; }
          .prepayment-value { font-size: 20px; font-weight: bold; color: #15803d; }
          .prepayment-label { font-size: 10px; color: #16a34a; }

          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
          th { background: #f1f5f9; padding: 8px; text-align: right; font-weight: 600; color: #475569; }
          th:first-child { text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; }
          td:first-child { text-align: left; }
          .principal { color: #16a34a; }
          .interest { color: #3b82f6; }
          .prepayment-row { background: #f0fdf4; }
          .prepayment-row td:first-child { border-left: 3px solid #22c55e; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { padding: 10px; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <h1>EMI Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Loan Amount</div>
              <div class="summary-value">₹${formatIndianNumber(principal)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Interest Rate</div>
              <div class="summary-value">${rate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tenure</div>
              <div class="summary-value">${tenure} years</div>
            </div>
          </div>
        </div>

        <div class="emi-highlight">
          <div class="emi-label">Monthly EMI</div>
          <div class="emi-value">₹${formatIndianNumber(result.emi)}</div>
        </div>

        <h2>Payment Breakdown</h2>
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color legend-principal"></div>
              <span>Principal: ₹${formatIndianNumber(principal)} (${result.principalPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-interest"></div>
              <span>Interest: ₹${formatIndianNumber(result.totalInterest)} (${result.interestPercent}%)</span>
            </div>
            <div class="legend-item" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <strong>Total Payment: ₹${formatIndianNumber(result.totalPayment)}</strong>
            </div>
          </div>
        </div>

        ${
          hasPrepayments && prepaymentResult
            ? `
        <h2>Prepayment Analysis</h2>
        <div class="prepayment-summary">
          <div class="prepayment-title">You Save with Prepayments</div>
          <div class="prepayment-grid">
            <div class="prepayment-item">
              <div class="prepayment-value">₹${formatIndianNumber(prepaymentResult.interestSaved)}</div>
              <div class="prepayment-label">Interest Saved</div>
            </div>
            <div class="prepayment-item">
              <div class="prepayment-value">${Math.floor(prepaymentResult.monthsSaved / 12)}y ${prepaymentResult.monthsSaved % 12}m</div>
              <div class="prepayment-label">Earlier Payoff</div>
            </div>
          </div>
        </div>
        <p style="font-size: 11px; color: #64748b; margin: 10px 0;">
          Total Prepayments: ₹${formatIndianNumber(totalPrepaymentAmount)} |
          New Tenure: ${Math.floor(prepaymentResult.newTenureMonths / 12)}y ${prepaymentResult.newTenureMonths % 12}m |
          New Total Interest: ₹${formatIndianNumber(prepaymentResult.newTotalInterest)}
        </p>
        `
            : ''
        }

        <h2>Yearly Payment Breakdown</h2>
        <div class="yearly-chart">
          <div class="chart-header">
            <span>Year</span>
            <span>Principal & Interest</span>
            <span>Balance</span>
          </div>
          ${hasPrepayments && prepaymentResult ? generateYearlyChartHTML(prepaymentResult.yearlyBreakdown, prepayments) : generateYearlyChartHTML(yearlyBreakdown)}
          <div class="chart-footer">
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #22c55e;"></div>
              <span>Principal</span>
            </div>
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #3b82f6;"></div>
              <span>Interest</span>
            </div>
            ${hasPrepayments ? '<span style="color: #64748b;">* = Prepayment Year</span>' : ''}
          </div>
        </div>

        <div class="page-break"></div>
        <h2>Amortization Schedule</h2>
        <table>
          <tr>
            <th>Month</th>
            <th>EMI</th>
            <th>Principal</th>
            <th>Interest</th>
            <th>Balance</th>
            ${hasPrepayments ? '<th>Prepayment</th>' : ''}
          </tr>
          ${schedule
            .map((row) => {
              const isYearEnd = row.month % 12 === 0
              const currentYear = Math.ceil(row.month / 12)
              const prepaymentForYear = prepayments.find((p) => p.year === currentYear)
              const showPrepayment = isYearEnd && prepaymentForYear
              return `
            <tr class="${showPrepayment ? 'prepayment-row' : ''}">
              <td>${row.month}${showPrepayment ? '*' : ''}</td>
              <td>₹${formatIndianNumber(row.emi)}</td>
              <td class="principal">₹${formatIndianNumber(row.principal)}</td>
              <td class="interest">₹${formatIndianNumber(row.interest)}</td>
              <td>₹${formatIndianNumber(row.balance)}</td>
              ${hasPrepayments ? `<td class="principal">${showPrepayment ? '₹' + formatIndianNumber(prepaymentForYear.amount) : '—'}</td>` : ''}
            </tr>
          `
            })
            .join('')}
        </table>
        ${hasPrepayments ? '<p style="font-size: 10px; color: #16a34a; margin-top: 10px;">* Prepayment applied at end of year</p>' : ''}

        <div class="footer">
          Generated by AnyCalc — Calculate everything. Plan anything.
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Export to HTML
  const exportToHTML = () => {
    const hasPrepayments = prepayments.length > 0 && prepayments.some((p) => p.amount > 0)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>EMI Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #2563eb; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .emi-highlight { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .emi-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
          .emi-value { font-size: 32px; font-weight: bold; color: #0f172a; }

          /* Pie Chart */
          .chart-section { display: flex; align-items: center; gap: 30px; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
          .pie-chart { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#22c55e 0% ${result.principalPercent}%, #3b82f6 ${result.principalPercent}% 100%); flex-shrink: 0; }
          .chart-legend { flex: 1; }
          .legend-item { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 13px; }
          .legend-color { width: 16px; height: 16px; border-radius: 4px; }
          .legend-principal { background: #22c55e; }
          .legend-interest { background: #3b82f6; }

          /* Yearly Chart */
          .yearly-chart { margin: 15px 0; }
          .chart-header { display: flex; font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; padding: 0 5px; }
          .chart-header span:first-child { width: 40px; }
          .chart-header span:nth-child(2) { flex: 1; }
          .chart-header span:last-child { width: 70px; text-align: right; }
          .year-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
          .year-row.prepayment-year .year-label { color: #16a34a; font-weight: bold; }
          .year-label { width: 35px; font-size: 11px; color: #64748b; font-family: monospace; }
          .bar-container { height: 24px; background: #e2e8f0; border-radius: 4px; display: flex; overflow: hidden; flex: 1; }
          .bar-principal { background: #22c55e; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
          .bar-interest { background: #3b82f6; display: flex; align-items: center; justify-content: flex-start; padding-left: 4px; }
          .bar-principal span, .bar-interest span { font-size: 9px; color: white; font-weight: 500; }
          .balance-label { width: 65px; font-size: 10px; color: #64748b; text-align: right; font-family: monospace; }
          .prepayment-badge { font-size: 9px; color: #16a34a; background: #dcfce7; padding: 2px 6px; border-radius: 4px; margin-left: 5px; }
          .chart-footer { display: flex; gap: 20px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; }
          .chart-footer-item { display: flex; align-items: center; gap: 6px; }
          .chart-footer-color { width: 12px; height: 12px; border-radius: 3px; }

          /* Prepayment Summary */
          .prepayment-summary { background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); padding: 15px; border-radius: 10px; margin: 15px 0; }
          .prepayment-title { font-size: 11px; color: #16a34a; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; }
          .prepayment-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .prepayment-item { text-align: center; }
          .prepayment-value { font-size: 20px; font-weight: bold; color: #15803d; }
          .prepayment-label { font-size: 10px; color: #16a34a; }

          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
          th { background: #f1f5f9; padding: 8px; text-align: right; font-weight: 600; color: #475569; }
          th:first-child { text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; }
          td:first-child { text-align: left; }
          .principal { color: #16a34a; }
          .interest { color: #3b82f6; }
          .prepayment-row { background: #f0fdf4; }
          .prepayment-row td:first-child { border-left: 3px solid #22c55e; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>EMI Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Loan Amount</div>
              <div class="summary-value">₹${formatIndianNumber(principal)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Interest Rate</div>
              <div class="summary-value">${rate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tenure</div>
              <div class="summary-value">${tenure} years</div>
            </div>
          </div>
        </div>

        <div class="emi-highlight">
          <div class="emi-label">Monthly EMI</div>
          <div class="emi-value">₹${formatIndianNumber(result.emi)}</div>
        </div>

        <h2>Payment Breakdown</h2>
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color legend-principal"></div>
              <span>Principal: ₹${formatIndianNumber(principal)} (${result.principalPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-interest"></div>
              <span>Interest: ₹${formatIndianNumber(result.totalInterest)} (${result.interestPercent}%)</span>
            </div>
            <div class="legend-item" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <strong>Total Payment: ₹${formatIndianNumber(result.totalPayment)}</strong>
            </div>
          </div>
        </div>

        ${
          hasPrepayments && prepaymentResult
            ? `
        <h2>Prepayment Analysis</h2>
        <div class="prepayment-summary">
          <div class="prepayment-title">You Save with Prepayments</div>
          <div class="prepayment-grid">
            <div class="prepayment-item">
              <div class="prepayment-value">₹${formatIndianNumber(prepaymentResult.interestSaved)}</div>
              <div class="prepayment-label">Interest Saved</div>
            </div>
            <div class="prepayment-item">
              <div class="prepayment-value">${Math.floor(prepaymentResult.monthsSaved / 12)}y ${prepaymentResult.monthsSaved % 12}m</div>
              <div class="prepayment-label">Earlier Payoff</div>
            </div>
          </div>
        </div>
        <p style="font-size: 11px; color: #64748b; margin: 10px 0;">
          Total Prepayments: ₹${formatIndianNumber(totalPrepaymentAmount)} |
          New Tenure: ${Math.floor(prepaymentResult.newTenureMonths / 12)}y ${prepaymentResult.newTenureMonths % 12}m |
          New Total Interest: ₹${formatIndianNumber(prepaymentResult.newTotalInterest)}
        </p>
        `
            : ''
        }

        <h2>Yearly Payment Breakdown</h2>
        <div class="yearly-chart">
          <div class="chart-header">
            <span>Year</span>
            <span>Principal & Interest</span>
            <span>Balance</span>
          </div>
          ${hasPrepayments && prepaymentResult ? generateYearlyChartHTML(prepaymentResult.yearlyBreakdown, prepayments) : generateYearlyChartHTML(yearlyBreakdown)}
          <div class="chart-footer">
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #22c55e;"></div>
              <span>Principal</span>
            </div>
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #3b82f6;"></div>
              <span>Interest</span>
            </div>
            ${hasPrepayments ? '<span style="color: #64748b;">* = Prepayment Year</span>' : ''}
          </div>
        </div>

        <h2>Amortization Schedule</h2>
        <table>
          <tr>
            <th>Month</th>
            <th>EMI</th>
            <th>Principal</th>
            <th>Interest</th>
            <th>Balance</th>
            ${hasPrepayments ? '<th>Prepayment</th>' : ''}
          </tr>
          ${schedule
            .map((row) => {
              const isYearEnd = row.month % 12 === 0
              const currentYear = Math.ceil(row.month / 12)
              const prepaymentForYear = prepayments.find((p) => p.year === currentYear)
              const showPrepayment = isYearEnd && prepaymentForYear
              return `
            <tr class="${showPrepayment ? 'prepayment-row' : ''}">
              <td>${row.month}${showPrepayment ? '*' : ''}</td>
              <td>₹${formatIndianNumber(row.emi)}</td>
              <td class="principal">₹${formatIndianNumber(row.principal)}</td>
              <td class="interest">₹${formatIndianNumber(row.interest)}</td>
              <td>₹${formatIndianNumber(row.balance)}</td>
              ${hasPrepayments ? `<td class="principal">${showPrepayment ? '₹' + formatIndianNumber(prepaymentForYear.amount) : '—'}</td>` : ''}
            </tr>
          `
            })
            .join('')}
        </table>
        ${hasPrepayments ? '<p style="font-size: 10px; color: #16a34a; margin-top: 10px;">* Prepayment applied at end of year</p>' : ''}

        <div class="footer">
          Generated by AnyCalc — Calculate everything. Plan anything.
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `EMI_Report_${principal}_${rate}pct_${tenure}yrs.html`
    link.click()
  }

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  return (
    <div className="space-y-4" ref={calculatorRef}>
      {/* Main Calculator Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Mode Toggle */}
        <div className="p-3 border-b border-slate-100 bg-slate-50">
          <div className="flex rounded-lg bg-slate-200 p-0.5">
            <button
              onClick={() => setMode('calculate')}
              className={`flex-1 px-4 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'calculate'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calculate EMI
            </button>
            <button
              onClick={() => setMode('affordability')}
              className={`flex-1 px-4 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'affordability'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Affordability
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            {mode === 'calculate'
              ? 'Calculate EMI for a given loan amount'
              : 'Find how much loan you can afford for your EMI budget'}
          </p>
        </div>

        <div className="grid md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 space-y-5 border-r border-slate-100">
            {mode === 'calculate' ? (
              /* Loan Amount - Calculate mode */
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-medium text-slate-600">Loan Amount</label>
                  <span className="font-mono text-base font-semibold text-slate-900">
                    ₹{formatIndianNumber(principal)}
                  </span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={100000000}
                  step={100000}
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>₹1L</span>
                  <span>₹10Cr</span>
                </div>
              </div>
            ) : (
              /* EMI Budget - Affordability mode */
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-medium text-slate-600">Monthly EMI Budget</label>
                  <span className="font-mono text-base font-semibold text-blue-600">
                    ₹{formatIndianNumber(emiBudget)}
                  </span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={500000}
                  step={1000}
                  value={emiBudget}
                  onChange={(e) => setEmiBudget(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>₹5K</span>
                  <span>₹5L</span>
                </div>
                {/* Quick EMI presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[25000, 50000, 75000, 100000, 150000].map((emi) => (
                    <button
                      key={emi}
                      onClick={() => setEmiBudget(emi)}
                      className={`px-2 py-1 text-[10px] rounded-full border transition-colors ${
                        emiBudget === emi
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:border-blue-300'
                      }`}
                    >
                      ₹{(emi / 1000)}K
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interest Rate */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Interest Rate</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {rate}% p.a.
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={18}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>5%</span>
                <span>18%</span>
              </div>
              {/* Loan type presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { label: 'Home', rate: 8.5, tenure: 20 },
                  { label: 'Car', rate: 9.0, tenure: 5 },
                  { label: 'Personal', rate: 12.0, tenure: 3 },
                  { label: 'Gold', rate: 8.0, tenure: 1 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => { setRate(preset.rate); setTenure(preset.tenure); }}
                    className={`px-2 py-1 text-[10px] rounded-full border transition-colors ${
                      rate === preset.rate && tenure === preset.tenure
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-slate-200 text-slate-500 hover:border-blue-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {/* Quick rate buttons */}
              <div className="flex gap-1 mt-1.5">
                {[7, 8, 9, 10, 11, 12].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRate(r)}
                    className={`flex-1 py-0.5 text-[9px] rounded transition-colors ${
                      Math.floor(rate) === r
                        ? 'bg-slate-200 text-slate-700 font-medium'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Tenure */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Loan Tenure</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {tenure} years
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={tenure}
                onChange={(e) => setTenure(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>1 yr</span>
                <span>30 yrs</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result - Mode dependent */}
            {mode === 'calculate' ? (
              <div className="bg-green-50 rounded-lg p-4 text-center mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">
                  Monthly EMI
                </div>
                <div className="font-mono text-3xl font-bold text-slate-900">
                  ₹{formatIndianNumber(result.emi)}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 rounded-lg p-4 text-center mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-1">
                  Maximum Loan You Can Afford
                </div>
                <div className="font-mono text-3xl font-bold text-slate-900">
                  ₹{formatIndianNumber(affordableLoan)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  at ₹{formatIndianNumber(emiBudget)}/month EMI
                </div>
              </div>
            )}

            {/* Secondary Results */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  {mode === 'calculate' ? 'Principal' : 'EMI Budget'}
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {mode === 'calculate' ? formatCompact(principal) : formatCompact(emiBudget)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Interest
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {formatCompact(result.totalInterest)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Total
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {formatCompact(result.totalPayment)}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-lg p-3 flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray={`${result.principalPercent} ${100 - result.principalPercent}`}
                  />
                </svg>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-sm" />
                  <span className="text-slate-600">Principal</span>
                  <span className="ml-auto font-mono font-medium">{result.principalPercent}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-blue-500 rounded-sm" />
                  <span className="text-slate-600">Interest</span>
                  <span className="ml-auto font-mono font-medium">{result.interestPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-save indicator with subtle notes */}
        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Auto-saved {lastSaved || 'just now'}
            </div>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-colors ${
                notes
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title={notes ? 'View note' : 'Add note'}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {notes ? 'Note' : 'Add note'}
            </button>
          </div>
          {showNotes && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a quick note..."
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Yearly Payment Breakdown Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span>📊</span> Yearly Payment Breakdown
        </h3>
        <div className="flex items-center gap-3 mb-3 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
          <span className="w-10">Year</span>
          <span className="flex-1">Principal & Interest Paid</span>
          <span className="w-20 text-right">Balance</span>
        </div>
        <div className="space-y-2">
          {yearlyBreakdown.map((year) => {
            const total = year.principal + year.interest
            const maxTotal = Math.max(...yearlyBreakdown.map((y) => y.principal + y.interest))
            const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0
            const principalWidth = total > 0 ? (year.principal / total) * 100 : 0

            return (
              <div key={year.year} className="flex items-center gap-3">
                <span className="text-xs w-10 font-mono text-slate-500">Y{year.year}</span>
                <div
                  className="flex-1 h-8 bg-slate-100 rounded overflow-hidden relative"
                  style={{ width: `${barWidth}%` }}
                >
                  <div
                    className="absolute left-0 top-0 h-full bg-green-500 flex items-center justify-end pr-1"
                    style={{ width: `${principalWidth}%` }}
                  >
                    {principalWidth > 20 && (
                      <span className="text-[9px] text-white font-medium">
                        {formatCompact(year.principal)}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute top-0 h-full bg-blue-500 flex items-center justify-start pl-1"
                    style={{ left: `${principalWidth}%`, width: `${100 - principalWidth}%` }}
                  >
                    {(100 - principalWidth) > 20 && (
                      <span className="text-[9px] text-white font-medium">
                        {formatCompact(year.interest)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-slate-600 w-20 text-right font-mono">
                  {formatCompact(year.balance)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-sm" />
            <span>Principal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span>Interest</span>
          </div>
          <span className="ml-auto text-slate-400">
            Total: ₹{formatIndianNumber(result.totalPayment)} over {tenure} years
          </span>
        </div>
      </div>

      {/* Prepayment Simulator */}
      <details open={showPrepayment} className="bg-white border border-slate-200 rounded-xl">
        <summary
          className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
          onClick={(e) => {
            e.preventDefault()
            setShowPrepayment(!showPrepayment)
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span>Prepayment Simulator</span>
            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">What-if analysis</span>
            {prepayments.length > 0 && (
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {prepayments.length} prepayment{prepayments.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${showPrepayment ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        {showPrepayment && (
          <div className="px-4 pb-4 pt-2">
            <p className="text-xs text-slate-500 mb-4">
              Add lumpsum payments to see how they reduce your loan tenure and save interest.
            </p>

            {/* Prepayment List */}
            <div className="space-y-3 mb-4">
              {prepayments.map((prepayment, index) => (
                <div
                  key={prepayment.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <span className="text-xs font-medium text-slate-400 w-4">#{index + 1}</span>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">Amount</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          value={prepayment.amount}
                          onChange={(e) => updatePrepayment(prepayment.id, 'amount', Number(e.target.value))}
                          className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                          min={10000}
                          step={10000}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">Year</label>
                      <select
                        value={prepayment.year}
                        onChange={(e) => updatePrepayment(prepayment.id, 'year', Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      >
                        {Array.from({ length: tenure }, (_, i) => i + 1).map((year) => (
                          <option key={year} value={year}>
                            Year {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => removePrepayment(prepayment.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Remove prepayment"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add Prepayment Button */}
            <button
              onClick={addPrepayment}
              disabled={prepayments.length >= tenure}
              className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Prepayment
            </button>

            {/* Total Prepayment Summary */}
            {prepayments.length > 0 && (
              <div className="mt-4 text-xs text-slate-500 text-center">
                Total prepayments: <span className="font-mono font-semibold text-slate-700">₹{formatIndianNumber(totalPrepaymentAmount)}</span>
              </div>
            )}

            {/* Comparison View */}
            {prepaymentResult && (
              <>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  {/* Without Prepayment */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Without Prepayment
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Tenure</span>
                        <span className="font-mono text-sm font-semibold text-slate-700">{tenure} years</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Total Interest</span>
                        <span className="font-mono text-sm font-semibold text-slate-700">{formatCompact(result.totalInterest)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Total Payment</span>
                        <span className="font-mono text-sm font-semibold text-slate-700">{formatCompact(result.totalPayment)}</span>
                      </div>
                    </div>
                  </div>

                  {/* With Prepayment */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-3">
                      With Prepayment{prepayments.length > 1 ? 's' : ''}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-700">New Tenure</span>
                        <span className="font-mono text-sm font-semibold text-green-700">
                          {Math.floor(prepaymentResult.newTenureMonths / 12)}y {prepaymentResult.newTenureMonths % 12}m
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-700">Total Interest</span>
                        <span className="font-mono text-sm font-semibold text-green-700">{formatCompact(prepaymentResult.newTotalInterest)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-700">Total Payment</span>
                        <span className="font-mono text-sm font-semibold text-green-700">{formatCompact(prepaymentResult.newTotalPayment + totalPrepaymentAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Savings Summary */}
                {prepaymentResult.interestSaved > 0 && (
                  <div className="mt-4 bg-gradient-to-r from-green-100 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">
                        You Save
                      </div>
                      <div className="flex items-center justify-center gap-6">
                        <div>
                          <div className="font-mono text-2xl font-bold text-green-700">
                            ₹{formatIndianNumber(prepaymentResult.interestSaved)}
                          </div>
                          <div className="text-[10px] text-green-600">in interest</div>
                        </div>
                        <div className="text-2xl text-green-300">+</div>
                        <div>
                          <div className="font-mono text-2xl font-bold text-green-700">
                            {Math.floor(prepaymentResult.monthsSaved / 12)}y {prepaymentResult.monthsSaved % 12}m
                          </div>
                          <div className="text-[10px] text-green-600">earlier payoff</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Yearly Breakdown with Prepayments */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-700 mb-3">
                    Yearly Breakdown with Prepayments
                  </div>
                  <div className="flex items-center gap-3 mb-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                    <span className="w-8">Year</span>
                    <span className="flex-1">Principal & Interest</span>
                    <span className="w-20 text-right">Balance</span>
                  </div>
                  <div className="space-y-2">
                    {prepaymentResult.yearlyBreakdown.map((year) => {
                      const total = year.principal + year.interest
                      const maxTotal = Math.max(...prepaymentResult.yearlyBreakdown.map((y) => y.principal + y.interest))
                      const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0
                      const principalWidth = total > 0 ? (year.principal / total) * 100 : 0
                      const hasPrepayment = prepayments.some((p) => p.year === year.year)

                      return (
                        <div key={year.year} className="flex items-center gap-3">
                          <span className={`text-xs w-8 font-mono ${hasPrepayment ? 'text-green-600 font-semibold' : 'text-slate-500'}`}>
                            Y{year.year}{hasPrepayment && '*'}
                          </span>
                          <div
                            className="flex-1 h-7 bg-slate-100 rounded overflow-hidden relative"
                            style={{ width: `${barWidth}%` }}
                          >
                            <div
                              className="absolute left-0 top-0 h-full bg-green-500 flex items-center justify-end pr-1"
                              style={{ width: `${principalWidth}%` }}
                            >
                              {principalWidth > 25 && (
                                <span className="text-[9px] text-white font-medium">
                                  {formatCompact(year.principal)}
                                </span>
                              )}
                            </div>
                            <div
                              className="absolute top-0 h-full bg-blue-500 flex items-center justify-start pl-1"
                              style={{ left: `${principalWidth}%`, width: `${100 - principalWidth}%` }}
                            >
                              {(100 - principalWidth) > 25 && (
                                <span className="text-[9px] text-white font-medium">
                                  {formatCompact(year.interest)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-600 w-20 text-right font-mono">
                            {formatCompact(year.balance)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400">* = prepayment year</span>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
                      Principal
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                      Interest
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </details>

      {/* Amortization Schedule */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Amortization Schedule</h3>
          <button
            onClick={() => setShowFullSchedule(!showFullSchedule)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {showFullSchedule ? 'Show Less' : `Show All ${schedule.length} Months`}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-500">Month</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500">EMI</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500">Principal</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500">Interest</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500">Balance</th>
                {prepayments.length > 0 && (
                  <th className="px-3 py-2 text-right font-semibold text-slate-500">Prepayment</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(showFullSchedule ? schedule : schedule.slice(0, 12)).map((row) => {
                const isYearEnd = row.month % 12 === 0
                const currentYear = Math.ceil(row.month / 12)
                const prepaymentForYear = prepayments.find((p) => p.year === currentYear)
                const showPrepaymentRow = isYearEnd && prepaymentForYear

                return (
                  <tr
                    key={row.month}
                    className={`hover:bg-slate-50 ${showPrepaymentRow ? 'bg-green-50 border-l-2 border-l-green-500' : ''}`}
                  >
                    <td className={`px-3 py-2 font-mono ${showPrepaymentRow ? 'text-green-700 font-semibold' : 'text-slate-600'}`}>
                      {row.month}
                      {showPrepaymentRow && <span className="text-green-500 ml-1">*</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-900 font-mono">
                      ₹{formatIndianNumber(row.emi)}
                    </td>
                    <td className="px-3 py-2 text-right text-green-600 font-mono">
                      ₹{formatIndianNumber(row.principal)}
                    </td>
                    <td className="px-3 py-2 text-right text-blue-600 font-mono">
                      ₹{formatIndianNumber(row.interest)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-900 font-mono">
                      ₹{formatIndianNumber(row.balance)}
                    </td>
                    {prepayments.length > 0 && (
                      <td className="px-3 py-2 text-right font-mono">
                        {showPrepaymentRow ? (
                          <span className="text-green-600 font-semibold">
                            ₹{formatIndianNumber(prepaymentForYear.amount)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {prepayments.length > 0 && (
          <div className="px-4 py-2 bg-green-50 border-t border-green-100 text-[10px] text-green-600">
            <span className="font-medium">*</span> Prepayment applied at end of year
          </div>
        )}
        {!showFullSchedule && schedule.length > 12 && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400">
              Showing first 12 of {schedule.length} months
            </span>
          </div>
        )}
      </div>

      {/* Pro Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-transparent border border-blue-100 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 mb-2">
          <span>💡</span> Pro Tips
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="flex gap-2">
            <span className="text-blue-500 font-bold">•</span>
            <span>Prepaying even 1 EMI per year can save years of interest</span>
          </div>
          <div className="flex gap-2">
            <span className="text-blue-500 font-bold">•</span>
            <span>Compare rates from multiple banks before finalizing</span>
          </div>
          <div className="flex gap-2">
            <span className="text-blue-500 font-bold">•</span>
            <span>Keep EMI below 40% of your monthly income</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About EMI Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>EMI (Equated Monthly Installment)</strong> is a fixed payment amount made by a
            borrower to a lender at a specified date each month. EMIs are used to pay off both
            principal and interest each month.
          </p>
          <p>
            <strong>Formula:</strong> EMI = [P × R × (1+R)^N] / [(1+R)^N - 1]
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>P = Principal loan amount</li>
            <li>R = Monthly interest rate (annual rate / 12 / 100)</li>
            <li>N = Number of monthly installments (years × 12)</li>
          </ul>
          <p className="text-slate-500">
            This calculator helps you understand the total cost of your loan, including the
            interest component, so you can make informed borrowing decisions.
          </p>
        </div>
      </details>
    </div>
  )
})

export default EMICalculator
