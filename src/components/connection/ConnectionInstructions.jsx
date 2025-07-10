import React from 'react'
import { Card, Typography, Steps, Alert } from 'antd'
import { PhoneOutlined, QrcodeOutlined, PlusOutlined, CheckCircleOutlined } from '@ant-design/icons'

const { Title } = Typography

const ConnectionInstructions = () => {
  const instructionSteps = [
    {
      title: <span style={{ color: '#ffffff' }}>Open WhatsApp on your phone</span>,
      icon: <PhoneOutlined style={{ color: '#4a9eff' }} />
    },
    {
      title: <span style={{ color: '#ffffff' }}>Tap Menu or Settings and select Linked Devices</span>,
      icon: <QrcodeOutlined style={{ color: '#4a9eff' }} />
    },
    {
      title: <span style={{ color: '#ffffff' }}>Tap on "Link a Device"</span>,
      icon: <PlusOutlined style={{ color: '#4a9eff' }} />
    },
    {
      title: <span style={{ color: '#ffffff' }}>Point your phone to this screen to capture the code</span>,
      icon: <CheckCircleOutlined style={{ color: '#4a9eff' }} />
    }
  ]

  return (
    <Card 
      style={{ 
        height: '100%',
        background: '#1a1a1a',
        border: '1px solid #333333'
      }}
      bodyStyle={{ color: '#ffffff' }}
    >
      <Title level={4} style={{ color: '#ffffff' }}>How to Connect</Title>
      <Steps
        direction="vertical"
        size="small"
        current={-1}
        items={instructionSteps}
      />
      <Alert
        message="Once connected, you'll be able to use WhatsApp on this device"
        type="success"
        showIcon
        style={{ 
          marginTop: '16px',
          background: '#0f3a2e',
          border: '1px solid #52c41a',
          color: '#52c41a'
        }}
      />
    </Card>
  )
}

export default ConnectionInstructions