import { useState, useEffect, useCallback, useRef } from 'react'
import { useSocket } from './useSocket'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { message } from 'antd'

export const useCampaignRealtime = (campaignId) => {
  const [campaign, setCampaign] = useState(null)
  const [recipientStatuses, setRecipientStatuses] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isStopped, setIsStopped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [delayRange, setDelayRange] = useState({ start: 3, end: 5 })
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isLoading: false,
    connectedCount: 0,
    totalCount: 0,
    message: '',
    subMessage: ''
  })
  const [controlStates, setControlStates] = useState({
    isPausing: false,
    isResuming: false,
    isStopping: false
  })
  const [isStarting, setIsStarting] = useState(false)

  const { user } = useAuth()
  const token = localStorage.getItem('token')
  const lastUpdateRef = useRef(0)

  // Socket connection
  const { emit, on, off, isConnected } = useSocket({
    token,
    onConnect: () => {
      console.log('Socket connected for campaign tracking')
    },
    onDisconnect: () => {
      console.log('Socket disconnected')
    },
    onError: (error) => {
      console.error('Socket error:', error)
    }
  })

  // Fetch campaign details
  const fetchCampaignDetails = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    
    try {
      const response = await api.post('/template/message/get', { id: campaignId })
      
      if (response.data.status) {
        const campaignData = response.data.message
        setCampaign(campaignData)
        
        // Initialize recipient statuses
        const statuses = campaignData.recipients?.map(recipient => recipient.status || 'pending') || []
        setRecipientStatuses(statuses)
        
        // Update campaign state
        const status = campaignData.status
        setIsProcessing(status === 'processing')
        setIsPaused(status === 'paused')
        setIsStopped(status === 'stop' || status === 'stopped')
        
        // Update delay range if available
        if (campaignData.settings?.delayRange || campaignData.delayRange) {
          setDelayRange(campaignData.settings?.delayRange || campaignData.delayRange)
        }
        
        // Check connection status for instances
        if (campaignData.instanceIds?.length > 0) {
          await checkInstanceConnections(campaignData.instanceIds)
        }
      } else {
        message.error(response.data.message || 'Failed to fetch campaign details')
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
      message.error('Failed to load campaign details')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [campaignId])

  // Check instance connections
  const checkInstanceConnections = useCallback(async (instanceIds) => {
    setConnectionStatus(prev => ({ ...prev, isLoading: true }))
    
    try {
      const response = await api.post('/instance/all', { page: 0, limit: 100 })
      
      if (response.data.status) {
        const allInstances = response.data.instances || []
        const campaignInstances = allInstances.filter(instance => 
          instanceIds.includes(instance._id)
        )
        
        const connectedInstances = campaignInstances.filter(instance => 
          instance.whatsapp?.status === 'connected'
        )
        
        const connectedCount = connectedInstances.length
        const totalCount = campaignInstances.length
        const isConnected = connectedCount > 0
        
        setConnectionStatus({
          isConnected,
          isLoading: false,
          connectedCount,
          totalCount,
          message: isConnected 
            ? `${connectedCount}/${totalCount} instances connected`
            : 'No instances connected',
          subMessage: isConnected
            ? 'Campaign can proceed with connected instances'
            : 'Please connect at least one instance to continue'
        })
      }
    } catch (error) {
      console.error('Error checking instance connections:', error)
      setConnectionStatus(prev => ({
        ...prev,
        isLoading: false,
        message: 'Failed to check instance status',
        subMessage: 'Please refresh to check connection status'
      }))
    }
  }, [])

  // Socket event handlers
  useEffect(() => {
    if (!isConnected || !campaignId) return

    const handleCampaignProgress = (data) => {
      if (data.campaignId !== campaignId) return
      
      const now = Date.now()
      if (now - lastUpdateRef.current < 1000) return // Throttle updates
      lastUpdateRef.current = now
      
      // Update recipient statuses based on progress
      setRecipientStatuses(prev => {
        const newStatuses = [...prev]
        if (data.lastRecipientIndex !== undefined && data.lastMessageStatus) {
          newStatuses[data.lastRecipientIndex] = data.lastMessageStatus
        }
        return newStatuses
      })
      
      // Update processing state
      setIsProcessing(true)
      setIsPaused(false)
      setIsStopped(false)
    }

    const handleCampaignComplete = (data) => {
      if (data.campaignId !== campaignId) return
      
      setIsProcessing(false)
      setIsPaused(false)
      setIsStopped(data.status === 'stop' || data.status === 'stopped')
      
      // Refresh campaign details to get final state
      fetchCampaignDetails(false)
      
      message.success('Campaign completed!')
    }

    const handleCampaignPaused = (data) => {
      if (data.campaignId !== campaignId) return
      
      setIsProcessing(false)
      setIsPaused(true)
      setIsStopped(false)
      
      message.info('Campaign paused')
    }

    const handleCampaignResumed = (data) => {
      if (data.campaignId !== campaignId) return
      
      setIsProcessing(true)
      setIsPaused(false)
      setIsStopped(false)
      
      message.success('Campaign resumed')
    }

    const handleCampaignStopped = (data) => {
      if (data.campaignId !== campaignId) return
      
      setIsProcessing(false)
      setIsPaused(false)
      setIsStopped(true)
      
      message.warning('Campaign stopped')
    }

    // Listen for campaign events
    on('campaign.progress', handleCampaignProgress)
    on('campaign.complete', handleCampaignComplete)
    on('campaign.paused', handleCampaignPaused)
    on('campaign.resumed', handleCampaignResumed)
    on('campaign.stopped', handleCampaignStopped)

    return () => {
      off('campaign.progress', handleCampaignProgress)
      off('campaign.complete', handleCampaignComplete)
      off('campaign.paused', handleCampaignPaused)
      off('campaign.resumed', handleCampaignResumed)
      off('campaign.stopped', handleCampaignStopped)
    }
  }, [isConnected, campaignId, on, off, fetchCampaignDetails])

  // Campaign control functions
  const handleStopCampaign = useCallback(async () => {
    setControlStates(prev => ({ ...prev, isStopping: true }))
    
    try {
      const response = await api.post('/campaign/stop', { campaignId })
      
      if (response.data.status) {
        setIsStopped(true)
        setIsProcessing(false)
        setIsPaused(false)
        message.success('Campaign stopped successfully')
      } else {
        message.error(response.data.message || 'Failed to stop campaign')
      }
    } catch (error) {
      console.error('Error stopping campaign:', error)
      message.error('Failed to stop campaign')
    } finally {
      setControlStates(prev => ({ ...prev, isStopping: false }))
    }
  }, [campaignId])

  const handlePauseCampaign = useCallback(async () => {
    setControlStates(prev => ({ ...prev, isPausing: true }))
    
    try {
      const response = await api.post('/campaign/pause', { campaignId })
      
      if (response.data.status) {
        setIsPaused(true)
        setIsProcessing(false)
        message.success('Campaign paused successfully')
      } else {
        message.error(response.data.message || 'Failed to pause campaign')
      }
    } catch (error) {
      console.error('Error pausing campaign:', error)
      message.error('Failed to pause campaign')
    } finally {
      setControlStates(prev => ({ ...prev, isPausing: false }))
    }
  }, [campaignId])

  const handleResumeCampaign = useCallback(async () => {
    setControlStates(prev => ({ ...prev, isResuming: true }))
    
    try {
      const response = await api.post('/campaign/resume', { campaignId })
      
      if (response.data.status) {
        setIsProcessing(true)
        setIsPaused(false)
        message.success('Campaign resumed successfully')
      } else {
        message.error(response.data.message || 'Failed to resume campaign')
      }
    } catch (error) {
      console.error('Error resuming campaign:', error)
      message.error('Failed to resume campaign')
    } finally {
      setControlStates(prev => ({ ...prev, isResuming: false }))
    }
  }, [campaignId])

  const handleStartCampaign = useCallback(async () => {
    setIsStarting(true)
    
    try {
      const response = await api.post('/campaign/send', { campaignId })
      
      if (response.data.status) {
        setIsProcessing(true)
        setIsPaused(false)
        setIsStopped(false)
        message.success('Campaign started successfully')
      } else {
        message.error(response.data.message || 'Failed to start campaign')
      }
    } catch (error) {
      console.error('Error starting campaign:', error)
      message.error('Failed to start campaign')
    } finally {
      setIsStarting(false)
    }
  }, [campaignId])

  const refreshCampaignDetails = useCallback(() => {
    setIsRefreshing(true)
    fetchCampaignDetails(false)
  }, [fetchCampaignDetails])

  // Initial load
  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetails()
    }
  }, [campaignId, fetchCampaignDetails])

  return {
    campaign,
    recipientStatuses,
    isProcessing,
    isPaused,
    isStopped,
    isLoading,
    isRefreshing,
    statusFilter,
    setStatusFilter,
    delayRange,
    setDelayRange,
    connectionStatus,
    controlStates,
    handleStopCampaign,
    handlePauseCampaign,
    handleResumeCampaign,
    refreshCampaignDetails,
    handleStartCampaign,
    isStarting,
  }
}