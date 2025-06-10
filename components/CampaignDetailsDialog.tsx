"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, RefreshCw, Pause, Play, StopCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
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

  const isStoppingRef = useRef(false);
  const isResumingRef = useRef(false);
  const lastProgressUpdateRef = useRef<number>(0);
  const hasLoadedDetailsRef = useRef(false); // Track if details have been loaded

  // Get token for socket connection
  const getToken = useCallback((): string | null => {
    const cookieToken = Cookies.get('token');
    if (cookieToken) return cookieToken;
    return localStorage.getItem('token');
  }, []);

  const token = getToken();

  // Socket connection for real-time updates
  const { on, off, isConnected } = useSocket({
    token,
    onConnect: () => console.log('Socket connected for campaign details'),
    onDisconnect: () => console.log('Socket disconnected'),
    onError: (error) => console.error('Socket error:', error),
  });

  // Load detailed campaign data
  const loadCampaignDetails = useCallback(async (campaignId: string) => {
    if (!token || hasLoadedDetailsRef.current) return; // Prevent multiple calls

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

          // Initialize recipient statuses
          if (detailedCampaign.recipients) {
            const statuses = new Array(detailedCampaign.recipients.length).fill('pending');
            detailedCampaign.recipients.forEach((recipient: any, index: number) => {
              if (recipient.status) {
                statuses[index] = recipient.status;
              } else if (detailedCampaign.status === 'completed') {
                if (index < (detailedCampaign.statistics?.sent || 0)) {
                  statuses[index] = 'sent';
                } else if (index < (detailedCampaign.statistics?.sent || 0) + (detailedCampaign.statistics?.failed || 0)) {
                  statuses[index] = 'failed';
                } else {
                  statuses[index] = 'not_exist';
                }
              }
            });
            setRecipientStatuses(statuses);
          }

          setIsPaused(detailedCampaign.status === 'paused');
          setIsProcessing(detailedCampaign.status === 'processing');
          hasLoadedDetailsRef.current = true; // Mark as loaded
        }
      } else {
        console.error('Failed to load campaign details:', response.status);
      }
    } catch (error) {
      console.error('Error loading campaign details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [token]);

  // Load campaign details only when dialog opens and campaign changes
  useEffect(() => {
    if (campaign && open && !hasLoadedDetailsRef.current) {
      setCampaignData(campaign);
      setIsPaused(campaign.status === 'paused');
      setIsProcessing(campaign.status === 'processing');
      loadCampaignDetails(campaign._id);
    }
  }, [campaign, open, loadCampaignDetails]);

  // Handle campaign progress updates via WebSocket
  const handleCampaignProgress = useCallback(
    (data: any) => {
      if (!campaignData || data.campaignId !== campaignData._id) return;

      const now = Date.now();
      if (now - lastProgressUpdateRef.current < 500) return; // Throttle updates
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
      } else if (data.status === 'processing') {
        setIsProcessing(true);
        setIsPaused(false);
      }
    },
    [campaignData]
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

      setRecipientStatuses((prev) => {
        const newStatuses = [...prev];
        for (let i = 0; i < data.sent; i++) {
          if (i < newStatuses.length) newStatuses[i] = 'sent';
        }
        for (let i = data.sent; i < data.sent + (data.failed || 0); i++) {
          if (i < newStatuses.length) newStatuses[i] = 'failed';
        }
        for (let i = data.sent + (data.failed || 0); i < data.sent + (data.failed || 0) + (data.notExist || 0); i++) {
          if (i < newStatuses.length) newStatuses[i] = 'not_exist';
        }
        return newStatuses;
      });
    },
    [campaignData]
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

  // Listen for WebSocket events
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

  // Refresh campaign details manually
  const refreshCampaignDetails = async () => {
    if (!campaignData || !token) return;

    setIsRefreshing(true);
    hasLoadedDetailsRef.current = false; // Allow re-fetch on manual refresh
    try {
      await loadCampaignDetails(campaignData._id);
    } catch (error) {
      console.error('Error refreshing campaign details:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Campaign control (stop/resume)
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

  if (!campaignData) return null;

  // Pagination logic
  const totalRecipients = campaignData.recipients?.length || 0;
  const totalPages = Math.ceil(totalRecipients / recipientsPerPage);
  const indexOfLastRecipient = currentPage * recipientsPerPage;
  const indexOfFirstRecipient = indexOfLastRecipient - recipientsPerPage;
  const currentRecipients = campaignData.recipients?.slice(indexOfFirstRecipient, indexOfLastRecipient) || [];

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const getRecipientStatus = (index: number) => {
    const globalIndex = indexOfFirstRecipient + index;
    return recipientStatuses[globalIndex] || 'pending';
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
                    <div className="text-2xl font-bold text-green-400">{campaignData.sentMessages}</div>
                    <div className="text-sm text-green-300">Sent</div>
                  </div>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{campaignData.failedMessages}</div>
                    <div className="text-sm text-red-300">Failed</div>
                  </div>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getCampaignStatusColor(campaignData.status)}`}>
                      {getCampaignStatusIcon(campaignData.status)}
                    </div>
                    <div className="text-sm text-zinc-300 capitalize">
                      {campaignData.status === 'paused' ? 'Paused' : campaignData.status}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-200">Recipients ({totalRecipients})</h3>
                  {(isProcessing || isPaused) && (
                    <div className="flex gap-2">
                      {isProcessing && (
                        <Button
                          onClick={handleStopCampaign}
                          disabled={isStoppingRef.current}
                          size="sm"
                          className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 transition-all duration-75"
                        >
                          <StopCircle className="h-4 w-4 mr-2" />
                          {isStoppingRef.current ? 'Stopping...' : 'Stop Campaign'}
                        </Button>
                      )}
                      {isPaused && (
                        <Button
                          onClick={handleResumeCampaign}
                          disabled={isResumingRef.current}
                          size="sm"
                          className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30 transition-all duration-75"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {isResumingRef.current ? 'Resuming...' : 'Resume Campaign'}
                        </Button>
                      )}
                    </div>
                  )}
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
                        const status = getRecipientStatus(index);

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