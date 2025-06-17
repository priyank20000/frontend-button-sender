"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from 'lucide-react';
import { useSocket } from "../hooks/useSocket";
import Cookies from 'js-cookie';

// Import sub-components
import CampaignStatusCard from './campaign-details/CampaignStatusCard';
import CampaignControlButtons from './campaign-details/CampaignControlButtons';
import CampaignStats from './campaign-details/CampaignStats';
import DelayConfiguration from './campaign-details/DelayConfiguration';
import RecipientsTable from './campaign-details/RecipientsTable';

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
  const [campaignData, setCampaignData] = useState<Campaign | null>(campaign);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [instancesDisconnected, setInstancesDisconnected] = useState(false);
  const [disconnectionReason, setDisconnectionReason] = useState<string>('');
  const [canResumeAfterReconnect, setCanResumeAfterReconnect] = useState(false);
  const [delayRange, setDelayRange] = useState<{ start: number; end: number }>(
    campaign?.delayRange || { start: 1, end: 1 }
  );

  const isStoppingRef = useRef(false);
  const isPausingRef = useRef(false);
  const isResumingRef = useRef(false);
  const lastProgressUpdateRef = useRef<number>(0);
  const hasLoadedDetailsRef = useRef(false);
  const autoRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const socketListenersSetupRef = useRef(false);
  const instanceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastInstanceStatusRef = useRef<{ [key: string]: string }>({});
  const campaignStarted = useRef(false);

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

  const fetchInstances = useCallback(async () => {
    const authToken = getToken();
    if (!authToken) return;

    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/instance/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.status === 401) return;

      const data = await response.json();
      if (data.status) {
        const fetchedInstances = data.instances || [];
        setInstances(fetchedInstances);

        if (selectedInstances.length > 0) {
          checkInstanceConnectionsImmediate(fetchedInstances);
        }
      }
    } catch (err) {
      console.error('Error fetching instances:', err);
    }
  }, [getToken, selectedInstances]);

  const checkInstanceConnectionsImmediate = useCallback((instancesData?: any[]) => {
    const instancesToCheck = instancesData || instances;

    if (!campaignStarted.current || !selectedInstances.length) return;

    const currentInstanceStatuses: { [key: string]: string } = {};
    selectedInstances.forEach(instanceId => {
      const instance = instancesToCheck.find(inst => inst._id === instanceId);
      currentInstanceStatuses[instanceId] = instance?.whatsapp?.status || 'disconnected';
    });

    const connectedInstances = selectedInstances.filter(instanceId =>
      currentInstanceStatuses[instanceId] === 'connected'
    );

    const disconnectedInstances = selectedInstances.filter(instanceId =>
      currentInstanceStatuses[instanceId] !== 'connected'
    );

    if (connectedInstances.length === 0 && (isProcessing || campaignData?.status === 'processing')) {
      console.log('🚨 ALL INSTANCES DISCONNECTED - INSTANT AUTO-PAUSE');

      setInstancesDisconnected(true);
      setDisconnectionReason(`All ${disconnectedInstances.length} selected instance(s) disconnected`);
      setIsProcessing(false);
      setIsPaused(true);
      setIsStopped(false);
      setCanResumeAfterReconnect(false);

      setCampaignData(prev => prev ? ({
        ...prev,
        status: 'paused'
      }) : null);

      if (campaignData?._id) {
        const authToken = getToken();
        if (authToken) {
          fetch('https://whatsapp.recuperafly.com/api/template/campaign/control', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              campaignId: campaignData._id,
              action: 'pause'
            })
          }).catch(error => {
            console.error('Failed to send auto-pause signal:', error);
          });
        }
      }
    } else if (connectedInstances.length > 0 && instancesDisconnected && isPaused) {
      console.log('✅ Instances reconnected, ready to resume');

      setInstancesDisconnected(false);
      setCanResumeAfterReconnect(true);
      setDisconnectionReason('');
    } else if (disconnectedInstances.length > 0 && connectedInstances.length > 0) {
      console.log('⚠️ Some instances disconnected');
      setInstancesDisconnected(false);
      setDisconnectionReason(`${disconnectedInstances.length} of ${selectedInstances.length} instances disconnected`);
    } else if (connectedInstances.length === selectedInstances.length && selectedInstances.length > 0) {
      console.log('✅ All instances connected');
      setInstancesDisconnected(false);
      setDisconnectionReason('');
      if (isPaused && !isProcessing) {
        setCanResumeAfterReconnect(true);
      }
    }

    lastInstanceStatusRef.current = currentInstanceStatuses;
  }, [campaignStarted.current, selectedInstances, instances, isProcessing, isPaused, instancesDisconnected, campaignData, getToken]);

  const checkInstanceConnections = useCallback(() => {
    checkInstanceConnectionsImmediate();
  }, [checkInstanceConnectionsImmediate]);

  useEffect(() => {
    if (campaignData && selectedInstances.length > 0) {
      const initialStatuses: { [key: string]: string } = {};
      selectedInstances.forEach(instanceId => {
        const instance = instances.find(inst => inst._id === instanceId);
        initialStatuses[instanceId] = instance?.whatsapp?.status || 'disconnected';
      });
      lastInstanceStatusRef.current = initialStatuses;

      checkInstanceConnectionsImmediate();
    }
  }, [campaignData, selectedInstances, instances, checkInstanceConnectionsImmediate]);

  useEffect(() => {
    if (open && selectedInstances.length > 0) {
      checkInstanceConnections();

      instanceCheckIntervalRef.current = setInterval(() => {
        fetchInstances();
      }, 1000);

      return () => {
        if (instanceCheckIntervalRef.current) {
          clearInterval(instanceCheckIntervalRef.current);
          instanceCheckIntervalRef.current = null;
        }
      };
    } else if (instanceCheckIntervalRef.current) {
      clearInterval(instanceCheckIntervalRef.current);
      instanceCheckIntervalRef.current = null;
    }
  }, [open, selectedInstances, checkInstanceConnections, fetchInstances]);

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

        if (data.status && data.message) {
          const detailedCampaign = data.message;

          const newDelayRange = campaign?.delayRange || detailedCampaign.delayRange || { start: 1, end: 1 };

          setCampaignData((prev) => ({
            ...prev,
            ...detailedCampaign,
            totalMessages: detailedCampaign.statistics?.total || detailedCampaign.recipients?.length || 0,
            sentMessages: detailedCampaign.statistics?.sent || 0,
            failedMessages: detailedCampaign.statistics?.failed || 0,
            notExistMessages: detailedCampaign.statistics?.notExist || 0,
            delayRange: newDelayRange,
          }));

          setDelayRange(newDelayRange);

          if (detailedCampaign.instanceIds) {
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

          if (!hasLoadedDetailsRef.current) {
            hasLoadedDetailsRef.current = true;
          }

          if ((detailedCampaign.status === 'completed' || detailedCampaign.status === 'stopped') && !hasCompletedRef.current && !autoRefreshTimeoutRef.current) {
            hasCompletedRef.current = true;
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
  }, [token, updateRecipientStatuses, campaign?.delayRange]);

  useEffect(() => {
    if (campaign && open && !hasLoadedDetailsRef.current) {
      setCampaignData(campaign);
      setIsPaused(campaign.status === 'paused');
      setIsStopped(campaign.status === 'stopped');
      setIsProcessing(campaign.status === 'processing');
      setDelayRange(campaign.delayRange || { start: 1, end: 1 });
      hasCompletedRef.current = campaign.status === 'completed' || campaign.status === 'stopped';

      if (campaign.status === 'processing' || campaign.status === 'paused') {
        campaignStarted.current = true;
      }

      loadCampaignDetails(campaign._id);
      fetchInstances();
    }
  }, [campaign, open, loadCampaignDetails, fetchInstances]);

  const handleCampaignProgress = useCallback(
    (data: any) => {
      if (!campaignData || data.campaignId !== campaignData._id) return;

      const now = Date.now();
      if (now - lastProgressUpdateRef.current < 500) return;
      lastProgressUpdateRef.current = now;

      if (data.instancesDisconnected !== undefined) {
        setInstancesDisconnected(data.instancesDisconnected);
        if (data.instancesDisconnected) {
          setDisconnectionReason('Instances disconnected during campaign');
          setCanResumeAfterReconnect(false);
        } else {
          setDisconnectionReason('');
          setCanResumeAfterReconnect(data.status === 'paused');
        }
      }

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

      if (data.status === 'completed') {
        setIsProcessing(false);
        setIsPaused(false);
        setIsStopped(false);
        setInstancesDisconnected(false);
        setCanResumeAfterReconnect(false);
        campaignStarted.current = false;
        isStoppingRef.current = false;
        isPausingRef.current = false;
        isResumingRef.current = false;
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setTimeout(() => {
            loadCampaignDetails(data.campaignId, true);
          }, 1000);
        }
      } else if (data.status === 'stopped') {
        setIsProcessing(false);
        setIsPaused(false);
        setIsStopped(true);
        setInstancesDisconnected(false);
        setCanResumeAfterReconnect(false);
        campaignStarted.current = false;
        isStoppingRef.current = false;
        isPausingRef.current = false;
        isResumingRef.current = false;
        setRecipientStatuses((prev) => {
          const newStatuses = [...prev];
          return newStatuses.map((status) => (status === 'pending' ? 'stopped' : status));
        });
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
    },
    [campaignData, loadCampaignDetails]
  );

  const handleCampaignComplete = useCallback(
    (data: any) => {
      if (!campaignData || data.campaignId !== campaignData._id) return;

      setCampaignData((prev) =>
        prev
          ? {
            ...prev,
            status: 'completed',
            sentMessages: data.sent || 0,
            failedMessages: data.failed || 0,
            notExistMessages: data.notExist || 0,
            delayRange: data.delayRange || prev.delayRange,
          }
          : null
      );

      setIsProcessing(false);
      setIsPaused(false);
      setIsStopped(false);
      setInstancesDisconnected(false);
      setCanResumeAfterReconnect(false);
      campaignStarted.current = false;
      isStoppingRef.current = false;
      isPausingRef.current = false;
      isResumingRef.current = false;

      setRecipientStatuses((prev) => {
        const newStatuses = [...prev];
        const sentCount = data.sent || 0;
        const failedCount = data.failed || 0;
        const notExistCount = data.notExist || 0;

        let index = 0;

        for (let i = 0; i < sentCount && index < newStatuses.length; i++, index++) {
          newStatuses[index] = 'sent';
        }

        for (let i = 0; i < failedCount && index < newStatuses.length; i++, index++) {
          newStatuses[index] = 'failed';
        }

        for (let i = 0; i < notExistCount && index < newStatuses.length; i++, index++) {
          newStatuses[index] = 'not_exist';
        }

        return newStatuses;
      });

      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        setTimeout(() => {
          loadCampaignDetails(data.campaignId, true);
        }, 1500);
      }
    },
    [campaignData, loadCampaignDetails]
  );

  const handleCampaignStopped = useCallback(
    (data: any) => {
      if (!campaignData || data.campaignId !== campaignData._id) return;

      setIsStopped(true);
      setIsProcessing(false);
      setIsPaused(false);
      setInstancesDisconnected(false);
      setCanResumeAfterReconnect(false);
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
            delayRange: data.delayRange || prev.delayRange,
          }
          : null
      );

      setRecipientStatuses((prev) => {
        const newStatuses = [...prev];
        return newStatuses.map((status) => (status === 'pending' ? 'stopped' : status));
      });
    },
    [campaignData]
  );

  const handleCampaignPaused = useCallback(
    (data: any) => {
      if (!campaignData || data.campaignId !== campaignData._id) return;

      setIsPaused(true);
      setIsProcessing(false);
      setIsStopped(false);
      isStoppingRef.current = false;
      isPausingRef.current = false;
      isResumingRef.current = false;

      if (data.instancesDisconnected) {
        setInstancesDisconnected(true);
        setDisconnectionReason('Campaign paused due to instance disconnection');
        setCanResumeAfterReconnect(false);
      }

      setCampaignData((prev) =>
        prev
          ? {
            ...prev,
            status: 'paused',
            delayRange: data.delayRange || prev.delayRange,
          }
          : null
      );
    },
    [campaignData]
  );

  const handleCampaignResumed = useCallback(
    (data: any) => {
      if (!campaignData || data.campaignId !== campaignData._id) return;

      setIsPaused(false);
      setIsProcessing(true);
      setIsStopped(false);
      setInstancesDisconnected(false);
      setCanResumeAfterReconnect(false);
      setDisconnectionReason('');
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
          }
          : null
      );
    },
    [campaignData]
  );

  useEffect(() => {
    if (!isConnected || !campaignData || socketListenersSetupRef.current) return;

    socketListenersSetupRef.current = true;

    on('campaign.progress', handleCampaignProgress);
    on('campaign.complete', handleCampaignComplete);
    on('campaign.stopped', handleCampaignStopped);
    on('campaign.paused', handleCampaignPaused);
    on('campaign.resumed', handleCampaignResumed);

    return () => {
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

  const handleCampaignControl = useCallback(
    async (action: 'stop' | 'pause' | 'resume') => {
      if (!campaignData) return;

      if (action === 'stop' && isStoppingRef.current) return;
      if (action === 'pause' && isPausingRef.current) return;
      if (action === 'resume' && isResumingRef.current) return;

      if (action === 'resume' && instancesDisconnected) {
        const connectedInstances = instances.filter(instance =>
          selectedInstances.includes(instance._id) && instance.whatsapp?.status === 'connected'
        );

        if (connectedInstances.length === 0) {
          console.log('Cannot resume: No instances are connected');
          return;
        }
      }

      if (action === 'stop') {
        isStoppingRef.current = true;
      } else if (action === 'pause') {
        isPausingRef.current = true;
      } else {
        isResumingRef.current = true;
      }

      if (action === 'stop') {
        setIsProcessing(false);
        setIsPaused(false);
        setIsStopped(true);
        setCampaignData((prev) => (prev ? { ...prev, status: 'stopped' } : null));
        setRecipientStatuses((prev) => {
          const newStatuses = [...prev];
          return newStatuses.map((status) => (status === 'pending' ? 'stopped' : status));
        });
      } else if (action === 'pause') {
        setIsProcessing(false);
        setIsPaused(true);
        setIsStopped(false);
        setCampaignData((prev) => (prev ? { ...prev, status: 'paused' } : null));
      } else {
        setIsProcessing(true);
        setIsPaused(false);
        setIsStopped(false);
        setInstancesDisconnected(false);
        setCanResumeAfterReconnect(false);
        setDisconnectionReason('');
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
          // Revert state on failure
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
        // Revert state on error
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
    },
    [campaignData, getToken, instancesDisconnected, instances, selectedInstances, delayRange]
  );

  const handleStopCampaign = useCallback(() => handleCampaignControl('stop'), [handleCampaignControl]);
  const handlePauseCampaign = useCallback(() => handleCampaignControl('pause'), [handleCampaignControl]);
  const handleResumeCampaign = useCallback(() => handleCampaignControl('resume'), [handleCampaignControl]);

  useEffect(() => {
    if (!open) {
      hasLoadedDetailsRef.current = false;
      hasCompletedRef.current = false;
      socketListenersSetupRef.current = false;
      campaignStarted.current = false;
      setCurrentPage(1);
      setRecipientStatuses([]);
      setIsRefreshing(false);
      setIsPaused(false);
      setIsStopped(false);
      setIsProcessing(false);
      setIsLoadingDetails(false);
      setStatusFilter('all');
      setInstancesDisconnected(false);
      setDisconnectionReason('');
      setCanResumeAfterReconnect(false);
      setSelectedInstances([]);
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

  const getConnectedInstancesCount = () => {
    return instances.filter(instance =>
      selectedInstances.includes(instance._id) && instance.whatsapp?.status === 'connected'
    ).length;
  };

  const canResume = isPaused && !instancesDisconnected && getConnectedInstancesCount() > 0;

  const connectionStatus = getConnectedInstancesCount() === 0 && selectedInstances.length > 0
    ? {
      isConnected: false,
      message: '🚨 All Instances Disconnected - Campaign Auto-Paused',
      subMessage: `0 of ${selectedInstances.length} instances connected`
    }
    : getConnectedInstancesCount() < selectedInstances.length && selectedInstances.length > 0
      ? {
        isConnected: false,
        message: '⚠️ Some Instances Disconnected',
        subMessage: `${getConnectedInstancesCount()} of ${selectedInstances.length} instances connected`
      }
      : selectedInstances.length > 0
        ? {
          isConnected: true,
          message: '✅ All Instances Connected',
          subMessage: `${getConnectedInstancesCount()} of ${selectedInstances.length} instances connected`
        }
        : {
          isConnected: false,
          message: '❓ No Instances Selected',
          subMessage: 'No instances to monitor'
        };

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
              <CampaignControlButtons
                isProcessing={isProcessing}
                isPaused={isPaused}
                isStopped={isStopped}
                canResume={canResume}
                onPause={handlePauseCampaign}
                onStop={handleStopCampaign}
                onResume={handleResumeCampaign}
              />
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
          <CampaignStatusCard
            connectionStatus={connectionStatus}
            isProcessing={isProcessing}
            isPaused={isPaused}
            isStopped={isStopped}
            instancesDisconnected={instancesDisconnected}
            disconnectionReason={disconnectionReason}
          />

          {/* Delay Configuration for Paused Campaigns */}
          {isPaused && (
            <DelayConfiguration
              delayRange={delayRange}
              setDelayRange={setDelayRange}
              canResume={canResume}
            />
          )}

          {/* Loading State */}
          {isLoadingDetails && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-zinc-400">Loading campaign details...</span>
            </div>
          )}

          {/* Campaign Statistics */}
          {!isLoadingDetails && (
            <>
              <CampaignStats
                totalMessages={campaignData.totalMessages}
                recipientStatuses={recipientStatuses}
              />

              {/* Recipients Table */}
              <RecipientsTable
                recipients={campaignData.recipients || []}
                recipientStatuses={recipientStatuses}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                recipientsPerPage={recipientsPerPage}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}