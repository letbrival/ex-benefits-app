import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useEnterprise } from './hooks/useEnterprise'

import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Register from './pages/auth/Register'
import WalletConnect from './pages/auth/WalletConnect'
import EnterpriseSetup from './pages/enterprise/EnterpriseSetup'
import Dashboard from './pages/enterprise/Dashboard'
import Governance from './pages/enterprise/Governance'
import PlansList from './pages/plans/PlansList'
import PlanCreate from './pages/plans/PlanCreate'
import PlanDetail from './pages/plans/PlanDetail'
import BeneficiariesList from './pages/beneficiaries/BeneficiariesList'
import AddBeneficiary from './pages/beneficiaries/AddBeneficiary'
import PositionsList from './pages/positions/PositionsList'
import PositionCreate from './pages/positions/PositionCreate'
import PositionDetail from './pages/positions/PositionDetail'
import BeneficiaryPortal from './pages/portal/BeneficiaryPortal'
import Treasury from './pages/treasury/Treasury'
import Settings from './pages/settings/Settings'

export default function App() {
  const { user, profile, loading } = useAuth()
  const { enterprise, loading: entLoading, selectEnterprise, refresh } = useEnterprise()

  if (loading || entLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  if (!profile?.wallet_address) {
    return (
      <Routes>
        <Route path="/wallet-connect" element={<WalletConnect profile={profile!} />} />
        <Route path="*" element={<Navigate to="/wallet-connect" replace />} />
      </Routes>
    )
  }

  if (!enterprise) {
    return (
      <Routes>
        <Route path="/setup" element={<EnterpriseSetup profile={profile!} onCreated={selectEnterprise} />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )
  }

  const props = { enterprise, profile: profile! }
  const adminProps = { ...props, onRefresh: refresh }

  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard {...props} />} />
      <Route path="/plans" element={<PlansList {...props} />} />
      <Route path="/plans/create" element={profile!.role === 'beneficiary' ? <Navigate to="/plans" replace /> : <PlanCreate {...adminProps} />} />
      <Route path="/plans/:id" element={<PlanDetail {...adminProps} />} />
      <Route path="/beneficiaries" element={<BeneficiariesList {...props} />} />
      <Route path="/beneficiaries/add" element={profile!.role === 'beneficiary' ? <Navigate to="/beneficiaries" replace /> : <AddBeneficiary {...props} />} />
      <Route path="/positions" element={<PositionsList {...props} />} />
      <Route path="/positions/create" element={profile!.role === 'beneficiary' ? <Navigate to="/positions" replace /> : <PositionCreate {...adminProps} />} />
      <Route path="/positions/:id" element={<PositionDetail {...adminProps} />} />
      <Route path="/portal" element={<BeneficiaryPortal {...props} />} />
      <Route path="/treasury" element={<Treasury {...props} />} />
      <Route path="/governance" element={<Governance {...adminProps} />} />
      <Route path="/settings" element={<Settings profile={profile!} />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
