import React from 'react'
import { Spin, Typography } from 'antd'

const { Text } = Typography

const QRCodeDisplay = ({ qrCode, isLoading = false }) => {
  const renderContent = () => {
    if (qrCode) {
      return (
        <div style={{ 
          background: '#ffffff', 
          padding: '16px', 
          borderRadius: '8px',
          display: 'inline-block',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <img 
            src={qrCode} 
            alt="QR Code" 
            style={{ maxWidth: '300px', width: '100%' }} 
          />
        </div>
      )
    }

    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '300px',
        width: '300px',
        background: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #333333'
      }}>
        <Spin size="large" />
        <Text style={{ marginTop: '16px', color: '#888888' }}>
          Waiting for QR code...
        </Text>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {renderContent()}
    </div>
  )
}

export default QRCodeDisplay