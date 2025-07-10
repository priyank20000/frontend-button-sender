import React, { useEffect } from 'react'
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  Row, 
  Col, 
  Card, 
  Typography,
  Space
} from 'antd'
import {
  PlusOutlined,
  MinusOutlined,
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  CodeOutlined
} from '@ant-design/icons'
import StyledButton from '../common/StyledButton'

const { TextArea } = Input
const { Option } = Select
const { Text } = Typography
import { message } from 'antd'

const TemplateFormDialog = ({
  open,
  onClose,
  onSubmit,
  editingTemplate,
  templateName,
  setTemplateName,
  messageType,
  setMessageType,
  message,
  setMessage,
  buttons,
  setButtons,
  header,
  setHeader,
  footer,
  setFooter,
  isSubmitting
}) => {
  const [form] = Form.useForm()

  // Initialize form values when modal opens
  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: templateName,
        messageType: messageType,
        header: header,
        footer: footer,
        message: message
      })
    }
  }, [open, templateName, messageType, header, footer, message, form])

  // Add default button when switching to Buttons type
  useEffect(() => {
    if (messageType === 'Buttons' && buttons.length === 0) {
      setButtons([{ title: '', type: 'REPLY', url: '' }])
    }
  }, [messageType, buttons.length, setButtons])

  const addButton = () => {
    if (buttons.length < 3) {
      setButtons([...buttons, { title: '', type: 'REPLY', url: '' }])
    }
  }

  const removeButton = (index) => {
    const newButtons = buttons.filter((_, i) => i !== index)
    setButtons(newButtons)
  }

  const updateButton = (index, field, value) => {
    const updatedButtons = [...buttons]
    updatedButtons[index] = { ...updatedButtons[index], [field]: value }
    setButtons(updatedButtons)
  }

  const insertVariable = (variable) => {
    const textarea = document.querySelector('textarea[placeholder*="message content"]')
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newMessage = message.substring(0, start) + `{{${variable}}}` + message.substring(end)
      setMessage(newMessage)
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4)
      }, 0)
    }
  }

  const formatText = (format) => {
    const textarea = document.querySelector('textarea[placeholder*="message content"]')
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = message.substring(start, end)
      
      if (selectedText) {
        let formattedText = selectedText
        
        if (format === 'bold') formattedText = `*${selectedText}*`
        else if (format === 'italic') formattedText = `_${selectedText}_`
        else if (format === 'strikethrough') formattedText = `~${selectedText}~`
        else if (format === 'code') formattedText = `\`${selectedText}\``
        
        const newMessage = message.substring(0, start) + formattedText + message.substring(end)
        setMessage(newMessage)
        
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start, start + formattedText.length)
        }, 0)
      }
    }
  }

  const handleSubmit = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault()
    }
    
    // Validate required fields
    if (!templateName.trim()) {
      message.error('Please enter template name')
      return
    }
    
    if (!message?.trim()) {
      message.error('Please enter message content')
      return
    }
    
    // Validate buttons if message type is Buttons
    if (messageType === 'Buttons') {
      const validButtons = buttons.filter(btn => btn.title?.trim())
      if (validButtons.length === 0) {
        message.error('Please add at least one button for Buttons message type')
        return
      }
      
      // Validate URL buttons
      const urlButtons = validButtons.filter(btn => btn.type === 'URL')
      const invalidUrlButtons = urlButtons.filter(btn => !btn.url?.trim())
      if (invalidUrlButtons.length > 0) {
        message.error('Please provide URL for all URL type buttons')
        return
      }
    }
    
    // Call the onSubmit function passed from parent
    onSubmit()
  }

  const renderButtonForm = (button, index) => (
    <Card
      key={index}
      size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>
            Button {index + 1}
          </Text>
          {/* Only show remove button if there's more than 1 button OR it's not the first button */}
          {(buttons.length > 1 || index > 0) && (
            <StyledButton
              variant="danger"
              size="small"
              icon={<MinusOutlined />}
              onClick={() => removeButton(index)}
            />
          )}
        </div>
      }
      style={{
        background: '#1a1a1a',
        border: '1px solid #404040',
        marginBottom: '20px',
        borderRadius: '12px'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <Row gutter={[20, 20]}>
        <Col span={12}>
          <Text style={{ 
            color: '#ffffff', 
            fontSize: '16px', 
            fontWeight: '600', 
            display: 'block', 
            marginBottom: '12px' 
          }}>
            Title
          </Text>
          <Input
            placeholder={`Enter title for Button ${index + 1}`}
            value={button.title}
            onChange={(e) => updateButton(index, 'title', e.target.value)}
            style={{
              background: '#2a2a2a',
              border: '1px solid #555555',
              color: '#ffffff',
              height: '44px',
              fontSize: '16px',
              borderRadius: '8px'
            }}
          />
        </Col>
        <Col span={12}>
          <Text style={{ 
            color: '#ffffff', 
            fontSize: '16px', 
            fontWeight: '600', 
            display: 'block', 
            marginBottom: '12px' 
          }}>
            Type
          </Text>
          <Select
            value={button.type}
            onChange={(value) => updateButton(index, 'type', value)}
            style={{ width: '100%', height: '44px' }}
            dropdownStyle={{
              background: '#1a1a1a',
              border: '1px solid #404040'
            }}
          >
            <Option value="REPLY">Reply</Option>
            <Option value="URL">URL</Option>
          </Select>
        </Col>
        {button.type === 'URL' && (
          <Col span={24}>
            <Text style={{ 
              color: '#ffffff', 
              fontSize: '16px', 
              fontWeight: '600', 
              display: 'block', 
              marginBottom: '12px' 
            }}>
              URL
            </Text>
            <Input
              placeholder="Enter URL"
              value={button.url}
              onChange={(e) => updateButton(index, 'url', e.target.value)}
              prefix={<LinkOutlined style={{ color: '#888888' }} />}
              style={{
                background: '#2a2a2a',
                border: '1px solid #555555',
                color: '#ffffff',
                height: '44px',
                fontSize: '16px',
                borderRadius: '8px'
              }}
            />
          </Col>
        )}
      </Row>
    </Card>
  )

  return (
    <Modal
      title={<span style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700' }}>
        {editingTemplate ? 'Edit Template' : 'Create New Template'}
      </span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1400}
      centered
      destroyOnClose
      styles={{
        header: {
          backgroundColor: 'transparent',
          borderBottom: 'none',
          padding: '32px 40px 0'
        },
        content: {
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '16px'
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)'
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ padding: '0 40px 40px' }}
      >
        <Row gutter={[32, 0]}>
          <Col span={12}>
            <Form.Item
              label={<span style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
                Template Name
              </span>}
              name="name"
              rules={[{ required: true, message: 'Please enter template name' }]}
              style={{ marginBottom: '32px' }}
            >
              <Input
                placeholder="Enter template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #404040',
                  color: '#ffffff',
                  height: '52px',
                  fontSize: '16px',
                  borderRadius: '8px'
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={<span style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
                Message Type
              </span>}
              name="messageType"
              rules={[{ required: true, message: 'Please select message type' }]}
              style={{ marginBottom: '32px' }}
            >
              <Select
                value={messageType}
                onChange={setMessageType}
                style={{ width: '100%', height: '52px' }}
                dropdownStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #404040'
                }}
              >
                <Option value="Text">Text</Option>
                <Option value="Buttons">Buttons</Option>
                <Option value="Media">Media</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {messageType === 'Buttons' && (
          <Row gutter={[32, 0]}>
            <Col span={12}>
              <Form.Item
                label={<span style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
                  Header (Optional)
                </span>}
                name="header"
                style={{ marginBottom: '32px' }}
              >
                <Input
                  placeholder="Enter header text"
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #404040',
                    color: '#ffffff',
                    height: '52px',
                    fontSize: '16px',
                    borderRadius: '8px'
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={<span style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
                  Footer (Optional)
                </span>}
                name="footer"
                style={{ marginBottom: '32px' }}
              >
                <Input
                  placeholder="Enter footer text"
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #404040',
                    color: '#ffffff',
                    height: '52px',
                    fontSize: '16px',
                    borderRadius: '8px'
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item
          label={<span style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
            Message Content
          </span>}
          name="message"
          rules={[{ required: true, message: 'Please enter message content' }]}
          style={{ marginBottom: '32px' }}
        >
          <div>
            <div style={{ 
              marginBottom: '16px', 
              display: 'flex', 
              gap: '16px', 
              alignItems: 'center', 
              flexWrap: 'wrap',
              padding: '16px',
              background: '#1a1a1a',
              border: '1px solid #404040',
              borderRadius: '12px'
            }}>
              <Select
                placeholder="Insert variable"
                style={{ 
                  width: 200, 
                  height: '44px',
                  fontSize: '16px',
                  color: '#ffffff'
                }}
                size="large"
                onSelect={insertVariable}
                value={undefined}
                dropdownStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #404040'
                }}
                dropdownRender={(menu) => (
                  <div style={{ background: '#1a1a1a', border: '1px solid #404040' }}>
                    {menu}
                  </div>
                )}
              >
                <Option value="name" style={{ fontSize: '16px' }}>{'{{name}}'}</Option>
                <Option value="phone" style={{ fontSize: '16px' }}>{'{{phone}}'}</Option>
                {Array.from({ length: 30 }, (_, i) => (
                  <Option key={`var${i + 1}`} value={`var${i + 1}`} style={{ fontSize: '16px' }}>
                    {`{{var${i + 1}}}`}
                  </Option>
                ))}
              </Select>
              <div style={{ 
                height: '32px', 
                width: '2px', 
                background: '#404040',
                margin: '0 8px'
              }} />
              <Space size="middle">
                <StyledButton 
                  size="middle" 
                  icon={<BoldOutlined />} 
                  onClick={() => formatText('bold')}
                  variant="ghost"
                  style={{ width: '44px' }}
                />
                <StyledButton 
                  size="middle" 
                  icon={<ItalicOutlined />} 
                  onClick={() => formatText('italic')}
                  variant="ghost"
                  style={{ width: '44px' }}
                />
                <StyledButton 
                  size="middle" 
                  icon={<StrikethroughOutlined />} 
                  onClick={() => formatText('strikethrough')}
                  variant="ghost"
                  style={{ width: '44px' }}
                />
                <StyledButton 
                  size="middle" 
                  icon={<CodeOutlined />} 
                  onClick={() => formatText('code')}
                  variant="ghost"
                  style={{ width: '44px' }}
                />
                <StyledButton 
                  size="middle" 
                  icon={<UnorderedListOutlined />} 
                  variant="ghost"
                  style={{ width: '44px' }}
                />
                <StyledButton 
                  size="middle" 
                  icon={<LinkOutlined />} 
                  variant="ghost"
                  style={{ width: '44px' }}
                />
              </Space>
            </div>
            <TextArea
              rows={10}
              placeholder="Enter your message content here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                background: '#1a1a1a',
                border: '1px solid #404040',
                color: '#ffffff',
                resize: 'none',
                fontSize: '16px',
                lineHeight: '1.6',
                borderRadius: '12px',
                padding: '16px'
              }}
            />
          </div>
        </Form.Item>

        {messageType === 'Buttons' && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px' 
            }}>
              <Text style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
                Buttons
              </Text>
              <StyledButton
                variant="primary"
                icon={<PlusOutlined />}
                onClick={addButton}
                disabled={buttons.length >= 3}
              >
                Add Button
              </StyledButton>
            </div>
            {buttons.map((button, index) => renderButtonForm(button, index))}
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '20px', 
          marginTop: '40px',
          paddingTop: '32px',
          borderTop: '1px solid #404040'
        }}>
          <StyledButton
            variant="secondary"
            onClick={onClose}
            style={{ minWidth: '140px' }}
          >
            Cancel
          </StyledButton>
          <StyledButton
            variant="primary"
            htmlType="submit"
            loading={isSubmitting}
            onClick={handleSubmit}
            style={{ minWidth: '180px' }}
          >
            {editingTemplate ? 'Update Template' : 'Create Template'}
          </StyledButton>
        </div>
      </Form>
    </Modal>
  )
}

export default TemplateFormDialog