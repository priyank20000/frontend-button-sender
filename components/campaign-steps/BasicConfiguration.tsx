"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, X, Check, ChevronDown, Users, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const connectedInstances = instances.filter(instance => instance.whatsapp.status === 'connected');
  const isAllSelected = selectedInstances.length === connectedInstances.length && connectedInstances.length > 0;

  const handleInstanceSelection = (instanceId: string) => {
    setSelectedInstances(
      selectedInstances.includes(instanceId)
        ? selectedInstances.filter(id => id !== instanceId)
        : [...selectedInstances, instanceId]
    );
  };

  const handleSelectAll = () => {
    const connectedInstanceIds = connectedInstances.map(instance => instance._id);
    setSelectedInstances(connectedInstanceIds);
  };

  const handleDeselectAll = () => {
    setSelectedInstances([]);
  };

  const filteredInstances = connectedInstances.filter(instance => {
    const name = instance.name || `Device ${instance._id.slice(-4)}`;
    const phone = instance.whatsapp.phone || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           phone.includes(searchTerm);
  });

  const getDisplayText = () => {
    if (selectedInstances.length === 0) {
      return "Select instances";
    }
    if (selectedInstances.length === connectedInstances.length) {
      return `All instances selected (${selectedInstances.length})`;
    }
    if (selectedInstances.length <= 3) {
      return selectedInstances.map(id => {
        const instance = instances.find(i => i._id === id);
        return instance?.name || `Device ${id.slice(-4)}`;
      }).join(", ");
    }
    return `${selectedInstances.length} instances selected`;
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
        <div className="flex justify-between items-center">
          <Label className="text-zinc-400 font-medium">Select Instances *</Label>
          <div className="flex gap-3">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              disabled={isAllSelected}
              className={`${
                isAllSelected 
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-500 cursor-not-allowed' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Select All
            </Button>
            
            <Button
              onClick={handleDeselectAll}
              variant="outline"
              size="sm"
              disabled={selectedInstances.length === 0}
              className={`${
                selectedInstances.length === 0
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-500 cursor-not-allowed'
                  : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
              }`}
            >
              <UserX className="h-4 w-4 mr-2" />
              Deselect All
            </Button>
          </div>
        </div>
        
        {connectedInstances.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-zinc-400">No connected instances available. Please connect at least one instance first.</p>
          </div>
        ) : (
          <>
            {/* Instance count info */}
          
            <div className="relative">
              {/* Custom Dropdown Trigger */}
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md cursor-pointer hover:border-zinc-600 transition-colors"
              >
                <span className="text-zinc-200 truncate">
                  {getDisplayText()}
                </span>
                <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown Content */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-50 max-h-80 overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b border-zinc-700">
                    <Input
                      placeholder="Search instances..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-zinc-900 border-zinc-600 text-zinc-200 h-8"
                    />
                  </div>

                  {/* Instance List with Profile Pictures */}
                  <div className="max-h-60 overflow-y-auto">
                    {filteredInstances.length === 0 ? (
                      <div className="p-4 text-center text-zinc-400">
                        No instances found
                      </div>
                    ) : (
                      filteredInstances.map(instance => (
                        <div
                          key={instance._id}
                          onClick={() => handleInstanceSelection(instance._id)}
                          className="flex items-center gap-3 p-3 hover:bg-zinc-700 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedInstances.includes(instance._id)}
                            onChange={() => {}} // Handled by parent onClick
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          
                          {/* Profile Picture */}
                          <div className="relative flex-shrink-0">
                            {instance.whatsapp.profile ? (
                              <img
                                src={instance.whatsapp.profile}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover border-2 border-zinc-600"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center border-2 border-zinc-600">
                                <span className="text-zinc-300 font-semibold text-sm">
                                  {(instance.name || `D${instance._id.slice(-2)}`).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-800 ${
                              instance.whatsapp.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}></div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-200 font-medium truncate">
                                {instance.name || `Device ${instance._id.slice(-4)}`}
                              </span>
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                                Connected
                              </Badge>
                            </div>
                            {instance.whatsapp.phone && (
                              <span className="text-zinc-400 text-sm">
                                {instance.whatsapp.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Click outside to close */}
              {isDropdownOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}
            </div>
          </>
        )}

        {/* Selected Instances Summary - Only show first 5 */}
        {selectedInstances.length > 0 && (
          <div className="mt-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm font-medium">
                Selected Instances ({selectedInstances.length})
              </span>
              {selectedInstances.length > 5 && (
                <span className="text-zinc-500 text-xs">
                  Showing first 5 of {selectedInstances.length}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedInstances.slice(0, 5).map(instanceId => {
                const instance = instances.find(i => i._id === instanceId);
                return (
                  <Badge key={instanceId} variant="outline" className="text-zinc-200 bg-zinc-700/50">
                    {instance?.name || `Device ${instanceId.slice(-4)}`}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-4 w-4 p-0 hover:bg-red-500/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstanceSelection(instanceId);
                      }}
                    >
                      <X className="h-3 w-3 text-red-400" />
                    </Button>
                  </Badge>
                );
              })}
              {selectedInstances.length > 5 && (
                <Badge variant="outline" className="text-zinc-400 bg-zinc-700/30">
                  +{selectedInstances.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}