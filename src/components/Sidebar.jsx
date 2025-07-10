import React from 'react'
import { Layout, Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  ApiOutlined,
  MessageOutlined,
  FileTextOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const { Sider } = Layout

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/connection',
      icon: <ApiOutlined />,
      label: 'Connection',
    },
    {
      key: '/campaign',
      icon: <MessageOutlined />,
      label: 'Campaign',
    },
    {
      key: '/messaging',
      icon: <MessageOutlined />,
      label: 'Messaging',
    },
    {
      key: '/templates',
      icon: <FileTextOutlined />,
      label: 'Templates',
    },
  ]

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout()
      navigate('/login')
    } else {
      navigate(key)
    }
  }

  return (
    <Sider
      width={200}
      style={{
        background: '#000000',
        borderRight: '1px solid #1a1a1a',
        height: '100vh'
      }}
    >
      <div style={{ 
        padding: '24px 16px', 
        borderBottom: '1px solid #1a1a1a',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DashboardOutlined style={{ color: '#ffffff', fontSize: '20px' }} />
          <h3 style={{ color: '#ffffff', margin: 0, fontSize: '16px' }}>
            Dashboard
          </h3>
        </div>
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        onClick={handleMenuClick}
        style={{ 
          background: '#000000',
          border: 'none',
          paddingTop: '16px'
        }}
        items={menuItems.map(item => ({
          ...item,
          style: {
            color: location.pathname === item.key ? '#ffffff' : '#888888',
            backgroundColor: location.pathname === item.key ? '#1a1a1a' : 'transparent'
          }
        }))}
      />
      
      <div style={{ 
        position: 'absolute', 
        bottom: '24px', 
        left: '0', 
        right: '0',
        padding: '0 8px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 16px',
          cursor: 'pointer',
          borderRadius: '6px',
          transition: 'background 0.3s'
        }}
        onClick={() => handleMenuClick({ key: 'logout' })}
        onMouseEnter={(e) => e.target.style.background = '#1a1a1a'}
        onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          <span style={{ fontSize: '12px', color: '#888888' }}>←</span>
          <span style={{ color: '#888888', fontSize: '14px' }}>Logout</span>
        </div>
      </div>
    </Sider>
  )
}

export default Sidebar