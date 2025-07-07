"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

// Component imports
import BasicConfiguration from '../../../components/campaign-steps/BasicConfiguration';
import ChooseTemplate from '../../../components/campaign-steps/ChooseTemplate';
import SelectAudience from '../../../components/campaign-steps/SelectAudience';
import ScheduleCampaign from '../../../components/campaign-steps/ScheduleCampaign';
import FinalStep from '../../../components/campaign-steps/FinalStep';
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
  name?: string;
  whatsapp: {
    status: string;
    phone?: string | null;
    profile?: string | null;
  };
  createdAt: string;
}

interface Recipient {
  phone: string;
  name: string;
  variables: { [key: string]: string };
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

const CAMPAIGN_STEPS = [
  { id: 1, title: 'Basic Configuration', description: '' },
  { id: 2, title: 'Choose Template', description: '' },
  { id: 3, title: 'Select Audience', description: '' },
  { id: 4, title: 'Schedule Campaign', description: '' },
  { id: 5, title: 'Final', description: '' }
];

export default function CreateCampaignPage() {
  const router = useRouter();
  
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([
    { phone: '', name: '', variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' } },
  ]);
  const [delayRange, setDelayRange] = useState<{ start: number; end: number }>({ start: 3, end: 5 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [antdContacts, setAntdContacts] = useState<any[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    
    try {
      const token = await getToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      // Fetch templates
      const templatesResponse = await fetch('https://whatsapp.recuperafly.com/api/template/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page: 0, limit: 100 })
      });

      if (templatesResponse.status === 401) {
        handleUnauthorized();
        return;
      }

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        console.log('Templates API response:', templatesData);
        if (templatesData.status) {
          const fetchedTemplates = templatesData.templates || [];
          console.log('Fetched templates:', fetchedTemplates);
          setTemplates(fetchedTemplates);
        } else {
          showToast(templatesData.message || 'Failed to fetch templates', 'error');
        }
      }

      // Fetch instances
      const instancesResponse = await fetch('https://whatsapp.recuperafly.com/api/instance/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page: 0, limit: 100 })
      });

      if (instancesResponse.status === 401) {
        handleUnauthorized();
        return;
      }

      if (instancesResponse.ok) {
        const instancesData = await instancesResponse.json();
        console.log('Instances API response:', instancesData);
        if (instancesData.status) {
          const fetchedInstances = instancesData.instances || [];
          console.log('Fetched instances:', fetchedInstances);
          console.log('Connected instances:', fetchedInstances.filter((i: any) => i?.whatsapp?.status?.toLowerCase() === 'connected'));
          setInstances(fetchedInstances);
        } else {
          showToast(instancesData.message || 'Failed to fetch instances', 'error');
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNext = () => {
    if (currentStep === 1) {
      if (!campaignName.trim()) {
        showToast('Please enter a campaign name', 'error');
        return;
      }
      if (selectedInstances.length === 0) {
        showToast('Please select at least one instance', 'error');
        return;
      }
    } else if (currentStep === 2) {
      if (!selectedTemplate) {
        showToast('Please select a template', 'error');
        return;
      }
    } else if (currentStep === 3) {
      if (antdContacts.length === 0 || antdContacts.some((contact) => !contact.number || !contact.name)) {
        showToast('All contacts must have a valid phone number and name', 'error');
        return;
      }
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSendCampaign = async () => {
    setIsSending(true);
    
    try {
      const token = await getToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const campaignData = {
        name: campaignName,
        templateId: selectedTemplate,
        instances: selectedInstances,
        recipients: antdContacts.map(contact => ({
          phone: contact.number,
          name: contact.name,
          variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' }
        })),
        delayRange
      };

      const response = await fetch('https://whatsapp.recuperafly.com/api/template/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: campaignName,
          templateId: selectedTemplate,
          instanceIds: selectedInstances,
          recipients: antdContacts.map(contact => ({
            phone: contact.number,
            name: contact.name,
            variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' }
          })),
          delayRange
        })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await response.json();
      if (result.status) {
        showToast('Campaign created and sent successfully!', 'success');
        // Redirect to messaging page with refresh parameter
        router.push('/dashboard/messaging?refresh=true');
      } else {
        showToast(result.message || 'Failed to create campaign', 'error');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      showToast('Failed to send campaign. Please try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    // Reset everything and go back to messaging page
    setCurrentStep(1);
    setCampaignName('');
    setSelectedInstances([]);
    setSelectedTemplate('');
    setDelayRange({ start: 3, end: 5 });
    setAntdContacts([]);
    setRecipients([{
      phone: '',
      name: '',
      variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' }
    }]);
    router.push('/dashboard/messaging');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicConfiguration
            campaignName={campaignName}
            setCampaignName={setCampaignName}
            selectedInstances={selectedInstances}
            setSelectedInstances={setSelectedInstances}
            instances={instances}
          />
        );
      case 2:
        return (
          <ChooseTemplate
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            templates={templates}
          />
        );
      case 3:
        return (
          <SelectAudience
            antdContacts={antdContacts}
            setAntdContacts={setAntdContacts}
            recipients={recipients}
            setRecipients={setRecipients}
            showToast={showToast}
          />
        );
      case 4:
        return (
          <ScheduleCampaign
            campaignName={campaignName}
            selectedTemplate={selectedTemplate}
            selectedInstances={selectedInstances}
            antdContacts={antdContacts}
            delayRange={delayRange}
            setDelayRange={setDelayRange}
            templates={templates}
            onSendCampaign={handleSendCampaign}
            isSending={isSending}
          />
        );
      case 5:
        return (
          <FinalStep
            campaignName={campaignName}
            selectedTemplate={selectedTemplate}
            selectedInstances={selectedInstances}
            antdContacts={antdContacts}
            delayRange={delayRange}
            templates={templates}
            instances={instances}
            onSendCampaign={handleSendCampaign}
            isSending={isSending}
            onClose={handleClose}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-200"></div>
          <p className="text-zinc-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Create New Campaign</h1>
            <p className="text-zinc-400 mt-1">Connect with your customers through WhatsApp</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 bg-zinc-900/50 rounded-xl p-6">
          {CAMPAIGN_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-zinc-600 text-zinc-400'
              }`}>
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-4 hidden sm:block">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-zinc-200' : 'text-zinc-400'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < CAMPAIGN_STEPS.length - 1 && (
                <div className={`hidden sm:block w-20 h-0.5 ml-6 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-zinc-600'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        {/* Step Content */}
        <div className="bg-zinc-900/50 rounded-xl p-8 min-h-[500px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 5 && (
          <div className="flex justify-between items-center pt-6 mt-6 border-t border-zinc-800">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button
              onClick={handleNext}
              className="bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 