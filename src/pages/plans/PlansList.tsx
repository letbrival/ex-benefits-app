import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Layout, PageHeader } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { BENEFICIARY_TYPE_LABELS, PLAN_STATUS_COLORS, type BenefitPlan, type Enterprise, type Profile } from '../../types'

interface Props { enterprise: Enterprise; profile: Profile }

export default function PlansList({ enterprise, profile }: Props) {
  const [plans, setPlans] = useState<BenefitPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('benefit_plans').select('*').eq('enterprise_id', enterprise.id).order('created_at', { ascending: false })
      .then(({ data }) => { setPlans(data ?? []); setLoading(false) })
  }, [enterprise.id])

  const fmtDuration = (secs: number) => {
    const days = Math.round(secs / 86400)
    if (days >= 365) return `${(days / 365).toFixed(1)}y`
    if (days >= 30) return `${Math.round(days / 30)}mo`
    return `${days}d`
  }

  return (
    <Layout
      enterprise={enterprise}
      profile={profile}
      header={
        <PageHeader
          title="Benefit Plans"
          subtitle={`${plans.length} plans`}
          action={
            profile.role !== 'beneficiary' && (
              <Link to="/plans/create">
                <Button size="sm"><Plus size={14} /> Create Plan</Button>
              </Link>
            )
          }
        />
      }
    >
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 mb-4">No plans yet.{profile.role !== 'beneficiary' && ' Create your first benefit plan.'}</p>
          {profile.role !== 'beneficiary' && <Link to="/plans/create"><Button size="sm"><Plus size={14} /> Create Plan</Button></Link>}
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map(plan => (
            <Link
              key={plan.id}
              to={`/plans/${plan.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-violet-200 hover:shadow transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-gray-900">{plan.name}</p>
                  <Badge className={PLAN_STATUS_COLORS[plan.status]} dot>{plan.status}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="capitalize">{plan.vesting_type} vesting</span>
                  <span>·</span>
                  <span>{fmtDuration(plan.duration_seconds)}</span>
                  <span>·</span>
                  <span>{plan.eligible_types.map(t => BENEFICIARY_TYPE_LABELS[t]).join(', ')}</span>
                  {plan.early_settlement && <><span>·</span><span className="text-violet-500">Early settlement</span></>}
                  {plan.revocable && <><span>·</span><span className="text-amber-500">Revocable</span></>}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-violet-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </Layout>
  )
}
