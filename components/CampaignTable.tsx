"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Trash2, Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
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

interface CampaignTableProps {
  campaigns: Campaign[];
  isDeleting: { [key: string]: boolean };
  onViewDetails: (campaign: Campaign) => void;
  onDelete: (campaignId: string) => void;
  onCampaignUpdate?: (updatedCampaign: Campaign) => void;
}

const CAMPAIGN_STATUS = {
  completed: { label: 'Completed', color: 'bg-green-500', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500', icon: XCircle },
  processing: { label: 'Processing', color: 'bg-blue-500', icon: Clock }
};

// Memoized row component to prevent unnecessary re-renders
const CampaignRow = memo(({ 
  campaign, 
  isDeleting, 
  onViewDetails, 
  onDelete,
  onCampaignUpdate
}: {
  campaign: Campaign;
  isDeleting: boolean;
  onViewDetails: (campaign: Campaign) => void;
  onDelete: (campaignId: string) => void;
  onCampaignUpdate?: (updatedCampaign: Campaign) => void;
}) => {
  const [localCampaign, setLocalCampaign] = useState<Campaign>(campaign);

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
      console.log('Socket connected for campaign row');
    },
    onDisconnect: () => {
      console.log('Socket disconnected');
    },
    onError: (error) => {
      console.error('Socket error:', error);
    }
  });

  // Update local campaign when prop changes
  useEffect(() => {
    setLocalCampaign(campaign);
  }, [campaign]);

  // Listen for real-time campaign updates
  useEffect(() => {
    if (!isConnected) return;

    const handleCampaignProgress = (data: any) => {
      if (data.campaignId !== localCampaign._id) return;

      console.log('Campaign progress update for row:', data);

      const updatedCampaign = {
        ...localCampaign,
        status: data.status,
        sentMessages: data.sent || 0,
        failedMessages: data.failed || 0,
        totalMessages: data.total || localCampaign.totalMessages
      };

      setLocalCampaign(updatedCampaign);
      onCampaignUpdate?.(updatedCampaign);
    };

    const handleCampaignComplete = (data: any) => {
      if (data.campaignId !== localCampaign._id) return;

      console.log('Campaign completed for row:', data);

      const updatedCampaign = {
        ...localCampaign,
        status: 'completed' as const,
        sentMessages: data.sent || 0,
        failedMessages: data.failed || 0
      };

      setLocalCampaign(updatedCampaign);
      onCampaignUpdate?.(updatedCampaign);
    };

    on('campaign.progress', handleCampaignProgress);
    on('campaign.complete', handleCampaignComplete);

    return () => {
      off('campaign.progress', handleCampaignProgress);
      off('campaign.complete', handleCampaignComplete);
    };
  }, [isConnected, localCampaign._id, on, off, onCampaignUpdate]);

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
    if (!statusInfo) return null;
    
    const Icon = statusInfo.icon;
    return (
      <Badge className={`${statusInfo.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {statusInfo.label}
      </Badge>
    );
  };

  const getProgressPercentage = () => {
    if (localCampaign.totalMessages === 0) return 0;
    return Math.round(((localCampaign.sentMessages + localCampaign.failedMessages) / localCampaign.totalMessages) * 100);
  };

  return (
    <TableRow className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
      <TableCell>
        <div>
          <p className="text-zinc-200 font-medium truncate max-w-[200px]" title={localCampaign.name}>
            {localCampaign.name}
          </p>
          <p className="text-zinc-400 text-xs">ID: {localCampaign._id.slice(-8)}</p>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="text-zinc-200 truncate max-w-[150px]" title={localCampaign.template.name}>
            {localCampaign.template.name}
          </p>
          <p className="text-zinc-400 text-xs">{localCampaign.template.messageType}</p>
        </div>
      </TableCell>
      <TableCell className="text-zinc-200">{localCampaign.instances.length}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {getStatusBadge(localCampaign.status)}
          {localCampaign.status === 'processing' && (
            <div className="text-xs text-zinc-400">
              {localCampaign.sentMessages}/{localCampaign.totalMessages} ({getProgressPercentage()}%)
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-zinc-400 text-sm">{formatDate(localCampaign.createdAt)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(localCampaign)}
                  className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Details</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(localCampaign._id)}
                  disabled={isDeleting}
                  className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Campaign</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    </TableRow>
  );
});

CampaignRow.displayName = 'CampaignRow';

export default function CampaignTable({
  campaigns,
  isDeleting,
  onViewDetails,
  onDelete,
  onCampaignUpdate
}: CampaignTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead className="text-zinc-400 font-semibold">Campaign</TableHead>
            <TableHead className="text-zinc-400 font-semibold">Template</TableHead>
            <TableHead className="text-zinc-400 font-semibold">Instances</TableHead>
            <TableHead className="text-zinc-400 font-semibold">Status</TableHead>
            <TableHead className="text-zinc-400 font-semibold">Created</TableHead>
            <TableHead className="text-zinc-400 font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <CampaignRow
              key={campaign._id}
              campaign={campaign}
              isDeleting={isDeleting[campaign._id] || false}
              onViewDetails={onViewDetails}
              onDelete={onDelete}
              onCampaignUpdate={onCampaignUpdate}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}