import React from 'react'
import { Card, Avatar, Space, Typography, Popconfirm } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  LogoutOutlined,
  QrcodeOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import StyledButton from '../common/StyledButton'

const { Text } = Typography

const InstanceCard = ({
  instance,
  index,
  indexOfFirstInstance,
  isProcessingEdit,
  isProcessingLogout,
  isProcessingDelete,
  isProcessingQR,
  isConnected,
  onEdit,
  onLogout,
  onDelete,
  onShowQR
}) => {
  const renderActionButtons = () => {
    const buttons = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        text: 'Edit',
        loading: isProcessingEdit[instance._id],
        onClick: () => onEdit(instance._id, instance.name),
        variant: 'secondary'
      }
    ]

    if (instance.whatsapp.status === 'connected') {
      buttons.push({
        key: 'logout',
        icon: <LogoutOutlined />,
        text: 'Logout',
        loading: isProcessingLogout[instance._id],
        onClick: () => onLogout(instance._id),
        variant: 'secondary'
      })
    } else {
      buttons.push({
        key: 'qr',
        icon: <QrcodeOutlined />,
        text: 'QR',
        loading: isProcessingQR[instance._id],
        onClick: () => onShowQR(instance._id),
        disabled: !isConnected,
        variant: 'primary'
      })
    }

    buttons.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      text: 'Delete',
      loading: isProcessingDelete[instance._id],
      onClick: () => onDelete(instance._id),
      variant: 'danger',
      popconfirm: true
    })

    return buttons.map(button => {
      const buttonElement = (
        <StyledButton
          size="middle"
          variant={button.variant}
          icon={button.icon}
          loading={button.loading}
          onClick={button.onClick}
          disabled={button.disabled}
          style={{ minWidth: '80px' }}
        >
          {button.text}
        </StyledButton>
      )

      if (button.popconfirm) {
        return (
          <Popconfirm
            key={button.key}
            title="Delete Instance"
            description="Are you sure you want to delete this instance? This action cannot be undone."
            onConfirm={button.onClick}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ 
              style: { 
                background: '#ff4d4f', 
                borderColor: '#ff4d4f',
                color: '#ffffff'
              } 
            }}
            cancelButtonProps={{
              style: {
                background: '#1a1a1a',
                borderColor: '#404040',
                color: '#ffffff'
              }
            }}
            placement="topRight"
          >
            {buttonElement}
          </Popconfirm>
        )
      }

      return <div key={button.key}>{buttonElement}</div>
    })
  }

  return (
    <Card
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '12px',
        transition: 'all 0.3s ease'
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Header with phone number and avatar */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ position: 'relative' }}>
          <Avatar
            size={40}
            src={instance.whatsapp.profile}
            style={{ 
              background: '#1a1a1a',
              color: '#ffffff',
              border: '2px solid #333333'
            }}
          >
            {instance.whatsapp.phone ? instance.whatsapp.phone.slice(-2) : (indexOfFirstInstance + index + 1)}
          </Avatar>
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: instance.whatsapp.status === 'connected' ? '#52c41a' : '#ff4d4f',
            border: '2px solid #0a0a0a'
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ 
            color: '#ffffff', 
            fontSize: '16px',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {instance.whatsapp.phone || `WhatsApp Device ${indexOfFirstInstance + index + 1}`}
          </Text>
          {instance.name && (
            <Text style={{ 
              color: '#888888', 
              fontSize: '12px',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {instance.name}
            </Text>
          )}
        </div>
      </div>

      {/* Status section */}
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <CheckCircleOutlined style={{ 
          color: instance.whatsapp.status === 'connected' ? '#52c41a' : '#666666',
          fontSize: '16px'
        }} />
        <Text style={{ 
          color: instance.whatsapp.status === 'connected' ? '#52c41a' : '#888888',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {instance.whatsapp.status === 'connected' ? 'Ready' : 'Not Connected'}
        </Text>
        {instance.name && (
          <Text style={{ 
            color: '#666666',
            fontSize: '12px',
            marginLeft: 'auto'
          }}>
            {instance.name}
          </Text>
        )}
      </div>

      {/* Action buttons */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #1a1a1a',
        display: 'flex',
        gap: '12px',
        justifyContent: 'center'
      }}>
        <Space size="middle">
          {renderActionButtons()}
        </Space>
      </div>
    </Card>
  )
}

export default InstanceCard