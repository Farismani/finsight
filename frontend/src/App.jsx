import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from './components/AppLayout'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPolicyPage from './pages/AdminPolicyPage'
import AIInsightsPage from './pages/AIInsightsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import BillingInsightsPage from './pages/BillingInsightsPage'
import ClaimsPage from './pages/ClaimsPage'
import DashboardPage from './pages/DashboardPage'
import FinSightCyclePage from './pages/FinSightCyclePage'
import SubmitClaimPage from './pages/SubmitClaimPage'

function ShellRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/submit-claim" element={<SubmitClaimPage />} />
        <Route path="/claims" element={<ClaimsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/ai-insights" element={<AIInsightsPage />} />
        <Route path="/billing-insights" element={<BillingInsightsPage />} />
        <Route path="/finsight-cycle" element={<FinSightCyclePage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/policy" element={<AdminPolicyPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return <ShellRoutes />
}
