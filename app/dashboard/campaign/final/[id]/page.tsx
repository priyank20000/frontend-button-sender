"use client";

import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff, StopCircle, Pause, Play, RefreshCw, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCampaignRealtime } from "@/hooks/useCampaignRealtime";
import React from "react";

export default function CampaignFinalPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const campaignId = params.id;
  const {
    campaign,
    recipientStatuses,
    isProcessing,
    isPaused,
    isStopped,
    isLoading,
    isRefreshing,
    statusFilter,
    setStatusFilter,
    delayRange,
    setDelayRange,
    connectionStatus,
    controlStates,
    handleStopCampaign,
    handlePauseCampaign,
    handleResumeCampaign,
    refreshCampaignDetails,
    handleStartCampaign,
    isStarting,
  } = useCampaignRealtime(campaignId);

  const recipientsPerPage = 10;
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isDownloadingExcel, setIsDownloadingExcel] = React.useState(false);

  // Get token function
  const getToken = (): string | null => {
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
    
    if (cookieToken) {
      return cookieToken;
    }
    
    const localToken = localStorage.getItem('token');
    if (localToken) {
      return localToken;
    }

    return null;
  };

  // Handle Excel download
  const handleDownloadExcel = async () => {
    const token = getToken();
    if (!token) {
      console.error('No token available');
      return;
    }

    setIsDownloadingExcel(true);
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/template/xcel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaignId
        })
      });

      if (response.ok) {
        // Get the blob from response
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `campaign-${campaignId}-report.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download Excel file');
      }
    } catch (error) {
      console.error('Error downloading Excel:', error);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // Modified handleStopCampaign to prevent page reload and maintain UI state
  const handleStopCampaignModified = async (e?: React.MouseEvent) => {
    // Prevent any default behavior that might cause page reload
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Call the original stop function
    await handleStopCampaign();
  };

  // Modified handlePauseCampaign to prevent page reload
  const handlePauseCampaignModified = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    await handlePauseCampaign();
  };

  // Modified handleResumeCampaign to prevent page reload
  const handleResumeCampaignModified = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    await handleResumeCampaign();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return <div className="text-center text-white p-10">Campaign not found.</div>;
  }

  const filteredRecipients = campaign.recipients?.filter((recipient: any, index: number) => {
    if (statusFilter === 'all') return true;
    const status = recipientStatuses[index] || 'pending';
    return status === statusFilter;
  }) || [];

  const totalRecipients = filteredRecipients.length;
  const totalPages = Math.ceil(totalRecipients / recipientsPerPage);
  const indexOfLastRecipient = currentPage * recipientsPerPage;
  const indexOfFirstRecipient = indexOfLastRecipient - recipientsPerPage;
  const currentRecipients = filteredRecipients.slice(indexOfFirstRecipient, indexOfLastRecipient);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const getRecipientStatus = (recipient: any) => {
    const originalIndex = campaign.recipients?.indexOf(recipient) || 0;
    const status = recipientStatuses[originalIndex] || 'pending';
    
    // Don't change status to 'stopped' for pending recipients when campaign is stopped
    // Keep them as 'pending' as requested
    if (status === 'stopped') {
      return 'pending';
    }
    
    return status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-500/10 text-green-400';
      case 'failed':
        return 'bg-red-500/10 text-red-400';
      case 'not_exist':
        return 'bg-orange-500/10 text-orange-400';
      case 'stopped':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'failed':
        return 'Failed';
      case 'not_exist':
        return 'Not on WhatsApp';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Pending';
    }
  };

  const sentCount = recipientStatuses.filter(status => status === 'sent').length;
  const failedCount = recipientStatuses.filter(status => status === 'failed').length;
  const notExistCount = recipientStatuses.filter(status => status === 'not_exist').length;

  const canResume = isPaused && connectionStatus.connectedCount > 0;

  // Ensure total messages count is always available
  const totalMessages = campaign.totalMessages || campaign.recipients?.length || 0;

  // Show download button when campaign is paused, stopped, completed, or has some progress
  const showDownloadButton = (isPaused || isStopped || campaign?.status === 'completed') || 
    (!isProcessing && (sentCount > 0 || failedCount > 0 || notExistCount > 0));

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign Details</h1>
            <p className="text-zinc-400 mt-1">Name: <span className="text-white font-semibold">{campaign.name}</span></p>
            <p className="text-zinc-400">Status: <span className="text-white font-semibold capitalize">{campaign.status}</span></p>
          </div>
          <div className="flex gap-2">
            {isProcessing && (
              <>
                <Button
                  onClick={handlePauseCampaignModified}
                  disabled={controlStates.isPausing}
                  variant="outline"
                  size="sm"
                  className="bg-yellow-600/20 border-yellow-500 text-yellow-400 hover:bg-yellow-600/30 transition-all duration-75"
                  type="button"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  {controlStates.isPausing ? 'Pausing...' : 'Pause'}
                </Button>
                <Button
                  onClick={handleStopCampaignModified}
                  disabled={controlStates.isStopping}
                  variant="outline"
                  size="sm"
                  className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 transition-all duration-75"
                  type="button"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  {controlStates.isStopping ? 'Stopping...' : 'Stop'}
                </Button>
              </>
            )}
            {isPaused && (
              <>
                <Button
                  onClick={handleResumeCampaignModified}
                  disabled={controlStates.isResuming || !canResume}
                  variant="outline"
                  size="sm"
                  className={`transition-all duration-75 ${
                    canResume 
                      ? 'bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30' 
                      : 'bg-gray-600/20 border-gray-500 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                  type="button"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {controlStates.isResuming ? 'Resuming...' : 
                   !canResume ? 'Waiting for Connection' : 'Resume'}
                </Button>
                <Button
                  onClick={handleStopCampaignModified}
                  disabled={controlStates.isStopping}
                  variant="outline"
                  size="sm"
                  className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30 transition-all duration-75"
                  type="button"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  {controlStates.isStopping ? 'Stopping...' : 'Stop'}
                </Button>
              </>
            )}
            {isStopped && (
              <div className="text-red-400 text-sm font-medium flex items-center gap-2">
                <StopCircle className="h-4 w-4" />
                Campaign Stopped
              </div>
            )}
            {campaign?.status === 'pending' && (
              <Button
                onClick={handleStartCampaign}
                disabled={isStarting}
                variant="outline"
                size="sm"
                className="bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600/30"
                type="button"
              >
                {isStarting ? 'Starting...' : 'Start'}
              </Button>
            )}
            {/* Download Excel Button - Always show when campaign has progress or is completed */}
            {showDownloadButton && (
              <Button
                onClick={handleDownloadExcel}
                disabled={isDownloadingExcel}
                variant="outline"
                size="sm"
                className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30 transition-all duration-75"
                type="button"
              >
                {isDownloadingExcel ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isDownloadingExcel ? 'Downloading...' : 'Download Excel'}
              </Button>
            )}
            <Button
              onClick={refreshCampaignDetails}
              disabled={isRefreshing || isLoading}
              variant="outline"
              size="sm"
              className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              type="button"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || isLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/messaging')}
              type="button"
            >
              Back to Messaging
            </Button>
          </div>
        </div>

        {(isProcessing || isPaused) && campaign.instanceIds?.length > 0 && (
          <div className={`p-4 rounded-lg border ${
            connectionStatus.isLoading
              ? 'bg-blue-500/10 border-blue-500/20'
              : connectionStatus.isConnected
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center gap-3">
              {connectionStatus.isLoading ? (
                <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
              ) : connectionStatus.isConnected ? (
                <Wifi className="h-5 w-5 text-green-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-400" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  connectionStatus.isLoading
                    ? 'text-blue-400'
                    : connectionStatus.isConnected
                      ? 'text-green-400'
                      : 'text-red-400'
                }`}>
                  {connectionStatus.message}
                </p>
                <p className={`text-xs ${
                  connectionStatus.isLoading
                    ? 'text-blue-300'
                    : connectionStatus.isConnected
                      ? 'text-green-300'
                      : 'text-red-300'
                }`}>
                  {connectionStatus.subMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {isStopped && (
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
        )}

        {isPaused && (
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
        )}

        {/* Stats Cards - Always show total messages */}
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-200">Recipients ({campaign.recipients?.length || 0})</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-gray-700'}
                type="button"
              >
                <Users className="h-4 w-4 mr-2" />
                All ({campaign.recipients?.length || 0})
              </Button>
              <Button
                onClick={() => {
                  setStatusFilter('sent');
                  setCurrentPage(1);
                }}
                variant={statusFilter === 'sent' ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === 'sent' ? 'bg-green-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-gray-700'}
                type="button"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Sent ({sentCount})
              </Button>
              <Button
                onClick={() => {
                  setStatusFilter('failed');
                  setCurrentPage(1);
                }}
                variant={statusFilter === 'failed' ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === 'failed' ? 'bg-red-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-gray-700'}
                type="button"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Failed ({failedCount})
              </Button>
              <Button
                onClick={() => {
                  setStatusFilter('not_exist');
                  setCurrentPage(1);
                }}
                variant={statusFilter === 'not_exist' ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === 'not_exist' ? 'bg-orange-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-gray-700'}
                type="button"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Error ({notExistCount})
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700">
                  <TableHead className="text-zinc-400">SN</TableHead>
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Phone</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecipients.map((recipient: any, index: number) => {
                  const globalIndex = indexOfFirstRecipient + index;
                  const status = getRecipientStatus(recipient);
                  return (
                    <TableRow key={`${recipient.phone}-${index}`} className="border-zinc-700">
                      <TableCell className="text-zinc-200">{globalIndex + 1}</TableCell>
                      <TableCell className="text-zinc-200 font-medium">{recipient.name}</TableCell>
                      <TableCell className="text-zinc-200">{recipient.phone}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-zinc-700 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 text-sm">
                  Showing {indexOfFirstRecipient + 1}-{Math.min(indexOfLastRecipient, totalRecipients)} of {totalRecipients} recipients
                  {statusFilter !== 'all' && (
                    <Badge variant="outline" className="ml-2 text-zinc-300">
                      {statusFilter === 'sent' && 'Sent'}
                      {statusFilter === 'failed' && 'Failed'}
                      {statusFilter === 'not_exist' && 'Error'}
                    </Badge>
                  )}
                </span>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ${
                    currentPage === 1
                      ? 'text-zinc-600 cursor-not-allowed'
                      : 'text-zinc-400 hover:text-white hover:bg-gray-700'
                  }`}
                  aria-label="Previous page"
                  type="button"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-9 w-9 rounded-full transition-all duration-200 ${
                          currentPage === page
                            ? 'bg-zinc-700 text-white hover:bg-gray-600'
                            : 'bg-transparent hover:bg-gray-700 text-zinc-400 hover:text-white'
                        }`}
                        aria-label={`Page ${page}`}
                        type="button"
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ${
                    currentPage === totalPages
                      ? 'text-zinc-600 cursor-not-allowed'
                      : 'text-zinc-400 hover:text-white hover:bg-gray-700'
                  }`}
                  aria-label="Next page"
                  type="button"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}