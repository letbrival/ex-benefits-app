export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'treasury_manager' | 'beneficiary'
  wallet_address: string | null
  wallet_type: 'external' | 'managed' | null
  created_at: string
}

export interface Enterprise {
  id: string
  enterprise_id: string
  name: string
  pda_address: string | null
  admin_authority: string
  treasury_authority: string
  settlement_mint: string
  status: 'active' | 'paused'
  created_by: string
  created_at: string
}

export interface BenefitPlan {
  id: string
  enterprise_id: string
  plan_id: string
  pda_address: string | null
  name: string
  vesting_type: 'linear' | 'accelerated'
  duration_seconds: number
  early_settlement: boolean
  revocable: boolean
  eligible_types: number[]
  status: 'inactive' | 'active' | 'deactivated'
  created_by: string
  created_at: string
}

export interface Beneficiary {
  id: string
  enterprise_id: string
  user_id: string | null
  full_name: string
  email: string | null
  beneficiary_type: 0 | 1 | 2 | 3 | 4
  wallet_address: string
  wallet_type: 'external' | 'managed'
  created_at: string
}

export interface Position {
  id: string
  enterprise_id: string
  plan_id: string
  beneficiary_id: string
  grant_id: string
  pda_address: string | null
  vault_address: string | null
  principal: string
  funded_amount: string
  claimed_amount: string
  vesting_start: string
  status: 'created' | 'funded' | 'active' | 'claimed' | 'settled' | 'revoked' | 'closed'
  beneficiary_type: number
  created_by: string
  created_at: string
  // joined
  benefit_plans?: BenefitPlan
  beneficiaries?: Beneficiary
}

export interface Transaction {
  id: string
  enterprise_id: string
  action: string
  signature: string | null
  status: 'pending' | 'confirmed' | 'failed'
  related_entity_id: string | null
  related_entity_type: string | null
  metadata: Record<string, unknown> | null
  created_by: string
  created_at: string
}

export const BENEFICIARY_TYPE_LABELS: Record<number, string> = {
  0: 'Employee',
  1: 'Client',
  2: 'Contractor',
  3: 'Partner',
  4: 'Other',
}

export const POSITION_STATUS_COLORS: Record<string, string> = {
  created: 'bg-gray-100 text-gray-700',
  funded: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  claimed: 'bg-purple-100 text-purple-700',
  settled: 'bg-amber-100 text-amber-700',
  revoked: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-500',
}

export const PLAN_STATUS_COLORS: Record<string, string> = {
  inactive: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  deactivated: 'bg-red-100 text-red-700',
}
