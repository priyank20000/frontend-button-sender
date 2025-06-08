"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Trash2, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

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

export default function CampaignTable({
  campaigns,
  isDeleting,
  onViewDetails,
  onDelete
}: CampaignTableProps) {
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
      <Badge className={`${statusInfo.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {statusInfo.label}
        {status === 'processing' && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
      </Badge>
    );
  };

  const getProgressPercentage = (campaign: Campaign) => {
    if (campaign.totalMessages === 0) return 0;
    return Math.round((campaign.sentMessages + campaign.failedMessages) / campaign.totalMessages * 100);
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead className="text-zinc-400">Campaign</TableHead>
            <TableHead className="text-zinc-400">Template</TableHead>
            <TableHead className="text-zinc-400">Instances</TableHead>
            <TableHead className="text-zinc-400">Status</TableHead>
            <TableHead className="text-zinc-400">Progress</TableHead>
            <TableHead className="text-zinc-400">Messages</TableHead>
            <TableHead className="text-zinc-400">Sent</TableHead>
            <TableHead className="text-zinc-400">Failed</TableHead>
            <TableHead className="text-zinc-400">Created</TableHead>
            <TableHead className="text-zinc-400">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign._id} className="border-zinc-800">
              <TableCell>
                <div>
                  <p className="text-zinc-200 font-medium">{campaign.name}</p>
                  <p className="text-zinc-400 text-sm">ID: {campaign._id}</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-zinc-200">{campaign.template.name}</p>
                  <p className="text-zinc-400 text-sm">{campaign.template.messageType}</p>
                </div>
              </TableCell>
              <TableCell className="text-zinc-200">{campaign.instances.length}</TableCell>
              <TableCell>{getStatusBadge(campaign.status)}</TableCell>
              <TableCell>
                <div className="w-full">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>{getProgressPercentage(campaign)}%</span>
                    <span>{campaign.sentMessages + campaign.failedMessages}/{campaign.totalMessages}</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        campaign.status === 'processing' ? 'bg-blue-500' :
                        campaign.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${getProgressPercentage(campaign)}%` }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-zinc-200">{campaign.totalMessages}</TableCell>
              <TableCell className="text-green-400">{campaign.sentMessages}</TableCell>
              <TableCell className="text-red-400">{campaign.failedMessages}</TableCell>
              <TableCell className="text-zinc-400">{formatDate(campaign.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(campaign)}
                          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors"
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
                          disabled={isDeleting[campaign._id] || campaign.status === 'processing'}
                          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting[campaign._id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{campaign.status === 'processing' ? 'Cannot delete processing campaign' : 'Delete Campaign'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}