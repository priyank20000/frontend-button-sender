import React, { useState } from 'react'
import { Form, Input, Typography, message } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StyledButton from '../components/common/StyledButton'
import api from '../services/api'

const { Title, Text } = Typography

const Login = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = async (values) => {
    setLoading(true)
    try {
      console.log('Attempting login with:', values.email)
      
      const response = await api.post('/user/login', values)
      console.log('Login response:', response.data)
      
      if (response.data.success && response.data.token) {
        login(response.data.token, response.data.user)
        message.success('Login successful!')
        navigate('/dashboard')
      } else {
        message.error(response.data.message || 'Login failed. Please check your credentials.')
      }
    } catch (error) {
      console.error('Login error:', error)
      
      if (error.response?.status === 401) {
        message.error('Invalid email or password')
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message)
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        message.error('Network error. Please check your connection and try again.')
      } else {
        message.error('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid #333333',
        borderRadius: '8px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '28px' }}>
            Welcome
          </Title>
          <Text style={{ color: '#888888', fontSize: '14px' }}>
            Login to your account
          </Text>
        </div>

        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            label={<span style={{ color: '#ffffff', fontSize: '14px' }}>Email</span>}
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
            style={{ textAlign: 'left', marginBottom: '20px' }}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#666666' }} />}
              placeholder="Enter your email"
              style={{
                background: '#2a2a2a',
                border: '1px solid #404040',
                color: '#ffffff',
                height: '48px',
                borderRadius: '6px'
              }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: '#ffffff', fontSize: '14px' }}>Password</span>}
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
            style={{ textAlign: 'left', marginBottom: '32px' }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#666666' }} />}
              placeholder="Enter your password"
              style={{
                background: '#2a2a2a',
                border: '1px solid #404040',
                color: '#ffffff',
                height: '48px',
                borderRadius: '6px'
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <StyledButton
              variant="ghost"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </StyledButton>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

export default Login