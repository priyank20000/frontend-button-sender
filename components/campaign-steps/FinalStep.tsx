"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, Loader2, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Clock, MessageSquare, Pause, Play, StopCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSocket } from "../../hooks/useSocket";
import Cookies from 'js-cookie';

interface FinalStepProps {
  campaignName: string;
  selectedTemplate: string;
  selectedInstances: string[];
  antdContacts: any[];
  delayRange: { start: number; end: number };
  templates: any[];
  instances: any[];
  onSendCampaign: () => void;
  isSending: boolean;
  onClose: () => void;
  onBack?: () => void;
}

interface CampaignProgress {
  campaignId: string;
  total: number;
  sent: number;
  failed?: number;
  notExist?: number;
  status: 'processing' | 'completed' | 'pending' | 'paused';
  currentRecipient?: string;
  lastMessageStatus?: 'sent' | 'failed' | 'not_exist';
  lastRecipient?: string;
  canStop?: boolean;
  canResume?: boolean;
}

export default function FinalStep({
  campaignName,
  selectedTemplate,
  selectedInstances,
  antdContacts,
  delayRange,
  templates,
  instances,
  onSendCampaign,
  isSending,
  onClose,
  onBack
}: FinalStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recipientsPerPage] = useState(10);
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress>({ 
    campaignId: '', 
    total: antdContacts.length, 
    sent: 0, 
    failed: 0,
    notExist: 0,
    status: 'pending' 
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [recipientStatuses, setRecipientStatuses] = useState<string[]>(new Array(antdContacts.length).fill('pending'));
  const [existingNumbers, setExistingNumbers] = useState(0);
  const [nonExistingNumbers, setNonExistingNumbers] = useState(0);
  const router = useRouter();

  // Get token for socket connection
  const getToken = (): string | null => {
    const cookieToken = Cookies.get('token');
    if (cookieToken) return cookieToken;
    return localStorage.getItem('token');
  };

  const token = getToken();

  // Socket connection for real-time updates
  const { on, off, isConnected, emit } = useSocket({
    token,
    onConnect: () => {
      console.log('Socket connected for campaign tracking');
    },
    onDisconnect: () => {
      console.log('Socket disconnected');
    },
    onError: (error) => {
      console.error('Socket error:', error);
    }
  });

  // Listen for campaign progress updates
  useEffect(() => {
    if (!isConnected || !currentCampaignId) return;

    const handleCampaignProgress = (data: any) => {
      if (data.campaignId === currentCampaignId) {
        setCampaignProgress({
          campaignId: data.campaignId,
          total: data.total,
          sent: data.sent,
          failed: data.failed || 0,
          notExist: data.notExist || 0,
          status: data.status,
          currentRecipient: data.currentRecipient,
          lastMessageStatus: data.lastMessageStatus,
          lastRecipient: data.lastRecipient,
          canStop: data.canStop,
          canResume: data.canResume
        });

        // Update recipient status based on lastMessageStatus
        if (data.lastRecipient && data.lastMessageStatus) {
          const recipientIndex = antdContacts.findIndex(contact => contact.name === data.lastRecipient);
          if (recipientIndex !== -1) {
            setRecipientStatuses(prev => {
              const newStatuses = [...prev];
              newStatuses[recipientIndex] = data.lastMessageStatus;
              return newStatuses;
            });
          }
        }

        // Update existing/non-existing counts
        const existing = data.sent;
        const nonExisting = data.notExist || 0;
        setExistingNumbers(existing);
        setNonExistingNumbers(nonExisting);

        // Check if campaign is completed
        if (data.status === 'completed') {
          setIsProcessing(false);
          setIsCompleted(true);
          setIsPaused(false);
        }
      }
    };

    const handleCampaignComplete = (data: any) => {
      if (data.campaignId === currentCampaignId) {
        setIsProcessing(false);
        setIsCompleted(true);
        setIsPaused(false);
        
        // Final count update
        setExistingNumbers(data.sent);
        setNonExistingNumbers(data.notExist || 0);
      }
    };

    const handleCampaignPaused = (data: any) => {
      if (data.campaignId === currentCampaignId) {
        setIsPaused(true);
        setIsProcessing(false);
        setCampaignProgress(prev => ({
          ...prev,
          status: 'paused',
          canStop: data.canStop,
          canResume: data.canResume
        }));
      }
    };

    const handleCampaignResumed = (data: any) => {
      if (data.campaignId === currentCampaignId) {
        setIsPaused(false);
        setIsProcessing(true);
        setCampaignProgress(prev => ({
          ...prev,
          status: 'processing',
          canStop: data.canStop,
          canResume: data.canResume
        }));
      }
    };

    on('campaign.progress', handleCampaignProgress);
    on('campaign.complete', handleCampaignComplete);
    on('campaign.paused', handleCampaignPaused);
    on('campaign.resumed', handleCampaignResumed);

    return () => {
      off('campaign.progress', handleCampaignProgress);
      off('campaign.complete', handleCampaignComplete);
      off('campaign.paused', handleCampaignPaused);
      off('campaign.resumed', handleCampaignResumed);
    };
  }, [isConnected, currentCampaignId, on, off, antdContacts]);

  const handleSendMessages = async () => {
    setIsLoading(true);
    setIsProcessing(true);
    setIsCompleted(false);
    setIsPaused(false);
    setRecipientStatuses(new Array(antdContacts.length).fill('pending'));
    setExistingNumbers(0);
    setNonExistingNumbers(0);
    
    try {
      const authToken = getToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const payload = {
        name: campaignName,
        templateId: selectedTemplate,
        instanceIds: selectedInstances,
        recipients: antdContacts.map(contact => ({
          phone: contact.number,
          name: contact.name,
          variables: {
            var1: contact.var1 || '',
            var2: contact.var2 || '',
            var3: contact.var3 || '',
            var4: contact.var4 || '',
            var5: contact.var5 || '',
            var6: contact.var6 || '',
            var7: contact.var7 || '',
            var8: contact.var8 || '',
            var9: contact.var9 || '',
            var10: contact.var10 || '',
          }
        })),
        delayRange,
      };

      const response = await fetch('https://whatsapp.recuperafly.com/api/template/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        throw new Error('Authentication failed');
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.message || 'Failed to send campaign');
      }

      // Set the campaign ID for tracking
      if (result.campaignId) {
        setCurrentCampaignId(result.campaignId);
      }

      // Initialize progress tracking
      setCampaignProgress({
        campaignId: result.campaignId || 'unknown',
        total: antdContacts.length,
        sent: 0,
        failed: 0,
        notExist: 0,
        status: 'processing'
      });

    } catch (err) {
      console.error('Error sending campaign:', err);
      setIsProcessing(false);
      setIsLoading(false);
      // Handle error (you might want to show an error toast here)
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignControl = async (action: 'stop' | 'resume') => {
    if (!currentCampaignId) return;

    try {
      const authToken = getToken();
      const response = await fetch('https://whatsapp.recuperafly.com/api/template/campaign/control', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          campaignId: currentCampaignId,
          action: action
        }),
      });

      const result = await response.json();
      if (result.status) {
        console.log(`Campaign ${action} signal sent successfully`);
      }
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
    }
  };

  const handleStopCampaign = () => handleCampaignControl('stop');
  const handleResumeCampaign = () => handleCampaignControl('resume');

  const handleComplete = () => {
    onClose();
    // Refresh the messaging page data when navigating back
    router.push('/dashboard/messaging?refresh=true');
  };

  const totalRecipients = antdContacts.length;
  const totalPages = Math.ceil(totalRecipients / recipientsPerPage);
  const indexOfLastRecipient = currentPage * recipientsPerPage;
  const indexOfFirstRecipient = indexOfLastRecipient - recipientsPerPage;
  const currentRecipients = antdContacts.slice(indexOfFirstRecipient, indexOfLastRecipient);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getProgressPercentage = () => {
    if (campaignProgress.total === 0) return 0;
    return Math.round(((campaignProgress.sent + (campaignProgress.failed || 0) + (campaignProgress.notExist || 0)) / campaignProgress.total) * 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Final Review</h3>
        <p className="text-zinc-400 mb-6">Review your campaign details and send messages to all selected numbers.</p>
      </div>

      {/* Progress Stats */}
      {(isProcessing || isPaused || isCompleted) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{existingNumbers}</div>
                <div className="text-sm text-blue-300">Existing Numbers</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{nonExistingNumbers}</div>
                <div className="text-sm text-red-300">Non-Existing Numbers</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{campaignProgress.sent}</div>
                <div className="text-sm text-green-300">Messages Sent</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-500/10 border-zinc-500/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-zinc-400">{getProgressPercentage()}%</div>
                <div className="text-sm text-zinc-300">Progress</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Status */}
      {isProcessing && (
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <div>
                  <h3 className="text-blue-400 font-semibold text-lg">Campaign Running</h3>
                  <p className="text-blue-300">
                    {campaignProgress.currentRecipient ? 
                      `Currently sending to: ${campaignProgress.currentRecipient}` : 
                      'Processing messages...'
                    }
                  </p>
                </div>
              </div>
              {campaignProgress.canStop && (
                <Button
                  onClick={handleStopCampaign}
                  variant="outline"
                  className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isPaused && (
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Pause className="h-8 w-8 text-yellow-500" />
                <div>
                  <h3 className="text-yellow-400 font-semibold text-lg">Campaign Paused</h3>
                  <p className="text-yellow-300">Campaign has been paused. Click resume to continue.</p>
                </div>
              </div>
              {campaignProgress.canResume && (
                <Button
                  onClick={handleResumeCampaign}
                  variant="outline"
                  className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Message */}
      {isCompleted && (
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="text-green-400 font-semibold text-lg">Campaign Completed!</h3>
                <p className="text-green-300">
                  Sent: {campaignProgress.sent} | Failed: {campaignProgress.failed || 0} | Not on WhatsApp: {campaignProgress.notExist || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipients Table */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-zinc-200">Recipients ({antdContacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700">
                  <TableHead className="text-zinc-400">SN</TableHead>
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Phone</TableHead>
                  {(isProcessing || isPaused || isCompleted) && (
                    <TableHead className="text-zinc-400">Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecipients.map((contact, index) => {
                  const globalIndex = indexOfFirstRecipient + index;
                  const recipientStatus = recipientStatuses[globalIndex] || 'pending';

                  return (
                    <TableRow key={`${contact.number}-${index}`} className="border-zinc-700">
                      <TableCell className="text-zinc-200">
                        {globalIndex + 1}
                      </TableCell>
                      <TableCell className="text-zinc-200 font-medium">{contact.name}</TableCell>
                      <TableCell className="text-zinc-200">{contact.number}</TableCell>
                      {(isProcessing || isPaused || isCompleted) && (
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            recipientStatus === 'sent' ? 'bg-green-500/10 text-green-400' :
                            recipientStatus === 'failed' ? 'bg-red-500/10 text-red-400' :
                            recipientStatus === 'not_exist' ? 'bg-orange-500/10 text-orange-400' :
                            'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {recipientStatus === 'sent' ? 'Sent' :
                             recipientStatus === 'failed' ? 'Failed' :
                             recipientStatus === 'not_exist' ? 'Not on WhatsApp' :
                             'Pending'}
                          </span>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-zinc-700 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 text-sm">
                  Showing {indexOfFirstRecipient + 1}-{Math.min(indexOfLastRecipient, totalRecipients)} of {totalRecipients} recipients
                </span>
              </div>
              
              <div className="flex items-center">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ${
                    currentPage === 1
                      ? 'text-zinc-600 cursor-not-allowed'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                  aria-label="Previous page"
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
                            ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                            : 'bg-transparent hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                        aria-label={`Page ${page}`}
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
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
        <div className="flex gap-3">
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isLoading || isProcessing}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading || isProcessing}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            Cancel
          </Button>
        </div>
        
        <div className="flex gap-3">
          {!isCompleted && !isProcessing && !isPaused && (
            <Button
              onClick={handleSendMessages}
              disabled={isLoading || isSending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading || isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Messages
                </>
              )}
            </Button>
          )}

          {isProcessing && (
            <Button
              disabled
              className="bg-blue-600/50 text-white cursor-not-allowed"
            >
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </Button>
          )}

          {isPaused && (
            <Button
              disabled
              className="bg-yellow-600/50 text-white cursor-not-allowed"
            >
              <Pause className="h-4 w-4 mr-2" />
              Paused
            </Button>
          )}
          
          {isCompleted && (
            <Button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}