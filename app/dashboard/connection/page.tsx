// app/dashboard/connection/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface Instance {
  _id: string;
  name?: string;
  whatsapp: {
    phone?: string | null;
    status: string;
    profile?: string | null;
  };
}

export default function DevicesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchInstances = useCallback(async () => {
    // Check cookie first, then localStorage
    let token = Cookies.get('token');
    if (!token) {
      token = localStorage.getItem('token');
    }

    if (!token) {
      // Retry after a short delay
      await new Promise(resolve => setTimeout(resolve, 500));
      token = Cookies.get('token') || localStorage.getItem('token');
    }

    if (!token) {
      console.warn('No token found in cookie or localStorage, redirecting to login');
      toast.error('Please log in to access your devices');
      router.push('/login');
      return;
    }

    console.log('Fetching instances with token:', token.substring(0, 10) + '...');
    setIsLoading(true);
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/instance/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.status === 401) {
        console.warn('Unauthorized response from /api/instance/all');
        toast.error('Session expired. Please log in again.');
        Cookies.remove('token', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
        localStorage.removeItem('token');
        Cookies.remove('user', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      const data = await response.json();
      if (data.status) {
        setInstances(data.instances || []);
      } else {
        console.error('API error:', data.message);
        toast.error(data.message || 'Failed to fetch instances');
      }
    } catch (err) {
      console.error('Error fetching instances:', err);
      toast.error('Error fetching instances');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  return (
    <div className="p-6 max-w-7xl mx-auto bg-zinc-950">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold text-white mb-8">WhatsApp Devices</h1>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 text-zinc-500 animate-spin" />
        </div>
      ) : instances.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800 p-8 text-center">
          <p className="text-zinc-400">No devices found. Create an instance to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map((instance) => (
            <Card key={instance._id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5">
                <p className="text-zinc-200">{instance.whatsapp.phone || 'Unnamed Device'}</p>
                <p className="text-zinc-400">{instance.name || 'No name'}</p>
                <p className="text-sm">{instance.whatsapp.status}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}