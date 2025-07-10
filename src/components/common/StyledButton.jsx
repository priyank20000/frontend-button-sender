import React from 'react'
import { Button } from 'antd'

const StyledButton = ({ 
  variant = 'primary',
  size = 'large',
  children,
  icon,
  loading = false,
  disabled = false,
  onClick,
  style = {},
  ...props
}) => {
  const getVariantStyles = () => {
    const baseStyles = {
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    }

    const sizeStyles = {
      large: { height: '48px', padding: '0 24px' },
      middle: { height: '40px', padding: '0 20px', fontSize: '14px' },
      small: { height: '32px', padding: '0 16px', fontSize: '12px' }
    }

    const variants = {
      primary: {
        border: '1px solid #4a9eff',
        color: '#4a9eff',
        background: '#1a1a1a',
        boxShadow: 'none'
      },
      secondary: {
        border: '1px solid #333333',
        color: '#ffffff',
        background: '#1a1a1a',
        boxShadow: 'none'
      },
      danger: {
        border: '1px solid #ff4d4f',
        color: '#ff4d4f',
        background: '#1a1a1a',
        boxShadow: 'none'
      },
      success: {
        border: '1px solid #52c41a',
        color: '#52c41a',
        background: '#1a1a1a',
        boxShadow: 'none'
      },
      ghost: {
        border: '1px solid #404040',
        color: '#ffffff',
        background: 'transparent',
        boxShadow: 'none'
      }
    }

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variants[variant],
      ...style
    }
  }

  return (
    <Button
      icon={icon}
      loading={loading}
      disabled={disabled}
      onClick={onClick}
      size={size}
      style={getVariantStyles()}
      {...props}
    >
      {children}
    </Button>
  )
}

export default StyledButton