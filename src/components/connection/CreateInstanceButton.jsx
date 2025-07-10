import React from 'react'
import { PlusOutlined } from '@ant-design/icons'
import StyledButton from '../common/StyledButton'

const CreateInstanceButton = ({ 
  isCreating, 
  onClick, 
  size = 'large',
  style = {} 
}) => {
  return (
    <StyledButton
      variant="primary"
      icon={<PlusOutlined />}
      loading={isCreating}
      onClick={onClick}
      size={size}
      style={style}
    >
      Create Instance
    </StyledButton>
  )
}

export default CreateInstanceButton