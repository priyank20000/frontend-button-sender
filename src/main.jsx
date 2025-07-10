import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import App from './App.jsx'
import './index.css'

const theme = {
  token: {
    colorPrimary: '#4a9eff',
    colorBgBase: '#000000',
    colorBgContainer: '#0a0a0a',
    colorBgElevated: '#1a1a1a',
    colorText: '#ffffff',
    colorTextSecondary: '#888888',
    colorBorder: '#1a1a1a',
    colorBorderSecondary: '#333333',
    borderRadius: 8,
  },
  components: {
    Layout: {
      siderBg: '#000000',
      bodyBg: '#000000',
      headerBg: '#000000',
    },
    Menu: {
      darkItemBg: '#000000',
      darkSubMenuItemBg: '#000000',
      darkItemSelectedBg: '#1a1a1a',
      darkItemHoverBg: '#1a1a1a',
    },
    Card: {
      colorBgContainer: '#0a0a0a',
    },
    Button: {
      colorPrimary: '#4a9eff',
      colorPrimaryHover: '#6bb6ff',
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
)