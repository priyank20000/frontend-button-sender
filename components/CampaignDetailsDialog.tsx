"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Campaign {
  _id: string;
  name: string;
  recipients: any[];
  status: 'completed' | 'failed' | 'processing';
}

interface CampaignDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

export default function CampaignDetailsDialog({
  open,
  onOpenChange,
  campaign
}: CampaignDetailsDialogProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const recipientsPerPage = 10;

  if (!campaign) return null;

  // Pagination logic for recipients table
  const totalRecipients = campaign.recipients.length;
  const totalPages = Math.ceil(totalRecipients / recipientsPerPage);
  const indexOfLastRecipient = currentPage * recipientsPerPage;
  const indexOfFirstRecipient = indexOfLastRecipient - recipientsPerPage;
  const currentRecipients = campaign.recipients.slice(indexOfFirstRecipient, indexOfLastRecipient);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Campaign Recipients: {campaign.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            View the recipients for this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Recipients Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-200">Recipients ({totalRecipients})</h3>
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
                  {currentRecipients.map((recipient, index) => {
                    const globalIndex = indexOfFirstRecipient + index;
                    // Derive recipient status; use recipient.status if available, else fallback to campaign status
                    const recipientStatus = recipient.status || campaign.status;

                    return (
                      <TableRow key={`${recipient.phone}-${index}`} className="border-zinc-700">
                        <TableCell className="text-zinc-200">
                          {globalIndex + 1}
                        </TableCell>
                       
                        <TableCell className="text-zinc-200 font-medium">{recipient.name}</TableCell>
                        <TableCell className="text-zinc-200">{recipient.phone}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            recipientStatus === 'sent' || recipientStatus === 'completed' ? 'bg-green-500/10 text-green-400' :
                            recipientStatus === 'failed' ? 'bg-red-500/10 text-red-400' :
                            'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {recipientStatus === 'sent' || recipientStatus === 'completed' ? 'Sent' :
                             recipientStatus === 'failed' ? 'Failed' : 'Pending'}
                          </span>
                        </TableCell>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}