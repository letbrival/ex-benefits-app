import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import type { Enterprise, Profile } from '../../types'

interface LayoutProps {
  children: ReactNode
  enterprise: Enterprise | null
  profile: Profile | null
  header?: ReactNode
}

export function Layout({ children, enterprise, profile, header }: LayoutProps) {
  return (
    <div className="flex h-screen bg-[#f5f6fa] overflow-hidden">
      <Sidebar enterprise={enterprise} profile={profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {header && (
          <div className="shrink-0 bg-white border-b border-gray-100 px-7 py-4">
            {header}
          </div>
        )}
        <main className="flex-1 overflow-y-auto px-7 py-5">
          {children}
        </main>
      </div>
    </div>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  meta?: ReactNode
}

export function PageHeader({ title, subtitle, action, meta }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {subtitle && <span className="text-sm text-gray-400">· {subtitle}</span>}
        </div>
        {meta && <div className="mt-0.5">{meta}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
