
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, Loader2, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Clock, MessageSquare, Pause, Play, StopCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSocket } from "../../hooks/useSocket";
import Cookies from 'js-cookie';

interface FinalStepProps {
  campaignName: string;
  selectedTemplate: string;
  selectedInstances: string[];
  antdContacts: any[];
  delayRange: { start: number; end: number };
  templates: any[];
  instances: any[];
  onSendCampaign: () => void;
  isSending: boolean;
  onClose: () => void | Promise<void>;
  onBack?: () => void;
}

interface CampaignProgress {
  campaignId: string;
  total: number;
  sent: number;
  failed?: number;
  notExist?: number;
  status: 'processing' | 'completed' | 'pending' | 'paused' | 'stopped';
  currentRecipient?: string;
  lastMessageStatus?: 'sent' | 'failed' | 'not_exist' | 'paused' | 'stopped' | 'ready_to_resume';
  lastRecipient?: string;
  canStop?: boolean;
  canPause?: boolean;
  canResume?: boolean;
  instancesDisconnected?: boolean;
}

export default function FinalStep({
  campaignName,
  selectedTemplate,
  selectedInstances,
  antdContacts,
  delayRange,
  templates,
  instances,
  onSendCampaign,
  isSending,
  onClose,
  onBack
}: FinalStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recipientsPerPage] = useState(10);
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress>({ 
    campaignId: '', 
    total: antdContacts.length, 
    sent: 0, 
    failed: 0,
    notExist: 0,
    status: 'pending' 
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [recipientStatuses, setRecipientStatuses] = useState<string[]>(new Array(antdContacts.length).fill('pending'));
  const [existingNumbers, setExistingNumbers] = useState(0);
  const [nonExistingNumbers, setNonExistingNumbers] = useState(0);
  const [campaignStarted, setCampaignStarted] = useState(false);
  const [instancesDisconnected, setInstancesDisconnected] = useState(false);
  const [disconnectionReason, setDisconnectionReason] = useState<string>('');
  const [canResumeAfterReconnect, setCanResumeAfterReconnect] = useState(false);
  
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isStoppingRef = useRef(false);
  const isPausingRef = useRef(false);
  const isResumingRef = useRef(false);
  const lastProgressUpdateRef = useRef<number>(0);
  const instanceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastInstanceStatusRef = useRef<{ [key: string]: string }>({});

<<<<<<< HEAD
=======
  // Get token for socket connection
>>>>>>> main
  const getToken = useCallback((): string | null => {
    const cookieToken = Cookies.get('token');
    if (cookieToken) return cookieToken;
    return localStorage.getItem('token');
  }, []);

  const token = getToken();

<<<<<<< HEAD
  const { emit, on, off, isConnected, reconnect } = useSocket({
=======
  // Socket connection for real-time updates
  const { emit, on, off, isConnected } = useSocket({
>>>>>>> main
    token,
    onConnect: () => {
      console.log('Socket connected for campaign tracking');
      if (currentCampaignId) {
        on('campaign.progress', handleCampaignProgress);
        on('campaign.complete', handleCampaignComplete);
        on('campaign.stopped', handleCampaignStopped);
        on('campaign.paused', handleCampaignPaused);
        on('campaign.resumed', handleCampaignResumed);
      }
    },
    onDisconnect: () => {
      console.log('Socket disconnected');
     
    },
    onError: (error) => {
      console.error('Socket error:', error);
    }
  });

<<<<<<< HEAD
  const fetchCampaignStatus = useCallback(async () => {
    try {
      const authToken = getToken();
      if (!authToken || !currentCampaignId) return;

      const response = await fetch(`https://whatsapp.recuperafly.com/api/template/campaign/${currentCampaignId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.status && result.campaign) {
        setCampaignProgress(prev => ({
          ...prev,
          status: result.campaign.status,
          sent: result.campaign.sent || 0,
          failed: result.campaign.failed || 0,
          notExist: result.campaign.notExist || 0,
          instancesDisconnected: result.campaign.instancesDisconnected || false,
        }));

        if (result.campaign.status === 'stopped') {
          setIsProcessing(false);
          setIsStopped(true);
          setIsPaused(false);
          setInstancesDisconnected(false);
          setCanResumeAfterReconnect(false);
          setRecipientStatuses(prev => {
            const newStatuses = [...prev];
            return newStatuses.map(status => (status === 'pending' ? 'stopped' : status));
          });
        }
      }
    } catch (error) {
      console.error('Error fetching campaign status:', error);
    }
  }, [currentCampaignId, getToken]);

  const checkInstanceConnections = useCallback(() => {
    if (!campaignStarted || !selectedInstances.length || !isProcessing) return;

=======
  // ULTRA-FAST instance monitoring with INSTANT disconnect detection
  const checkInstanceConnections = useCallback(() => {
    if (!campaignStarted || !selectedInstances.length || !isProcessing) return;

    // Get current status of all selected instances
>>>>>>> main
    const currentInstanceStatuses: { [key: string]: string } = {};
    selectedInstances.forEach(instanceId => {
      const instance = instances.find(inst => inst._id === instanceId);
      currentInstanceStatuses[instanceId] = instance?.whatsapp?.status || 'disconnected';
    });

<<<<<<< HEAD
=======
    // Check if any instance status changed from connected to disconnected
>>>>>>> main
    let anyDisconnected = false;
    selectedInstances.forEach(instanceId => {
      const previousStatus = lastInstanceStatusRef.current[instanceId];
      const currentStatus = currentInstanceStatuses[instanceId];
      
      if (previousStatus === 'connected' && currentStatus !== 'connected') {
        console.log(`🚨 INSTANT DETECTION: Instance ${instanceId} disconnected!`);
        anyDisconnected = true;
      }
    });

<<<<<<< HEAD
=======
    // Update the reference for next check
>>>>>>> main
    lastInstanceStatusRef.current = currentInstanceStatuses;

    const connectedInstances = selectedInstances.filter(instanceId => 
      currentInstanceStatuses[instanceId] === 'connected'
    );
    
    const disconnectedInstances = selectedInstances.filter(instanceId => 
      currentInstanceStatuses[instanceId] !== 'connected'
    );

<<<<<<< HEAD
    if (connectedInstances.length === 0 && isProcessing && !instancesDisconnected) {
      console.log('🚨 ALL INSTANCES DISCONNECTED - INSTANT AUTO-PAUSE');
      
=======
    // INSTANT AUTO-PAUSE: If all selected instances are disconnected during active campaign
    if (connectedInstances.length === 0 && isProcessing && !instancesDisconnected) {
      console.log('🚨 ALL INSTANCES DISCONNECTED - INSTANT AUTO-PAUSE');
      
      // IMMEDIATE UI UPDATE - No delays, no waiting
>>>>>>> main
      setInstancesDisconnected(true);
      setDisconnectionReason(`All ${disconnectedInstances.length} selected instance(s) disconnected`);
      setIsProcessing(false);
      setIsPaused(true);
      setCanResumeAfterReconnect(false);
      
<<<<<<< HEAD
=======
      // Update campaign progress to show disconnection IMMEDIATELY
>>>>>>> main
      setCampaignProgress(prev => ({
        ...prev,
        status: 'paused',
        instancesDisconnected: true
      }));

<<<<<<< HEAD
=======
      // Send pause signal to backend (fire and forget - don't wait)
>>>>>>> main
      if (currentCampaignId) {
        const authToken = getToken();
        if (authToken) {
          fetch('https://whatsapp.recuperafly.com/api/template/campaign/control', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              campaignId: currentCampaignId,
              action: 'pause'
            })
          }).catch(error => {
            console.error('Failed to send auto-pause signal:', error);
          });
        }
      }
<<<<<<< HEAD
    } else if (connectedInstances.length > 0 && instancesDisconnected && isPaused) {
=======
    } 
    // If instances reconnect while campaign is paused due to disconnection
    else if (connectedInstances.length > 0 && instancesDisconnected && isPaused) {
>>>>>>> main
      console.log('✅ Instances reconnected, ready to resume');
      
      setInstancesDisconnected(false);
      setCanResumeAfterReconnect(true);
      setDisconnectionReason('');
      
<<<<<<< HEAD
=======
      // Update campaign progress to show ready to resume
>>>>>>> main
      setCampaignProgress(prev => ({
        ...prev,
        instancesDisconnected: false,
        lastMessageStatus: 'ready_to_resume'
      }));
    }
  }, [campaignStarted, selectedInstances, instances, isProcessing, isPaused, instancesDisconnected, currentCampaignId, getToken]);

<<<<<<< HEAD
  useEffect(() => {
    if (campaignStarted && selectedInstances.length > 0) {
=======
  // Initialize instance status tracking when campaign starts
  useEffect(() => {
    if (campaignStarted && selectedInstances.length > 0) {
      // Initialize the reference with current statuses
>>>>>>> main
      const initialStatuses: { [key: string]: string } = {};
      selectedInstances.forEach(instanceId => {
        const instance = instances.find(inst => inst._id === instanceId);
        initialStatuses[instanceId] = instance?.whatsapp?.status || 'disconnected';
      });
      lastInstanceStatusRef.current = initialStatuses;
    }
  }, [campaignStarted, selectedInstances, instances]);

<<<<<<< HEAD
  useEffect(() => {
    if (campaignStarted && isProcessing) {
      checkInstanceConnections();
=======
  // Start ULTRA-AGGRESSIVE instance monitoring when campaign starts
  useEffect(() => {
    if (campaignStarted && isProcessing) {
      // Check immediately
      checkInstanceConnections();
      
      // Set up ULTRA-FREQUENT interval for INSTANT detection (every 500ms)
>>>>>>> main
      instanceCheckIntervalRef.current = setInterval(checkInstanceConnections, 500);
      
      return () => {
        if (instanceCheckIntervalRef.current) {
          clearInterval(instanceCheckIntervalRef.current);
          instanceCheckIntervalRef.current = null;
        }
      };
    } else if (instanceCheckIntervalRef.current) {
<<<<<<< HEAD
=======
      // Clear interval when not processing
>>>>>>> main
      clearInterval(instanceCheckIntervalRef.current);
      instanceCheckIntervalRef.current = null;
    }
  }, [campaignStarted, isProcessing, checkInstanceConnections]);

<<<<<<< HEAD
=======
  // Cleanup interval on unmount
>>>>>>> main
  useEffect(() => {
    return () => {
      if (instanceCheckIntervalRef.current) {
        clearInterval(instanceCheckIntervalRef.current);
      }
    };
  }, []);

<<<<<<< HEAD
  const handleCampaignProgress = useCallback((data: any) => {
    if (data.campaignId !== currentCampaignId) return;

    const now = Date.now();
    if (now - lastProgressUpdateRef.current < 500) return;
    lastProgressUpdateRef.current = now;

=======
  // Enhanced progress handler with disconnect handling
  const handleCampaignProgress = useCallback((data: any) => {
    if (data.campaignId !== currentCampaignId) return;

    // Throttle updates for better performance with large numbers
    const now = Date.now();
    if (now - lastProgressUpdateRef.current < 500) {
      return;
    }
    lastProgressUpdateRef.current = now;

    // Handle disconnection status from backend
>>>>>>> main
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

<<<<<<< HEAD
=======
    // Batch state updates for better performance
>>>>>>> main
    setCampaignProgress(prev => ({
      ...prev,
      campaignId: data.campaignId,
      total: data.total,
      sent: data.sent,
      failed: data.failed || 0,
      notExist: data.notExist || 0,
      status: data.status,
      currentRecipient: data.currentRecipient,
      lastMessageStatus: data.lastMessageStatus,
      lastRecipient: data.lastRecipient,
      canStop: data.canStop,
      canPause: data.canPause,
      canResume: data.canResume,
      instancesDisconnected: data.instancesDisconnected
    }));

<<<<<<< HEAD
=======
    // Update recipient status efficiently with batch updates
>>>>>>> main
    if (data.lastRecipient && data.lastMessageStatus) {
      const recipientIndex = antdContacts.findIndex(contact => contact.name === data.lastRecipient);
      if (recipientIndex !== -1) {
        setRecipientStatuses(prev => {
          const newStatuses = [...prev];
          newStatuses[recipientIndex] = data.lastMessageStatus;
          return newStatuses;
        });
      }
    }

<<<<<<< HEAD
    setExistingNumbers(data.sent);
    setNonExistingNumbers(data.notExist || 0);

=======
    // Update counts
    setExistingNumbers(data.sent);
    setNonExistingNumbers(data.notExist || 0);

    // Update state flags and reset control flags
>>>>>>> main
    if (data.status === 'completed') {
      setIsProcessing(false);
      setIsCompleted(true);
      setIsPaused(false);
      setIsStopped(false);
      setInstancesDisconnected(false);
      setCanResumeAfterReconnect(false);
      isStoppingRef.current = false;
      isPausingRef.current = false;
      isResumingRef.current = false;
    } else if (data.status === 'stopped') {
      setIsProcessing(false);
      setIsStopped(true);
      setIsPaused(false);
      setInstancesDisconnected(false);
      setCanResumeAfterReconnect(false);
      isStoppingRef.current = false;
      isPausingRef.current = false;
      isResumingRef.current = false;
    } else if (data.status === 'processing') {
      setIsProcessing(true);
      setIsPaused(false);
      setIsStopped(false);
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
  }, [currentCampaignId, antdContacts]);

  const handleCampaignComplete = useCallback((data: any) => {
    if (data.campaignId !== currentCampaignId) return;
    
    setIsProcessing(false);
    setIsCompleted(true);
    setIsPaused(false);
    setIsStopped(false);
    setInstancesDisconnected(false);
    setCanResumeAfterReconnect(false);
    isStoppingRef.current = false;
    isPausingRef.current = false;
    isResumingRef.current = false;
    
<<<<<<< HEAD
    setExistingNumbers(data.sent);
    setNonExistingNumbers(data.notExist || 0);
    
=======
    // Final count update
    setExistingNumbers(data.sent);
    setNonExistingNumbers(data.notExist || 0);
    
    // Final status update for all remaining recipients
>>>>>>> main
    setCampaignProgress(prev => ({
      ...prev,
      status: 'completed',
      sent: data.sent,
      failed: data.failed || 0,
      notExist: data.notExist || 0,
      instancesDisconnected: false
    }));
  }, [currentCampaignId]);
  
  const handleCampaignStopped = useCallback((data: any) => {
    if (data.campaignId !== currentCampaignId) return;
    
    setIsStopped(true);
    setIsProcessing(false);
    setIsPaused(false);
    setInstancesDisconnected(false);
    setCanResumeAfterReconnect(false);
    isStoppingRef.current = false;
    isPausingRef.current = false;
    isResumingRef.current = false;
    
    setCampaignProgress(prev => ({
      ...prev,
      status: 'stopped',
      instancesDisconnected: false
    }));
  
<<<<<<< HEAD
=======
    // Update recipient statuses: set "stopped" for all pending recipients
>>>>>>> main
    setRecipientStatuses(prev => {
      const newStatuses = [...prev];
      return newStatuses.map(status => (status === 'pending' ? 'stopped' : status));
    });
  }, [currentCampaignId]);

  const handleCampaignPaused = useCallback((data: any) => {
    if (data.campaignId !== currentCampaignId) return;
    
    setIsPaused(true);
    setIsProcessing(false);
    setIsStopped(false);
    isStoppingRef.current = false;
    isPausingRef.current = false;
    isResumingRef.current = false;
    
<<<<<<< HEAD
=======
    // Handle disconnection-related pause
>>>>>>> main
    if (data.instancesDisconnected) {
      setInstancesDisconnected(true);
      setDisconnectionReason('Campaign paused due to instance disconnection');
      setCanResumeAfterReconnect(false);
    }
    
    setCampaignProgress(prev => ({
      ...prev,
      status: 'paused',
      canStop: data.canStop,
      canPause: data.canPause,
      canResume: data.canResume,
      instancesDisconnected: data.instancesDisconnected
    }));
  }, [currentCampaignId]);

  const handleCampaignResumed = useCallback((data: any) => {
    if (data.campaignId !== currentCampaignId) return;
    
    setIsPaused(false);
    setIsProcessing(true);
    setIsStopped(false);
    setInstancesDisconnected(false);
    setCanResumeAfterReconnect(false);
    setDisconnectionReason('');
    isStoppingRef.current = false;
    isPausingRef.current = false;
    isResumingRef.current = false;
    
    setCampaignProgress(prev => ({
      ...prev,
      status: 'processing',
      canStop: data.canStop,
      canPause: data.canPause,
      canResume: data.canResume,
      instancesDisconnected: false
    }));
  }, [currentCampaignId]);

<<<<<<< HEAD
=======
  // Listen for campaign progress updates
>>>>>>> main
  useEffect(() => {
    if (!isConnected || !currentCampaignId) return;

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
    };
  }, [isConnected, currentCampaignId, on, off, handleCampaignProgress, handleCampaignComplete, handleCampaignStopped, handleCampaignPaused, handleCampaignResumed]);

  const handleSendMessages = async () => {
<<<<<<< HEAD
    if (isLoading || isProcessing) return;

=======
    // Prevent multiple simultaneous requests
    if (isLoading || isProcessing) return;

    // Cancel any previous request
>>>>>>> main
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setIsProcessing(true);
    setIsCompleted(false);
    setIsPaused(false);
    setIsStopped(false);
    setCampaignStarted(true);
    setInstancesDisconnected(false);
    setCanResumeAfterReconnect(false);
    setDisconnectionReason('');
    setRecipientStatuses(new Array(antdContacts.length).fill('pending'));
    setExistingNumbers(0);
    setNonExistingNumbers(0);
    
    try {
      const authToken = getToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const payload = {
        name: campaignName,
        templateId: selectedTemplate,
        instanceIds: selectedInstances,
        recipients: antdContacts.map(contact => ({
          phone: contact.number,
          name: contact.name,
          variables: {
            var1: contact.var1 || '',
            var2: contact.var2 || '',
            var3: contact.var3 || '',
            var4: contact.var4 || '',
            var5: contact.var5 || '',
            var6: contact.var6 || '',
            var7: contact.var7 || '',
            var8: contact.var8 || '',
            var9: contact.var9 || '',
            var10: contact.var10 || '',
            var11: contact.var11 || '',
            var12: contact.var12 || '',
            var13: contact.var13 || '',
            var14: contact.var14 || '',
            var15: contact.var15 || '',
            var16: contact.var16 || '',
            var17: contact.var17 || '',
            var18: contact.var18 || '',
            var19: contact.var19 || '',
            var20: contact.var20 || '',
            var21: contact.var21 || '',
            var22: contact.var22 || '',
            var23: contact.var23 || '',
            var24: contact.var24 || '',
            var25: contact.var25 || '',
            var26: contact.var26 || '',
            var27: contact.var27 || '',
            var28: contact.var28 || '',
            var29: contact.var29 || '',
            var30: contact.var30 || '',
          }
        })),
        delayRange,
      };

      const response = await fetch('https://whatsapp.recuperafly.com/api/template/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });

      if (response.status === 401) {
        throw new Error('Authentication failed');
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.message || 'Failed to send campaign');
      }

      if (result.campaignId) {
        setCurrentCampaignId(result.campaignId);
      }

      setCampaignProgress({
        campaignId: result.campaignId || 'unknown',
        total: antdContacts.length,
        sent: 0,
        failed: 0,
        notExist: 0,
        status: 'processing'
      });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Error sending campaign:', err);
      setIsProcessing(false);
      setCampaignStarted(false);
<<<<<<< HEAD
=======
      // Handle error (you might want to show an error toast here)
>>>>>>> main
    } finally {
      setIsLoading(false);
    }
  };

<<<<<<< HEAD
=======
  // Enhanced campaign control with separate stop and pause
>>>>>>> main
  const handleCampaignControl = useCallback(async (action: 'stop' | 'pause' | 'resume') => {
    if (!currentCampaignId) return;
    
    // Prevent multiple simultaneous control actions
    if (action === 'stop' && isStoppingRef.current) return;
    if (action === 'pause' && isPausingRef.current) return;
    if (action === 'resume' && isResumingRef.current) return;

<<<<<<< HEAD
    if (action === 'stop' && isStoppingRef.current) return;
    if (action === 'pause' && isPausingRef.current) return;
    if (action === 'resume' && isResumingRef.current) return;

=======
    // For resume, check if instances are connected
>>>>>>> main
    if (action === 'resume' && instancesDisconnected) {
      const connectedInstances = instances.filter(instance => 
        selectedInstances.includes(instance._id) && instance.whatsapp?.status === 'connected'
      );
<<<<<<< HEAD
=======
      
>>>>>>> main
      if (connectedInstances.length === 0) {
        console.log('Cannot resume: No instances are connected');
        return;
      }
    }

<<<<<<< HEAD
    if (action === 'stop' && !isConnected) {
      console.warn('Socket disconnected, relying on polling for stop status');
      await fetchCampaignStatus();
    }

    if (action === 'stop') isStoppingRef.current = true;
    else if (action === 'pause') isPausingRef.current = true;
    else isResumingRef.current = true;

    try {
      const authToken = getToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://whatsapp.recuperafly.com/api/template/campaign/control', {
=======
    // Set control flags
    if (action === 'stop') {
      isStoppingRef.current = true;
    } else if (action === 'pause') {
      isPausingRef.current = true;
    } else {
      isResumingRef.current = true;
    }

    // INSTANT UI UPDATE - No waiting for server response
    if (action === 'stop') {
      setIsProcessing(false);
      setIsStopped(true);
      setIsPaused(false);
    } else if (action === 'pause') {
      setIsProcessing(false);
      setIsPaused(true);
      setIsStopped(false);
    } else {
      setIsProcessing(true);
      setIsPaused(false);
      setIsStopped(false);
      setInstancesDisconnected(false);
      setCanResumeAfterReconnect(false);
      setDisconnectionReason('');
    }

    // Send request in background without blocking UI
    try {
      const authToken = getToken();
      
      // Fire and forget with improved error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      fetch('https://whatsapp.recuperafly.com/api/template/campaign/control', {
>>>>>>> main
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          campaignId: currentCampaignId,
          action: action
        }),
        signal: controller.signal
<<<<<<< HEAD
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!result.status) {
        throw new Error(result.message || `Failed to ${action} campaign`);
      }

      if (action === 'stop') {
        setTimeout(() => {
          if (!isStopped) {
            console.log('Socket event not received, polling campaign status...');
            fetchCampaignStatus();
          }
        }, 5000);
      }

      if (action === 'stop') {
        setIsProcessing(false);
        setIsStopped(true);
        setIsPaused(false);
      } else if (action === 'pause') {
        setIsProcessing(false);
        setIsPaused(true);
        setIsStopped(false);
      } else {
        setIsProcessing(true);
        setIsPaused(false);
        setIsStopped(false);
        setInstancesDisconnected(false);
        setCanResumeAfterReconnect(false);
        setDisconnectionReason('');
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(`Error ${action}ing campaign:`, error);
        if (action === 'stop') {
          setIsProcessing(true);
          setIsStopped(false);
          fetchCampaignStatus();
        } else if (action === 'pause') {
          setIsProcessing(true);
          setIsPaused(false);
        } else {
          setIsProcessing(false);
          setIsPaused(true);
        }
      }
    } finally {
      if (action === 'stop') isStoppingRef.current = false;
      else if (action === 'pause') isPausingRef.current = false;
      else isResumingRef.current = false;
    }
  }, [currentCampaignId, getToken, instancesDisconnected, instances, selectedInstances, fetchCampaignStatus, isStopped, isConnected]);

  const handleStopCampaign = useCallback(() => handleCampaignControl('stop'), [handleCampaignControl]);
  const handlePauseCampaign = useCallback(() => handleCampaignControl('pause'), [handleCampaignControl]);
  const handleResumeCampaign = useCallback(() => handleCampaignControl('resume'), [handleCampaignControl]);

  const handleComplete = async () => {
    try {
      console.log('Starting handleComplete');
      await onClose();
      console.log('onClose completed');
      await router.push('/dashboard/messaging?refresh=true');
      console.log('Navigation completed');
    } catch (error) {
      console.error('Error in handleComplete:', error);
=======
      }).then(response => {
        clearTimeout(timeoutId);
        return response.json();
      })
        .then(result => {
          if (result.status) {
            console.log(`Campaign ${action} signal sent successfully`);
          } else {
            console.error(`Campaign ${action} failed:`, result.message);
            // Revert UI state if server request failed
            if (action === 'stop') {
              setIsProcessing(true);
              setIsStopped(false);
              isStoppingRef.current = false;
            } else if (action === 'pause') {
              setIsProcessing(true);
              setIsPaused(false);
              isPausingRef.current = false;
            } else {
              setIsProcessing(false);
              setIsPaused(true);
              isResumingRef.current = false;
            }
          }
        })
        .catch(error => {
          clearTimeout(timeoutId);
          if (error.name !== 'AbortError') {
            console.error(`Error ${action}ing campaign:`, error);
            // Revert UI state on error
            if (action === 'stop') {
              setIsProcessing(true);
              setIsStopped(false);
              isStoppingRef.current = false;
            } else if (action === 'pause') {
              setIsProcessing(true);
              setIsPaused(false);
              isPausingRef.current = false;
            } else {
              setIsProcessing(false);
              setIsPaused(true);
              isResumingRef.current = false;
            }
          }
        });

    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
      // Revert UI state on error
      if (action === 'stop') {
        setIsProcessing(true);
        setIsStopped(false);
        isStoppingRef.current = false;
      } else if (action === 'pause') {
        setIsProcessing(true);
        setIsPaused(false);
        isPausingRef.current = false;
      } else {
        setIsProcessing(false);
        setIsPaused(true);
        isResumingRef.current = false;
      }
>>>>>>> main
    }
  }, [currentCampaignId, getToken, instancesDisconnected, instances, selectedInstances]);

<<<<<<< HEAD
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (instanceCheckIntervalRef.current) {
        clearInterval(instanceCheckIntervalRef.current);
      }
    };
  }, []);
=======
  const handleStopCampaign = useCallback(() => handleCampaignControl('stop'), [handleCampaignControl]);
  const handlePauseCampaign = useCallback(() => handleCampaignControl('pause'), [handleCampaignControl]);
  const handleResumeCampaign = useCallback(() => handleCampaignControl('resume'), [handleCampaignControl]);

  const handleComplete = () => {
    onClose();
    router.push('/dashboard/messaging?refresh=true');
  };
>>>>>>> main

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (instanceCheckIntervalRef.current) {
        clearInterval(instanceCheckIntervalRef.current);
      }
    };
  }, []);

  const totalRecipients = antdContacts.length;
  const totalPages = Math.ceil(totalRecipients / recipientsPerPage);
  const indexOfLastRecipient = currentPage * recipientsPerPage;
  const indexOfFirstRecipient = indexOfLastRecipient - recipientsPerPage;
  const currentRecipients = antdContacts.slice(indexOfFirstRecipient, indexOfLastRecipient);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getProgressPercentage = () => {
    if (campaignProgress.total === 0) return 0;
    return Math.round(((campaignProgress.sent + (campaignProgress.failed || 0) + (campaignProgress.notExist || 0)) / campaignProgress.total) * 100);
  };

<<<<<<< HEAD
=======
  // Get connected instances count
>>>>>>> main
  const getConnectedInstancesCount = () => {
    return instances.filter(instance => 
      selectedInstances.includes(instance._id) && instance.whatsapp?.status === 'connected'
    ).length;
  };

<<<<<<< HEAD
  const shouldShowBackButton = !campaignStarted && onBack;
=======
  // Determine if back button should be shown
  const shouldShowBackButton = !campaignStarted && onBack;

  // Determine if resume button should be enabled - DISABLED if all instances disconnected
>>>>>>> main
  const canResume = isPaused && !instancesDisconnected && getConnectedInstancesCount() > 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Final Review</h3>
        <p className="text-zinc-400 mb-6">Review your campaign details and send messages to all selected numbers.</p>
      </div>

<<<<<<< HEAD
=======
      {/* Progress Stats */}
>>>>>>> main
      {(isProcessing || isPaused || isStopped || isCompleted) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{existingNumbers}</div>
                <div className="text-sm text-blue-300">Existing Numbers</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{nonExistingNumbers}</div>
                <div className="text-sm text-red-300">Non-Existing Numbers</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{campaignProgress.sent}</div>
                <div className="text-sm text-green-300">Messages Sent</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-500/10 border-zinc-500/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-zinc-400">{getProgressPercentage()}%</div>
                <div className="text-sm text-zinc-300">Progress</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isProcessing && (
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <div>
                  <h3 className="text-blue-400 font-semibold text-lg">Campaign Running</h3>
                  <p className="text-blue-300">
                    {campaignProgress.currentRecipient ? 
                      `Currently sending to: ${campaignProgress.currentRecipient}` : 
                      'Processing messages...'
                    }
                  </p>
                  <p className="text-blue-200 text-sm mt-1">
                    Progress: {campaignProgress.sent + (campaignProgress.failed || 0) + (campaignProgress.notExist || 0)} / {campaignProgress.total}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handlePauseCampaign}
                  variant="outline"
                  className="bg-yellow-600/20 border-yellow-500 text-yellow-400 hover:bg-yellow-600/30 transition-all duration-75"
                  disabled={isPausingRef.current}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  {isPausingRef.current ? 'Pausing...' : 'Pause'}
                </Button>
                <Button
                  onClick={handleStopCampaign}
                  variant="outline"
                  className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 transition-all duration-75"
<<<<<<< HEAD
                  disabled={isStoppingRef.current || isStopped}
=======
                  disabled={isStoppingRef.current}
>>>>>>> main
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  {isStoppingRef.current ? 'Stopping...' : 'Stop'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Paused State with Disconnect Handling */}
      {isPaused && (
        <Card className={`${instancesDisconnected ? 'bg-orange-500/10 border-orange-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {instancesDisconnected ? (
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                ) : (
                  <Pause className="h-8 w-8 text-yellow-500" />
                )}
                <div>
                  <h3 className={`font-semibold text-lg ${instancesDisconnected ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {instancesDisconnected ? '🚨 Campaign Auto-Paused - All Instances Disconnected' : 'Campaign Paused'}
                  </h3>
                  <p className={`${instancesDisconnected ? 'text-orange-300' : 'text-yellow-300'}`}>
                    {instancesDisconnected 
                      ? 'Campaign automatically paused due to instance disconnection. Reconnect instances to resume.'
                      : 'Campaign has been paused. Click resume to continue or stop to end the campaign.'
                    }
                  </p>
                  <p className={`text-sm mt-1 ${instancesDisconnected ? 'text-orange-200' : 'text-yellow-200'}`}>
                    Progress: {campaignProgress.sent + (campaignProgress.failed || 0) + (campaignProgress.notExist || 0)} / {campaignProgress.total}
                  </p>
                  {instancesDisconnected && canResumeAfterReconnect && (
                    <p className="text-green-300 text-sm mt-1 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      ✅ Instances reconnected - Ready to resume
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleResumeCampaign}
                  variant="outline"
                  className={`transition-all duration-75 ${
                    canResume 
                      ? 'bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30' 
                      : 'bg-gray-600/20 border-gray-500 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                  disabled={isResumingRef.current || !canResume}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isResumingRef.current ? 'Resuming...' : 
                   !canResume && instancesDisconnected ? 'Waiting for Connection' : 'Resume'}
                </Button>
                <Button
                  onClick={handleStopCampaign}
                  variant="outline"
                  className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 transition-all duration-75"
<<<<<<< HEAD
                  disabled={isStoppingRef.current || isStopped}
=======
                  disabled={isStoppingRef.current}
>>>>>>> main
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  {isStoppingRef.current ? 'Stopping...' : 'Stop'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

<<<<<<< HEAD
=======
      {/* Stopped State */}
>>>>>>> main
      {isStopped && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <StopCircle className="h-8 w-8 text-red-500" />
              <div>
                <h3 className="text-red-400 font-semibold text-lg">Campaign Stopped</h3>
                <p className="text-red-300">
                  Campaign has been stopped completely.
                </p>
                <p className="text-red-200 text-sm mt-1">
                  Final Results - Sent: {campaignProgress.sent} | Failed: {campaignProgress.failed || 0} | Not on WhatsApp: {campaignProgress.notExist || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isCompleted && (
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="text-green-400 font-semibold text-lg">Campaign Completed!</h3>
                <p className="text-green-300">
                  Sent: {campaignProgress.sent} | Failed: {campaignProgress.failed || 0} | Not on WhatsApp: {campaignProgress.notExist || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-zinc-200">Recipients ({antdContacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700">
                  <TableHead className="text-zinc-400">SN</TableHead>
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Phone</TableHead>
                  {(isProcessing || isPaused || isStopped || isCompleted) && (
                    <TableHead className="text-zinc-400">Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecipients.map((contact, index) => {
                  const globalIndex = indexOfFirstRecipient + index;
                  const recipientStatus = recipientStatuses[globalIndex] || 'pending';

                  return (
                    <TableRow key={`${contact.number}-${index}`} className="border-zinc-700">
                      <TableCell className="text-zinc-200">
                        {globalIndex + 1}
                      </TableCell>
                      <TableCell className="text-zinc-200 font-medium">{contact.name}</TableCell>
                      <TableCell className="text-zinc-200">{contact.number}</TableCell>
                      {(isProcessing || isPaused || isStopped || isCompleted) && (
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            recipientStatus === 'sent' ? 'bg-green-500/10 text-green-400' :
                            recipientStatus === 'failed' ? 'bg-red-500/10 text-red-400' :
                            recipientStatus === 'not_exist' ? 'bg-orange-500/10 text-orange-400' :
                            recipientStatus === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
                            recipientStatus === 'stopped' ? 'bg-red-500/10 text-red-400' :
                            'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {recipientStatus === 'sent' ? 'Sent' :
                             recipientStatus === 'failed' ? 'Failed' :
                             recipientStatus === 'not_exist' ? 'Not on WhatsApp' :
                             recipientStatus === 'paused' ? 'Paused' :
                             recipientStatus === 'stopped' ? 'Stopped' :
                             'Pending'}
                          </span>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-zinc-700 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 text-sm">
                  Showing {indexOfFirstRecipient + 1}-{Math.min(indexOfLastRecipient, totalRecipients)} of {totalRecipients} recipients
                </span>
              </div>
              
              <div className="flex items-center">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ${
                    currentPage === 1
                      ? 'text-zinc-600 cursor-not-allowed'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
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
                            ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                            : 'bg-transparent hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
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
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
        <div className="flex gap-3">
          {shouldShowBackButton && (
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isLoading || isProcessing}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading || isProcessing}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            Cancel
          </Button>
        </div>
        
        <div className="flex gap-3">
          {!isCompleted && !isStopped && !isProcessing && !isPaused && (
            <Button
              onClick={handleSendMessages}
              disabled={isLoading || isSending}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Messages
                </>
              )}
            </Button>
          )}

          {isProcessing && (
            <Button
              disabled
              className="bg-blue-600/50 text-white cursor-not-allowed"
            >
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </Button>
          )}

          {isPaused && (
            <Button
              disabled
              className="bg-yellow-600/50 text-white cursor-not-allowed"
            >
              <Pause className="h-4 w-4 mr-2" />
              Paused
            </Button>
          )}

          {isStopped && (
            <Button
              onClick={handleComplete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Campaign Stopped - Close
            </Button>
          )}
          
          {isCompleted && (
            <Button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
