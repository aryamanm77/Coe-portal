import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ToastProvider } from './components/ui/Toast'
import { ActivityLogPage } from './features/activity/ActivityLogPage'
import { AuthProvider } from './features/auth/AuthContext'
import { LoginPage } from './features/auth/LoginPage'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { KeyApprovalsPage } from './features/approvals/KeyApprovalsPage'
import { FileTransferPage } from './features/transfer/FileTransferPage'
import { ResultsPage } from './features/results/ResultsPage'
import { SchedulePage } from './features/schedule/SchedulePage'
import { AppProvider } from './store/AppStore'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/schedule-exam" element={<SchedulePage />} />
                  <Route path="/file-transfer" element={<FileTransferPage />} />
                  <Route path="/key-approvals" element={<KeyApprovalsPage />} />
                  <Route path="/results" element={<ResultsPage />} />
                  <Route path="/activity-log" element={<ActivityLogPage />} />
                </Route>
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
