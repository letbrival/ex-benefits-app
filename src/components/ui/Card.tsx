import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  sub?: string
  accent?: boolean
}

export function StatCard({ label, value, icon, sub, accent }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${accent ? 'border-violet-200 bg-violet-50' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`mt-1 text-2xl font-semibold ${accent ? 'text-violet-700' : 'text-gray-900'}`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg ${accent ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
