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
import { useCampaignDetails } from './../hooks/useCampaignDetails';
import { useCampaignControl } from './../hooks/useCampaignControl';
import { useInstanceMonitoring } from './../hooks/useInstanceMonitoring';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const recipientsPerPage = 10;

  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    const cookieToken = Cookies.get('token');
    if (cookieToken) return cookieToken;
    return localStorage.getItem('token');
  }, []);

  const token = getToken();

  // Custom hooks for managing different aspects
  const {
    campaignData,
    setCampaignData,
    recipientStatuses,
    setRecipientStatuses,
    isLoadingDetails,
    loadCampaignDetails,
    delayRange,
    setDelayRange
  } = useCampaignDetails(campaign, open, token);

  const {
    isProcessing,
    isPaused,
    isStopped,
    setIsProcessing,
    setIsPaused,
    setIsStopped,
    handleCampaignControl
  } = useCampaignControl(campaignData, token, delayRange);

  const {
    instances,
    selectedInstances,
    instancesDisconnected,
    disconnectionReason,
    canResumeAfterReconnect,
    connectionStatus
  } = useInstanceMonitoring(campaignData, isProcessing, isPaused);

  // Socket connection for real-time updates
  const { on, off, isConnected } = useSocket({
    token,
    onConnect: () => console.log('Socket connected for campaign details'),
    onDisconnect: () => console.log('Socket disconnected'),
    onError: (error) => console.error('Socket error:', error),
  });

  // Socket event handlers
  const handleCampaignProgress = useCallback((data: any) => {
    if (!campaignData || data.campaignId !== campaignData._id) return;

    setCampaignData((prev) =>
      prev ? {
        ...prev,
        status: data.status,
        sentMessages: data.sent || 0,
        failedMessages: data.failed || 0,
        notExistMessages: data.notExist || 0,
        totalMessages: data.total || prev.totalMessages,
      } : null
    );

    // Update status flags
    if (data.status === 'completed') {
      setIsProcessing(false);
      setIsPaused(false);
      setIsStopped(false);
    } else if (data.status === 'stopped') {
      setIsProcessing(false);
      setIsPaused(false);
      setIsStopped(true);
    } else if (data.status === 'processing') {
      setIsProcessing(true);
      setIsPaused(false);
      setIsStopped(false);
    } else if (data.status === 'paused') {
      setIsProcessing(false);
      setIsPaused(true);
      setIsStopped(false);
    }
  }, [campaignData, setCampaignData, setIsProcessing, setIsPaused, setIsStopped]);

  // Setup socket listeners
  useEffect(() => {
    if (!isConnected || !campaignData) return;

    on('campaign.progress', handleCampaignProgress);
    on('campaign.complete', handleCampaignProgress);
    on('campaign.stopped', handleCampaignProgress);
    on('campaign.paused', handleCampaignProgress);
    on('campaign.resumed', handleCampaignProgress);

    return () => {
      off('campaign.progress', handleCampaignProgress);
      off('campaign.complete', handleCampaignProgress);
      off('campaign.stopped', handleCampaignProgress);
      off('campaign.paused', handleCampaignProgress);
      off('campaign.resumed', handleCampaignProgress);
    };
  }, [isConnected, campaignData?._id, on, off, handleCampaignProgress]);

  const refreshCampaignDetails = async () => {
    if (!campaignData || !token) return;

    setIsRefreshing(true);
    try {
      await loadCampaignDetails(campaignData._id, true);
    } catch (error) {
      console.error('Error refreshing campaign details:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentPage(1);
      setStatusFilter('all');
      setIsRefreshing(false);
    }
  }, [open]);

  if (!campaignData) return null;

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
                canResume={!instancesDisconnected && connectionStatus.isConnected}
                onPause={() => handleCampaignControl('pause')}
                onStop={() => handleCampaignControl('stop')}
                onResume={() => handleCampaignControl('resume')}
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
              canResume={!instancesDisconnected && connectionStatus.isConnected}
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