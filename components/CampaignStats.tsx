"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, CheckCircle, XCircle } from 'lucide-react';

interface CampaignStatsProps {
  stats: {
    total: number;
    completed: number;
    failed: number;
  };
}

export default function CampaignStats({ stats }: CampaignStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <Card className="bg-zinc-900/80 border-zinc-800/80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/80 border-zinc-800/80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Completed</p>
              <p className="text-2xl font-bold text-white">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/80 border-zinc-800/80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Failed</p>
              <p className="text-2xl font-bold text-white">{stats.failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}