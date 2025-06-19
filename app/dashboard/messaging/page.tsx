"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Cookies from 'js-cookie';
import { useRouter, useSearchParams } from 'next/navigation';

// Component imports
import CampaignStats from '../../../components/CampaignStats';
import CampaignFilters from '../../../components/CampaignFilters';
import CampaignTable from '../../../components/CampaignTable';
import CampaignDetailsDialog from '../../../components/CampaignDetailsDialog';
import CreateCampaignDialog from '../../../components/CreateCampaignDialog';
import ToastContainer from '../../../components/ToastContainer';

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
  instances: Instance[];
  recipients: Recipient[];
  status: 'completed' | 'failed' | 'processing' | 'paused';
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

export default function MessagingPage() {
  // State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([
    { phone: '', name: '', variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' } },
  ]);
  const [delayRange, setDelayRange] = useState<{ start: number; end: number }>({ start: 3, end: 5 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [campaignsPerPage] = useState(10);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaignStats, setCampaignStats] = useState<CampaignStatsType>({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0
  });
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [antdContacts, setAntdContacts] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if we need to refresh data (coming from campaign completion)
  useEffect(() => {
    const shouldRefresh = searchParams.get('refresh');
    if (shouldRefresh === 'true') {
      // Remove the refresh parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Force refresh the data
      fetchData();
    }
  }, [searchParams]);

  // Toast functions
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString();
    const newToast: ToastMessage = {
      id,
      message,
      type,
      timestamp: Date.now()
    };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Utility functions
  const getToken = async (): Promise<string | null | undefined> => {
    let token: string | null | undefined = Cookies.get('token');
    if (!token) {
      token = localStorage.getItem('token');
    }
    if (!token) {
      await new Promise(resolve => setTimeout(resolve, 500));
      token = Cookies.get('token') || localStorage.getItem('token');
    }
    return token;
  };

  const handleUnauthorized = () => {
    showToast('Session expired. Please log in again.', 'error');
    Cookies.remove('token', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
    localStorage.removeItem('token');
    Cookies.remove('user', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
    localStorage.removeItem('user');
    router.push('/');
  };

  // Handle campaign updates from real-time events
  const handleCampaignUpdate = useCallback((updatedCampaign: Campaign) => {
    setCampaigns(prev => {
      const existingIndex = prev.findIndex(campaign => campaign._id === updatedCampaign._id);
      
      let newCampaigns;
      if (existingIndex !== -1) {
        // Update existing campaign
        newCampaigns = prev.map(campaign => 
          campaign._id === updatedCampaign._id ? updatedCampaign : campaign
        );
      } else {
        // Add new campaign at the beginning
        newCampaigns = [updatedCampaign, ...prev];
        setTotalCampaigns(prevTotal => prevTotal + 1);
      }

      // Update stats with the new campaigns list
      setCampaignStats(prevStats => ({
        total: newCampaigns.length,
        completed: newCampaigns.filter(c => c.status === 'completed').length,
        failed: newCampaigns.filter(c => c.status === 'failed').length,
        processing: newCampaigns.filter(c => c.status === 'processing').length,
      }));

      return newCampaigns;
    });

    // Update selected campaign if it's the one being viewed
    if (selectedCampaign && selectedCampaign._id === updatedCampaign._id) {
      setSelectedCampaign(updatedCampaign);
    }
  }, [selectedCampaign]);

  // Add new campaign to the list immediately
  const addNewCampaign = useCallback((newCampaign: Campaign) => {
    setCampaigns(prev => {
      // Check if campaign already exists
      const exists = prev.some(campaign => campaign._id === newCampaign._id);
      if (exists) {
        return prev;
      }
      
      // Add new campaign at the beginning
      const newCampaigns = [newCampaign, ...prev];
      
      // Update total count
      setTotalCampaigns(prevTotal => prevTotal + 1);
      
      // Update stats
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
    const token = await getToken();
    if (!token) {
      router.push('/');
      return;
    }
  
    if (showLoader) {
      setIsLoading(true);
    }
  
    try {
      let allInstances: Instance[] = [];
      let page = 0;
      const limit = 10;
  
      // Fetch instances with pagination and connected status filter
      while (true) {
        const instanceResponse = await fetch('https://whatsapp.recuperafly.com/api/instance/all', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            page,
            limit,
            instance_status: 'connected', // Add filter for connected instances
          }),
        });
  
        if (instanceResponse.status === 401) {
          handleUnauthorized();
          return;
        }
  
        const instanceData = await instanceResponse.json();
        if (instanceData.status) {
          const fetchedInstances = instanceData.instances || [];
          allInstances = [...allInstances, ...fetchedInstances];
          console.log('Fetched instances:', fetchedInstances); // Debug
          if (fetchedInstances.length < limit || allInstances.length >= instanceData.total) {
            break;
          }
          page++;
        } else {
          showToast(instanceData.message || 'Failed to fetch instances', 'error');
          break;
        }
      }
  
      setInstances(allInstances);
      console.log('All connected instances:', allInstances); // Debug
  
      // Fetch campaigns (unchanged)
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
      if (campaignData.status) {
        const mappedCampaigns: Campaign[] = campaignData.messages.map((msg: any) => ({
          _id: msg._id,
          name: msg.name,
          template: {
            _id: msg.templateId,
            name: `${msg.templateId.name}`,
            messageType: 'Text',
          },
          instances: (msg.instanceIds || [])
            .map((id: string) => allInstances.find((inst: Instance) => inst._id === id))
            .filter((inst: Instance | undefined) => inst !== undefined),
          recipients: msg.recipients.map((rec: any) => ({
            phone: rec.phone,
            name: rec.name,
            variables: {},
          })),
          status: msg.status,
          totalMessages: msg.statistics?.total || msg.recipients?.length || 0,
          sentMessages: msg.statistics?.sent || 0,
          failedMessages: msg.statistics?.failed || 0,
          createdAt: msg.createdAt,
          delayRange: msg.settings.delayRange,
        }));
  
        setCampaigns(mappedCampaigns);
        setTotalCampaigns(campaignData.total || 0);
  
        const stats = {
          total: campaignData.total || 0,
          completed: mappedCampaigns.filter(c => c.status === 'completed').length,
          failed: mappedCampaigns.filter(c => c.status === 'failed').length,
          processing: mappedCampaigns.filter(c => c.status === 'processing').length,
        };
  
        setCampaignStats(stats);
      } else {
        showToast(campaignData.message || 'Failed to fetch campaigns', 'error');
      }
    } catch (err) {
      showToast('Error fetching data: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [router, currentPage, campaignsPerPage, searchValue, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh data every 30 seconds when there are processing campaigns
  useEffect(() => {
    const hasProcessingCampaigns = campaigns.some(campaign => campaign.status === 'processing');
    
    if (hasProcessingCampaigns) {
      const interval = setInterval(() => {
        fetchData(false); // Don't show loader for auto-refresh
      }, 15000); // Refresh every 15 seconds for better UX

      return () => clearInterval(interval);
    }
  }, [campaigns, fetchData]);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(false);
  };

  // Campaign operations - Updated delete function to use correct API endpoint
  const handleDeleteCampaign = async (campaignId: string) => {
    const token = await getToken();
    if (!token) {
      showToast('Please log in to delete campaign', 'error');
      router.push('/');
      return;
    }

    setIsDeleting(prev => ({ ...prev, [campaignId]: true }));
    try {
      // Updated API endpoint to use /message/delete
      const response = await fetch('https://whatsapp.recuperafly.com/api/template/message/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.status) {
        // Update campaigns list immediately
        setCampaigns(prev => prev.filter(c => c._id !== campaignId));
        setTotalCampaigns(prev => prev - 1);
        
        // Update stats immediately
        setCampaignStats(prev => ({
          ...prev,
          total: prev.total - 1
        }));
        
        const newTotalPages = Math.ceil((totalCampaigns - 1) / campaignsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
        
        showToast(data.message || 'Campaign deleted successfully', 'success');
      } else {
        showToast(data.message || 'Failed to delete campaign', 'error');
      }
    } catch (err) {
      showToast('Error deleting campaign: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsDeleting(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleSendCampaign = async () => {
    const token = await getToken();
    if (!token) {
      router.push('/');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        name: campaignName,
        templateId: selectedTemplate,
        instanceIds: selectedInstances,
        recipients: recipients.map(({ phone, name, variables }) => ({
          phone,
          name,
          variables: Object.fromEntries(
            Object.entries(variables).filter(([_, value]) => value.trim() !== '')
          ),
        })),
        delayRange,
      };

      const response = await fetch('https://whatsapp.recuperafly.com/api/template/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.message || 'Failed to send campaign');
      }

      setResponseDialogOpen(true);
      showToast('Campaign created and started successfully!', 'success');
      
      // IMMEDIATE UPDATE: Create and add the new campaign to the list
      const newCampaign: Campaign = {
        _id: result.campaignId || result.campaign?._id || `temp_${Date.now()}`,
        name: campaignName,
        template: {
          _id: selectedTemplate,
          name: `Template ${selectedTemplate.slice(-4)}`,
          messageType: 'Text',
        },
        instances: selectedInstances.map(id => instances.find(inst => inst._id === id)).filter(Boolean) as Instance[],
        recipients: antdContacts.filter(r => r.number && r.name).map(contact => ({
          phone: contact.number,
          name: contact.name,
          variables: {},
        })),
        status: 'processing',
        totalMessages: antdContacts.filter(r => r.number && r.name).length,
        sentMessages: 0,
        failedMessages: 0,
        createdAt: new Date().toISOString(),
        delayRange,
      };

      // Add to campaigns list immediately
      addNewCampaign(newCampaign);

      // Reset form
      setCampaignName('');
      setSelectedTemplate('');
      setSelectedInstances([]);
      setRecipients([{ phone: '', name: '', variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' } }]);
      setAntdContacts([]);
      setDelayRange({ start: 3, end: 5 });

      // Also refresh data after a short delay to ensure consistency
      setTimeout(() => {
        fetchData(false);
      }, 2000);

    } catch (err) {
      showToast('Error sending campaign: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Enhanced dialog close handler with automatic refresh
  const handleCloseCreateCampaign = useCallback(() => {
    setShowCreateCampaign(false);
    
    // Reset form data
    setCampaignName('');
    setSelectedTemplate('');
    setSelectedInstances([]);
    setRecipients([{ phone: '', name: '', variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' } }]);
    setAntdContacts([]);
    setDelayRange({ start: 3, end: 5 });
    
    // Automatically refresh campaigns data when dialog closes
    console.log('Dialog closed, refreshing campaigns...');
    fetchData(false);
  }, [fetchData]);

  // Enhanced dialog close handler for campaign details
  const handleCloseCampaignDetails = useCallback(() => {
    setShowCampaignDetails(false);
    setSelectedCampaign(null);
    
    // Automatically refresh campaigns data when dialog closes
    console.log('Campaign details closed, refreshing campaigns...');
    fetchData(false);
  }, [fetchData]);

  // Pagination
  const totalPages = Math.ceil(totalCampaigns / campaignsPerPage);

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
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Messaging Campaigns
            </h1>
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
            <button
              onClick={() => setShowCreateCampaign(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 py-2 h-12 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Campaign
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <CampaignStats stats={campaignStats} />

        {/* Filters and Search */}
        <CampaignFilters
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onRefresh={handleRefresh}
        />

        {/* Campaigns Table */}
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
                <button
                  onClick={() => setShowCreateCampaign(true)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 h-12 rounded-xl transition-all duration-300 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Create Campaign
                </button>
              </div>
            ) : (
              <CampaignTable
                campaigns={campaigns}
                isDeleting={isDeleting}
                onViewDetails={(campaign) => {
                  setSelectedCampaign(campaign);
                  setShowCampaignDetails(true);
                }}
                onDelete={handleDeleteCampaign}
                onCampaignUpdate={handleCampaignUpdate}
              />
            )}
          </CardContent>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center mt-6 sm:mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-4 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 text-sm">
                  Showing {(currentPage - 1) * campaignsPerPage + 1}-
                  {Math.min(currentPage * campaignsPerPage, totalCampaigns)} of {totalCampaigns} campaigns
                </span>
              </div>

              <div className="flex items-center">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ${
                    currentPage === 1
                      ? 'text-zinc-600 cursor-not-allowed'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-9 w-9 rounded-full transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                          : 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                      aria-label={`Page ${page}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ${
                    currentPage === totalPages
                      ? 'text-zinc-600 cursor-not-allowed'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Dialogs */}
        <CreateCampaignDialog
          open={showCreateCampaign}
          onOpenChange={handleCloseCreateCampaign}
          onCreateCampaign={() => {}}
          onSendCampaign={handleSendCampaign}
          isCreating={isCreatingCampaign}
          isSending={isSending}
          campaignName={campaignName}
          setCampaignName={setCampaignName}
          selectedInstances={selectedInstances}
          setSelectedInstances={setSelectedInstances}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          delayRange={delayRange}
          setDelayRange={setDelayRange}
          instances={instances}
          templates={templates}
          antdContacts={antdContacts}
          setAntdContacts={setAntdContacts}
          recipients={recipients}
          setRecipients={setRecipients}
          showToast={showToast}
        />

        <CampaignDetailsDialog
          open={showCampaignDetails}
          onOpenChange={handleCloseCampaignDetails}
          campaign={selectedCampaign}
        />
      </div>
    </div>
  );
}