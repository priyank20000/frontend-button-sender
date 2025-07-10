import React, { useState } from 'react'
import { 
  Input, 
  Typography,
  Card,
  Modal,
  message
} from 'antd'
import { SendOutlined, LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import StyledButton from '../common/StyledButton'
import api from '../../services/api'

const { Title, Text } = Typography

const ScheduleCampaign = ({
  campaignName,
  selectedTemplate,
  selectedInstances,
  antdContacts,
  delayRange,
  setDelayRange,
  templates,
  onCreateCampaign,
  isCreating
}) => {
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  const handleCreateCampaign = async () => {
    await onCreateCampaign()
    setShowSuccessPopup(true)
  }

  const handleSendCampaign = async () => {
    setIsSending(true)
    setErrorMessage('')
    
    try {
      const campaignId = localStorage.getItem('currentCampaignId')
      if (!campaignId) {
        throw new Error('Campaign ID not found')
      }
      
      const response = await api.post('/campaign/send', { campaignId })

      if (response.data.status) {
        setShowSuccessPopup(false)
        navigate(`/dashboard/campaign/final/${campaignId}`)
      } else {
        throw new Error(response.data.message || 'Failed to send campaign')
      }
    } catch (error) {
      console.error('Error sending campaign:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
      } else {
        setErrorMessage(error.message || 'Failed to send campaign. Please try again.')
      }
    } finally {
      setIsSending(false)
    }
  }

  const handleViewReport = async () => {
    setIsSending(true)
    setErrorMessage('')
    
    try {
      const campaignId = localStorage.getItem('currentCampaignId')
      if (!campaignId) {
        throw new Error('Campaign ID not found')
      }
      
      const response = await api.post('/campaign/send', { campaignId })

      if (response.data.status) {
        setShowSuccessPopup(false)
        navigate('/messaging')
      } else {
        throw new Error(response.data.message || 'Failed to send campaign')
      }
    } catch (error) {
      console.error('Error sending campaign:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
      } else {
        setErrorMessage(error.message || 'Failed to send campaign. Please try again.')
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Title level={3} style={{ color: '#ffffff', margin: 0, marginBottom: '8px' }}>
          Schedule Campaign
        </Title>
        <Text style={{ color: '#888888' }}>
          Configure delay settings and create your campaign.
        </Text>
      </div>

      {/* Campaign Summary */}
      <Card
        style={{
          background: '#0a0a0a',
          border: '1px solid #333333',
          borderRadius: '8px'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Title level={4} style={{ color: '#ffffff', marginBottom: '16px' }}>
          Campaign Summary
        </Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <Text style={{ color: '#888888', display: 'block', marginBottom: '4px' }}>
              Campaign Name
            </Text>
            <Text style={{ color: '#ffffff', fontWeight: 500 }}>
              {campaignName}
            </Text>
          </div>
          <div>
            <Text style={{ color: '#888888', display: 'block', marginBottom: '4px' }}>
              Selected Template
            </Text>
            <Text style={{ color: '#ffffff', fontWeight: 500 }}>
              {templates.find(t => t._id === selectedTemplate)?.name || 'Template selected'}
            </Text>
          </div>
          <div>
            <Text style={{ color: '#888888', display: 'block', marginBottom: '4px' }}>
              Selected Instances
            </Text>
            <Text style={{ color: '#ffffff', fontWeight: 500 }}>
              {selectedInstances.length} instances
            </Text>
          </div>
          <div>
            <Text style={{ color: '#888888', display: 'block', marginBottom: '4px' }}>
              Total Recipients
            </Text>
            <Text style={{ color: '#ffffff', fontWeight: 500 }}>
              {antdContacts.length} recipients
            </Text>
          </div>
        </div>
      </Card>

      {/* Delay Configuration */}
      <Card
        style={{
          background: '#0a0a0a',
          border: '1px solid #333333',
          borderRadius: '8px'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Title level={4} style={{ color: '#ffffff', marginBottom: '16px' }}>
          Delay Configuration
        </Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Text style={{ color: '#888888', display: 'block', marginBottom: '8px' }}>
              Starting Delay (seconds)
            </Text>
            <Input
              type="number"
              value={delayRange.start}
              onChange={(e) => setDelayRange({ ...delayRange, start: parseInt(e.target.value) || 0 })}
              style={{
                background: '#1a1a1a',
                borderColor: '#333333',
                color: '#ffffff'
              }}
              min="1"
            />
          </div>
          <div>
            <Text style={{ color: '#888888', display: 'block', marginBottom: '8px' }}>
              Ending Delay (seconds)
            </Text>
            <Input
              type="number"
              value={delayRange.end}
              onChange={(e) => setDelayRange({ ...delayRange, end: parseInt(e.target.value) || 0 })}
              style={{
                background: '#1a1a1a',
                borderColor: '#333333',
                color: '#ffffff'
              }}
              min="1"
            />
          </div>
        </div>
        <Text style={{ color: '#888888', fontSize: '14px', marginTop: '8px' }}>
          Messages will be sent with a random delay between {delayRange.start} and {delayRange.end} seconds.
        </Text>
      </Card>

      {/* Create Campaign Button */}
      <Card
        style={{
          background: '#0f1f3a',
          border: '1px solid #1890ff',
          borderRadius: '8px'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title level={4} style={{ color: '#1890ff', margin: 0, marginBottom: '4px' }}>
              Ready to Create Campaign
            </Title>
            <Text style={{ color: '#69c0ff' }}>
              Click the button below to create your campaign. You'll be able to start sending messages immediately.
            </Text>
          </div>
          <StyledButton
            variant="primary"
            icon={isCreating ? <LoadingOutlined /> : <SendOutlined />}
            onClick={handleCreateCampaign}
            disabled={isCreating}
            loading={isCreating}
            size="large"
          >
            {isCreating ? 'Creating...' : 'Create Campaign'}
          </StyledButton>
        </div>
      </Card>

      {/* Success Modal */}
      <Modal
        open={showSuccessPopup}
        onCancel={() => {
          setShowSuccessPopup(false)
          navigate('/messaging')
        }}
        footer={null}
        centered
        width={450}
        closable={false}
        maskClosable={false}
        styles={{
          header: {
            backgroundColor: 'transparent',
            borderBottom: 'none',
            padding: '20px 24px 0'
          },
          content: {
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '12px',
            padding: '0'
          },
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)'
          }
        }}
      >
        <div style={{ 
          textAlign: 'center', 
          padding: '32px 24px 24px 24px',
          background: '#0a0a0a',
          borderRadius: '12px'
        }}>
          {/* Success Icon */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '20px' 
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#4a9eff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircleOutlined style={{ fontSize: '28px', color: '#ffffff' }} />
            </div>
          </div>

          {/* Title */}
          <Title level={3} style={{ 
            color: '#ffffff', 
            marginBottom: '8px',
            fontSize: '20px',
            fontWeight: '600'
          }}>
            Sending Messages Started
          </Title>

          {/* Description */}
          <Text style={{ 
            color: '#888888', 
            marginBottom: '32px', 
            display: 'block',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            Sent messages report showed in "Report" Menu.
          </Text>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                background: '#3a0f0f',
                border: '1px solid #ff4d4f',
                borderRadius: '6px',
                marginBottom: '24px',
                padding: '12px'
              }}
            >
              <Text style={{ color: '#ff4d4f', fontSize: '13px' }}>
                {errorMessage}
              </Text>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'center',
            marginTop: '8px'
          }}>
            <StyledButton
              variant="secondary"
              onClick={handleViewReport}
              disabled={isSending}
              loading={isSending}
              style={{
                background: '#1a1a1a',
                borderColor: '#333333',
                color: '#ffffff',
                borderRadius: '6px',
                height: '36px',
                fontSize: '14px',
                fontWeight: '500',
                minWidth: '100px'
              }}
            >
              View Report
            </StyledButton>
            <StyledButton
              variant="primary"
              onClick={handleSendCampaign}
              disabled={isSending}
              loading={isSending}
              style={{
                background: '#4a9eff',
                borderColor: '#4a9eff',
                color: '#ffffff',
                borderRadius: '6px',
                height: '36px',
                fontSize: '14px',
                fontWeight: '500',
                minWidth: '100px'
              }}
            >
              OK
            </StyledButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ScheduleCampaign