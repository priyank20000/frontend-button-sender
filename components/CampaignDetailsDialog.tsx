"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, RefreshCw, Pause, Play, StopCircle, Loader2, Users, CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSocket } from "../hooks/useSocket";
import Cookies from 'js-cookie';

interface Campaign {
  _id: string;
  name: string;
  recipients: any[];
  status: 'completed' | 'failed' | 'processing' | 'paused' | 'stopped';
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  notExistMessages?: number;
  statistics?: {
    total: number;
    sent: number;
    failed: number;
    notExist: number;
  };
  instances?: any[];
  instanceIds?: string[];
  delayRange?: { start: number; end: number };
}

interface CampaignDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

export default function CampaignDetailsDialog({
  open,
  onOpenChange,
  campaign
}: CampaignDetailsDialogProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const recipientsPerPage = 10;
  const [recipientStatuses, setRecipientStatuses] = useState<string[]>([]);
  const [campaignData, setCampaignData] = useState<Campaign | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    message: 'Checking connection...',
    subMessage: '',
    connectedCount: 0,
    totalCount: 0
  });
  const [delayRange, setDelayRange] = useState<{ start: number; end: number }>({ start: 1, end: 1 });

  // Control refs
  const isStoppingRef = useRef(false);
  const isPausingRef = useRef(false);
  const isResumingRef = useRef(false);
  
  // Cleanup refs
  const instanceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State tracking refs
  const hasLoadedDetailsRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const socketListenersSetupRef = useRef(false);
  const campaignStarted = useRef(false);
  const lastFetchTime = useRef(0);

  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    const cookieToken = Cookies.get('token');
    if (cookieToken) return cookieToken;
    return localStorage.getItem('token');
  }, []);

  const token = getToken();

  const { on, off, isConnected } = useSocket({
    token,
    onConnect: () => console.log('Socket connected for campaign details'),
    onDisconnect: () => console.log('Socket disconnected'),
    onError: (error) => console.error('Socket error:', error),
  });

  // Debounced instance fetching to prevent excessive API calls
  const fetchInstances = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime.current < 2000) { // Minimum 2 seconds between fetches
      return;
    }
    lastFetchTime.current = now;

    const authToken = getToken();
    if (!authToken) return;

    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/instance/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instance_status: 'connected' }),
      });

      if (response.status === 401) return;

      const data = await response.json();
      if (data.status) {
        const fetchedInstances = data.instances || [];
        setInstances(fetchedInstances);
        updateConnectionStatus(fetchedInstances);
      }
    } catch (err) {
      console.error('Error fetching instances:', err);
    }
  }, [getToken]);

  // Centralized connection status update
  const updateConnectionStatus = useCallback((instancesData: any[] = instances) => {
    if (selectedInstances.length === 0) {
      setConnectionStatus({
        isConnected: false,
        message: '❓ No Instances Selected',
        subMessage: 'No instances to monitor',
        connectedCount: 0,
        totalCount: 0
      });
      return;
    }

    const connectedInstances = selectedInstances.filter(instanceId => {
      const instance = instancesData.find(inst => inst._id === instanceId);
      return instance?.whatsapp?.status === 'connected';
    });

    const connectedCount = connectedInstances.length;
    const totalCount = selectedInstances.length;

    let status;
    if (connectedCount === 0) {
      status = {
        isConnected: false,
        message: '🚨 All Instances Disconnected',
        subMessage: `0 of ${totalCount} instances connected`,
        connectedCount,
        totalCount
      };
    } else if (connectedCount < totalCount) {
      status = {
        isConnected: false,
        message: '⚠️ Some Instances Disconnected',
        subMessage: `${connectedCount} of ${totalCount} instances connected`,
        connectedCount,
        totalCount
      };
    } else {
      status = {
        isConnected: true,
        message: '✅ All Instances Connected',
        subMessage: `${connectedCount} of ${totalCount} instances connected`,
        connectedCount,
        totalCount
      };
    }

    setConnectionStatus(status);

    // Auto-pause if all instances disconnect during processing
    if (connectedCount === 0 && isProcessing && campaignStarted.current) {
      console.log('🚨 ALL INSTANCES DISCONNECTED - AUTO-PAUSE');
      handleCampaignControl('pause');
    }
  }, [selectedInstances, instances, isProcessing]);

  const updateRecipientStatuses = useCallback((campaign: Campaign) => {
    if (!campaign.recipients) return [];
  
    const statuses = new Array(campaign.recipients.length).fill('pending');
    const sentCount = campaign.statistics?.sent || campaign.sentMessages || 0;
    const failedCount = campaign.statistics?.failed || campaign.failedMessages || 0;
    const notExistCount = campaign.statistics?.notExist || campaign.notExistMessages || 0;
  
    let index = 0;
  
    for (let i = 0; i < sentCount && index < statuses.length; i++, index++) {
      statuses[index] = 'sent';
    }
  
    for (let i = 0; i < failedCount && index < statuses.length; i++, index++) {
      statuses[index] = 'failed';
    }
  
    for (let i = 0; i < notExistCount && index < statuses.length; i++, index++) {
      statuses[index] = 'not_exist';
    }
  
    if (campaign.status === 'stopped') {
      for (let i = 0; i < statuses.length; i++) {
        if (statuses[i] === 'pending') {
          statuses[i] = 'stopped';
        }
      }
    }
  
    campaign.recipients.forEach((recipient: any, idx: number) => {
      if (recipient.status && recipient.status !== 'pending' && statuses[idx] !== 'stopped') {
        statuses[idx] = recipient.status === 'not_exist' ? 'not_exist' : recipient.status;
      }
    });
  
    return statuses;
  }, []);

  const loadCampaignDetails = useCallback(async (campaignId: string, forceRefresh = false) => {
    if (!token || (hasLoadedDetailsRef.current && !forceRefresh)) return;
  
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`https://whatsapp.recuperafly.com/api/template/message/get`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: campaignId }),
      });
  
      if (response.ok) {
        const data = await response.json();
        console.log('Detailed campaign data:', data);
  
        if (data.status && data.message) {
          const detailedCampaign = data.message;
          const newDelayRange = detailedCampaign.delayRange || { start: 1, end: 1 };
  
          setCampaignData((prev) => ({
            ...prev,
            ...detailedCampaign,
            totalMessages: detailedCampaign.statistics?.total || detailedCampaign.recipients?.length || 0,
            sentMessages: detailedCampaign.statistics?.sent || 0,
            failedMessages: detailedCampaign.statistics?.failed || 0,
            notExistMessages: detailedCampaign.statistics?.notExist || 0,
            delayRange: newDelayRange,
            instanceIds: detailedCampaign.instanceIds || prev?.instanceIds || [],
          }));
  
          setDelayRange(newDelayRange);
          
          // Update selected instances only if not already set
          if (detailedCampaign.instanceIds && selectedInstances.length === 0) {
            setSelectedInstances(detailedCampaign.instanceIds);
          }
  
          const statuses = updateRecipientStatuses(detailedCampaign);
          setRecipientStatuses(statuses);
  
          setIsPaused(detailedCampaign.status === 'paused');
          setIsStopped(detailedCampaign.status === 'stopped');
          setIsProcessing(detailedCampaign.status === 'processing');
          
          if (detailedCampaign.status === 'processing' || detailedCampaign.status === 'paused') {
            campaignStarted.current = true;
          }
          
          hasLoadedDetailsRef.current = true;
  
          if ((detailedCampaign.status === 'completed' || detailedCampaign.status === 'stopped') && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            if (autoRefreshTimeoutRef.current) {
              clearTimeout(autoRefreshTimeoutRef.current);
            }
            autoRefreshTimeoutRef.current = setTimeout(() => {
              console.log('Final auto-refresh for completed/stopped campaign');
              loadCampaignDetails(campaignId, true);
              autoRefreshTimeoutRef.current = null;
            }, 2000);
          }
        }
      }
    } catch (error) {
      console.error('Error loading campaign details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [token, updateRecipientStatuses, selectedInstances]);

  // Initialize campaign data when modal opens
  useEffect(() => {
    if (campaign && open && !hasLoadedDetailsRef.current) {
      console.log('Initializing campaign data:', campaign.name);
      
      setCampaignData(campaign);
      setSelectedInstances(campaign.instanceIds || []);
      setIsPaused(campaign.status === 'paused');
      setIsStopped(campaign.status === 'stopped');
      setIsProcessing(campaign.status === 'processing');
      setDelayRange(campaign.delayRange || { start: 1, end: 1 });
      
      hasCompletedRef.current = campaign.status === 'completed' || campaign.status === 'stopped';
      
      if (campaign.status === 'processing' || campaign.status === 'paused') {
        campaignStarted.current = true;
      }
      
      // Load details and fetch instances
      loadCampaignDetails(campaign._id);
      fetchInstances();
    }
  }, [campaign, open, loadCampaignDetails, fetchInstances]);

  // Setup instance monitoring when instances are selected
  useEffect(() => {
    if (open && selectedInstances.length > 0) {
      // Update connection status immediately
      updateConnectionStatus();
      
      // Set up polling interval (reduced frequency)
      if (instanceCheckIntervalRef.current) {
        clearInterval(instanceCheckIntervalRef.current);
      }
      
      instanceCheckIntervalRef.current = setInterval(() => {
        fetchInstances();
      }, 5000); // Reduced to 5 seconds instead of 1 second
      
      return () => {
        if (instanceCheckIntervalRef.current) {
          clearInterval(instanceCheckIntervalRef.current);
          instanceCheckIntervalRef.current = null;
        }
      };
    }
  }, [open, selectedInstances, updateConnectionStatus, fetchInstances]);

  // Update connection status when instances change
  useEffect(() => {
    if (selectedInstances.length > 0) {
      updateConnectionStatus();
    }
  }, [instances, selectedInstances, updateConnectionStatus]);

  // Socket event handlers
  const handleCampaignProgress = useCallback((data: any) => {
    if (!campaignData || data.campaignId !== campaignData._id) return;

    console.log('Campaign progress update:', data);

    setCampaignData((prev) =>
      prev
        ? {
            ...prev,
            status: data.status,
            sentMessages: data.sent || 0,
            failedMessages: data.failed || 0,
            notExistMessages: data.notExist || 0,
            totalMessages: data.total || prev.totalMessages,
            delayRange: data.delayRange || prev.delayRange,
            instanceIds: data.instanceIds || prev.instanceIds || [],
          }
        : null
    );

    if (data.lastRecipient && data.lastMessageStatus && campaignData) {
      const recipientIndex = campaignData.recipients.findIndex(
        (r) => r.name === data.lastRecipient || r.phone === data.lastRecipient
      );
      if (recipientIndex !== -1) {
        setRecipientStatuses((prev) => {
          const newStatuses = [...prev];
          newStatuses[recipientIndex] = data.lastMessageStatus;
          return newStatuses;
        });
      }
    }

    // Update campaign state
    if (data.status === 'completed') {
      setIsProcessing(false);
      setIsPaused(false);
      setIsStopped(false);
      campaignStarted.current = false;
      isStoppingRef.current = false;
      isPausingRef.current = false;
      isResumingRef.current = false;
    } else if (data.status === 'stopped') {
      setIsProcessing(false);
      setIsPaused(false);
      setIsStopped(true);
      campaignStarted.current = false;
      isStoppingRef.current = false;
      isPausingRef.current = false;
      isResumingRef.current = false;
    } else if (data.status === 'processing') {
      setIsProcessing(true);
      setIsPaused(false);
      setIsStopped(false);
      campaignStarted.current = true;
      isStoppingRef.current = false;
      isPausingRef.current = false;
      isResumingRef.current = false;
    } else if (data.status === 'paused') {
      setIsProcessing(false);
      setIsPaused(true);
      setIsStopped(false);
      isStoppingRef.current = false;
      isPausingRef.current = false;
      isResumingRef.current = false;
    }
  }, [campaignData]);

  const handleCampaignComplete = useCallback((data: any) => {
    if (!campaignData || data.campaignId !== campaignData._id) return;

    console.log('Campaign completed:', data);

    setCampaignData((prev) =>
      prev
        ? {
            ...prev,
            status: 'completed',
            sentMessages: data.sent || 0,
            failedMessages: data.failed || 0,
            notExistMessages: data.notExist || 0,
          }
        : null
    );

    setIsProcessing(false);
    setIsPaused(false);
    setIsStopped(false);
    campaignStarted.current = false;
    isStoppingRef.current = false;
    isPausingRef.current = false;
    isResumingRef.current = false;
  }, [campaignData]);

  const handleCampaignStopped = useCallback((data: any) => {
    if (!campaignData || data.campaignId !== campaignData._id) return;

    console.log('Campaign stopped:', data);

    setIsStopped(true);
    setIsProcessing(false);
    setIsPaused(false);
    campaignStarted.current = false;
    isStoppingRef.current = false;
    isPausingRef.current = false;
    isResumingRef.current = false;

    setCampaignData((prev) =>
      prev
        ? {
            ...prev,
            status: 'stopped',
            sentMessages: data.sent || prev.sentMessages,
            failedMessages: data.failed || prev.failedMessages,
            notExistMessages: data.notExist || prev.notExistMessages,
          }
        : null
    );

    setRecipientStatuses((prev) => {
      const newStatuses = [...prev];
      return newStatuses.map((status) => (status === 'pending' ? 'stopped' : status));
    });
  }, [campaignData]);

  const handleCampaignPaused = useCallback((data: any) => {
    if (!campaignData || data.campaignId !== campaignData._id) return;

    console.log('Campaign paused:', data);

    setIsPaused(true);
    setIsProcessing(false);
    setIsStopped(false);
    isStoppingRef.current = false;
    isPausingRef.current = false;
    isResumingRef.current = false;

    setCampaignData((prev) => 
      prev 
        ? { 
            ...prev, 
            status: 'paused',
            delayRange: data.delayRange || prev.delayRange,
            instanceIds: data.instanceIds || prev.instanceIds || [],
          } 
        : null
    );
  }, [campaignData]);

  const handleCampaignResumed = useCallback((data: any) => {
    if (!campaignData || data.campaignId !== campaignData._id) return;

    console.log('Campaign resumed:', data);

    setIsPaused(false);
    setIsProcessing(true);
    setIsStopped(false);
    campaignStarted.current = true;
    isStoppingRef.current = false;
    isPausingRef.current = false;
    isResumingRef.current = false;

    setCampaignData((prev) => 
      prev 
        ? { 
            ...prev, 
            status: 'processing',
            delayRange: data.delayRange || prev.delayRange,
            instanceIds: data.instanceIds || prev.instanceIds || [],
          } 
        : null
    );
  }, [campaignData]);

  // Setup socket listeners
  useEffect(() => {
    if (!isConnected || !campaignData || socketListenersSetupRef.current) return;

    console.log('Setting up socket listeners for campaign:', campaignData._id);
    socketListenersSetupRef.current = true;

    on('campaign.progress', handleCampaignProgress);
    on('campaign.complete', handleCampaignComplete);
    on('campaign.stopped', handleCampaignStopped);
    on('campaign.paused', handleCampaignPaused);
    on('campaign.resumed', handleCampaignResumed);

    return () => {
      console.log('Cleaning up socket listeners for campaign:', campaignData._id);
      off('campaign.progress', handleCampaignProgress);
      off('campaign.complete', handleCampaignComplete);
      off('campaign.stopped', handleCampaignStopped);
      off('campaign.paused', handleCampaignPaused);
      off('campaign.resumed', handleCampaignResumed);
      socketListenersSetupRef.current = false;
    };
  }, [isConnected, campaignData?._id, on, off, handleCampaignProgress, handleCampaignComplete, handleCampaignStopped, handleCampaignPaused, handleCampaignResumed]);

  const refreshCampaignDetails = async () => {
    if (!campaignData || !token) return;

    setIsRefreshing(true);
    hasLoadedDetailsRef.current = false;
    try {
      await loadCampaignDetails(campaignData._id, true);
      await fetchInstances();
    } catch (error) {
      console.error('Error refreshing campaign details:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCampaignControl = useCallback(async (action: 'stop' | 'pause' | 'resume') => {
    if (!campaignData) return;

    if (action === 'stop' && isStoppingRef.current) return;
    if (action === 'pause' && isPausingRef.current) return;
    if (action === 'resume' && isResumingRef.current) return;

    if (action === 'resume' && connectionStatus.connectedCount === 0) {
      console.log('Cannot resume: No instances are connected');
      return;
    }

    if (action === 'stop') {
      isStoppingRef.current = true;
    } else if (action === 'pause') {
      isPausingRef.current = true;
    } else {
      isResumingRef.current = true;
    }

    // Optimistic UI updates
    if (action === 'stop') {
      setIsProcessing(false);
      setIsPaused(false);
      setIsStopped(true);
      setCampaignData((prev) => (prev ? { ...prev, status: 'stopped' } : null));
    } else if (action === 'pause') {
      setIsProcessing(false);
      setIsPaused(true);
      setIsStopped(false);
      setCampaignData((prev) => (prev ? { ...prev, status: 'paused' } : null));
    } else {
      setIsProcessing(true);
      setIsPaused(false);
      setIsStopped(false);
      campaignStarted.current = true;
      setCampaignData((prev) => (prev ? { ...prev, status: 'processing' } : null));
    }

    try {
      const authToken = getToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const payload = {
        campaignId: campaignData._id,
        action,
        ...(action === 'resume' && { delayRange }),
      };

      console.log('Sending campaign control payload:', payload);

      const response = await fetch('https://whatsapp.recuperafly.com/api/template/campaign/control', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (result.status) {
        console.log(`Campaign ${action} signal sent successfully`);
        if (action === 'resume') {
          setCampaignData((prev) => 
            prev 
              ? { ...prev, delayRange } 
              : null
          );
        }
      } else {
        console.error(`Campaign ${action} failed:`, result.message);
        // Revert optimistic updates on failure
        if (action === 'stop') {
          setIsProcessing(true);
          setIsPaused(false);
          setIsStopped(false);
          isStoppingRef.current = false;
          setCampaignData((prev) => (prev ? { ...prev, status: 'processing' } : null));
        } else if (action === 'pause') {
          setIsProcessing(true);
          setIsPaused(false);
          setIsStopped(false);
          isPausingRef.current = false;
          setCampaignData((prev) => (prev ? { ...prev, status: 'processing' } : null));
        } else {
          setIsProcessing(false);
          setIsPaused(true);
          setIsStopped(false);
          isResumingRef.current = false;
          campaignStarted.current = false;
          setCampaignData((prev) => (prev ? { ...prev, status: 'paused' } : null));
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
      // Revert optimistic updates on error
      if (action === 'stop') {
        setIsProcessing(true);
        setIsPaused(false);
        setIsStopped(false);
        isStoppingRef.current = false;
        setCampaignData((prev) => (prev ? { ...prev, status: 'processing' } : null));
      } else if (action === 'pause') {
        setIsProcessing(true);
        setIsPaused(false);
        setIsStopped(false);
        isPausingRef.current = false;
        setCampaignData((prev) => (prev ? { ...prev, status: 'processing' } : null));
      } else {
        setIsProcessing(false);
        setIsPaused(true);
        setIsStopped(false);
        isResumingRef.current = false;
        campaignStarted.current = false;
        setCampaignData((prev) => (prev ? { ...prev, status: 'paused' } : null));
      }
    }
  }, [campaignData, getToken, connectionStatus.connectedCount, delayRange]);

  const handleStopCampaign = useCallback(() => handleCampaignControl('stop'), [handleCampaignControl]);
  const handlePauseCampaign = useCallback(() => handleCampaignControl('pause'), [handleCampaignControl]);
  const handleResumeCampaign = useCallback(() => handleCampaignControl('resume'), [handleCampaignControl]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      console.log('Modal closed, resetting state');
      hasLoadedDetailsRef.current = false;
      hasCompletedRef.current = false;
      socketListenersSetupRef.current = false;
      campaignStarted.current = false;
      lastFetchTime.current = 0;
      
      setCurrentPage(1);
      setRecipientStatuses([]);
      setIsRefreshing(false);
      setIsPaused(false);
      setIsStopped(false);
      setIsProcessing(false);
      setIsLoadingDetails(false);
      setStatusFilter('all');
      setInstances([]);
      setSelectedInstances([]);
      setConnectionStatus({
        isConnected: false,
        message: 'Checking connection...',
        subMessage: '',
        connectedCount: 0,
        totalCount: 0
      });
      setDelayRange({ start: 1, end: 1 });
      
      isStoppingRef.current = false;
      isPausingRef.current = false;
      isResumingRef.current = false;
      
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
        autoRefreshTimeoutRef.current = null;
      }

      if (instanceCheckIntervalRef.current) {
        clearInterval(instanceCheckIntervalRef.current);
        instanceCheckIntervalRef.current = null;
      }
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
      if (instanceCheckIntervalRef.current) {
        clearInterval(instanceCheckIntervalRef.current);
      }
    };
  }, []);

  if (!campaignData) return null;

  const filteredRecipients = campaignData.recipients?.filter((recipient, index) => {
    if (statusFilter === 'all') return true;
    const status = recipientStatuses[index] || 'pending';
    return status === statusFilter;
  }) || [];

  const totalRecipients = filteredRecipients.length;
  const totalPages = Math.ceil(totalRecipients / recipientsPerPage);
  const indexOfLastRecipient = currentPage * recipientsPerPage;
  const indexOfFirstRecipient = indexOfLastRecipient - recipientsPerPage;
  const currentRecipients = filteredRecipients.slice(indexOfFirstRecipient, indexOfLastRecipient);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const getRecipientStatus = (recipient: any) => {
    const originalIndex = campaignData.recipients?.indexOf(recipient) || 0;
    return recipientStatuses[originalIndex] || 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-500/10 text-green-400';
      case 'failed':
        return 'bg-red-500/10 text-red-400';
      case 'not_exist':
        return 'bg-orange-500/10 text-orange-400';
      case 'stopped':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'failed':
        return 'Failed';
      case 'not_exist':
        return 'Not on WhatsApp';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Pending';
    }
  };

  const sentCount = recipientStatuses.filter(status => status === 'sent').length;
  const failedCount = recipientStatuses.filter(status => status === 'failed').length;
  const notExistCount = recipientStatuses.filter(status => status === 'not_exist').length;

  const canResume = isPaused && connectionStatus.connectedCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Campaign Details: {campaignData.name}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                View the recipients and status for this campaign
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {isProcessing && (
                <>
                  <Button
                    onClick={handlePauseCampaign}
                    disabled={isPausingRef.current}
                    variant="outline"
                    size="sm"
                    className="bg-yellow-600/20 border-yellow-500 text-yellow-400 hover:bg-yellow-600/30 transition-all duration-75"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    {isPausingRef.current ? 'Pausing...' : 'Pause'}
                  </Button>
                  <Button
                    onClick={handleStopCampaign}
                    disabled={isStoppingRef.current}
                    variant="outline"
                    size="sm"
                    className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 transition-all duration-75"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    {isStoppingRef.current ? 'Stopping...' : 'Stop'}
                  </Button>
                </>
              )}
              {isPaused && (
                <>
                  <Button
                    onClick={handleResumeCampaign}
                    disabled={isResumingRef.current || !canResume}
                    variant="outline"
                    size="sm"
                    className={`transition-all duration-75 ${
                      canResume 
                        ? 'bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30' 
                        : 'bg-gray-600/20 border-gray-500 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isResumingRef.current ? 'Resuming...' : 
                     !canResume && connectionStatus.connectedCount === 0 ? 'Waiting for Connection' : 'Resume'}
                  </Button>
                  <Button
                    onClick={handleStopCampaign}
                    disabled={isStoppingRef.current}
                    variant="outline"
                    size="sm"
                    className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 transition-all duration-75"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    {isStoppingRef.current ? 'Stopping...' : 'Stop'}
                  </Button>
                </>
              )}
              {isStopped && (
                <div className="text-red-400 text-sm font-medium flex items-center gap-2">
                  <StopCircle className="h-4 w-4" />
                  Campaign Stopped
                </div>
              )}
              <Button
                onClick={refreshCampaignDetails}
                disabled={isRefreshing || isLoadingDetails}
                variant="outline"
                size="sm"
                className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || isLoadingDetails) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Connection Status */}
          {campaignStarted.current && selectedInstances.length > 0 && (
            <div className={`p-4 rounded-lg border ${connectionStatus.isConnected ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex items-center gap-3">
                {connectionStatus.isConnected ? (
                  <Wifi className="h-5 w-5 text-green-400" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-400" />
                )}
                <div>
                  <p className={`text-sm font-medium ${connectionStatus.isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {connectionStatus.message}
                  </p>
                  <p className={`text-xs ${connectionStatus.isConnected ? 'text-green-300' : 'text-red-300'}`}>
                    {connectionStatus.subMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Stopped Banner */}
          {isStopped && (
            <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/20">
              <div className="flex items-center gap-3">
                <StopCircle className="h-5 w-5 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">
                    🛑 Campaign Stopped
                  </p>
                  <p className="text-xs text-red-300">
                    Campaign has been permanently stopped and cannot be resumed
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delay Configuration */}
          {isPaused && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Adjust Delay Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-400">Start Delay (seconds)</Label>
                  <Input
                    type="number"
                    value={delayRange.start}
                    onChange={(e) => setDelayRange({ ...delayRange, start: parseInt(e.target.value) || 1 })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200"
                    min="1"
                    disabled={!canResume}
                  />
                </div>
                <div>
                  <Label className="text-zinc-400">End Delay (seconds)</Label>
                  <Input
                    type="number"
                    value={delayRange.end}
                    onChange={(e) => setDelayRange({ ...delayRange, end: parseInt(e.target.value) || 1 })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200"
                    min="1"
                    disabled={!canResume}
                  />
                </div>
              </div>
            </div>
          )}

          {isLoadingDetails && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-zinc-400">Loading campaign details...</span>
            </div>
          )}

          {!isLoadingDetails && (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{campaignData.totalMessages}</div>
                    <div className="text-sm text-blue-300">Total</div>
                  </div>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{sentCount}</div>
                    <div className="text-sm text-green-300">Sent</div>
                  </div>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{failedCount}</div>
                    <div className="text-sm text-red-300">Failed</div>
                  </div>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{notExistCount}</div>
                    <div className="text-sm text-orange-300">Error</div>
                  </div>
                </div>
              </div>

              {/* Recipients Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-200">Recipients ({campaignData.recipients?.length || 0})</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setStatusFilter('all');
                        setCurrentPage(1);
                      }}
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      className={statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-gray-700'}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      All ({campaignData.recipients?.length || 0})
                    </Button>
                    <Button
                      onClick={() => {
                        setStatusFilter('sent');
                        setCurrentPage(1);
                      }}
                      variant={statusFilter === 'sent' ? 'default' : 'outline'}
                      size="sm"
                      className={statusFilter === 'sent' ? 'bg-green-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-gray-700'}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Sent ({sentCount})
                    </Button>
                    <Button
                      onClick={() => {
                        setStatusFilter('failed');
                        setCurrentPage(1);
                      }}
                      variant={statusFilter === 'failed' ? 'default' : 'outline'}
                      size="sm"
                      className={statusFilter === 'failed' ? 'bg-red-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-gray-700'}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Failed ({failedCount})
                    </Button>
                    <Button
                      onClick={() => {
                        setStatusFilter('not_exist');
                        setCurrentPage(1);
                      }}
                      variant={statusFilter === 'not_exist' ? 'default' : 'outline'}
                      size="sm"
                      className={statusFilter === 'not_exist' ? 'bg-orange-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-gray-700'}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Error ({notExistCount})
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-700">
                        <TableHead className="text-zinc-400">SN</TableHead>
                        <TableHead className="text-zinc-400">Name</TableHead>
                        <TableHead className="text-zinc-400">Phone</TableHead>
                        <TableHead className="text-zinc-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentRecipients.map((recipient, index) => {
                        const globalIndex = indexOfFirstRecipient + index;
                        const status = getRecipientStatus(recipient);

                        return (
                          <TableRow key={`${recipient.phone}-${index}`} className="border-zinc-700">
                            <TableCell className="text-zinc-200">{globalIndex + 1}</TableCell>
                            <TableCell className="text-zinc-200 font-medium">{recipient.name}</TableCell>
                            <TableCell className="text-zinc-200">{recipient.phone}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                                {getStatusText(status)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-zinc-700 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 text-sm">
                        Showing {indexOfFirstRecipient + 1}-{Math.min(indexOfLastRecipient, totalRecipients)} of {totalRecipients} recipients
                        {statusFilter !== 'all' && (
                          <Badge variant="outline" className="ml-2 text-zinc-300">
                            {statusFilter === 'sent' && 'Sent'}
                            {statusFilter === 'failed' && 'Failed'}
                            {statusFilter === 'not_exist' && 'Error'}
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ${
                          currentPage === 1
                            ? 'text-zinc-600 cursor-not-allowed'
                            : 'text-zinc-400 hover:text-white hover:bg-gray-700'
                        }`}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let page;
                          if (totalPages <= 5) {
                            page = i + 1;
                          } else if (currentPage <= 3) {
                            page = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            page = totalPages - 4 + i;
                          } else {
                            page = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`h-9 w-9 rounded-full transition-all duration-200 ${
                                currentPage === page
                                  ? 'bg-zinc-700 text-white hover:bg-gray-600'
                                  : 'bg-transparent hover:bg-gray-700 text-zinc-400 hover:text-white'
                              }`}
                              aria-label={`Page ${page}`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ${
                          currentPage === totalPages
                            ? 'text-zinc-600 cursor-not-allowed'
                            : 'text-zinc-400 hover:text-white hover:bg-gray-700'
                        }`}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}