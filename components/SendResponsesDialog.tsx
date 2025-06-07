"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare } from 'lucide-react';

interface SendResponse {
  phone: string;
  status: boolean;
  message: string;
  instanceId: string;
}

interface SendResponsesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responses: SendResponse[];
}

export default function SendResponsesDialog({
  open,
  onOpenChange,
  responses
}: SendResponsesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Send Responses</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Review the status of messages sent in the campaign
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          {responses.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
              <p className="text-zinc-400">No responses available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Phone</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Message</TableHead>
                    <TableHead className="text-zinc-400">Instance ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response, index) => (
                    <TableRow key={index} className="border-zinc-800">
                      <TableCell className="text-zinc-200">{response.phone}</TableCell>
                      <TableCell>
                        <Badge className={response.status ? 'bg-green-500' : 'bg-red-500'}>
                          {response.status ? 'Success' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-200">{response.message}</TableCell>
                      <TableCell className="text-zinc-200">{response.instanceId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              Close
            </Button>
          </div>  
        </div>
      </DialogContent>
    </Dialog>
  );
}