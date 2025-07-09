"use client";

import { Table, Button, Tag, Tooltip, Space, Popconfirm } from 'antd';
import { Eye, Trash2, Loader2, CheckCircle, XCircle, Clock, RefreshCw, StopCircle, Pause, Play } from 'lucide-react';
import { memo, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import type { ColumnsType } from 'antd/es/table';

interface Campaign {
  _id: string;
  name: string;
  template: {
    _id: string;
    name: string;
    messageType: string;
  };
  instanceCount: number;
  recipients: any[];
  status: 'completed' | 'failed' | 'processing' | 'paused' | 'stopped' | 'pending';
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  createdAt: string;
  delayRange: { start: number; end: number };
}

interface CampaignTableProps {
  campaigns: Campaign[];
  isDeleting: { [key: string]: boolean };
  onViewDetails: (campaign: Campaign) => void;
  onDelete: (campaignId: string) => void;
  onCampaignUpdate?: (updatedCampaign: Campaign) => void;
  loading?: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize?: number) => void;
    showSizeChanger: boolean;
    showQuickJumper: boolean;
    showTotal: (total: number, range: [number, number]) => string;
  };
}

const CAMPAIGN_STATUS = {
  completed: { label: 'Completed', color: 'success', icon: CheckCircle },
  failed: { label: 'Failed', color: 'error', icon: XCircle },
  pending: { label: 'Pending', color: 'default', icon: Clock },
  processing: { label: 'Processing', color: 'processing', icon: Clock },
  paused: { label: 'Paused', color: 'warning', icon: Pause },
  stopped: { label: 'Stopped', color: 'error', icon: StopCircle },
};

// Campaign Control Component
const CampaignControls = memo(({ campaign, onCampaignUpdate }: { campaign: Campaign; onCampaignUpdate?: (updatedCampaign: Campaign) => void }) => {
  const [isControlling, setIsControlling] = useState(false);

  const handleCampaignControl = useCallback(async (action: 'stop' | 'pause' | 'resume') => {
    if (isControlling) return;

    setIsControlling(true);

    let newStatus: Campaign['status'];
    if (action === 'stop') newStatus = 'stopped';
    else if (action === 'pause') newStatus = 'paused';
    else newStatus = 'processing';

    const updatedCampaign = { ...campaign, status: newStatus };
    onCampaignUpdate?.(updatedCampaign);

    try {
      const authToken = Cookies.get('token') || localStorage.getItem('token');
      let endpoint = '';
      if (action === 'pause') endpoint = 'https://whatsapp.recuperafly.com/api/campaign/pause';
      else if (action === 'stop') endpoint = 'https://whatsapp.recuperafly.com/api/campaign/stop';
      else if (action === 'resume') endpoint = 'https://whatsapp.recuperafly.com/api/campaign/resume';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId: campaign._id }),
      });

      const result = await response.json();
      if (!result.status) {
        onCampaignUpdate?.(campaign); // Revert on failure
        console.error(`Campaign ${action} failed:`, result.message);
      }
    } catch (error) {
      onCampaignUpdate?.(campaign); // Revert on error
      console.error(`Error ${action}ing campaign:`, error);
    } finally {
      setIsControlling(false);
    }
  }, [campaign, isControlling, onCampaignUpdate]);

  const getControlActions = () => {
    const actions = [];

    if (campaign.status === 'processing') {
      actions.push(
        <Tooltip title="Pause Campaign" key="pause">
          <Button
            type="text"
            size="small"
            icon={<Pause className="h-4 w-4" />}
            loading={isControlling}
            onClick={() => handleCampaignControl('pause')}
            className="text-yellow-500 hover:text-yellow-600"
          />
        </Tooltip>
      );
      actions.push(
        <Tooltip title="Stop Campaign" key="stop">
          <Popconfirm
            title="Stop Campaign"
            description="Are you sure you want to stop this campaign? This action cannot be undone."
            onConfirm={() => handleCampaignControl('stop')}
            okText="Yes, Stop"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              icon={<StopCircle className="h-4 w-4" />}
              loading={isControlling}
              className="text-red-500 hover:text-red-600"
            />
          </Popconfirm>
        </Tooltip>
      );
    }

    if (campaign.status === 'paused') {
      actions.push(
        <Tooltip title="Resume Campaign" key="resume">
          <Button
            type="text"
            size="small"
            icon={<Play className="h-4 w-4" />}
            loading={isControlling}
            onClick={() => handleCampaignControl('resume')}
            className="text-green-500 hover:text-green-600"
          />
        </Tooltip>
      );
      actions.push(
        <Tooltip title="Stop Campaign" key="stop">
          <Popconfirm
            title="Stop Campaign"
            description="Are you sure you want to stop this campaign? This action cannot be undone."
            onConfirm={() => handleCampaignControl('stop')}
            okText="Yes, Stop"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              icon={<StopCircle className="h-4 w-4" />}
              loading={isControlling}
              className="text-red-500 hover:text-red-600"
            />
          </Popconfirm>
        </Tooltip>
      );
    }

    return actions;
  };

  return <>{getControlActions()}</>;
});

CampaignControls.displayName = 'CampaignControls';

const CampaignTable = memo(function CampaignTable({
  campaigns,
  isDeleting,
  onViewDetails,
  onDelete,
  onCampaignUpdate,
  loading = false,
  pagination
}: CampaignTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusTag = (status: string) => {
    const statusInfo = CAMPAIGN_STATUS[status as keyof typeof CAMPAIGN_STATUS] || { label: status, color: 'default', icon: Clock };
    const Icon = statusInfo.icon;
    return (
      <Tag color={statusInfo.color} icon={<Icon className="h-3 w-3" />}>
        {statusInfo.label}
      </Tag>
    );
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Campaign',
      dataIndex: 'campaign',
      key: 'campaign',
      width: 250,
      render: (_, record) => (
        <div>
          <div className="font-medium text-zinc-200 truncate max-w-[200px]" title={record.name}>
            {record.name}
          </div>
          <div className="text-xs text-zinc-400">ID: {record._id ? record._id.slice(-8) : 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Template',
      dataIndex: 'template',
      key: 'template',
      width: 200,
      render: (_, record) => (
        <div>
          <div className="text-zinc-200 truncate max-w-[150px]" title={record.template?.name || 'No Template'}>
            {record.template?.name || 'No Template'}
          </div>
          <div className="text-xs text-zinc-400">{record.template?.messageType || 'Text'}</div>
        </div>
      ),
    },
    {
      title: 'Instances',
      dataIndex: 'instanceCount',
      key: 'instanceCount',
      width: 100,
      align: 'center',
      render: (instances) => <span className="text-zinc-200">{instances}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (createdAt) => (
        <span className="text-zinc-400 text-sm">{formatDate(createdAt)}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <CampaignControls campaign={record} onCampaignUpdate={onCampaignUpdate} />
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<Eye className="h-4 w-4" />}
              onClick={() => onViewDetails(record)}
              className="text-blue-500 hover:text-blue-600"
            />
          </Tooltip>
          <Tooltip title="Delete Campaign">
            <Popconfirm
              title="Delete Campaign"
              description="Are you sure you want to delete this campaign? This action cannot be undone."
              onConfirm={() => onDelete(record._id)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                size="small"
                icon={isDeleting[record._id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                loading={isDeleting[record._id]}
                className="text-red-500 hover:text-red-600"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg overflow-hidden">
      <Table
        columns={columns}
        dataSource={campaigns}
        loading={loading}
        rowKey="_id"
        pagination={{
          ...pagination,
          position: ['bottomCenter'],
          className: 'ant-pagination-dark',
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} campaigns`,
        }}
        scroll={{ x: 1000 }}
        size="middle"
        className="campaign-table"
        rowClassName="campaign-row"
      />

      <style jsx global>{`
        .campaign-table .ant-table {
          background: transparent;
        }

        .campaign-table .ant-table-thead > tr > th {
          background: #18181b !important;
          color: #a1a1aa !important;
          border-bottom: 1px solid #3f3f46 !important;
          font-weight: 600;
        }

        .campaign-table .ant-table-tbody > tr > td {
          background: #27272a !important;
          border-bottom: 1px solid #3f3f46 !important;
        }

        .campaign-table .ant-table-tbody > tr:hover > td {
          background: #3f3f46 !important;
        }

        .campaign-table .ant-table-container {
          border: 1px solid #3f3f46 !important;
          border-radius: 8px;
        }

        .ant-pagination-dark {
          background: #18181b;
          padding: 16px;
          border-top: 1px solid #3f3f46;
        }

        .ant-pagination-dark .ant-pagination-item {
          background: #27272a !important;
          border-color: #3f3f46 !important;
        }

        .ant-pagination-dark .ant-pagination-item a {
          color: #e4e4e7 !important;
        }

        .ant-pagination-dark .ant-pagination-item-active {
          background: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }

        .ant-pagination-dark .ant-pagination-item-active a {
          color: white !important;
        }

        .ant-pagination-dark .ant-pagination-prev,
        .ant-pagination-dark .ant-pagination-next,
        .ant-pagination-dark .ant-pagination-jump-prev,
        .ant-pagination-dark .ant-pagination-jump-next {
          color: #e4e4e7 !important;
        }

        .ant-pagination-dark .ant-pagination-options {
          color: #e4e4e7 !important;
        }

        .ant-pagination-dark .ant-select-selector {
          background: #27272a !important;
          border-color: #3f3f46 !important;
          color: #e4e4e7 !important;
        }

        .ant-pagination-dark .ant-pagination-total-text {
          color: #a1a1aa !important;
        }
      `}</style>
    </div>
  );
});

export default CampaignTable;