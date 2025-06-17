"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DelayConfigurationProps {
  delayRange: { start: number; end: number };
  setDelayRange: (range: { start: number; end: number }) => void;
  canResume: boolean;
}

export default function DelayConfiguration({
  delayRange,
  setDelayRange,
  canResume
}: DelayConfigurationProps) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-white mb-4">Adjust Delay Configuration</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-zinc-400">Start Delay (seconds)</Label>
          <Input
            type="number"
            value={delayRange.start}
            onChange={(e) => setDelayRange({ ...delayRange, start: parseInt(e.target.value) || 1 })}
            className="bg-zinc-800 border-zinc-700 text-zinc-200"
            min="1"
            disabled={!canResume}
          />
        </div>
        <div>
          <Label className="text-zinc-400">End Delay (seconds)</Label>
          <Input
            type="number"
            value={delayRange.end}
            onChange={(e) => setDelayRange({ ...delayRange, end: parseInt(e.target.value) || 1 })}
            className="bg-zinc-800 border-zinc-700 text-zinc-200"
            min="1"
            disabled={!canResume}
          />
        </div>
      </div>
    </div>
  );
}