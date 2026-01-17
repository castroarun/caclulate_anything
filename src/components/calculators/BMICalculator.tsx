'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface BMIResult {
  bmi: number
  category: string
  categoryColor: string
  healthRisk: string
  idealWeightMin: number
  idealWeightMax: number
}

interface TargetPlan {
  targetBMI: number
  targetWeight: number
  weightChange: number
  direction: 'lose' | 'gain' | 'maintain'
  weeklyChange: number
  estimatedWeeks: number
}

// BMI Categories
const BMI_CATEGORIES = [
  { min: 0, max: 16, label: 'Severe Thinness', color: 'text-red-600', bgColor: 'bg-red-100', risk: 'Very High' },
  { min: 16, max: 17, label: 'Moderate Thinness', color: 'text-orange-600', bgColor: 'bg-orange-100', risk: 'High' },
  { min: 17, max: 18.5, label: 'Mild Thinness', color: 'text-yellow-600', bgColor: 'bg-yellow-100', risk: 'Moderate' },
  { min: 18.5, max: 25, label: 'Normal', color: 'text-green-600', bgColor: 'bg-green-100', risk: 'Low' },
  { min: 25, max: 30, label: 'Overweight', color: 'text-yellow-600', bgColor: 'bg-yellow-100', risk: 'Moderate' },
  { min: 30, max: 35, label: 'Obese Class I', color: 'text-orange-600', bgColor: 'bg-orange-100', risk: 'High' },
  { min: 35, max: 40, label: 'Obese Class II', color: 'text-red-500', bgColor: 'bg-red-100', risk: 'Very High' },
  { min: 40, max: 100, label: 'Obese Class III', color: 'text-red-700', bgColor: 'bg-red-200', risk: 'Extremely High' },
]

function getBMICategory(bmi: number) {
  const category = BMI_CATEGORIES.find(c => bmi >= c.min && bmi < c.max) || BMI_CATEGORIES[BMI_CATEGORIES.length - 1]
  return category
}

function calculateBMI(weightKg: number, heightCm: number, age: number, gender: 'male' | 'female'): BMIResult {
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  const category = getBMICategory(bmi)

  // Adjusted ideal BMI ranges based on age and gender
  // - Seniors (65+): 23-28 is considered optimal (slightly higher due to sarcopenia risk)
  // - Women: Slightly lower ideal range (19-24)
  // - Men: Standard range (20-25)
  let idealBMIMin = 18.5
  let idealBMIMax = 25

  if (age >= 65) {
    // For seniors, a slightly higher BMI is associated with better health outcomes
    idealBMIMin = 23
    idealBMIMax = 28
  } else if (gender === 'female') {
    // Women typically have higher body fat percentage, slightly lower BMI range
    idealBMIMin = 19
    idealBMIMax = 24
  } else {
    // Men - standard healthy range slightly adjusted
    idealBMIMin = 20
    idealBMIMax = 25
  }

  // Calculate ideal weight range based on adjusted BMI
  const idealWeightMin = idealBMIMin * heightM * heightM
  const idealWeightMax = idealBMIMax * heightM * heightM

  // Adjust health risk interpretation for seniors
  let healthRisk = category.risk
  if (age >= 65 && bmi >= 25 && bmi < 28) {
    healthRisk = 'Low' // For seniors, overweight category has lower risk
  }

  return {
    bmi: Math.round(bmi * 10) / 10,
    category: category.label,
    categoryColor: category.color,
    healthRisk,
    idealWeightMin: Math.round(idealWeightMin * 10) / 10,
    idealWeightMax: Math.round(idealWeightMax * 10) / 10,
  }
}

function calculateTargetPlan(
  currentWeight: number,
  heightCm: number,
  targetBMI: number,
  weeklyChangeRate: number = 0.5
): TargetPlan {
  const heightM = heightCm / 100
  const targetWeight = targetBMI * heightM * heightM
  const weightChange = Math.abs(targetWeight - currentWeight)
  const direction = targetWeight < currentWeight ? 'lose' : targetWeight > currentWeight ? 'gain' : 'maintain'
  const estimatedWeeks = weightChange / weeklyChangeRate

  return {
    targetBMI,
    targetWeight: Math.round(targetWeight * 10) / 10,
    weightChange: Math.round(weightChange * 10) / 10,
    direction,
    weeklyChange: weeklyChangeRate,
    estimatedWeeks: Math.ceil(estimatedWeeks),
  }
}

export interface BMICalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const BMICalculator = forwardRef<BMICalculatorRef>(function BMICalculator(props, ref) {
  const [weight, setWeight] = useState(70)
  const [heightCm, setHeightCm] = useState(170)
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm')
  const [heightFeet, setHeightFeet] = useState(5)
  const [heightInches, setHeightInches] = useState(7)
  const [age, setAge] = useState(30)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [showTargetPlanner, setShowTargetPlanner] = useState(false)
  const [targetBMI, setTargetBMI] = useState(22)
  const [weeklyChangeRate, setWeeklyChangeRate] = useState(0.5)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Convert feet/inches to cm when unit changes
  useEffect(() => {
    if (heightUnit === 'ft') {
      const totalInches = heightFeet * 12 + heightInches
      setHeightCm(Math.round(totalInches * 2.54))
    }
  }, [heightFeet, heightInches, heightUnit])

  // Convert cm to feet/inches when switching to ft
  useEffect(() => {
    if (heightUnit === 'ft') {
      const totalInches = heightCm / 2.54
      setHeightFeet(Math.floor(totalInches / 12))
      setHeightInches(Math.round(totalInches % 12))
    }
  }, [heightUnit])

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_bmi')
    if (saved) {
      const data = JSON.parse(saved)
      setWeight(data.weight || 70)
      setHeightCm(data.heightCm || 170)
      setHeightUnit(data.heightUnit || 'cm')
      setHeightFeet(data.heightFeet || 5)
      setHeightInches(data.heightInches || 7)
      setAge(data.age || 30)
      setGender(data.gender || 'male')
      setTargetBMI(data.targetBMI || 22)
      setWeeklyChangeRate(data.weeklyChangeRate || 0.5)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { weight, heightCm, heightUnit, heightFeet, heightInches, age, gender, targetBMI, weeklyChangeRate, notes }
    localStorage.setItem('calc_bmi', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [weight, heightCm, heightUnit, heightFeet, heightInches, age, gender, targetBMI, weeklyChangeRate, notes, isLoaded])

  const result = useMemo(() => calculateBMI(weight, heightCm, age, gender), [weight, heightCm, age, gender])
  const targetPlan = useMemo(() => calculateTargetPlan(weight, heightCm, targetBMI, weeklyChangeRate), [weight, heightCm, targetBMI, weeklyChangeRate])

  const handleClear = () => {
    setWeight(70)
    setHeightCm(170)
    setHeightUnit('cm')
    setHeightFeet(5)
    setHeightInches(7)
    setAge(30)
    setGender('male')
    setTargetBMI(22)
    setWeeklyChangeRate(0.5)
    setNotes('')
    localStorage.removeItem('calc_bmi')
  }

  const exportToPDF = () => {
    const content = `
      <html>
      <head>
        <title>BMI Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          .section { margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .label { color: #64748b; font-size: 12px; }
          .value { font-size: 18px; font-weight: bold; color: #1e293b; }
          .category { padding: 10px 20px; border-radius: 8px; display: inline-block; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>BMI Health Report</h1>
        <div class="section">
          <div class="grid">
            <div><span class="label">Weight</span><div class="value">${weight} kg</div></div>
            <div><span class="label">Height</span><div class="value">${heightCm} cm</div></div>
            <div><span class="label">Age</span><div class="value">${age} years</div></div>
            <div><span class="label">Gender</span><div class="value">${gender === 'male' ? 'Male' : 'Female'}</div></div>
          </div>
        </div>
        <div class="section">
          <h2>Your BMI: ${result.bmi}</h2>
          <p class="category" style="background: ${result.categoryColor.includes('green') ? '#dcfce7' : result.categoryColor.includes('yellow') ? '#fef9c3' : result.categoryColor.includes('orange') ? '#fed7aa' : '#fecaca'}">
            ${result.category}
          </p>
          <p><strong>Health Risk:</strong> ${result.healthRisk}</p>
          <p><strong>Ideal Weight Range:</strong> ${result.idealWeightMin} - ${result.idealWeightMax} kg</p>
        </div>
        ${showTargetPlanner ? `
        <div class="section">
          <h2>Target Plan</h2>
          <p><strong>Target BMI:</strong> ${targetBMI}</p>
          <p><strong>Target Weight:</strong> ${targetPlan.targetWeight} kg</p>
          <p><strong>Weight to ${targetPlan.direction}:</strong> ${targetPlan.weightChange} kg</p>
          <p><strong>Estimated Time:</strong> ${targetPlan.estimatedWeeks} weeks at ${weeklyChangeRate} kg/week</p>
        </div>
        ` : ''}
        ${notes ? `<div class="section"><h3>Notes</h3><p>${notes}</p></div>` : ''}
        <div class="footer">
          Generated by AnyCalc — Calculate everything. Plan anything.
        </div>
      </body>
      </html>
    `
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bmi-report.html'
    a.click()
  }

  const exportToHTML = () => {
    exportToPDF()
  }

  const exportToExcel = () => {
    const csv = `BMI Health Report
Generated on,${new Date().toLocaleDateString()}

PERSONAL DETAILS
Weight (kg),${weight}
Height (cm),${heightCm}
Age,${age}
Gender,${gender}

BMI RESULTS
BMI,${result.bmi}
Category,${result.category}
Health Risk,${result.healthRisk}
Ideal Weight Range,${result.idealWeightMin} - ${result.idealWeightMax} kg

${showTargetPlanner ? `TARGET PLAN
Target BMI,${targetBMI}
Target Weight (kg),${targetPlan.targetWeight}
Weight Change (kg),${targetPlan.weightChange}
Direction,${targetPlan.direction}
Estimated Weeks,${targetPlan.estimatedWeeks}` : ''}

${notes ? `NOTES
${notes}` : ''}

Generated by AnyCalc`

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bmi-report.csv'
    a.click()
  }

  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  // BMI Scale visualization
  const bmiPosition = Math.min(Math.max((result.bmi - 15) / 30 * 100, 0), 100)

  return (
    <div ref={calculatorRef} className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Your Details</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Weight */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full px-3 py-2 text-lg font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              min="20"
              max="300"
            />
            <input
              type="range"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full mt-2 accent-pink-500"
              min="30"
              max="200"
            />
          </div>

          {/* Height */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-500">Height</label>
              <div className="flex items-center bg-slate-100 rounded p-0.5 text-xs">
                <button
                  onClick={() => setHeightUnit('cm')}
                  className={`px-2 py-0.5 rounded transition-all ${heightUnit === 'cm' ? 'bg-white shadow text-pink-600' : 'text-slate-500'}`}
                >
                  cm
                </button>
                <button
                  onClick={() => setHeightUnit('ft')}
                  className={`px-2 py-0.5 rounded transition-all ${heightUnit === 'ft' ? 'bg-white shadow text-pink-600' : 'text-slate-500'}`}
                >
                  ft
                </button>
              </div>
            </div>
            {heightUnit === 'cm' ? (
              <>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full px-3 py-2 text-lg font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  min="100"
                  max="250"
                />
                <input
                  type="range"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full mt-2 accent-pink-500"
                  min="120"
                  max="220"
                />
              </>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(Number(e.target.value))}
                    className="w-full px-3 py-2 text-lg font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    min="3"
                    max="8"
                  />
                  <span className="text-xs text-slate-400 mt-1 block text-center">feet</span>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={heightInches}
                    onChange={(e) => setHeightInches(Number(e.target.value))}
                    className="w-full px-3 py-2 text-lg font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    min="0"
                    max="11"
                  />
                  <span className="text-xs text-slate-400 mt-1 block text-center">inches</span>
                </div>
              </div>
            )}
          </div>

          {/* Age */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Age (years)</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full px-3 py-2 text-lg font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              min="10"
              max="100"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                  gender === 'male'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg mr-1">👨</span> Male
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                  gender === 'female'
                    ? 'bg-pink-50 border-pink-300 text-pink-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg mr-1">👩</span> Female
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BMI Result Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="text-center mb-6">
          <div className="text-sm text-slate-500 mb-1">Your BMI</div>
          <div className={`text-5xl font-bold ${result.categoryColor}`}>{result.bmi}</div>
          <div className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-medium ${getBMICategory(result.bmi).bgColor} ${result.categoryColor}`}>
            {result.category}
          </div>
        </div>

        {/* BMI Scale */}
        <div className="relative h-8 bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-yellow-400 to-red-500 rounded-full mb-2">
          {/* Ideal BMI marker (22) */}
          <div
            className="absolute top-0 w-0.5 h-8 bg-green-800/70 transform -translate-x-1/2"
            style={{ left: `${((22 - 15) / 30) * 100}%` }}
          >
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-green-700 whitespace-nowrap">
              Ideal
            </div>
          </div>
          {/* User's BMI marker */}
          <div
            className="absolute top-0 w-1 h-8 bg-slate-900 rounded-full transform -translate-x-1/2 transition-all duration-300"
            style={{ left: `${bmiPosition}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-0.5 rounded">
              {result.bmi}
            </div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-4">
          <span>15</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>35</span>
          <span>40+</span>
        </div>

        {/* Health Info */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">Health Risk</div>
            <div className={`text-lg font-semibold ${result.categoryColor}`}>{result.healthRisk}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">Ideal Weight Range</div>
            <div className="text-lg font-semibold text-slate-700">{result.idealWeightMin} - {result.idealWeightMax} kg</div>
          </div>
        </div>

        {/* Age/Gender adjustment note */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-[10px] text-blue-600">
            <span className="font-semibold">Note:</span> Ideal weight range adjusted for {gender === 'female' ? 'women' : 'men'}
            {age >= 65 && ' aged 65+'}.
            {age >= 65
              ? ' For seniors, a slightly higher BMI (23-28) is associated with better health outcomes.'
              : gender === 'female'
                ? ' Women typically have higher body fat %, so ideal BMI range is 19-24.'
                : ' Standard healthy BMI range for adult men is 20-25.'}
          </div>
        </div>
      </div>

      {/* Target Planner Toggle */}
      <button
        onClick={() => setShowTargetPlanner(!showTargetPlanner)}
        className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
      >
        <span>🎯</span>
        {showTargetPlanner ? 'Hide Target Planner' : 'Plan Your Target BMI'}
      </button>

      {/* Target Planner */}
      {showTargetPlanner && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span>🎯</span> Target BMI Planner
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Target BMI</label>
              <input
                type="number"
                value={targetBMI}
                onChange={(e) => setTargetBMI(Number(e.target.value))}
                className="w-full px-3 py-2 text-lg font-semibold border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                min="15"
                max="40"
                step="0.5"
              />
              <input
                type="range"
                value={targetBMI}
                onChange={(e) => setTargetBMI(Number(e.target.value))}
                className="w-full mt-2 accent-pink-500"
                min="15"
                max="35"
                step="0.5"
              />
              <div className="text-xs text-slate-500 mt-1">Healthy range: 18.5 - 25</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Weekly Change Rate (kg/week)</label>
              <select
                value={weeklyChangeRate}
                onChange={(e) => setWeeklyChangeRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-lg font-semibold border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="0.25">0.25 kg (Slow & Steady)</option>
                <option value="0.5">0.5 kg (Recommended)</option>
                <option value="0.75">0.75 kg (Moderate)</option>
                <option value="1">1 kg (Aggressive)</option>
              </select>
              <div className="text-xs text-slate-500 mt-2">
                Safe rate: 0.5-1 kg/week
              </div>
            </div>
          </div>

          {/* Target Plan Results */}
          <div className="bg-white rounded-lg p-4 border border-pink-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-500">Target Weight</div>
                <div className="text-2xl font-bold text-pink-600">{targetPlan.targetWeight} kg</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Weight to {targetPlan.direction}</div>
                <div className={`text-2xl font-bold ${targetPlan.direction === 'lose' ? 'text-orange-500' : targetPlan.direction === 'gain' ? 'text-blue-500' : 'text-green-500'}`}>
                  {targetPlan.direction === 'maintain' ? '0' : `${targetPlan.weightChange}`} kg
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Estimated Time</div>
                <div className="text-2xl font-bold text-purple-600">
                  {targetPlan.direction === 'maintain' ? '—' : `${targetPlan.estimatedWeeks} weeks`}
                </div>
              </div>
            </div>

            {targetPlan.direction !== 'maintain' && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">
                  <strong>Your Plan:</strong> {targetPlan.direction === 'lose' ? 'Lose' : 'Gain'} {targetPlan.weightChange} kg over ~{targetPlan.estimatedWeeks} weeks
                  ({Math.round(targetPlan.estimatedWeeks / 4)} months) at {weeklyChangeRate} kg/week
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  💡 {targetPlan.direction === 'lose'
                    ? 'Create a daily deficit of ~500 calories through diet and exercise'
                    : 'Create a daily surplus of ~300-500 calories with strength training'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-slate-600">📝 Notes</span>
          <span className="text-slate-400">{showNotes ? '−' : '+'}</span>
        </button>
        {showNotes && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add personal notes, health goals, reminders..."
            className="mt-3 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-pink-500"
            rows={3}
          />
        )}
      </div>

      {/* Auto-save indicator */}
      {lastSaved && (
        <div className="text-center text-xs text-slate-400">
          Auto-saved at {lastSaved}
        </div>
      )}
    </div>
  )
})

export default BMICalculator
