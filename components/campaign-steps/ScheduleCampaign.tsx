"use client";

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { Modal, Button as AntButton } from 'antd';
import { useRouter } from 'next/navigation';

interface ScheduleCampaignProps {
  campaignName: string;
  selectedTemplate: string;
  selectedInstances: string[];
  antdContacts: any[];
  delayRange: { start: number; end: number };
  setDelayRange: (range: { start: number; end: number }) => void;
  templates: any[];
  onCreateCampaign: () => void;
  isCreating: boolean;
}

export default function ScheduleCampaign({
  campaignName,
  selectedTemplate,
  selectedInstances,
  antdContacts,
  delayRange,
  setDelayRange,
  templates,
  onCreateCampaign,
  isCreating
}: ScheduleCampaignProps) {
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleCreateCampaign = async () => {
    await onCreateCampaign();
    setShowSuccessPopup(true);
  };

  const handleSendCampaign = async () => {
    setIsSending(true);
    setErrorMessage('');
    
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1] || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Get campaignId from localStorage
      const campaignId = localStorage.getItem('currentCampaignId');
      if (!campaignId) {
        throw new Error('Campaign ID not found');
      }
      
      const response = await fetch('https://whatsapp.recuperafly.com/api/campaign/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status) {
        // Close the popup first
        setShowSuccessPopup(false);
        // Redirect to the campaign [id] page
        window.location.href = `/dashboard/campaign/final/${campaignId}`;
      } else {
        throw new Error(result.message || 'Failed to send campaign');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send campaign. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleViewReport = async () => {
    setIsSending(true);
    setErrorMessage('');
    
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1] || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Get campaignId from localStorage
      const campaignId = localStorage.getItem('currentCampaignId');
      if (!campaignId) {
        throw new Error('Campaign ID not found');
      }
      
      const response = await fetch('https://whatsapp.recuperafly.com/api/campaign/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status) {
        // Close the popup and redirect to messaging page
        setShowSuccessPopup(false);
        router.push('/dashboard/messaging');
      } else {
        throw new Error(result.message || 'Failed to send campaign');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send campaign. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">Schedule Campaign</h3>
        <p className="text-zinc-400 mb-6">Configure delay settings and create your campaign.</p>
      </div>

      {/* Campaign Summary */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-zinc-200 mb-4">Campaign Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-zinc-400">Campaign Name</Label>
            <p className="text-zinc-200 font-medium">{campaignName}</p>
          </div>
          <div>
            <Label className="text-zinc-400">Selected Template</Label>
            <p className="text-zinc-200 font-medium">
              {templates.find(t => t._id === selectedTemplate)?.name || 'Template selected'}
            </p>
          </div>
          <div>
            <Label className="text-zinc-400">Selected Instances</Label>
            <p className="text-zinc-200 font-medium">
              {selectedInstances.length} instances
            </p>
          </div>
          <div>
            <Label className="text-zinc-400">Total Recipients</Label>
            <p className="text-zinc-200 font-medium">{antdContacts.length} recipients</p>
          </div>
        </div>
      </div>

      {/* Delay Configuration */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-zinc-200 mb-4">Delay Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400">Starting Delay (seconds)</Label>
            <Input
              type="number"
              value={delayRange.start}
              onChange={(e) => setDelayRange({ ...delayRange, start: parseInt(e.target.value) || 0 })}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
              min="1"
            />
          </div>
          <div>
            <Label className="text-zinc-400">Ending Delay (seconds)</Label>
            <Input
              type="number"
              value={delayRange.end}
              onChange={(e) => setDelayRange({ ...delayRange, end: parseInt(e.target.value) || 0 })}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
              min="1"
            />
          </div>
        </div>
        <p className="text-zinc-400 text-sm mt-2">
          Messages will be sent with a random delay between {delayRange.start} and {delayRange.end} seconds.
        </p>
      </div>

      {/* Create Campaign Button */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-blue-400 font-medium mb-1">Ready to Create Campaign</h4>
            <p className="text-blue-300 text-sm">
              Click the button below to create your campaign. You'll be able to start sending messages immediately.
            </p>
          </div>
          <Button
            onClick={handleCreateCampaign}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Ant Design Success Modal */}
      <Modal
        open={showSuccessPopup}
        onCancel={() => setShowSuccessPopup(false)}
        footer={null}
        centered
        width={400}
        className="success-modal"
        maskClosable={false}
        closable={false}
        styles={{
          content: {
            backgroundColor: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '12px',
            padding: '24px',
          },
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }
        }}
      >
        <div className="text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-white mb-2">
            Sending Messages Started
          </h3>

          {/* Description */}
          <p className="text-zinc-400 mb-6">
            Sent messages report showed in "Report" Menu.
          </p>

          {/* Error Message Display */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <AntButton
              onClick={handleViewReport}
              disabled={isSending}
              className="bg-zinc-700 hover:bg-zinc-600 border-zinc-600 text-zinc-200 hover:text-white"
              style={{
                backgroundColor: '#3f3f46',
                borderColor: '#52525b',
                color: '#e4e4e7',
                height: '36px',
                minWidth: '100px',
              }}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                'View Report'
              )}
            </AntButton>
            
            <AntButton
              type="primary"
              onClick={handleSendCampaign}
              disabled={isSending}
              style={{
                backgroundColor: '#3b82f6',
                borderColor: '#3b82f6',
                color: 'white',
                height: '36px',
                minWidth: '80px',
              }}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                'OK'
              )}
            </AntButton>
          </div>
        </div>
      </Modal>

      <style jsx global>{`
        .success-modal .ant-modal-content {
          background-color: #18181b !important;
          border: 1px solid #3f3f46 !important;
        }
        
        .success-modal .ant-modal-header {
          background-color: #18181b !important;
          border-bottom: none !important;
        }
        
        .success-modal .ant-modal-title {
          color: white !important;
        }
        
        .success-modal .ant-btn:hover {
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}