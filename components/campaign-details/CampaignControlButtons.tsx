"use client";

import { Button } from "@/components/ui/button";
import { Pause, Play, StopCircle } from 'lucide-react';
import { useState } from 'react';

interface CampaignControlButtonsProps {
  isProcessing: boolean;
  isPaused: boolean;
  isStopped: boolean;
  canResume: boolean;
  onPause: () => void;
  onStop: () => void;
  onResume: () => void;
}

export default function CampaignControlButtons({
  isProcessing,
  isPaused,
  isStopped,
  canResume,
  onPause,
  onStop,
  onResume
}: CampaignControlButtonsProps) {
  const [isPausing, setIsPausing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  const handlePause = async () => {
    setIsPausing(true);
    try {
      await onPause();
    } finally {
      setIsPausing(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await onStop();
    } finally {
      setIsStopping(false);
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    try {
      await onResume();
    } finally {
      setIsResuming(false);
    }
  };

  if (isProcessing) {
    return (
      <>
        <Button
          onClick={handlePause}
          disabled={isPausing}
          variant="outline"
          size="sm"
          className="bg-yellow-600/20 border-yellow-500 text-yellow-400 hover:bg-yellow-600/30 transition-all duration-75"
        >
          <Pause className="h-4 w-4 mr-2" />
          {isPausing ? 'Pausing...' : 'Pause'}
        </Button>
        <Button
          onClick={handleStop}
          disabled={isStopping}
          variant="outline"
          size="sm"
          className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 transition-all duration-75"
        >
          <StopCircle className="h-4 w-4 mr-2" />
          {isStopping ? 'Stopping...' : 'Stop'}
        </Button>
      </>
    );
  }

  if (isPaused) {
    return (
      <>
        <Button
          onClick={handleResume}
          disabled={isResuming || !canResume}
          variant="outline"
          size="sm"
          className={`transition-all duration-75 ${
            canResume 
              ? 'bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30' 
              : 'bg-gray-600/20 border-gray-500 text-gray-400 cursor-not-allowed opacity-50'
          }`}
        >
          <Play className="h-4 w-4 mr-2" />
          {isResuming ? 'Resuming...' : 
           !canResume ? 'Waiting for Connection' : 'Resume'}
        </Button>
        <Button
          onClick={handleStop}
          disabled={isStopping}
          variant="outline"
          size="sm"
          className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 transition-all duration-75"
        >
          <StopCircle className="h-4 w-4 mr-2" />
          {isStopping ? 'Stopping...' : 'Stop'}
        </Button>
      </>
    );
  }

  if (isStopped) {
    return (
      <div className="text-red-400 text-sm font-medium flex items-center gap-2">
        <StopCircle className="h-4 w-4" />
        Campaign Stopped
      </div>
    );
  }

  return null;
}