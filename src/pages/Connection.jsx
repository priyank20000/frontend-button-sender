import React, { useState, useEffect, useCallback, memo } from 'react'
import {
    Card,
    Button,
    Modal,
    Input,
    Pagination,
    Select,
    Avatar,
    Badge,
    Space,
    Typography,
    Spin,
    Empty,
    message,
    Row,
    Col,
    Divider,
    Steps,
    Alert,
    Popconfirm
} from 'antd'
import {
    PhoneOutlined,
    QrcodeOutlined,
    EditOutlined,
    DeleteOutlined,
    LogoutOutlined,
    PlusOutlined,
    LoadingOutlined,
    WifiOutlined,
    DisconnectOutlined,
    CloseOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined
} from '@ant-design/icons'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'
import StyledButton from '../components/common/StyledButton'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

const Connection = memo(function Connection() {
    const toast = useToast()
    const [instances, setInstances] = useState([])
    const [showQR, setShowQR] = useState(false)
    const [qrCode, setQrCode] = useState('')
    const [selectedInstanceId, setSelectedInstanceId] = useState(null)
    const [showSuccessDialog, setShowSuccessDialog] = useState(false)
    const [connectedInstance, setConnectedInstance] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [instancesPerPage, setInstancesPerPage] = useState(10)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [editInstanceId, setEditInstanceId] = useState(null)
    const [editInstanceName, setEditInstanceName] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [isProcessingQR, setIsProcessingQR] = useState({})
    const [isProcessingLogout, setIsProcessingLogout] = useState({})
    const [isProcessingDelete, setIsProcessingDelete] = useState({})
    const [isProcessingEdit, setIsProcessingEdit] = useState({})
    const [selectedInstance, setSelectedInstance] = useState(null)

    const { user } = useAuth()
    const token = localStorage.getItem('token')

    // Socket connection
    const { emit, on, off, isConnected } = useSocket({
        token,
        onConnect: () => {
            console.log('Socket connected successfully')
        },
        onDisconnect: () => {
            console.log('Socket disconnected')
        },
        onError: (error) => {
            console.error('Socket error:', error)
            const isAuthError = error.message.includes('Authentication failed') || error.message.includes('Not authorized')
            isAuthError && handleUnauthorized()
        }
    })

    // Socket event listeners
    useEffect(() => {
        if (!isConnected) {
            console.log('Socket not connected, skipping event listeners')
            return
        }

        console.log('Setting up socket event listeners')

        const handleQREvent = (data) => {
            console.log('QR event received:', data)
            const isValidQR = data.instanceId === selectedInstanceId || data.qr

            isValidQR && (() => {
                setQrCode(data.qr)
                setIsProcessingQR(prev => ({ ...prev, [selectedInstanceId]: false }))
                toast.success('QR code received')
            })()
        }

        const handleInstanceUpdate = (data) => {
            console.log('Instance update received:', data)
            setInstances(prev =>
                prev.map(instance =>
                    instance._id === data.instanceId
                        ? {
                            ...instance,
                            name: data.name,
                            whatsapp: {
                                phone: data.whatsapp.phone,
                                status: data.whatsapp.status,
                                profile: data.whatsapp.profile
                            },
                            createdAt: data.createdAt
                        }
                        : instance
                )
            )

            const isConnectedAndSelected = data.whatsapp.status === 'connected' &&
                data.instanceId === selectedInstanceId &&
                showQR

            isConnectedAndSelected && (() => {
                setShowQR(false)
                setConnectedInstance({
                    _id: data._id,
                    name: data.name,
                    whatsapp: {
                        phone: data.whatsapp.phone,
                        status: data.whatsapp.status,
                        profile: data.whatsapp.profile
                    },
                    createdAt: data.createdAt
                })
                setShowSuccessDialog(true)
                setSelectedInstanceId(null)
                toast.success('WhatsApp Connected Successfully!')
            })()
        }

        // Listen for QR code events
        on('instance.qr', handleQREvent)
        on('qr', handleQREvent) // Alternative event name

        // Listen for instance updates
        on('instance.update', handleInstanceUpdate)
        on('connection-status', handleInstanceUpdate) // Alternative event name

        return () => {
            console.log('Cleaning up socket event listeners')
            off('instance.qr', handleQREvent)
            off('qr', handleQREvent)
            off('instance.update', handleInstanceUpdate)
            off('connection-status', handleInstanceUpdate)
        }
    }, [isConnected, selectedInstanceId, showQR, on, off])

    const handleUnauthorized = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
    }

    const fetchInstances = useCallback(async () => {
        if (!token) {
            message.error('Please log in to access your devices')
            window.location.href = '/login'
            return
        }

        setIsLoading(true)
        try {
            let allInstances = []
            let page = 0
            const limit = 10

            const fetchPage = async (pageNum) => {
                const response = await api.post('/instance/all', { page: pageNum, limit })

                if (response.data.status) {
                    const fetchedInstances = response.data.instances || []
                    allInstances = [...allInstances, ...fetchedInstances]

                    const shouldContinue = fetchedInstances.length >= limit &&
                        allInstances.length < response.data.total

                    return shouldContinue ? fetchPage(pageNum + 1) : allInstances
                } else {
                    toast.error(response.data.message || 'Failed to fetch instances')
                    return allInstances
                }
            }

            await fetchPage(0)
            setInstances(allInstances)
        } catch (err) {
            console.error('Error fetching instances:', err)
            toast.error('Error fetching instances: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setIsLoading(false)
        }
    }, [token])

    useEffect(() => {
        token && fetchInstances()
    }, [token, fetchInstances])

    const handleCreateInstance = async () => {
        if (!token) {
            toast.error('Please log in to create an instance')
            window.location.href = '/login'
            return
        }

        setIsCreating(true)
        try {
            const response = await api.post('/instance/create')

            if (response.data.status) {
                const newInstance = response.data.instance
                setInstances((prev) => [...prev, newInstance])
                toast.success('Instance Created Successfully!')
                // Show the page with the new instance
                const totalPages = Math.ceil((instances.length + 1) / instancesPerPage)
                setCurrentPage(totalPages)
            } else {
                toast.error(response.data.message || 'Failed to create instance')
            }
        } catch (err) {
            console.error('Error creating instance:', err)
            toast.error('Error creating instance: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setIsCreating(false)
        }
    }

    const handleShowQR = async (instanceId) => {
        if (!token) {
            toast.error('Please log in to view QR code')
            window.location.href = '/login'
            return
        }

        if (!isConnected) {
            toast.warning('Socket not connected. Please wait for connection.')
            return
        }

        console.log('Requesting QR for instance:', instanceId)
        setIsProcessingQR(prev => ({ ...prev, [instanceId]: true }))
        setSelectedInstanceId(instanceId)
        setQrCode('')
        setShowQR(true)

        try {
            const response = await api.post('/instance/qr', { instance_id: instanceId })
            console.log('QR request response:', response.data)

            if (!response.data.status) {
                toast.error(response.data.message || 'Failed to request QR code')
                setShowQR(false)
                setSelectedInstanceId(null)
                setIsProcessingQR(prev => ({ ...prev, [instanceId]: false }))
            } else {
                toast.info('QR code requested, waiting for response...')
                // If QR is already available in response
                response.data.qr && (() => {
                    setQrCode(response.data.qr)
                    setIsProcessingQR(prev => ({ ...prev, [instanceId]: false }))
                })()
            }
        } catch (err) {
            console.error('Error requesting QR code:', err)
            toast.error('Error requesting QR code: ' + (err instanceof Error ? err.message : 'Unknown error'))
            setShowQR(false)
            setSelectedInstanceId(null)
            setIsProcessingQR(prev => ({ ...prev, [instanceId]: false }))
        }
    }

    const handleDeleteInstance = async (instanceId) => {
        if (!token) {
            toast.error('Please log in to delete instance')
            window.location.href = '/login'
            return
        }

        setIsProcessingDelete(prev => ({ ...prev, [instanceId]: true }))
        try {
            const response = await api.post('/instance/delete', { instanceId })

            if (response.data.status) {
                setInstances((prev) => {
                    const newInstances = prev.filter((instance) => instance._id !== instanceId)
                    const totalPages = Math.ceil(newInstances.length / instancesPerPage)
                    const shouldUpdatePage = currentPage > totalPages && totalPages > 0
                    shouldUpdatePage && setCurrentPage(totalPages)
                    return newInstances
                })
                toast.success('Instance Deleted Successfully!')
            } else {
                toast.error(response.data.message || 'Failed to delete instance')
            }
        } catch (err) {
            console.error('Error deleting instance:', err)
            toast.error('Error deleting instance: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setIsProcessingDelete(prev => ({ ...prev, [instanceId]: false }))
        }
    }

    const handleLogoutInstance = async (instanceId) => {
        if (!token) {
            toast.error('Please log in to log out instance')
            window.location.href = '/login'
            return
        }

        setIsProcessingLogout(prev => ({ ...prev, [instanceId]: true }))
        try {
            const response = await api.post('/instance/logout', { instanceId })

            if (response.data.status) {
                setInstances((prev) =>
                    prev.map((instance) =>
                        instance._id === instanceId
                            ? {
                                ...instance,
                                whatsapp: {
                                    ...instance.whatsapp,
                                    status: 'disconnected',
                                    phone: null,
                                    profile: null
                                }
                            }
                            : instance
                    )
                )
                toast.success('Logged Out Successfully!')
            } else {
                toast.error(response.data.message || 'Failed to log out')
            }
        } catch (err) {
            console.error('Error logging out:', err)
            toast.error('Error logging out: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setIsProcessingLogout(prev => ({ ...prev, [instanceId]: false }))
        }
    }

    const handleEditInstance = async () => {
        if (!token) {
            toast.error('Please log in to edit instance')
            window.location.href = '/login'
            return
        }

        if (!editInstanceName.trim()) {
            toast.warning('Please enter a valid name')
            return
        }

        setIsProcessingEdit(prev => ({ ...prev, [editInstanceId]: true }))
        try {
            const response = await api.post('/instance/edit', {
                instanceId: editInstanceId,
                name: editInstanceName,
            })

            if (response.data.status) {
                setInstances((prev) =>
                    prev.map((instance) =>
                        instance._id === editInstanceId
                            ? { ...instance, name: editInstanceName }
                            : instance
                    )
                )
                toast.success('Instance Name Updated Successfully!')
                setShowEditDialog(false)
                setEditInstanceId(null)
                setEditInstanceName('')
                setSelectedInstance(null)
            } else {
                toast.error(response.data.message || 'Failed to update instance name')
            }
        } catch (err) {
            console.error('Error updating instance name:', err)
            toast.error('Error updating instance name: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setIsProcessingEdit(prev => ({ ...prev, [editInstanceId]: false }))
        }
    }

    const openEditDialog = (instanceId, currentName) => {
        const instance = instances.find(inst => inst._id === instanceId)
        setEditInstanceId(instanceId)
        setEditInstanceName(currentName || '')
        setSelectedInstance(instance || null)
        setShowEditDialog(true)
    }

    // Sort instances from old to new
    const sortedInstances = [...instances].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateA - dateB
    })

    const indexOfLastInstance = currentPage * instancesPerPage
    const indexOfFirstInstance = indexOfLastInstance - instancesPerPage
    const currentInstances = sortedInstances.slice(indexOfFirstInstance, indexOfLastInstance)

    return (
        <div style={{ padding: '24px', background: '#000000', minHeight: '100vh' }}>
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Title level={2} style={{ color: '#ffffff', margin: 0 }}>
                            WhatsApp Devices
                        </Title>
                        <Badge
                            status={isConnected ? "success" : "error"}
                            text={
                                <span style={{ color: isConnected ? '#52c41a' : '#ff4d4f' }}>
                                    {isConnected ? 'Connected' : 'Disconnected'}
                                </span>
                            }
                        />
                    </div>
                    <StyledButton
                        variant="primary"
                        icon={<PlusOutlined />}
                        loading={isCreating}
                        onClick={handleCreateInstance}
                        size="large"
                    >
                        Create Instance
                    </StyledButton>
                </div>
            </div>

            {isLoading ? (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    flexDirection: 'column'
                }}>
                    <Spin size="large" />
                    <Text style={{ color: '#888888', marginTop: '16px' }}>Loading instances...</Text>
                </div>
            ) : sortedInstances.length === 0 ? (
                <Empty
                    image={<PhoneOutlined style={{ fontSize: '64px', color: '#666666' }} />}
                    description={
                        <div>
                            <Title level={4} style={{ color: '#ffffff' }}>No Devices Found</Title>
                            <Paragraph style={{ color: '#888888' }}>
                                You don't have any WhatsApp instances yet. Create your first instance to get started.
                            </Paragraph>
                        </div>
                    }
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} // Center content
                >
                    <StyledButton
                        variant="primary"
                        icon={<PlusOutlined />}
                        loading={isCreating}
                        onClick={handleCreateInstance}
                        size="large"
                    >
                        Create First Instance
                    </StyledButton>
                </Empty>
            ) : (
                <>
                    <Row gutter={[16, 16]} style={{ marginBottom: '120px' }}>
                        {currentInstances.map((instance, index) => (
                            <Col xs={24} sm={12} lg={8} key={instance._id}>
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
                                        <StyledButton
                                            variant="secondary"
                                            size="middle"
                                            icon={<EditOutlined />}
                                            loading={isProcessingEdit[instance._id]}
                                            onClick={() => openEditDialog(instance._id, instance.name)}
                                        >
                                            Edit
                                        </StyledButton>

                                        {instance.whatsapp.status === 'connected' ? (
                                            <StyledButton
                                                variant="secondary"
                                                size="middle"
                                                icon={<LogoutOutlined />}
                                                loading={isProcessingLogout[instance._id]}
                                                onClick={() => handleLogoutInstance(instance._id)}
                                            >
                                                Logout
                                            </StyledButton>
                                        ) : (
                                            <StyledButton
                                                variant="primary"
                                                size="middle"
                                                icon={<QrcodeOutlined />}
                                                loading={isProcessingQR[instance._id]}
                                                onClick={() => handleShowQR(instance._id)}
                                                disabled={!isConnected}
                                            >
                                                QR
                                            </StyledButton>
                                        )}

                                        <Popconfirm
                                            title="Delete Instance"
                                            description="Are you sure you want to delete this instance? This action cannot be undone."
                                            onConfirm={() => handleDeleteInstance(instance._id)}
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
                                            <StyledButton
                                                variant="danger"
                                                size="middle"
                                                icon={<DeleteOutlined />}
                                                loading={isProcessingDelete[instance._id]}
                                            >
                                                Delete
                                            </StyledButton>
                                        </Popconfirm>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    {/* Footer Pagination */}
                    {sortedInstances.length > 0 && (
                        <footer style={{
                            position: 'fixed',
                            bottom: '0',
                            left: '200px',
                            right: '0',
                            background: '#0a0a0a',
                            border: '1px solid #1a1a1a',
                            borderTop: '1px solid #1a1a1a',
                            padding: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            zIndex: 1000,
                            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.3)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <Text style={{ color: '#888888' }}>
                                    Showing {indexOfFirstInstance + 1}-{Math.min(indexOfLastInstance, sortedInstances.length)} of {sortedInstances.length} instances
                                </Text>
                                <Select
                                    value={instancesPerPage}
                                    onChange={(value) => {
                                        setInstancesPerPage(value)
                                        setCurrentPage(1)
                                    }}
                                    style={{ width: 120 }}
                                >
                                    {[10, 20, 30, 40, 50, 100, 200, 300, 400, 500].map(size => (
                                        <Option key={size} value={size}>{size} per page</Option>
                                    ))}
                                </Select>
                            </div>

                            <Pagination
                                current={currentPage}
                                total={sortedInstances.length}
                                pageSize={instancesPerPage}
                                onChange={setCurrentPage}
                                showSizeChanger={false}
                                style={{ color: '#ffffff' }}
                            />
                        </footer>
                    )}
                </>
            )}

            {/* QR Code Modal - Centered */}
            <Modal
                title={
                    <span style={{
                        color: '#ffffff',
                        fontSize: '18px',
                        fontWeight: '600'
                    }}>
                        Connect WhatsApp Device
                    </span>
                }
                open={showQR}
                onCancel={() => {
                    setShowQR(false)
                    setSelectedInstanceId(null)
                    setQrCode('')
                }}
                footer={null}
                width={800}
                centered
                destroyOnClose
                styles={{
                    header: {
                        backgroundColor: 'transparent',
                        borderBottom: 'none',
                        padding: '20px 24px 0'
                    },
                    content: {
                        background: '#0a0a0a',
                        border: '1px solid #1a1a1a',
                        borderRadius: '12px'
                    },
                    mask: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)'
                    }
                }}
            >
                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            {qrCode ? (
                                <div style={{
                                    background: '#ffffff',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    display: 'inline-block',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <img src={qrCode} alt="QR Code" style={{ maxWidth: '300px', width: '100%' }} />
                                </div>
                            ) : (
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
                                    <Text style={{ marginTop: '16px', color: '#888888' }}>Waiting for QR code...</Text>
                                </div>
                            )}
                        </div>
                    </Col>

                    <Col xs={24} lg={12}>
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
                                items={[
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
                                ]}
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
                    </Col>
                </Row>
            </Modal>

            {/* Success Modal - Centered */}
            <Modal
                title={
                    <div style={{
                        textAlign: 'center',
                        padding: '20px 0 10px',
                        background: 'transparent'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            marginBottom: '8px'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: '#25D366',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <span style={{
                                    color: '#ffffff',
                                    fontSize: '20px',
                                    fontWeight: 'bold'
                                }}>
                                    W
                                </span>
                            </div>
                            <CheckCircleOutlined style={{
                                color: '#52c41a',
                                fontSize: '32px'
                            }} />
                        </div>
                        <Title level={3} style={{
                            color: '#ffffff',
                            margin: 0,
                            fontSize: '20px'
                        }}>
                            Connected Successfully!
                        </Title>
                    </div>
                }
                open={showSuccessDialog}
                onCancel={() => setShowSuccessDialog(false)}
                footer={[
                    <StyledButton
                        key="continue"
                        variant="primary"
                        onClick={() => setShowSuccessDialog(false)}
                    >
                        Continue
                    </StyledButton>
                ]}
                width={400}
                centered
                destroyOnClose
                styles={{
                    header: {
                        backgroundColor: 'transparent',
                        borderBottom: 'none',
                        padding: '0'
                    },
                    content: {
                        background: '#0a0a0a',
                        border: '1px solid #1a1a1a',
                        borderRadius: '12px'
                    },
                    mask: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)'
                    }
                }}
            >
                {connectedInstance && (
                    <div style={{ textAlign: 'center' }}>
                        <Avatar
                            size={80}
                            src={connectedInstance.whatsapp.profile}
                            icon={<PhoneOutlined />}
                            style={{
                                marginBottom: '16px',
                                border: '4px solid #52c41a',
                                background: '#1a1a1a'
                            }}
                        />
                        <Title level={4} style={{ margin: '8px 0', color: '#ffffff' }}>
                            {connectedInstance.whatsapp.phone || 'Unknown'}
                        </Title>
                        {connectedInstance.name && (
                            <Text style={{ color: '#888888' }}>{connectedInstance.name}</Text>
                        )}
                        <Alert
                            message="Your WhatsApp account is now successfully connected and ready to use!"
                            type="success"
                            showIcon
                            style={{
                                marginTop: '16px',
                                background: '#0f3a2e',
                                border: '1px solid #52c41a',
                                color: '#52c41a'
                            }}
                        />
                    </div>
                )}
            </Modal>

            {/* Edit Modal - Centered */}
            <Modal
                title={<span style={{ color: '#ffffff' }}>Edit Device Name</span>}
                open={showEditDialog}
                onOk={handleEditInstance}
                onCancel={() => {
                    setShowEditDialog(false)
                    setEditInstanceId(null)
                    setEditInstanceName('')
                    setSelectedInstance(null)
                }}
                confirmLoading={isProcessingEdit[editInstanceId]}
                okText="Save Changes"
                okButtonProps={{
                    disabled: !editInstanceName.trim(),
                    style: {
                        background: '#4a9eff',
                        borderColor: '#4a9eff'
                    }
                }}
                cancelButtonProps={{
                    style: {
                        background: '#1a1a1a',
                        borderColor: '#404040',
                        color: '#ffffff'
                    }
                }}
                centered
                destroyOnClose
                styles={{
                    header: {
                        backgroundColor: 'transparent',
                        borderBottom: 'none',
                        padding: '20px 24px 0'
                    },
                    content: {
                        background: '#0a0a0a',
                        border: '1px solid #1a1a1a',
                        borderRadius: '12px'
                    },
                    mask: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)'
                    }
                }}
            >
                {selectedInstance && (
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <Avatar
                            size={64}
                            src={selectedInstance.whatsapp.profile}
                            icon={<PhoneOutlined />}
                            style={{
                                marginBottom: '12px',
                                border: `4px solid ${selectedInstance.whatsapp.status === 'connected' ? '#52c41a' : '#ff4d4f'}`,
                                background: '#1a1a1a'
                            }}
                        />
                        <Text strong style={{ display: 'block', color: '#ffffff' }}>
                            {selectedInstance.whatsapp.phone || 'WhatsApp Device'}
                        </Text>
                    </div>
                )}

                <div>
                    <Text strong style={{ display: 'block', marginBottom: '8px', color: '#ffffff' }}>
                        Instance Name
                    </Text>
                    <Input
                        value={editInstanceName}
                        onChange={(e) => setEditInstanceName(e.target.value)}
                        placeholder="Enter device name"
                        style={{
                            background: '#1a1a1a',
                            borderColor: '#333333',
                            color: '#ffffff'
                        }}
                    />
                </div>
            </Modal>
        </div>
    )
})

export default Connection