"use client";

interface CampaignStatsProps {
  totalMessages: number;
  recipientStatuses: string[];
}

export default function CampaignStats({
  totalMessages,
  recipientStatuses
}: CampaignStatsProps) {
  const sentCount = recipientStatuses.filter(status => status === 'sent').length;
  const failedCount = recipientStatuses.filter(status => status === 'failed').length;
  const notExistCount = recipientStatuses.filter(status => status === 'not_exist').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{totalMessages}</div>
          <div className="text-sm text-blue-300">Total</div>
        </div>
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">{sentCount}</div>
          <div className="text-sm text-green-300">Sent</div>
        </div>
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{failedCount}</div>
          <div className="text-sm text-red-300">Failed</div>
        </div>
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">{notExistCount}</div>
          <div className="text-sm text-orange-300">Error</div>
        </div>
      </div>
    </div>
  );
}