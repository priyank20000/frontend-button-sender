import React, { useState, useEffect } from 'react'
import { Input, Typography, message } from 'antd'
import { MailOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

const { Title, Text } = Typography

const Login = () => {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()

  useEffect(() => {
    if (localStorage.getItem('token') && isAuthenticated) {
      navigate('/dashboard')
    }
  }, [navigate, isAuthenticated])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post('/user/login', { email, password })

      if (response.data.success) {
        const token = response.data.token
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        login(token, response.data.user)
        toast.success('Login Successful!')
        setTimeout(() => navigate('/dashboard'), 100)
      } else {
        setError(response.data.message || 'Failed to login. Please check your credentials.')
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password')
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('Failed to login. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Brand */}
        <div className="brand">
          <div className="brand-icon">
            <LoginOutlined />
          </div>
          <Title level={1} className="brand-title">Welcome Back</Title>
          <Text className="brand-subtitle">Sign in to continue</Text>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="form">
          <div className="field">
            <label>Email</label>
            <div className="input-wrap">
              <MailOutlined className="icon" />
              <Input
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Password</label>
            <div className="input-wrap">
              <LockOutlined className="icon" />
              <Input.Password
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="error">
              <span className="dot"></span>
              <Text>{error}</Text>
            </div>
          )}

          <button type="submit" disabled={loading} className={`btn ${loading ? 'loading' : ''}`}>
            {loading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : (
              <>
                <LoginOutlined />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="footer">
          <Text>Secure login with encryption</Text>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
        }

        .login-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 25% 25%, rgba(74, 158, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(74, 158, 255, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 40px;
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid #333;
          border-radius: 16px;
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(74, 158, 255, 0.1);
          backdrop-filter: blur(10px);
          position: relative;
          z-index: 1;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .brand {
          text-align: center;
          margin-bottom: 32px;
        }

        .brand-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #4a9eff, #69c0ff);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 8px 24px rgba(74, 158, 255, 0.3);
          font-size: 24px;
          color: white;
        }

        .brand-title {
          font-size: 24px !important;
          font-weight: 700 !important;
          color: #fff !important;
          margin: 0 0 4px 0 !important;
          background: linear-gradient(135deg, #fff, #e0e0e0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .brand-subtitle {
          color: #888 !important;
          font-size: 14px !important;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field label {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
        }

        .input-wrap {
          position: relative;
        }

        .icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
          color: #4a9eff;
          z-index: 2;
        }

        .field :global(.ant-input),
        .field :global(.ant-input-password) {
          padding-left: 44px !important;
          background: rgba(26, 26, 26, 0.8) !important;
          border: 1px solid #333 !important;
          color: #fff !important;
          height: 48px !important;
          border-radius: 10px !important;
          font-size: 15px !important;
          transition: all 0.3s ease !important;
        }

        .field :global(.ant-input:focus),
        .field :global(.ant-input-password:focus),
        .field :global(.ant-input-password .ant-input:focus) {
          border-color: #4a9eff !important;
          box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1) !important;
        }

        .field :global(.ant-input::placeholder) {
          color: #666 !important;
        }

        .error {
          padding: 10px 14px;
          background: rgba(255, 68, 79, 0.1);
          border: 1px solid rgba(255, 68, 79, 0.3);
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #ff444f;
        }

        .error :global(span) {
          color: #ff444f !important;
          font-size: 13px !important;
          margin: 0 !important;
        }

        .btn {
          width: 100%;
          height: 48px;
          background: linear-gradient(135deg, #4a9eff, #69c0ff);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(74, 158, 255, 0.3);
        }

        .btn:hover:not(.loading) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(74, 158, 255, 0.4);
        }

        .btn:active:not(.loading) {
          transform: translateY(0);
        }

        .btn.loading {
          background: rgba(74, 158, 255, 0.5);
          cursor: not-allowed;
          box-shadow: none;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .footer {
          text-align: center;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #333;
        }

        .footer :global(span) {
          color: #666 !important;
          font-size: 12px !important;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 24px;
            margin: 16px;
          }
          
          .brand-title {
            font-size: 22px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Login