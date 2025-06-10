"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ScheduleCampaignProps {
  campaignName: string;
  selectedTemplate: string;
  selectedInstances: string[];
  antdContacts: any[];
  delayRange: { start: number; end: number };
  setDelayRange: (range: { start: number; end: number }) => void;
  templates: any[];
  onSendCampaign: () => void;
  isSending: boolean;
}

export default function ScheduleCampaign({
  campaignName,
  selectedTemplate,
  selectedInstances,
  antdContacts,
  delayRange,
  setDelayRange,
  templates,
  onSendCampaign,
  isSending
}: ScheduleCampaignProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Schedule Campaign</h3>
        <p className="text-zinc-400 mb-6">Configure delay settings for your campaign.</p>
      </div>

      {/* Campaign Summary */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-zinc-200 mb-4">Campaign Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-zinc-400">Campaign Name</Label>
            <p className="text-zinc-200 font-medium">{campaignName}</p>
          </div>
          <div>
            <Label className="text-zinc-400">Selected Template</Label>
            <p className="text-zinc-200 font-medium">
             1 template
            </p>
          </div>
          <div>
            <Label className="text-zinc-400">Selected Instances</Label>
            <p className="text-zinc-200 font-medium">
              {selectedInstances.length} instances
            </p>
          </div>
          <div>
            <Label className="text-zinc-400">Total Messages</Label>
            <p className="text-zinc-200 font-medium">{antdContacts.length} message</p>
          </div>
 
        </div>
      </div>

      {/* Delay Configuration */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-zinc-200 mb-4">Delay Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400">Starting Delay (seconds)</Label>
            <Input
              type="number"
              value={delayRange.start}
              onChange={(e) => setDelayRange({ ...delayRange, start: parseInt(e.target.value) || 0 })}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
              min="1"
            />
          </div>
          <div>
            <Label className="text-zinc-400">Ending Delay (seconds)</Label>
            <Input
              type="number"
              value={delayRange.end}
              onChange={(e) => setDelayRange({ ...delayRange, end: parseInt(e.target.value) || 0 })}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
              min="1"
            />
          </div>
        </div>
        <p className="text-zinc-400 text-sm mt-2">
          Messages will be sent with a random delay between {delayRange.start} and {delayRange.end} seconds.
        </p>
      </div>
    </div>
  );
}