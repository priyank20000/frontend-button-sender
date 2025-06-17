"use client";

import { Wifi, WifiOff, StopCircle } from 'lucide-react';

interface ConnectionStatus {
  isConnected: boolean;
  message: string;
  subMessage: string;
}

interface CampaignStatusCardProps {
  connectionStatus: ConnectionStatus;
  isProcessing: boolean;
  isPaused: boolean;
  isStopped: boolean;
  instancesDisconnected: boolean;
  disconnectionReason: string;
}

export default function CampaignStatusCard({
  connectionStatus,
  isProcessing,
  isPaused,
  isStopped,
  instancesDisconnected,
  disconnectionReason
}: CampaignStatusCardProps) {
  if (isStopped) {
    return (
      <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/20">
        <div className="flex items-center gap-3">
          <StopCircle className="h-5 w-5 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-400">
              🛑 Campaign Stopped
            </p>
            <p className="text-xs text-red-300">
              Campaign has been permanently stopped and cannot be resumed
            </p>
          </div>
        </div>
      </div>
    );
  }

  if ((isProcessing || isPaused) && connectionStatus) {
    return (
      <div className={`p-4 rounded-lg border ${connectionStatus.isConnected ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        <div className="flex items-center gap-3">
          {connectionStatus.isConnected ? (
            <Wifi className="h-5 w-5 text-green-400" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-400" />
          )}
          <div>
            <p className={`text-sm font-medium ${connectionStatus.isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {connectionStatus.message}
            </p>
            <p className={`text-xs ${connectionStatus.isConnected ? 'text-green-300' : 'text-red-300'}`}>
              {connectionStatus.subMessage}
              {disconnectionReason && ` - ${disconnectionReason}`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}