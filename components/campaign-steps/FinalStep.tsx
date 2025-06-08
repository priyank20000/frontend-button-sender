"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Send, Loader2, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Clock, MessageSquare } from 'lucide-react';
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
  failed: number;
  status: 'processing' | 'completed' | 'failed';
  currentRecipient?: string;
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
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const router = useRouter();

  // Get token for socket connection
  const getToken = (): string | null => {
    const cookieToken = Cookies.get('token');
    if (cookieToken) return cookieToken;
    return localStorage.getItem('token');
  };

  const token = getToken();

  // Socket connection for real-time updates
  const { on, off, isConnected } = useSocket({
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
          failed: data.failed,
          status: data.status,
          currentRecipient: data.currentRecipient
        });

        // Check if campaign is completed
        if (data.status === 'completed' || data.status === 'failed') {
          setIsProcessing(false);
          setIsCompleted(true);
        }
      }
    };

    const handleCampaignComplete = (data: any) => {
      if (data.campaignId === currentCampaignId) {
        setIsProcessing(false);
        setIsCompleted(true);
        setCampaignProgress(prev => prev ? { ...prev, status: data.status } : null);
      }
    };

    on('campaign.progress', handleCampaignProgress);
    on('campaign.complete', handleCampaignComplete);

    return () => {
      off('campaign.progress', handleCampaignProgress);
      off('campaign.complete', handleCampaignComplete);
    };
  }, [isConnected, currentCampaignId, on, off]);

  const handleSendMessages = async () => {
    setIsLoading(true);
    setIsProcessing(true);
    setIsCompleted(false);
    setCampaignProgress(null);
    
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
    if (!campaignProgress) return 0;
    return Math.round((campaignProgress.sent + campaignProgress.failed) / campaignProgress.total * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Final Review</h3>
        <p className="text-zinc-400 mb-6">Review your campaign details and send messages to all selected numbers.</p>
      </div>

      {/* Campaign Progress Card */}
      {(isProcessing || campaignProgress) && (
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-zinc-200 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Campaign Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaignProgress && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Status:</span>
                  <span className={`font-medium ${getStatusColor(campaignProgress.status)}`}>
                    {campaignProgress.status.charAt(0).toUpperCase() + campaignProgress.status.slice(1)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Progress</span>
                    <span className="text-zinc-200">
                      {campaignProgress.sent + campaignProgress.failed} / {campaignProgress.total}
                    </span>
                  </div>
                  <Progress 
                    value={getProgressPercentage()} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{getProgressPercentage()}% Complete</span>
                    <span>
                      Sent: {campaignProgress.sent} | Failed: {campaignProgress.failed}
                    </span>
                  </div>
                </div>

                {campaignProgress.currentRecipient && campaignProgress.status === 'processing' && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Clock className="h-4 w-4" />
                    <span>Currently sending to: {campaignProgress.currentRecipient}</span>
                  </div>
                )}
              </>
            )}

            {isProcessing && !campaignProgress && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initializing campaign...</span>
              </div>
            )}
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
                  {campaignProgress && (
                    <TableHead className="text-zinc-400">Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecipients.map((contact, index) => {
                  const globalIndex = indexOfFirstRecipient + index;
                  const recipientStatus = campaignProgress ? 
                    (globalIndex < campaignProgress.sent + campaignProgress.failed ? 
                      (globalIndex < campaignProgress.sent ? 'sent' : 'failed') : 'pending') 
                    : 'pending';

                  return (
                    <TableRow key={`${contact.number}-${index}`} className="border-zinc-700">
                      <TableCell className="text-zinc-200">
                        {globalIndex + 1}
                      </TableCell>
                      <TableCell className="text-zinc-200 font-medium">{contact.name}</TableCell>
                      <TableCell className="text-zinc-200">{contact.number}</TableCell>
                      {campaignProgress && (
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            recipientStatus === 'sent' ? 'bg-green-500/10 text-green-400' :
                            recipientStatus === 'failed' ? 'bg-red-500/10 text-red-400' :
                            'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {recipientStatus}
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
          {!isCompleted && !isProcessing && (
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