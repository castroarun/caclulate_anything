'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface ResultItem {
  label: string
  value: number
  formatted: string
}

interface ResultDisplayProps {
  primary: ResultItem
  secondary?: ResultItem[]
  className?: string
}

export function ResultDisplay({ primary, secondary, className }: ResultDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30',
        'rounded-2xl p-6 border border-primary-200 dark:border-primary-700',
        className
      )}
    >
      {/* Primary Result */}
      <div className="text-center mb-4">
        <p className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
          {primary.label}
        </p>
        <motion.p
          key={primary.value}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="text-4xl md:text-5xl font-bold text-primary-900 dark:text-white tabular-nums"
        >
          {primary.formatted}
        </motion.p>
      </div>

      {/* Secondary Results */}
      {secondary && secondary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-primary-200 dark:border-primary-700">
          {secondary.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {item.label}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                {item.formatted}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// Compact version for smaller spaces
export function ResultDisplayCompact({ primary, secondary, className }: ResultDisplayProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {primary.label}
        </span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
          {primary.formatted}
        </span>
      </div>

      {secondary && secondary.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          {secondary.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.label}
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                {item.formatted}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
