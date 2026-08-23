import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from './context/AuthContext'
import { AppLayout } from './layouts/AppLayout'
import { AssistantPage } from './pages/AssistantPage'
import { DashboardPage } from './pages/DashboardPage'
import { InsightsPage } from './pages/InsightsPage'
import { KnowledgeBasePage } from './pages/KnowledgeBasePage'
import { LoginPage } from './pages/LoginPage'
import { ParameterConfigPage } from './pages/ParameterConfigPage'
import { PredictionsPage } from './pages/PredictionsPage'
import { ProcessMonitorPage } from './pages/ProcessMonitorPage'
import { RecommendationsPage } from './pages/RecommendationsPage'
import { SettingsPage } from './pages/SettingsPage'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/monitor" element={<ProcessMonitorPage />} />
          <Route path="/parameters" element={<ParameterConfigPage />} />
          <Route path="/predictions" element={<PredictionsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
