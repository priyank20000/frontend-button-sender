"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, RefreshCw, Pause, Play, StopCircle, Loader2, Users, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "../hooks/useSocket";
import Cookies from 'js-cookie';

interface Campaign {
  _id: string;
  name: string;
  recipients: any[];
  status: 'completed' | 'failed' | 'processing' | 'paused';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'sent', 'failed', 'not_exist'

  const isStoppingRef = useRef(false);
  const isResumingRef = useRef(false);
  const lastProgressUpdateRef = useRef<number>(0);
  const hasLoadedDetailsRef = useRef(false);
  const autoRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false); // Track if campaign has completed to prevent multiple refreshes

  const getToken = useCallback((): string | null => {
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

  // Function to update recipient statuses based on campaign statistics
  const updateRecipientStatuses = useCallback((campaign: Campaign) => {
    if (!campaign.recipients) return [];

    const statuses = new Array(campaign.recipients.length).fill('pending');
    const sentCount = campaign.statistics?.sent || campaign.sentMessages || 0;
    const failedCount = campaign.statistics?.failed || campaign.failedMessages || 0;
    const notExistCount = campaign.statistics?.notExist || campaign.notExistMessages || 0;

    // Assign statuses based on the campaign's statistics
    let index = 0;

    // Sent messages
    for (let i = 0; i < sentCount && index < statuses.length; i++, index++) {
      statuses[index] = 'sent';
    }

    // Failed messages
    for (let i = 0; i < failedCount && index < statuses.length; i++, index++) {
      statuses[index] = 'failed';
    }

    // Not on WhatsApp (not_exist) messages
    for (let i = 0; i < notExistCount && index < statuses.length; i++, index++) {
      statuses[index] = 'not_exist';
    }

    // Override with individual recipient status if available
    campaign.recipients.forEach((recipient: any, idx: number) => {
      if (recipient.status) {
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

          // Update campaign data
          setCampaignData((prev) => ({
            ...prev,
            ...detailedCampaign,
            totalMessages: detailedCampaign.statistics?.total || detailedCampaign.recipients?.length || 0,
            sentMessages: detailedCampaign.statistics?.sent || 0,
            failedMessages: detailedCampaign.statistics?.failed || 0,
            notExistMessages: detailedCampaign.statistics?.notExist || 0,
          }));

          // Update recipient statuses based on detailed campaign data
          const statuses = updateRecipientStatuses(detailedCampaign);
          setRecipientStatuses(statuses);

          setIsPaused(detailedCampaign.status === 'paused');
          setIsProcessing(detailedCampaign.status === 'processing');
          
          if (!hasLoadedDetailsRef.current) {
            hasLoadedDetailsRef.current = true;
          }

          // Only schedule auto-refresh if campaign just completed and we haven't done it before
          if (detailedCampaign.status === 'completed' && !hasCompletedRef.current && !autoRefreshTimeoutRef.current) {
            hasCompletedRef.current = true;
            autoRefreshTimeoutRef.current = setTimeout(() => {
              console.log('Final auto-refresh for completed campaign');
              loadCampaignDetails(campaignId, true);
              autoRefreshTimeoutRef.current = null;
            }, 2000);
          }
        }
      } else {
        console.error('Failed to load campaign details:', response.status);
      }
    } catch (error) {
      console.error('Error loading campaign details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [token, updateRecipientStatuses]);

  useEffect(() => {
    if (campaign && open && !hasLoadedDetailsRef.current) {
      setCampaignData(campaign);
      setIsPaused(campaign.status === 'paused');
      setIsProcessing(campaign.status === 'processing');
      hasCompletedRef.current = campaign.status === 'completed'; // Set if already completed
      loadCampaignDetails(campaign._id);
    }
  }, [campaign, open, loadCampaignDetails]);

  const handleCampaignProgress = useCallback(
    (data: any) => {
      if (!campaignData || data.campaignId !== campaignData._id) return;

      const now = Date.now();
      if (now - lastProgressUpdateRef.current < 500) return;
      lastProgressUpdateRef.current = now;

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
        // Only auto-refresh if we haven't completed before
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setTimeout(() => {
            loadCampaignDetails(data.campaignId, true);
          }, 1000);
        }
      } else if (data.status === 'processing') {
        setIsProcessing(true);
        setIsPaused(false);
      }
    },
    [campaignData, loadCampaignDetails]
  );

  const handleCampaignComplete = useCallback(
    (data: any) => {
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

      // Update statuses on campaign completion and force refresh only once
      setRecipientStatuses((prev) => {
        const newStatuses = [...prev];
        const sentCount = data.sent || 0;
        const failedCount = data.failed || 0;
        const notExistCount = data.notExist || 0;

        let index = 0;

        // Sent messages
        for (let i = 0; i < sentCount && index < newStatuses.length; i++, index++) {
          newStatuses[index] = 'sent';
        }

        // Failed messages
        for (let i = 0; i < failedCount && index < newStatuses.length; i++, index++) {
          newStatuses[index] = 'failed';
        }

        // Not on WhatsApp (not_exist) messages
        for (let i = 0; i < notExistCount && index < newStatuses.length; i++, index++) {
          newStatuses[index] = 'not_exist';
        }

        return newStatuses;
      });

      // Force refresh campaign details after completion only if not done before
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        setTimeout(() => {
          console.log('Final refresh after campaign completion');
          loadCampaignDetails(data.campaignId, true);
        }, 1500);
      }
    },
    [campaignData, loadCampaignDetails]
  );

  const handleCampaignPaused = useCallback(
    (data: any) => {
      if (!campaignData || data.campaignId !== campaignData._id) return;

      console.log('Campaign paused:', data);

      setIsPaused(true);
      setIsProcessing(false);
      isStoppingRef.current = false;

      setCampaignData((prev) => (prev ? { ...prev, status: 'paused' } : null));
    },
    [campaignData]
  );

  const handleCampaignResumed = useCallback(
    (data: any) => {
      if (!campaignData || data.campaignId !== campaignData._id) return;

      console.log('Campaign resumed:', data);

      setIsPaused(false);
      setIsProcessing(true);
      isResumingRef.current = false;

      setCampaignData((prev) => (prev ? { ...prev, status: 'processing' } : null));
    },
    [campaignData]
  );

  useEffect(() => {
    if (!isConnected || !campaignData) return;

    on('campaign.progress', handleCampaignProgress);
    on('campaign.complete', handleCampaignComplete);
    on('campaign.paused', handleCampaignPaused);
    on('campaign.resumed', handleCampaignResumed);

    return () => {
      off('campaign.progress', handleCampaignProgress);
      off('campaign.complete', handleCampaignComplete);
      off('campaign.paused', handleCampaignPaused);
      off('campaign.resumed', handleCampaignResumed);
    };
  }, [isConnected, campaignData, on, off, handleCampaignProgress, handleCampaignComplete, handleCampaignPaused, handleCampaignResumed]);

  const refreshCampaignDetails = async () => {
    if (!campaignData || !token) return;

    setIsRefreshing(true);
    hasLoadedDetailsRef.current = false;
    try {
      await loadCampaignDetails(campaignData._id, true);
    } catch (error) {
      console.error('Error refreshing campaign details:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCampaignControl = useCallback(
    async (action: 'stop' | 'resume') => {
      if (!campaignData) return;

      if (action === 'stop' && isStoppingRef.current) return;
      if (action === 'resume' && isResumingRef.current) return;

      if (action === 'stop') {
        isStoppingRef.current = true;
        setIsProcessing(false);
        setIsPaused(true);
        setCampaignData((prev) => (prev ? { ...prev, status: 'paused' } : null));
      } else {
        isResumingRef.current = true;
        setIsProcessing(true);
        setIsPaused(false);
        setCampaignData((prev) => (prev ? { ...prev, status: 'processing' } : null));
      }

      try {
        const authToken = getToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('https://whatsapp.recuperafly.com/api/template/campaign/control', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaignId: campaignData._id,
            action,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const result = await response.json();

        if (result.status) {
          console.log(`Campaign ${action} signal sent successfully`);
        } else {
          console.error(`Campaign ${action} failed:`, result.message);
          if (action === 'stop') {
            setIsProcessing(true);
            setIsPaused(false);
            isStoppingRef.current = false;
            setCampaignData((prev) => (prev ? { ...prev, status: 'processing' } : null));
          } else {
            setIsProcessing(false);
            setIsPaused(true);
            isResumingRef.current = false;
            setCampaignData((prev) => (prev ? { ...prev, status: 'paused' } : null));
          }
        }
      } catch (error) {
        console.error(`Error ${action}ing campaign:`, error);
        if (action === 'stop') {
          setIsProcessing(true);
          setIsPaused(false);
          isStoppingRef.current = false;
          setCampaignData((prev) => (prev ? { ...prev, status: 'processing' } : null));
        } else {
          setIsProcessing(false);
          setIsPaused(true);
          isResumingRef.current = false;
          setCampaignData((prev) => (prev ? { ...prev, status: 'paused' } : null));
        }
      }
    },
    [campaignData, getToken]
  );

  const handleStopCampaign = useCallback(() => handleCampaignControl('stop'), [handleCampaignControl]);
  const handleResumeCampaign = useCallback(() => handleCampaignControl('resume'), [handleCampaignControl]);

  useEffect(() => {
    if (!open) {
      hasLoadedDetailsRef.current = false;
      hasCompletedRef.current = false; // Reset completion flag
      setCurrentPage(1);
      setRecipientStatuses([]);
      setIsRefreshing(false);
      setIsPaused(false);
      setIsProcessing(false);
      setIsLoadingDetails(false);
      setStatusFilter('all');
      
      // Clear auto-refresh timeout when dialog closes
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
        autoRefreshTimeoutRef.current = null;
      }
    }
  }, [open]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
    };
  }, []);

  if (!campaignData) return null;

  // Filter recipients based on status
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
      default:
        return 'Pending';
    }
  };

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'processing':
        return 'text-blue-400';
      case 'paused':
        return 'text-yellow-400';
      default:
        return 'text-zinc-400';
    }
  };

  const getCampaignStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'processing':
        return '⏳';
      case 'paused':
        return '⏸️';
      default:
        return '❓';
    }
  };

  // Get counts for each status
  const sentCount = recipientStatuses.filter(status => status === 'sent').length;
  const failedCount = recipientStatuses.filter(status => status === 'failed').length;
  const notExistCount = recipientStatuses.filter(status => status === 'not_exist').length;

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
                <Button
                  onClick={handleStopCampaign}
                  disabled={isStoppingRef.current}
                  variant="outline"
                  size="sm"
                  className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 transition-all duration-75"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  {isStoppingRef.current ? 'Pausing...' : 'Pause'}
                </Button>
              )}
              {isPaused && (
                <Button
                  onClick={handleResumeCampaign}
                  disabled={isResumingRef.current}
                  variant="outline"
                  size="sm"
                  className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30 transition-all duration-75"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isResumingRef.current ? 'Resuming...' : 'Resume'}
                </Button>
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
          {isLoadingDetails && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-zinc-400">Loading campaign details...</span>
            </div>
          )}
          {!isLoadingDetails && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{campaignData.totalMessages}</div>
                    <div className="text-sm text-blue-300">Total</div>
                  </div>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{sentCount}</div>
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
                    <div className="text-sm text-orange-300">Not on WhatsApp</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-200">Recipients ({campaignData.recipients?.length || 0})</h3>
                  
                  {/* Status Filter Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setStatusFilter('all');
                        setCurrentPage(1);
                      }}
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      className={statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'}
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
                      className={statusFilter === 'sent' ? 'bg-green-600 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'}
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
                      className={statusFilter === 'failed' ? 'bg-red-600 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'}
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
                      className={statusFilter === 'not_exist' ? 'bg-orange-600 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Not on WhatsApp ({notExistCount})
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

                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-zinc-700 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 text-sm">
                        Showing {indexOfFirstRecipient + 1}-{Math.min(indexOfLastRecipient, totalRecipients)} of {totalRecipients} recipients
                        {statusFilter !== 'all' && (
                          <Badge variant="outline" className="ml-2 text-zinc-300">
                            {statusFilter === 'sent' && 'Sent'}
                            {statusFilter === 'failed' && 'Failed'}
                            {statusFilter === 'not_exist' && 'Not on WhatsApp'}
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
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}