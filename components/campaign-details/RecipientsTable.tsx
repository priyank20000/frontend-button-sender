"use client";

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface RecipientsTableProps {
  recipients: any[];
  recipientStatuses: string[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  recipientsPerPage: number;
}

export default function RecipientsTable({
  recipients,
  recipientStatuses,
  currentPage,
  setCurrentPage,
  statusFilter,
  setStatusFilter,
  recipientsPerPage
}: RecipientsTableProps) {
  const getRecipientStatus = (recipient: any) => {
    const originalIndex = recipients.indexOf(recipient);
    return recipientStatuses[originalIndex] || 'pending';
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

  const filteredRecipients = recipients.filter((recipient, index) => {
    if (statusFilter === 'all') return true;
    const status = recipientStatuses[index] || 'pending';
    return status === statusFilter;
  });

  const sentCount = recipientStatuses.filter(status => status === 'sent').length;
  const failedCount = recipientStatuses.filter(status => status === 'failed').length;
  const notExistCount = recipientStatuses.filter(status => status === 'not_exist').length;

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-200">Recipients ({recipients.length})</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            className={statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-gray-700'}
          >
            <Users className="h-4 w-4 mr-2" />
            All ({recipients.length})
          </Button>
          <Button
            onClick={() => {
              setStatusFilter('sent');
              setCurrentPage(1);
            }}
            variant={statusFilter === 'sent' ? 'default' : 'outline'}
            size="sm"
            className={statusFilter === 'sent' ? 'bg-green-600 text-white' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-gray-700'}
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
            {currentRecipients.map((recipient, index) => {
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
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}