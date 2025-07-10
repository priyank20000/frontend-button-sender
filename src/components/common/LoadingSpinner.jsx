import React from 'react'
import { Spin, Typography } from 'antd'

const { Text } = Typography

const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'large',
  height = '400px',
  style = {} 
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: height,
      flexDirection: 'column',
      ...style
    }}>
      <Spin size={size} />
      <Text style={{ color: '#888888', marginTop: '16px' }}>
        {message}
      </Text>
    </div>
  )
}

export default LoadingSpinner