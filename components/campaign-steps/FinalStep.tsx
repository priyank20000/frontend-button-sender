"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, Loader2, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

interface MessageStatus {
  phone: string;
  name: string;
  instanceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
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
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recipientsPerPage] = useState(10);
  const router = useRouter();

  const selectedTemplateData = templates.find(t => t._id === selectedTemplate);
  const selectedInstancesData = instances.filter(i => selectedInstances.includes(i._id));

  // Create message statuses with round-robin distribution of contacts to instances
  const createMessageStatuses = () => {
    const statuses: MessageStatus[] = [];
    antdContacts.forEach((contact, contactIndex) => {
      // Assign the contact to an instance using round-robin distribution
      const instanceIndex = contactIndex % selectedInstances.length;
      const instanceId = selectedInstances[instanceIndex];
      statuses.push({
        phone: contact.number,
        name: contact.name,
        instanceId: instanceId,
        status: 'pending'
      });
    });
    return statuses;
  };

  const handleSendMessages = async () => {
    const initialStatuses = createMessageStatuses();
    setMessageStatuses(initialStatuses);

    for (let i = 0; i < initialStatuses.length; i++) {
      setMessageStatuses(prev => prev.map((status, index) => 
        index === i ? { ...status, status: 'processing' } : status
      ));

      await new Promise(resolve => setTimeout(resolve, 800));

      setMessageStatuses(prev => prev.map((status, index) => 
        index === i ? { 
          ...status, 
          status: Math.random() > 0.15 ? 'completed' : 'failed',
          message: Math.random() > 0.15 ? 'Message sent successfully' : 'Failed to send message'
        } : status
      ));
    }

    await onSendCampaign();
    setIsCompleted(true);
  };

  const handleComplete = () => {
    onClose();
    router.push('/dashboard/messaging');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-zinc-400" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      case 'processing':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getInstanceDetails = (instanceId: string) => {
    return instances.find(i => i._id === instanceId);
  };

  const completedCount = messageStatuses.filter(s => s.status === 'completed').length;
  const failedCount = messageStatuses.filter(s => s.status === 'failed').length;
  const pendingCount = messageStatuses.filter(s => s.status === 'pending').length;
  const processingCount = messageStatuses.filter(s => s.status === 'processing').length;

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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Final Review</h3>
        <p className="text-zinc-400 mb-6">Review your campaign details and send messages to all selected numbers.</p>
      </div>

      {messageStatuses.length > 0 && (
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-zinc-200">Message Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-zinc-200">{completedCount}</p>
                <p className="text-green-400 text-sm">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-zinc-200">{failedCount}</p>
                <p className="text-red-400 text-sm">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-zinc-200">{processingCount}</p>
                <p className="text-blue-400 text-sm">Processing</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-zinc-200">{pendingCount}</p>
                <p className="text-zinc-400 text-sm">Pending</p>
              </div>
            </div>
            
            <div className="w-full bg-zinc-700 rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${messageStatuses.length > 0 ? ((completedCount + failedCount) / messageStatuses.length) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead className="text-zinc-400">Instance</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecipients.map((contact, index) => {
                  const globalIndex = indexOfFirstRecipient + index;
                  const instanceIndex = globalIndex % selectedInstances.length;
                  const instanceId = selectedInstances[instanceIndex];
                  const instance = getInstanceDetails(instanceId);
                  const messageStatus = messageStatuses.find(
                    ms => ms.phone === contact.number && ms.instanceId === instanceId
                  );

                  return (
                    <TableRow key={`${contact.number}-${instanceId}`} className="border-zinc-700">
                      <TableCell className="text-zinc-200">
                        {indexOfFirstRecipient + index + 1}
                      </TableCell>
                      <TableCell className="text-zinc-200 font-medium">{contact.name}</TableCell>
                      <TableCell className="text-zinc-200">{contact.number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {instance.whatsapp.profile ? (
                            <img
                              src={instance.whatsapp.profile}
                              alt="Profile"
                              className="w-8 h-8 rounded-full object-cover border border-zinc-600"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center border border-zinc-600">
                              <span className="text-zinc-300 font-semibold text-xs">
                                {(instance.name || `D${instance._id.slice(-2)}`).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-zinc-200 text-sm font-medium">
                              {instance.name || `Device ${instance._id.slice(-4)}`}
                            </p>
                            {instance.whatsapp.phone && (
                              <p className="text-zinc-400 text-xs">{instance.whatsapp.phone}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(messageStatus?.status || 'pending')}
                          <Badge className={`${getStatusColor(messageStatus?.status || 'pending')} border`}>
                            {(messageStatus?.status || 'pending').charAt(0).toUpperCase() + (messageStatus?.status || 'pending').slice(1)}
                          </Badge>
                        </div>
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

      <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
        <div className="flex gap-3">
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isSending || (messageStatuses.length > 0 && !isCompleted)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending || (messageStatuses.length > 0 && !isCompleted)}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            Cancel
          </Button>
        </div>
        
        <div className="flex gap-3">
          {!isCompleted && messageStatuses.length === 0 && (
            <Button
              onClick={handleSendMessages}
              disabled={isSending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSending ? (
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