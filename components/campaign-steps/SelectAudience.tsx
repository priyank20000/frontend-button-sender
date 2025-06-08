"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Users, Trash2, Plus, FileText } from 'lucide-react';
import { ConfigProvider, Table as AntTable, Button as AntButton, Form, message as antMessage } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import ExcelImportModal from '../ExcelImportModal';

interface SelectAudienceProps {
  antdContacts: any[];
  setAntdContacts: (contacts: any[]) => void;
  recipients: any[];
  setRecipients: (recipients: any[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function SelectAudience({
  antdContacts,
  setAntdContacts,
  recipients,
  setRecipients,
  showToast
}: SelectAudienceProps) {
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteContactKey, setDeleteContactKey] = useState<string | null>(null);
  const [contactForm] = Form.useForm();
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Handle inline editing for Name column
  const handleSaveName = (key: string, newName: string) => {
    const updatedContacts = antdContacts.map(contact =>
      contact.key === key ? { ...contact, name: newName } : contact
    );
    setAntdContacts(updatedContacts);

    const updatedRecipients = updatedContacts.map(contact => ({
      phone: contact.number,
      name: contact.name,
      variables: {
        var1: contact.var1 || '',
        var2: contact.var2 || '',
        var3: contact.var3 || '',
        var4: contact.var4 || '',
        var5: contact.var5 || '',
        var6: contact.var6 || '',
        var7: contact.var7 || '',
        var8: contact.var8 || '',
        var9: contact.var9 || '',
        var10: contact.var10 || '',
      }
    }));
    setRecipients(updatedRecipients);
    antMessage.success('Name updated successfully');
  };

  // Ant Design Table Columns
  const antdColumns = [
    {
      title: 'SN',
      dataIndex: 'sn',
      key: 'sn',
      width: 60,
      align: 'center' as const,
      fixed: 'left' as const,
      render: (text: any, record: any, index: number) => index + 1,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left' as const,
      render: (text: string) => text || 'Enter Here',
      onCell: (record: any) => ({
        onDoubleClick: () => {
          const input = document.createElement('input');
          input.value = record.name || '';
          input.style.width = '100%';
          input.style.padding = '4px';
          input.style.border = '1px solid #3f3f46';
          input.style.backgroundColor = '#18181b';
          input.style.color = '#e4e4e7';
          input.onblur = () => {
            handleSaveName(record.key, input.value);
          };
          input.onkeydown = (e) => {
            if (e.key === 'Enter') {
              handleSaveName(record.key, input.value);
            }
          };
          const cell = document.querySelector(`[data-row-key="${record.key}"] .ant-table-cell[data-column-key="name"]`);
          if (cell) {
            cell.innerHTML = '';
            cell.appendChild(input);
            input.focus();
          }
        },
      }),
    },
    {
      title: 'Number',
      dataIndex: 'number',
      key: 'number',
      width: 150,
      fixed: 'left' as const,
      render: (text: string) => text || 'Enter Here',
    },
    ...Array.from({ length: 10 }, (_, index) => ({
      title: `Variable ${index + 1}`,
      dataIndex: `var${index + 1}`,
      key: `var${index + 1}`,
      width: 120,
      render: (text: string) => text || 'Enter Here',
    })),
    {
      title: 'Action',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <AntButton
          type="link"
          danger
          icon={<DeleteOutlined />}
          size="small"
          style={{ color: '#ef4444' }}
          onClick={() => {
            setDeleteContactKey(record.key);
            setIsDeleteDialogOpen(true);
          }}
        >
          Delete
        </AntButton>
      ),
    },
  ];

  const handleContactAdd = () => {
    contactForm.resetFields();
    setIsContactDialogOpen(true);
  };

  const handleContactDelete = (key: string) => {
    setAntdContacts(antdContacts.filter(contact => contact.key !== key));
    antMessage.success('Contact deleted successfully');
    
    const updatedRecipients = antdContacts
      .filter(contact => contact.key !== key)
      .map(contact => ({
        phone: contact.number,
        name: contact.name,
        variables: {
          var1: contact.var1,
          var2: contact.var2,
          var3: contact.var3,
          var4: contact.var4,
          var5: contact.var5,
          var6: contact.var6,
          var7: contact.var7,
          var8: contact.var8,
          var9: contact.var9,
          var10: contact.var10,
        }
      }));
    setRecipients(updatedRecipients);
  };

  const handleConfirmDelete = () => {
    if (deleteContactKey) {
      handleContactDelete(deleteContactKey);
      setIsDeleteDialogOpen(false);
      setDeleteContactKey(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeleteContactKey(null);
  };

  const handleContactSubmit = async () => {
    try {
      const values = await contactForm.validateFields();
      const newContact = {
        ...values,
        key: Date.now().toString(),
        sn: antdContacts.length + 1,
      };
      const updatedContacts = [...antdContacts, newContact];
      setAntdContacts(updatedContacts);
      antMessage.success('Contact added successfully');
      
      const updatedRecipients = updatedContacts.map(contact => ({
        phone: contact.number,
        name: contact.name,
        variables: {
          var1: contact.var1 || '',
          var2: contact.var2 || '',
          var3: contact.var3 || '',
          var4: contact.var4 || '',
          var5: contact.var5 || '',
          var6: contact.var6 || '',
          var7: contact.var7 || '',
          var8: contact.var8 || '',
          var9: contact.var9 || '',
          var10: contact.var10 || '',
        }
      }));
      setRecipients(updatedRecipients);
      
      setIsContactDialogOpen(false);
      contactForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleContactCancel = () => {
    setIsContactDialogOpen(false);
    contactForm.resetFields();
  };

  const handleRemoveDuplicates = () => {
    const seenPhones = new Set<string>();
    const uniqueContacts = antdContacts.filter((contact) => {
      if (!contact.number) return false;
      if (seenPhones.has(contact.number)) return false;
      seenPhones.add(contact.number);
      return true;
    });

    if (uniqueContacts.length === antdContacts.length) {
      antMessage.info('No duplicate phone numbers found.');
    } else {
      setAntdContacts(uniqueContacts);
      antMessage.success(`Removed ${antdContacts.length - uniqueContacts.length} duplicate contacts.`);
      
      const updatedRecipients = uniqueContacts.map(contact => ({
        phone: contact.number,
        name: contact.name,
        variables: {
          var1: contact.var1 || '',
          var2: contact.var2 || '',
          var3: contact.var3 || '',
          var4: contact.var4 || '',
          var5: contact.var5 || '',
          var6: contact.var6 || '',
          var7: contact.var7 || '',
          var8: contact.var8 || '',
          var9: contact.var9 || '',
          var10: contact.var10 || '',
        }
      }));
      setRecipients(updatedRecipients);
    }
  };

  const handleDeleteAll = () => {
    setAntdContacts([]);
    setRecipients([{
      phone: '',
      name: '',
      variables: { var1: '', var2: '', var3: '', var4: '', var5: '', var6: '', var7: '', var8: '', var9: '', var10: '' }
    }]);
    antMessage.success('All contacts deleted.');
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#3b82f6',
          colorBgContainer: '#27272a',
          colorBorder: '#3f3f46',
          colorText: '#e4e4e7',
          colorTextSecondary: '#a1a1aa',
          colorBgElevated: '#18181b',
        },
        components: {
          Table: {
            headerBg: '#18181b',
            headerColor: '#a1a1aa',
            rowHoverBg: '#3f3f46',
            borderColor: '#3f3f46',
          },
        },
      }}
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-200 mb-2">Select Audience</h3>
          <p className="text-zinc-400 mb-6">Import recipients from Excel or add manually.</p>
        </div>

        {/* Import Options */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Excel Import
          </Button>
          <Button
            variant="outline"
            onClick={handleRemoveDuplicates}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            <Users className="h-4 w-4 mr-2" />
            Remove Duplicates
          </Button>
          <Button
            variant="outline"
            onClick={handleDeleteAll}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
          <Button
            variant="outline"
            onClick={handleContactAdd}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Ant Design Table with Fixed Width Container */}
        <div className="bg-zinc-900 rounded-lg p-4 table-container">
          <AntTable
            columns={antdColumns}
            dataSource={antdContacts}
            scroll={{ x: 960 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} items`,
              style: { 
                color: '#e4e4e7',
              }
            }}
            bordered
            size="middle"
            style={{
              backgroundColor: '#27272a',
            }}
            className="custom-table"
            rowKey="key"
          />
        </div>

        {/* Summary */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Total: {antdContacts.length}</span>
            <span className="text-zinc-400">Valid: {antdContacts.filter(c => c.name && c.number).length}</span>
            <span className="text-zinc-400">Invalid: {antdContacts.filter(c => !c.name || !c.number).length}</span>
          </div>
        </div>

        {/* Contact Dialog for Adding New Contact */}
        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
          <DialogContent className="bg-zinc-800 text-zinc-200 border-zinc-700 max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-zinc-200">Add New Contact</DialogTitle>
            </DialogHeader>
            <Form
              form={contactForm}
              layout="vertical"
              requiredMark={false}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  label={<span className="text-zinc-400">Name</span>}
                  name="name"
                  rules={[{ required: true, message: 'Please enter name' }]}
                >
                  <Input
                    placeholder="Enter name"
                    autoFocus
                    className="bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-blue-500"
                  />
                </Form.Item>
                <Form.Item
                  label={<span className="text-zinc-400">Phone Number</span>}
                  name="number"
                  rules={[{ required: true, message: 'Please enter number' }]}
                >
                  <Input
                    placeholder="Enter phone number"
                    className="bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-blue-500"
                  />
                </Form.Item>
              </div>

              <div className="border-t border-zinc-700 pt-4 mt-4">
                <h4 className="text-zinc-200 mb-4">Custom Variables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 10 }, (_, index) => (
                    <Form.Item
                      key={index}
                      label={<span className="text-zinc-400">Variable {index + 1}</span>}
                      name={`var${index + 1}`}
                    >
                      <Input
                        placeholder={`Enter variable ${index + 1}`}
                        className="bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-blue-500"
                      />
                    </Form.Item>
                  ))}
                </div>
              </div>
            </Form>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleContactCancel}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleContactSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-zinc-800 text-zinc-200 border-zinc-700">
            <DialogHeader>
              <DialogTitle className="text-zinc-200">Confirm Delete</DialogTitle>
            </DialogHeader>
            <p className="text-center text-zinc-400">Are you sure you want to delete this contact?</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              >
                No
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Excel Import Modal */}
        <ExcelImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          antdContacts={antdContacts}
          setAntdContacts={setAntdContacts}
          setRecipients={setRecipients}
          showToast={showToast}
        />
      </div>

      <style jsx global>{`
        .table-container {
          width: 1090px;
          overflow-x: auto;
        }

        .custom-table .ant-table-thead > tr > th {
          background-color: #18181b !important;
          color: #a1a1aa !important;
          border-bottom: 1px solid #3f3f46 !important;
        }
        
        .custom-table .ant-table-tbody > tr > td {
          background-color: #27272a !important;
          color: #e4e4e7 !important;
          border-bottom: 1px solid #3f3f46 !important;
        }
        
        .custom-table .ant-table-tbody > tr:hover > td {
          background-color: #3f3f46 !important;
        }
        
        .custom-table .ant-table-container {
          border: 1px solid #3f3f46 !important;
        }
        
        .custom-table .ant-pagination {
          color: #e4e4e7 !important;
        }
        
        .custom-table .ant-pagination .ant-pagination-item {
          background-color: #18181b !important;
          border-color: #3f3f46 !important;
        }
        
        .custom-table .ant-pagination .ant-pagination-item a {
          color: #e4e4e7 !important;
        }
        
        .custom-table .ant-pagination .ant-pagination-item-active {
          background-color: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }
        
        .custom-table .ant-pagination .ant-pagination-item-active a {
          color: white !important;
        }

        .custom-table .ant-table-body::-webkit-scrollbar {
          height: 8px;
        }
        
        .custom-table .ant-table-body::-webkit-scrollbar-track {
          background: #3f3f46;
        }
        
        .custom-table .ant-table-body::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        
        .custom-table .ant-table-body::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        /* Custom scrollbar for dialog */
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: #3f3f46;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </ConfigProvider>
  );
}