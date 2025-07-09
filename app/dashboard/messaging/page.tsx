"use client";

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, MessageSquare, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Component imports
import CampaignStats from '../../../components/CampaignStats';
import CampaignFilters from '../../../components/CampaignFilters';
import CampaignTable from '../../../components/CampaignTable';
import ToastContainer from '../../../components/ToastContainer';
import { useSocket } from '../../../hooks/useSocket';

// Types
interface Template {
  _id?: string;
  name: string;
  messageType: string;
  template: {
    message: string;
    header?: string;
    footer?: string;
    button?: any[];
  };
}

interface Instance {
  _id: string;
  name: string;
  whatsapp: {
    status: string;
    phone?: string;
  };
}

interface Recipient {
  phone: string;
  name: string;
  variables: { [key: string]: string };
}

interface Campaign {
  _id: string;
  name: string;
  template: {
    _id: string;
    name: string;
    messageType: string;
  };
  instanceCount: number;
  recipients: Recipient[];
  status: 'completed' | 'failed' | 'processing' | 'paused' | 'stopped' | 'pending';
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  createdAt: string;
  delayRange: { start: number; end: number };
}

interface CampaignStatsType {
  total: number;
  completed: number;
  failed: number;
  processing: number;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

const MessagingPage = memo(function MessagingPage() {
  // State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]); // Explicitly empty initial state
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [campaignsPerPage, setCampaignsPerPage] = useState(10);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaignStats, setCampaignStats] = useState<CampaignStatsType>({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0
  });
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  // Memoized token to prevent unnecessary re-renders
  const token = useMemo(() => {
    if (!mounted) return null;
    return Cookies.get('token') || null; // Use only Cookies for consistency
  }, [mounted]);

  const { on, off, isConnected } = useSocket({ token });

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if we need to refresh data (coming from campaign completion)
  useEffect(() => {
    if (!mounted) return;

    const urlParams = new URLSearchParams(window.location.search);
    const shouldRefresh = urlParams.get('refresh');

    if (shouldRefresh === 'true') {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      fetchData();
    }
  }, [mounted]);

  // Toast functions
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { id, message, type, timestamp: Date.now() };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => removeToast(id), 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Utility functions
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!mounted) return null;
    return Cookies.get('token') || null;
  }, [mounted]);

  const handleUnauthorized = useCallback(() => {
    showToast('Session expired. Please log in again.', 'error');
    if (mounted) {
      Cookies.remove('token', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
    }
    setCampaigns([]); // Clear campaigns on unauthorized access
    router.push('/');
  }, [mounted, router, showToast]);

  // Handle campaign updates from real-time events
  const handleCampaignUpdate = useCallback((updatedCampaign: Campaign) => {
    setCampaigns(prev => {
      const existingIndex = prev.findIndex(campaign => campaign._id === updatedCampaign._id);
      let newCampaigns = prev.filter(c => c._id); // Filter out any null/undefined entries
      if (existingIndex !== -1) {
        newCampaigns = newCampaigns.map(campaign =>
          campaign._id === updatedCampaign._id ? updatedCampaign : campaign
        );
      } else {
        newCampaigns = [updatedCampaign, ...newCampaigns];
        setTotalCampaigns(prevTotal => prevTotal + 1);
      }

      setCampaignStats(prevStats => ({
        total: newCampaigns.length,
        completed: newCampaigns.filter(c => c.status === 'completed').length,
        failed: newCampaigns.filter(c => c.status === 'failed').length,
        processing: newCampaigns.filter(c => c.status === 'processing').length,
      }));

      console.log('Updated Campaigns:', newCampaigns); // Debug log
      return newCampaigns;
    });

    if (selectedCampaign && selectedCampaign._id === updatedCampaign._id) {
      setSelectedCampaign(updatedCampaign);
    }
  }, [selectedCampaign]);

  // Add new campaign to the list immediately
  const addNewCampaign = useCallback((newCampaign: Campaign) => {
    setCampaigns(prev => {
      const exists = prev.some(campaign => campaign._id === newCampaign._id);
      if (exists) return prev;

      const newCampaigns = [newCampaign, ...prev.filter(c => c._id)]; // Filter out null/undefined
      setTotalCampaigns(prevTotal => prevTotal + 1);
      setCampaignStats(prevStats => ({
        total: prevStats.total + 1,
        completed: newCampaigns.filter(c => c.status === 'completed').length,
        failed: newCampaigns.filter(c => c.status === 'failed').length,
        processing: newCampaigns.filter(c => c.status === 'processing').length,
      }));
      return newCampaigns;
    });
  }, []);

  const fetchData = useCallback(async (showLoader = true) => {
    if (!mounted) return;

    const token = await getToken();
    if (!token) {
      handleUnauthorized();
      return;
    }

    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const campaignResponse = await fetch('https://whatsapp.recuperafly.com/api/template/message/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: currentPage - 1,
          limit: campaignsPerPage,
          search: searchValue,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
      });

      if (campaignResponse.status === 401) {
        handleUnauthorized();
        return;
      }

      const campaignData = await campaignResponse.json();
      console.log('API Response:', campaignData); // Debug log

      if (campaignData.status) {
        const mappedCampaigns: Campaign[] = (campaignData.messages || [])
          .filter((msg: any) => {
            // Strict validation to reject invalid campaigns
            return msg && typeof msg === 'object' && msg._id && typeof msg._id === 'string' &&
                   msg.name && typeof msg.name === 'string' &&
                   msg.templateId && typeof msg.templateId === 'object' && msg.templateId._id && typeof msg.templateId._id === 'string' &&
                   msg.createdAt && !isNaN(Date.parse(msg.createdAt));
          })
          .map((msg: any) => ({
            _id: msg._id,
            name: msg.name,
            template: {
              _id: msg.templateId._id,
              name: msg.templateId.name || 'Loading...',
              messageType: msg.templateId.messageType || 'Text',
            },
            instanceCount: (msg.instanceIds || []).length,
            recipients: (msg.recipients || []).map((rec: any) => ({
              phone: rec.phone,
              name: rec.name,
              variables: rec.variables || {},
            })),
            status: msg.status,
            totalMessages: msg.statistics?.total || msg.recipients?.length || 0,
            sentMessages: msg.statistics?.sent || 0,
            failedMessages: msg.statistics?.failed || 0,
            createdAt: msg.createdAt,
            delayRange: msg.delayRange || { start: 3, end: 5 },
          }));

        setCampaigns(mappedCampaigns); // Only set valid campaigns
        setTotalCampaigns(campaignData.total || mappedCampaigns.length); // Use API total or mapped length
      } else {
        showToast(campaignData.message || 'Failed to fetch campaigns', 'error');
        setCampaigns([]); // Clear campaigns on failure
        setTotalCampaigns(0);
      }
    } catch (err) {
      showToast('Error fetching data: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
      setCampaigns([]); // Clear campaigns on error
      setTotalCampaigns(0);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [mounted, router, currentPage, campaignsPerPage, searchValue, statusFilter, getToken, handleUnauthorized, showToast]);

  useEffect(() => {
    if (mounted && token) {
      fetchData();
    }
  }, [mounted, token, fetchData]);

  // Auto-refresh data every 15 seconds when there are processing campaigns
  useEffect(() => {
    if (!mounted) return;

    const hasProcessingCampaigns = campaigns.some(campaign => campaign.status === 'processing');

    if (hasProcessingCampaigns) {
      const interval = setInterval(() => {
        fetchData(false);
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [mounted, campaigns, fetchData]);

  useEffect(() => {
    if (!mounted || !isConnected) return;

    const handleCampaignProgress = (data: any) => {
      console.log('WebSocket Progress:', data); // Debug log
      if (data.campaign && data.campaign._id) { // Safeguard against invalid data
        handleCampaignUpdate({
          ...data.campaign,
          status: data.status,
          sentMessages: data.sent || 0,
          failedMessages: data.failed || 0,
          totalMessages: data.total || 0,
        });
      }
    };

    const handleCampaignComplete = (data: any) => {
      if (data.campaign && data.campaign._id) {
        handleCampaignUpdate({
          ...data.campaign,
          status: 'completed',
          sentMessages: data.sent || 0,
          failedMessages: data.failed || 0,
        });
      }
    };

    const handleCampaignStopped = (data: any) => {
      if (data.campaign && data.campaign._id) {
        handleCampaignUpdate({
          ...data.campaign,
          status: 'stopped',
        });
      }
    };

    const handleCampaignPaused = (data: any) => {
      if (data.campaign && data.campaign._id) {
        handleCampaignUpdate({
          ...data.campaign,
          status: 'paused',
        });
      }
    };

    const handleCampaignResumed = (data: any) => {
      if (data.campaign && data.campaign._id) {
        handleCampaignUpdate({
          ...data.campaign,
          status: 'processing',
        });
      }
    };

    on('campaign.progress', handleCampaignProgress);
    on('campaign.complete', handleCampaignComplete);
    on('campaign.stopped', handleCampaignStopped);
    on('campaign.paused', handleCampaignPaused);
    on('campaign.resumed', handleCampaignResumed);

    return () => {
      off('campaign.progress', handleCampaignProgress);
      off('campaign.complete', handleCampaignComplete);
      off('campaign.stopped', handleCampaignStopped);
      off('campaign.paused', handleCampaignPaused);
      off('campaign.resumed', handleCampaignResumed);
    };
  }, [mounted, isConnected, on, off, handleCampaignUpdate]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData(false);
  }, [fetchData]);

  // Campaign operations
  const handleDeleteCampaign = useCallback(async (campaignId: string) => {
    setIsDeleting(prev => ({ ...prev, [campaignId]: true }));

    try {
      const token = await getToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch('https://whatsapp.recuperafly.com/api/campaign/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ campaignId })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await response.json();

      if (result.status) {
        showToast('Campaign deleted successfully', 'success');
        setCampaigns(prev => prev.filter(campaign => campaign._id !== campaignId));
        setTotalCampaigns(prev => prev - 1);

        setCampaignStats(prevStats => ({
          total: prevStats.total - 1,
          completed: campaigns.find(c => c._id === campaignId)?.status === 'completed' ? prevStats.completed - 1 : prevStats.completed,
          failed: campaigns.find(c => c._id === campaignId)?.status === 'failed' ? prevStats.failed - 1 : prevStats.failed,
          processing: campaigns.find(c => c._id === campaignId)?.status === 'processing' ? prevStats.processing - 1 : prevStats.processing,
        }));
      } else {
        showToast(result.message || 'Failed to delete campaign', 'error');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      showToast('Failed to delete campaign. Please try again.', 'error');
    } finally {
      setIsDeleting(prev => ({ ...prev, [campaignId]: false }));
    }
  }, [getToken, handleUnauthorized, showToast, campaigns]);

  const handleCloseCampaignDetails = useCallback(() => {
    setShowCampaignDetails(false);
    setSelectedCampaign(null);
    fetchData(false);
  }, [fetchData]);

  const totalPages = Math.ceil(totalCampaigns / campaignsPerPage);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  }, [currentPage, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  }, [currentPage]);

  const paginationConfig = {
    current: currentPage,
    pageSize: campaignsPerPage,
    total: totalCampaigns,
    onChange: (page: number, pageSize?: number) => {
      setCurrentPage(page);
      if (pageSize && pageSize !== campaignsPerPage) setCampaignsPerPage(pageSize);
    },
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => `Showing ${range[0]}-${range[1]} of ${total} campaigns`,
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Messaging Campaigns</h1>
            <p className="text-zinc-400 mt-2">Manage your WhatsApp messaging campaigns</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-4 py-2 h-12 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/dashboard/campaign"
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 py-2 h-12 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Campaign
            </Link>
          </div>
        </div>

        <CampaignStats stats={campaignStats} />

        <CampaignFilters
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onRefresh={handleRefresh}
        />

        <Card className="bg-zinc-900/80 border-zinc-800/80">
          <CardHeader>
            <CardTitle className="text-zinc-200">Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-12 w-12 text-zinc-500 animate-spin mb-4" />
                  <p className="text-zinc-400">Loading campaigns...</p>
                </div>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <MessageSquare className="h-16 w-16 text-zinc-600 mb-4" />
                <h3 className="text-xl font-semibold text-zinc-300 mb-2">No Campaigns Found</h3>
                <p className="text-zinc-400 mb-6">Create your first campaign to get started.</p>
                <Link
                  href="/dashboard/campaign"
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 h-12 rounded-xl transition-all duration-300 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Create Campaign
                </Link>
              </div>
            ) : (
              <CampaignTable
                campaigns={campaigns.filter(c => c._id)} // Final safeguard to filter out invalid entries
                isDeleting={isDeleting}
                loading={isLoading}
                pagination={paginationConfig}
                onViewDetails={(campaign) => router.push(`/dashboard/campaign/final/${campaign._id}`)}
                onDelete={handleDeleteCampaign}
                onCampaignUpdate={handleCampaignUpdate}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default MessagingPage;