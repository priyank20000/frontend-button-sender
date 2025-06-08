"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Trash2, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { memo } from 'react';

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
  onDelete 
}: {
  campaign: Campaign;
  isDeleting: boolean;
  onViewDetails: (campaign: Campaign) => void;
  onDelete: (campaignId: string) => void;
}) => {
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
    if (campaign.totalMessages === 0) return 0;
    return Math.round((campaign.sentMessages / campaign.totalMessages) * 100);
  };

  return (
    <TableRow className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
      <TableCell>
        <div>
          <p className="text-zinc-200 font-medium truncate max-w-[200px]" title={campaign.name}>
            {campaign.name}
          </p>
          <p className="text-zinc-400 text-xs">ID: {campaign._id.slice(-8)}</p>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="text-zinc-200 truncate max-w-[150px]" title={campaign.template.name}>
            {campaign.template.name}
          </p>
          <p className="text-zinc-400 text-xs">{campaign.template.messageType}</p>
        </div>
      </TableCell>
      <TableCell className="text-zinc-200">{campaign.instances.length}</TableCell>
      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
      <TableCell className="text-zinc-400 text-sm">{formatDate(campaign.createdAt)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(campaign)}
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
                  onClick={() => onDelete(campaign._id)}
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
  onDelete
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
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}