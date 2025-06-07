"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from 'lucide-react';

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
  status: 'completed' | 'failed';
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

const CAMPAIGN_STATUS = {
  completed: { label: 'Completed', color: 'bg-green-500', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500', icon: XCircle }
};

export default function CampaignDetailsDialog({
  open,
  onOpenChange,
  campaign
}: CampaignDetailsDialogProps) {
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
      <Badge className={`${statusInfo.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Campaign Details: {campaign.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            View detailed information about this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Campaign Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400">Campaign Name</Label>
                <p className="text-zinc-200 font-medium">{campaign.name}</p>
              </div>
              <div>
                <Label className="text-zinc-400">Status</Label>
                <div className="mt-1">{getStatusBadge(campaign.status)}</div>
              </div>
              <div>
                <Label className="text-zinc-400">Template</Label>
                <p className="text-zinc-200">{campaign.template.name}</p>
              </div>
              <div>
                <Label className="text-zinc-400">Instances</Label>
                <p className="text-zinc-200">{campaign.instances.length} instances</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400">Total Messages</Label>
                <p className="text-zinc-200 font-medium">{campaign.totalMessages}</p>
              </div>
              <div>
                <Label className="text-zinc-400">Sent</Label>
                <p className="text-green-400 font-medium">{campaign.sentMessages}</p>
              </div>
              <div>
                <Label className="text-zinc-400">Failed</Label>
                <p className="text-red-400 font-medium">{campaign.failedMessages}</p>
              </div>
              <div>
                <Label className="text-zinc-400">Delay Range</Label>
                <p className="text-zinc-200">{campaign.delayRange.start}s - {campaign.delayRange.end}s</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Progress</Label>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${campaign.totalMessages > 0 ? (campaign.sentMessages / campaign.totalMessages) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-zinc-400 text-sm">
              {campaign.sentMessages} of {campaign.totalMessages} messages sent
            </p>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-zinc-400">Created At</Label>
              <p className="text-zinc-200">{formatDate(campaign.createdAt)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}