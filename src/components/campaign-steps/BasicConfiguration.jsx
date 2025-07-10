import React, { useState, useEffect } from 'react'
import { 
  Input, 
  Badge, 
  Checkbox, 
  Modal, 
  Table, 
  Typography,
  Card,
  Space,
  Avatar,
  Pagination
} from 'antd'
import {
  ExclamationCircleOutlined,
  CloseOutlined,
  DownOutlined,
  UserAddOutlined,
  UsergroupDeleteOutlined
} from '@ant-design/icons'
import StyledButton from '../common/StyledButton'

const { Title, Text } = Typography

const BasicConfiguration = ({
  campaignName,
  setCampaignName,
  selectedInstances,
  setSelectedInstances,
  instances = []
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogSearchTerm, setDialogSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [dialogCurrentPage, setDialogCurrentPage] = useState(1)
  const [tempSelectedInstances, setTempSelectedInstances] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    console.log('Instances received:', instances)
    console.log('Connected instances:', instances?.filter(i => i?.whatsapp?.status?.toLowerCase() === 'connected') || [])
  }, [instances, selectedInstances])

  const connectedInstances = instances?.filter(i => i?.whatsapp?.status?.toLowerCase() === 'connected') || []
  const isAllSelected = selectedInstances.length === connectedInstances.length && connectedInstances.length > 0

  const handleInstanceSelection = (instanceId) => {
    setTempSelectedInstances(prev => 
      prev.includes(instanceId)
        ? prev.filter(id => id !== instanceId)
        : [...prev, instanceId]
    )
  }

  const handleSelectAll = () => {
    const connectedInstanceIds = connectedInstances.map(instance => instance._id)
    setSelectedInstances(connectedInstanceIds)
    setTempSelectedInstances(connectedInstanceIds)
  }

  const handleDeselectAll = () => {
    setSelectedInstances([])
    setTempSelectedInstances([])
  }

  const handleDialogSelectAll = () => {
    const connectedInstanceIds = connectedInstances.map(instance => instance._id)
    setTempSelectedInstances(connectedInstanceIds)
  }

  const handleDialogDeselectAll = () => {
    setTempSelectedInstances([])
  }

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen)
    if (!isDropdownOpen) {
      setSearchTerm('')
      setDialogSearchTerm('')
      setDialogCurrentPage(1)
    }
  }

  const filteredInstances = connectedInstances.filter(instance => {
    const name = instance.name || `Device ${instance._id.slice(-4)}`
    const phone = instance?.whatsapp?.phone || ''
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           phone.includes(searchTerm)
  })

  const dialogFilteredInstances = connectedInstances.filter(instance => {
    const name = instance.name || `Device ${instance._id.slice(-4)}`
    const phone = instance?.whatsapp?.phone || ''
    return name.toLowerCase().includes(dialogSearchTerm.toLowerCase()) || 
           phone.includes(dialogSearchTerm)
  })

  const getDisplayText = () => {
    if (selectedInstances.length === 0) {
      return "Select instances"
    }
    if (selectedInstances.length === connectedInstances.length) {
      return `All instances selected (${selectedInstances.length})`
    }
    if (selectedInstances.length <= 3) {
      return selectedInstances.map(id => {
        const instance = instances?.find(i => i._id === id)
        return instance?.name || `Device ${id.slice(-4)}`
      }).join(", ")
    }
    return `${selectedInstances.length} instances selected`
  }

  const totalPages = Math.ceil(selectedInstances.length / itemsPerPage)
  const paginatedInstances = selectedInstances
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    .map(id => instances?.find(i => i._id === id))
    .filter(instance => instance !== undefined)

  const dialogTotalPages = Math.ceil(dialogFilteredInstances.length / itemsPerPage)
  const dialogPaginatedInstances = dialogFilteredInstances
    .slice((dialogCurrentPage - 1) * itemsPerPage, dialogCurrentPage * itemsPerPage)

  const handleDialogOpen = () => {
    setTempSelectedInstances([...selectedInstances])
    setIsDialogOpen(true)
  }

  const handleDialogClose = (confirm) => {
    if (confirm) {
      setSelectedInstances(tempSelectedInstances)
      setIsDropdownOpen(false)
      setSearchTerm('')
    } else {
      setTempSelectedInstances([...selectedInstances])
    }
    setDialogSearchTerm('')
    setDialogCurrentPage(1)
    setIsDialogOpen(false)
  }

  const handleRemoveInstance = (instanceId) => {
    const updatedSelection = selectedInstances.filter(id => id !== instanceId)
    setSelectedInstances(updatedSelection)
    setTempSelectedInstances(updatedSelection)
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Text style={{ color: '#ffffff' }}>
          {text || `Device ${record._id.slice(-4)}`}
        </Text>
      )
    },
    {
      title: 'Phone',
      dataIndex: ['whatsapp', 'phone'],
      key: 'phone',
      render: (text) => (
        <Text style={{ color: '#888888' }}>
          {text || '-'}
        </Text>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: () => (
        <Badge 
          status="success" 
          text={<span style={{ color: '#52c41a' }}>Connected</span>} 
        />
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Checkbox
          checked={tempSelectedInstances.includes(record._id)}
          onChange={() => handleInstanceSelection(record._id)}
        />
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Title level={3} style={{ color: '#ffffff', margin: 0, marginBottom: '8px' }}>
          Basic Configuration
        </Title>
        <Text style={{ color: '#888888' }}>
          Enter the Campaign Name and Select Instance Details.
        </Text>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Text style={{ color: '#888888', fontWeight: 500 }}>Campaign Name *</Text>
        <Input
          placeholder="Enter campaign name"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          style={{
            background: '#1a1a1a',
            borderColor: '#333333',
            color: '#ffffff'
          }}
          size="large"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#888888', fontWeight: 500 }}>Select Instances *</Text>
          <Space>
            <StyledButton
              variant="success"
              icon={<UserAddOutlined />}
              onClick={handleSelectAll}
              disabled={isAllSelected}
              size="small"
            >
              Select All
            </StyledButton>
            <StyledButton
              variant="danger"
              icon={<UsergroupDeleteOutlined />}
              onClick={handleDeselectAll}
              disabled={selectedInstances.length === 0}
              size="small"
            >
              Deselect All
            </StyledButton>
          </Space>
        </div>
        
        {connectedInstances.length === 0 ? (
          <Card style={{ background: '#1a1a1a', border: '1px solid #333333' }}>
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14', marginBottom: '16px' }} />
              <Text style={{ color: '#888888' }}>
                No connected instances available. Please connect at least one instance first.
              </Text>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <div
                onClick={handleDropdownToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '12px 16px',
                  background: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'border-color 0.3s'
                }}
              >
                <Text style={{ color: '#ffffff' }}>
                  {getDisplayText()}
                </Text>
                <DownOutlined 
                  style={{ 
                    color: '#888888', 
                    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }} 
                />
              </div>

              {isDropdownOpen && (
                <Card
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    borderRadius: '6px',
                    zIndex: 50,
                    maxHeight: '384px',
                    overflow: 'hidden'
                  }}
                  bodyStyle={{ padding: 0 }}
                >
                  <div style={{ padding: '12px', borderBottom: '1px solid #333333' }}>
                    <Input
                      placeholder="Search instances..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        background: '#0a0a0a',
                        borderColor: '#555555',
                        color: '#ffffff'
                      }}
                      size="small"
                    />
                  </div>

                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {filteredInstances.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center' }}>
                        <Text style={{ color: '#888888' }}>No instances found</Text>
                      </div>
                    ) : (
                      filteredInstances.slice(0, 10).map(instance => (
                        <div
                          key={instance._id}
                          onClick={() => {
                            handleInstanceSelection(instance._id)
                            setSelectedInstances(
                              tempSelectedInstances.includes(instance._id)
                                ? tempSelectedInstances.filter(id => id !== instance._id)
                                : [...tempSelectedInstances, instance._id]
                            )
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            cursor: 'pointer',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#333333'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <Checkbox
                            checked={tempSelectedInstances.includes(instance._id)}
                            onChange={() => {}}
                          />
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            {instance?.whatsapp?.profile ? (
                              <Avatar
                                src={instance.whatsapp.profile}
                                size={40}
                                style={{ border: '2px solid #555555' }}
                              />
                            ) : (
                              <Avatar
                                size={40}
                                style={{ 
                                  background: '#333333', 
                                  color: '#ffffff',
                                  border: '2px solid #555555'
                                }}
                              >
                                {(instance.name || `D${instance._id.slice(-2)}`).charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                            <div style={{
                              position: 'absolute',
                              bottom: '-2px',
                              right: '-2px',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: instance?.whatsapp?.status?.toLowerCase() === 'connected' ? '#52c41a' : '#ff4d4f',
                              border: '2px solid #1a1a1a'
                            }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Text strong style={{ color: '#ffffff' }}>
                                {instance.name || `Device ${instance._id.slice(-4)}`}
                              </Text>
                              <Badge 
                                status="success" 
                                text={<span style={{ color: '#52c41a', fontSize: '12px' }}>Connected</span>} 
                              />
                            </div>
                            {instance?.whatsapp?.phone && (
                              <Text style={{ color: '#888888', fontSize: '14px' }}>
                                {instance.whatsapp.phone}
                              </Text>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {filteredInstances.length > 10 && (
                      <div style={{ padding: '8px' }}>
                        <StyledButton
                          variant="secondary"
                          onClick={handleDialogOpen}
                          style={{ width: '100%' }}
                        >
                          See More
                        </StyledButton>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {isDropdownOpen && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 40
                  }}
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}
            </div>

            {selectedInstances.length > 0 && (
              <Card
                style={{
                  background: '#0a0a0a',
                  border: '1px solid #333333',
                  borderRadius: '8px'
                }}
              >
                <Space wrap>
                  {selectedInstances.slice(0, 5).map(instanceId => {
                    const instance = instances?.find(i => i._id === instanceId)
                    return (
                      <Badge
                        key={instanceId}
                        count={
                          <StyledButton
                            variant="danger"
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveInstance(instanceId)
                            }}
                            style={{ 
                              minWidth: 'auto',
                              width: '16px',
                              height: '16px',
                              padding: 0
                            }}
                          />
                        }
                        offset={[8, -8]}
                      >
                        <Badge 
                          status="processing" 
                          text={
                            <span style={{ color: '#ffffff' }}>
                              {instance?.name || `Device ${instanceId.slice(-4)}`}
                            </span>
                          } 
                        />
                      </Badge>
                    )
                  })}
                  {selectedInstances.length > 5 && (
                    <Badge 
                      status="default" 
                      text={
                        <span 
                          style={{ color: '#888888', cursor: 'pointer' }}
                          onClick={() => setIsDialogOpen(true)}
                        >
                          +{selectedInstances.length - 5} more
                        </span>
                      } 
                    />
                  )}
                </Space>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Dialog Modal */}
      <Modal
        title={<span style={{ color: '#ffffff' }}>All Instances</span>}
        open={isDialogOpen}
        onCancel={() => handleDialogClose(false)}
        width={800}
        footer={[
          <StyledButton
            key="cancel"
            variant="secondary"
            onClick={() => handleDialogClose(false)}
          >
            Cancel
          </StyledButton>,
          <StyledButton
            key="ok"
            variant="primary"
            onClick={() => handleDialogClose(true)}
          >
            OK
          </StyledButton>
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <StyledButton
              variant="success"
              icon={<UserAddOutlined />}
              onClick={handleDialogSelectAll}
              disabled={tempSelectedInstances.length === connectedInstances.length}
              size="small"
            >
              Select All
            </StyledButton>
            <StyledButton
              variant="danger"
              icon={<UsergroupDeleteOutlined />}
              onClick={handleDialogDeselectAll}
              disabled={tempSelectedInstances.length === 0}
              size="small"
            >
              Deselect All
            </StyledButton>
          </Space>
        </div>

        <div style={{ padding: '12px', borderBottom: '1px solid #333333', marginBottom: '16px' }}>
          <Input
            placeholder="Search instances..."
            value={dialogSearchTerm}
            onChange={(e) => {
              setDialogSearchTerm(e.target.value)
              setDialogCurrentPage(1)
            }}
            style={{
              background: '#0a0a0a',
              borderColor: '#555555',
              color: '#ffffff'
            }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={dialogPaginatedInstances}
          rowKey="_id"
          pagination={false}
        />

        {dialogTotalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginTop: '24px',
            padding: '16px',
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '12px'
          }}>
            <Text style={{ color: '#888888' }}>
              Showing {(dialogCurrentPage - 1) * itemsPerPage + 1}-{Math.min(dialogCurrentPage * itemsPerPage, dialogFilteredInstances.length)} of {dialogFilteredInstances.length} instances
            </Text>
            <Pagination
              current={dialogCurrentPage}
              total={dialogFilteredInstances.length}
              pageSize={itemsPerPage}
              onChange={setDialogCurrentPage}
              showSizeChanger={false}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default BasicConfiguration