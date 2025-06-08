"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

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
  status: 'completed' | 'failed';
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  createdAt: string;
  delayRange: { start: number; end: number };
}


interface CampaignStats {
  total: number;
  completed: number;
  failed: number;
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
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaignStats, setCampaignStats] = useState<CampaignStats>({
    total: 0,
    completed: 0,
    failed: 0
  });
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [antdContacts, setAntdContacts] = useState<any[]>([]);

  const router = useRouter();

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

  // Fetch data
  const fetchData = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.push('/');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch instances
      const instanceResponse = await fetch('https://whatsapp.recuperafly.com/api/instance/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (instanceResponse.status === 401) {
        handleUnauthorized();
        return;
      }

      const instanceData = await instanceResponse.json();
      const fetchedInstances = instanceData.status ? instanceData.instances || [] : [];
      setInstances(fetchedInstances);

      // Fetch campaigns
      const campaignResponse = await fetch('https://whatsapp.recuperafly.com/api/template/message/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
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
            name: `Template ${msg.templateId.slice(-4)}`,
            messageType: 'Text',
          },
          instances: (msg.instanceIds || [])
            .map((id: string) => fetchedInstances.find((inst: Instance) => inst._id === id))
            .filter((inst: Instance | undefined) => inst !== undefined),
          recipients: msg.recipients.map((rec: any) => ({
            phone: rec.phone,
            name: rec.name,
            variables: {},
          })),
          status: msg.status,
          totalMessages: msg.statistics.total,
          sentMessages: msg.statistics.sent,
          failedMessages: msg.statistics.failed,
          createdAt: msg.createdAt,
          delayRange: msg.settings.delayRange,
        }));

        setCampaigns(mappedCampaigns);

        // Calculate stats
        const stats = mappedCampaigns.reduce(
          (acc, campaign) => {
            acc.total++;
            acc[campaign.status]++;
            return acc;
          },
          {
            total: 0,
            completed: 0,
            failed: 0,
          }
        );

        setCampaignStats(stats);
      } else {
        showToast(campaignData.message || 'Failed to fetch campaigns', 'error');
      }
    } catch (err) {
      showToast('Error fetching data: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Campaign operations
  const handleDeleteCampaign = async (campaignId: string) => {
    const token = await getToken();
    if (!token) {
      showToast('Please log in to delete campaign', 'error');
      router.push('/');
      return;
    }

    setIsDeleting(prev => ({ ...prev, [campaignId]: true }));
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/campaigns/delete', {
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
        setCampaigns(prev => prev.filter(c => c._id !== campaignId));
        
        const newTotalPages = Math.ceil((campaigns.length - 1) / campaignsPerPage);
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
      showToast('Campaign sent successfully!', 'success');
      setShowCreateCampaign(false);

      // Reset form
      setCampaignName('');
      setSelectedTemplate('');
      setSelectedInstances([]);
      setRecipients([{ phone: '', name: '', variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' } }]);
      setAntdContacts([]);
      setDelayRange({ start: 3, end: 5 });

    } catch (err) {
      showToast('Error sending campaign: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Filter and pagination
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                         campaign.template.name.toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const indexOfLastCampaign = currentPage * campaignsPerPage;
  const indexOfFirstCampaign = indexOfLastCampaign - campaignsPerPage;
  const currentCampaigns = filteredCampaigns.slice(indexOfFirstCampaign, indexOfLastCampaign);
  const totalPages = Math.ceil(filteredCampaigns.length / campaignsPerPage);

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
          <button
            onClick={() => setShowCreateCampaign(true)}
            className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 py-2 h-12 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Campaign
          </button>
        </div>

        {/* Statistics Cards */}
        <CampaignStats stats={campaignStats} />

        {/* Filters and Search */}
        <CampaignFilters
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onRefresh={fetchData}
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
            ) : currentCampaigns.length === 0 ? (
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
                campaigns={currentCampaigns}
                isDeleting={isDeleting}
                onViewDetails={(campaign) => {
                  setSelectedCampaign(campaign);
                  setShowCampaignDetails(true);
                }}
                onDelete={handleDeleteCampaign}
              />
            )}
          </CardContent>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center mt-6 sm:mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-4 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 text-sm">
                  Showing {indexOfFirstCampaign + 1}-{Math.min(indexOfLastCampaign, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns
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
          onOpenChange={setShowCreateCampaign}
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
          onOpenChange={setShowCampaignDetails}
          campaign={selectedCampaign}
        />

     
      </div>
    </div>
  );
}