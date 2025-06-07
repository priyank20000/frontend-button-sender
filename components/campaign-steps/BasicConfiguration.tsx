"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, X } from 'lucide-react';

interface BasicConfigurationProps {
  campaignName: string;
  setCampaignName: (name: string) => void;
  selectedInstances: string[];
  setSelectedInstances: (instances: string[]) => void;
  instances: any[];
}

export default function BasicConfiguration({
  campaignName,
  setCampaignName,
  selectedInstances,
  setSelectedInstances,
  instances
}: BasicConfigurationProps) {
  const handleInstanceSelection = (instanceId: string) => {
    setSelectedInstances(
      selectedInstances.includes(instanceId)
        ? selectedInstances.filter(id => id !== instanceId)
        : [...selectedInstances, instanceId]
    );
  };

  const handleSelectAllInstances = () => {
    const connectedInstanceIds = instances
      .filter(instance => instance.whatsapp.status === 'connected')
      .map(instance => instance._id);
    setSelectedInstances(connectedInstanceIds);
  };

  const handleDeselectAllInstances = () => {
    setSelectedInstances([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Basic Configuration</h3>
        <p className="text-zinc-400 mb-6">Enter the Campaign Name and Select Instance Details.</p>
      </div>

      {/* Campaign Name */}
      <div className="space-y-2">
        <Label className="text-zinc-400 font-medium">Campaign Name *</Label>
        <Input
          placeholder="Enter campaign name"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-200"
        />
      </div>

      {/* Instance Selection */}
      <div className="space-y-4">
        <Label className="text-zinc-400 font-medium">Select Instances *</Label>
        <Select
          value={selectedInstances}
          onValueChange={(value) => {
            if (value === 'select-all') {
              handleSelectAllInstances();
            } else if (value === 'deselect-all') {
              handleDeselectAllInstances();
            } else {
              handleInstanceSelection(value);
            }
          }}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
            <SelectValue
              placeholder="Select instances"
              className="text-zinc-400"
            >
              {selectedInstances.length > 0
                ? `${selectedInstances.length} instance${selectedInstances.length > 1 ? 's' : ''} selected`
                : 'Select instances'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200 max-h-60 overflow-y-auto">
            <SelectItem value="select-all" className="font-semibold">
              Select All
            </SelectItem>
            <SelectItem value="deselect-all" className="font-semibold">
              Deselect All
            </SelectItem>
            {instances
              .filter(instance => instance.whatsapp.status === 'connected')
              .map(instance => (
                <SelectItem key={instance._id} value={instance._id}>
                  <div className="flex items-center justify-between">
                    <span>{instance.name || `Device ${instance._id.slice(-4)}`}</span>
                    <Badge className="bg-green-500 text-white ml-2">
                      Connected
                    </Badge>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        
        {instances.filter(i => i.whatsapp.status === 'connected').length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-zinc-400">No connected instances available. Please connect at least one instance first.</p>
          </div>
        )}
        
        {/* Display selected instances */}
        {selectedInstances.length > 0 && (
          <div className="mt-4">
            <p className="text-zinc-400 text-sm mb-2">Selected Instances:</p>
            <div className="flex flex-wrap gap-2">
              {selectedInstances.map(instanceId => {
                const instance = instances.find(i => i._id === instanceId);
                return (
                  <Badge key={instanceId} variant="outline" className="text-zinc-200">
                    {instance?.name || `Device ${instanceId.slice(-4)}`}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-4 w-4 p-0"
                      onClick={() => handleInstanceSelection(instanceId)}
                    >
                      <X className="h-3 w-3 text-red-400" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}