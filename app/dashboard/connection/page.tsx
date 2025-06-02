"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ConnectionPage() {
  const [showQR, setShowQR] = useState(false);

  const instances = [
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
    { id: 5 },
    { id: 6 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-zinc-200">Devices</h1>
        <div className="flex gap-2">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Instance
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {instances.map((instance) => (
          <Card key={instance.id} className="bg-zinc-900 border-zinc-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-zinc-200">WA (sad)</span>
                  <span className="text-sm text-yellow-500">New</span>
                  <span className="text-sm text-zinc-500">Click on Show QR to connect</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">QR</span>
              </div>
            </div>
            <div className="border-t border-zinc-800 p-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setShowQR(true)}
              >
                Show QR
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="bg-red-600/20 hover:bg-red-600/40 text-red-500"
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center p-6">
            <div className="bg-white p-8 rounded-lg">
              <img 
                src="https://images.pexels.com/photos/278338/pexels-photo-278338.jpeg?auto=compress&cs=tinysrgb&w=300" 
                alt="QR Code" 
                className="max-w-[300px]" 
              />
            </div>
            <p className="text-sm text-zinc-400 mt-4">
              Scan this QR code with WhatsApp to connect
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}