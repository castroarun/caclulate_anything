'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { Share2, Bookmark, Download } from 'lucide-react'

interface CalculatorCardProps {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  resultSlot?: ReactNode
  chartSlot?: ReactNode
  breakdownSlot?: ReactNode
  onShare?: () => void
  onSave?: () => void
  onExport?: () => void
  className?: string
}

export function CalculatorCard({
  title,
  description,
  icon,
  children,
  resultSlot,
  chartSlot,
  breakdownSlot,
  onShare,
  onSave,
  onExport,
  className,
}: CalculatorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-white dark:bg-gray-900 rounded-2xl shadow-xl',
        'border border-gray-200 dark:border-gray-800',
        'overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">{children}</div>

          {/* Result Section */}
          {resultSlot && (
            <div className="space-y-6">
              {resultSlot}
              {chartSlot}
            </div>
          )}
        </div>

        {/* Breakdown Section (Full Width) */}
        {breakdownSlot && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            {breakdownSlot}
          </div>
        )}
      </div>

      {/* Actions */}
      {(onShare || onSave || onExport) && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-end gap-2">
            {onShare && (
              <button
                onClick={onShare}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}
            {onSave && (
              <button
                onClick={onSave}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Save
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
