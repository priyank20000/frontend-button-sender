"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useSocket } from "../hooks/useSocket";
import Cookies from 'js-cookie';

interface Campaign {
  _id: string;
  name: string;
  template: {
    _id: string;
    name: string;
    messageType: string;
  };
  instances: any[];
  recipients: any[];
  status: 'completed' | 'failed' | 'processing';
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  createdAt: string;
  delayRange: { start: number; end: number };
}

interface CampaignDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

interface CampaignProgress {
  campaignId: string;
  total: number;
  sent: number;
  failed: number;
  status: 'processing' | 'completed' | 'failed';
  currentRecipient?: string;
  lastMessageStatus?: 'sent' | 'failed';
  lastRecipient?: string;
}

const CAMPAIGN_STATUS = {
  completed: { label: 'Completed', color: 'bg-green-500', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500', icon: XCircle },
  processing: { label: 'Processing', color: 'bg-blue-500', icon: Clock }
};

export default function CampaignDetailsDialog({
  open,
  onOpenChange,
  campaign
}: CampaignDetailsDialogProps) {
  const [realTimeCampaign, setRealTimeCampaign] = useState<Campaign | null>(campaign);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get token for socket connection
  const getToken = (): string | null => {
    const cookieToken = Cookies.get('token');
    if (cookieToken) return cookieToken;
    return localStorage.getItem('token');
  };

  const token = getToken();

  // Socket connection for real-time updates
  const { on, off, isConnected } = useSocket({
    token,
    onConnect: () => {
      console.log('Socket connected for campaign details');
    },
    onDisconnect: () => {
      console.log('Socket disconnected from campaign details');
    },
    onError: (error) => {
      console.error('Socket error in campaign details:', error);
    }
  });

  // Update real-time campaign when prop changes
  useEffect(() => {
    setRealTimeCampaign(campaign);
  }, [campaign]);

  // Listen for campaign progress updates
  useEffect(() => {
    if (!isConnected || !realTimeCampaign || !open) return;

    const handleCampaignProgress = (data: CampaignProgress) => {
      if (data.campaignId === realTimeCampaign._id) {
        setIsUpdating(true);
        
        // Update the campaign with real-time data
        setRealTimeCampaign(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            status: data.status,
            totalMessages: data.total,
            sentMessages: data.sent,
            failedMessages: data.failed
          };
        });

        // Remove updating indicator after a short delay
        setTimeout(() => {
          setIsUpdating(false);
        }, 1000);
      }
    };

    const handleCampaignComplete = (data: any) => {
      if (data.campaignId === realTimeCampaign._id) {
        setRealTimeCampaign(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            status: 'completed'
          };
        });
      }
    };

    const handleCampaignFailed = (data: any) => {
      if (data.campaignId === realTimeCampaign._id) {
        setRealTimeCampaign(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            status: 'failed'
          };
        });
      }
    };

    // Listen to socket events
    on('campaign.progress', handleCampaignProgress);
    on('campaign.complete', handleCampaignComplete);
    on('campaign.failed', handleCampaignFailed);

    return () => {
      off('campaign.progress', handleCampaignProgress);
      off('campaign.complete', handleCampaignComplete);
      off('campaign.failed', handleCampaignFailed);
    };
  }, [isConnected, realTimeCampaign, open, on, off]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = CAMPAIGN_STATUS[status as keyof typeof CAMPAIGN_STATUS];
    const Icon = statusInfo.icon;
    return (
      <div className="flex items-center gap-2">
        <Badge className={`${statusInfo.color} text-white flex items-center gap-1`}>
          <Icon className="h-3 w-3" />
          {statusInfo.label}
        </Badge>
        {isUpdating && (
          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
        )}
      </div>
    );
  };

  const getProgressPercentage = () => {
    if (!realTimeCampaign || realTimeCampaign.totalMessages === 0) return 0;
    return Math.round((realTimeCampaign.sentMessages / realTimeCampaign.totalMessages) * 100);
  };

  const getSuccessRate = () => {
    if (!realTimeCampaign || realTimeCampaign.totalMessages === 0) return 0;
    const processedMessages = realTimeCampaign.sentMessages + realTimeCampaign.failedMessages;
    if (processedMessages === 0) return 0;
    return Math.round((realTimeCampaign.sentMessages / processedMessages) * 100);
  };

  if (!realTimeCampaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            Campaign Details: {realTimeCampaign.name}
            {isConnected && (
              <div className="flex items-center gap-1 text-sm text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Live
              </div>
            )}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            View detailed information and real-time progress of this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Campaign Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400">Campaign Name</Label>
                <p className="text-zinc-200 font-medium">{realTimeCampaign.name}</p>
              </div>
              <div>
                <Label className="text-zinc-400">Status</Label>
                <div className="mt-1">{getStatusBadge(realTimeCampaign.status)}</div>
              </div>
              <div>
                <Label className="text-zinc-400">Template</Label>
                <p className="text-zinc-200">{realTimeCampaign.template.name}</p>
              </div>
              <div>
                <Label className="text-zinc-400">Instances</Label>
                <p className="text-zinc-200">{realTimeCampaign.instances.length} instances</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400">Total Messages</Label>
                <p className="text-zinc-200 font-medium text-2xl">{realTimeCampaign.totalMessages}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-400">Sent Messages</Label>
                  <p className="text-green-400 font-medium text-xl">{realTimeCampaign.sentMessages}</p>
                </div>
                <div>
                  <Label className="text-zinc-400">Failed Messages</Label>
                  <p className="text-red-400 font-medium text-xl">{realTimeCampaign.failedMessages}</p>
                </div>
              </div>
              <div>
                <Label className="text-zinc-400">Success Rate</Label>
                <p className="text-zinc-200 font-medium">{getSuccessRate()}%</p>
              </div>
              <div>
                <Label className="text-zinc-400">Delay Range</Label>
                <p className="text-zinc-200">{realTimeCampaign.delayRange.start}s - {realTimeCampaign.delayRange.end}s</p>
              </div>
              <div>
                <Label className="text-zinc-400">Created At</Label>
                <p className="text-zinc-200">{formatDate(realTimeCampaign.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-4 bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-400 text-lg font-semibold">Campaign Progress</Label>
              <span className="text-zinc-300 font-medium">{getProgressPercentage()}%</span>
            </div>
            
            <Progress 
              value={getProgressPercentage()} 
              className="w-full h-3"
            />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-zinc-700/50 rounded-lg p-3">
                <p className="text-zinc-400 text-sm">Total</p>
                <p className="text-zinc-200 font-bold text-lg">{realTimeCampaign.totalMessages}</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-green-400 text-sm">Sent</p>
                <p className="text-green-400 font-bold text-lg">{realTimeCampaign.sentMessages}</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">Failed</p>
                <p className="text-red-400 font-bold text-lg">{realTimeCampaign.failedMessages}</p>
              </div>
            </div>

            {realTimeCampaign.status === 'processing' && (
              <div className="text-center">
                <p className="text-zinc-400 text-sm">
                  {realTimeCampaign.sentMessages + realTimeCampaign.failedMessages} of {realTimeCampaign.totalMessages} messages processed
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span className="text-blue-400 text-sm">Campaign in progress...</span>
                </div>
              </div>
            )}

            {realTimeCampaign.status === 'completed' && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Campaign completed successfully!</span>
                </div>
              </div>
            )}

            {realTimeCampaign.status === 'failed' && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-red-400">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Campaign failed</span>
                </div>
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-zinc-400">
                {isConnected ? 'Real-time updates active' : 'Real-time updates disconnected'}
              </span>
            </div>
            {isUpdating && (
              <div className="flex items-center gap-2 text-blue-400">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}