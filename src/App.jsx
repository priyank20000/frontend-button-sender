import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Connection from './pages/Connection'
import Templates from './pages/Templates'
import Campaign from './pages/Campaign'
import CampaignFinal from './pages/CampaignFinal'
import Messaging from './pages/Messaging'
import Sidebar from './components/Sidebar'
import LoadingSpinner from './components/common/LoadingSpinner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

const { Content } = Layout

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, isInitialized } = useAuth()
  
  // Show loading spinner while initializing auth
  if (!isInitialized || loading) {
    return (
      <LoadingSpinner 
        message="Loading..." 
        style={{ minHeight: '100vh', background: '#000000' }}
      />
    )
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, isInitialized } = useAuth()
  
  // Show loading spinner while initializing auth
  if (!isInitialized || loading) {
    return (
      <LoadingSpinner 
        message="Loading..." 
        style={{ minHeight: '100vh', background: '#000000' }}
      />
    )
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

const AppLayout = ({ children }) => {
  const { isAuthenticated, loading, isInitialized } = useAuth()
  
  // Show loading spinner while initializing auth
  if (!isInitialized || loading) {
    return (
      <LoadingSpinner 
        message="Initializing..." 
        style={{ minHeight: '100vh', background: '#000000' }}
      />
    )
  }
  
  if (!isAuthenticated) {
    return children
  }

  return (
    <Layout>
      <Sidebar />
      <Layout>
        <Content style={{ padding: '24px', background: '#000000' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppLayout>
            <Routes>
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/connection" 
                element={
                  <ProtectedRoute>
                    <Connection />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/templates" 
                element={
                  <ProtectedRoute>
                    <Templates />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/campaign" 
                element={
                  <ProtectedRoute>
                    <Campaign />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/messaging" 
                element={
                  <ProtectedRoute>
                    <Messaging />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/campaign/final/:id" 
                element={
                  <ProtectedRoute>
                    <CampaignFinal />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppLayout>
        </Router>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App