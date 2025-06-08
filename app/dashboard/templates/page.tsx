"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { X, Plus, FileText, Bold, Italic, Strikethrough, List, Quote, Code, Eye, Edit, Trash, Link, ChevronLeft, ChevronRight, Minus } from 'lucide-react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface Template {
  _id?: string;
  name: string;
  messageType: string;
  template: {
    message: string;
    header?: string;
    footer?: string;
    button?: Button[];
  };
}

interface Button {
  name: string;
  type: 'REPLY' | 'URL' ;
  url?: string;
  title?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

export default function Templates() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [messageType, setMessageType] = useState('');
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [buttons, setButtons] = useState<Button[]>([{ name: '', type: 'REPLY' }]);
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const templatesPerPage = 10;
  const editorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewButtons, setPreviewButtons] = useState<Button[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Enhanced toast system matching connection page
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString();
    const newToast: ToastMessage = {
      id,
      message,
      type,
      timestamp: Date.now()
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Plus className="h-5 w-5" />;
      case 'error':
        return <X className="h-5 w-5" />;
      case 'warning':
        return <X className="h-5 w-5" />;
      case 'info':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-900/90 border-emerald-700 text-emerald-100';
      case 'error':
        return 'bg-red-900/90 border-red-700 text-red-100';
      case 'warning':
        return 'bg-amber-900/90 border-amber-700 text-amber-100';
      case 'info':
        return 'bg-blue-900/90 border-blue-700 text-blue-100';
      default:
        return 'bg-zinc-900/90 border-zinc-700 text-zinc-100';
    }
  };

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
    console.warn('Unauthorized response received');
    showToast('Session expired. Please log in again.', 'error');
    Cookies.remove('token', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
    localStorage.removeItem('token');
    Cookies.remove('user', { path: '/', secure: window.location.protocol === 'https:', sameSite: 'Lax' });
    localStorage.removeItem('user');
    router.push('/');
  };

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      console.warn('No token found in cookie or localStorage, redirecting to login');
      showToast('Please log in to access your templates', 'error');
      router.push('/');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/template/all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page: currentPage, limit: templatesPerPage }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.status) {
        const validTemplates = (data.templates || []).filter(
          (template: Template) => template && template._id
        );
        setTemplates(validTemplates);
        setTotalTemplates(data.total || 0);
      } else {
        showToast(data.message || 'Failed to fetch templates', 'error');
      }
    } catch (err) {
      showToast('Error fetching templates: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [router, currentPage]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Initialize editor content when modal opens or editingTemplate changes
  useEffect(() => {
    if (isModalOpen && editorRef.current && editingTemplate) {
      editorRef.current.innerText = editingTemplate.template.message || '';
      setMessage(editingTemplate.template.message || '');
    } else if (isModalOpen && editorRef.current) {
      editorRef.current.innerText = '';
      setMessage('');
    }
  }, [isModalOpen, editingTemplate]);

  const totalPages = Math.ceil(totalTemplates / templatesPerPage);

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

  const handleOpenModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.name || '');
      setMessageType(template.messageType || '');
      setButtons(
        template.template.button?.map(btn => ({
          name: btn.name || btn.title || '',
          type: btn.type as 'REPLY' | 'URL' ,
          url: btn.url,
        })) || [{ name: '', type: 'REPLY' }]
      );
      setHeader(template.messageType === 'Buttons' ? template.template.header || '' : '');
      setFooter(template.messageType === 'Buttons' ? template.template.footer || '' : '');
      setMessage(template.template.message || '');
    } else {
      setEditingTemplate(null);
      setTemplateName('');
      setMessageType('');
      setMessage('');
      setButtons([{ name: '', type: 'REPLY' }]);
      setHeader('');
      setFooter('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTemplateName('');
    setMessageType('');
    setMessage('');
    setButtons([{ name: '', type: 'REPLY' }]);
    setHeader('');
    setFooter('');
    setEditingTemplate(null);
    if (editorRef.current) {
      editorRef.current.innerText = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    if (!token) {
      console.warn('No token found in cookie or localStorage, redirecting to login');
      showToast('Please log in to save template', 'error');
      router.push('/');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: templateName,
        messageType,
        template: {
          ...(messageType === 'Buttons' && { header: header || undefined }),
          message: editorRef.current?.innerText || '',
          ...(messageType === 'Buttons' && { footer: footer || undefined }),
          ...(messageType === 'Buttons' && {
            button: buttons
              .filter(btn => btn.name.trim() !== '')
              .map(btn => ({
                type: btn.type,
                title: btn.name,
                ...(btn.type === 'URL' && { url: btn.url }),
              })),
          }),
        },
      };

      const response = await fetch('https://whatsapp.recuperafly.com/api/template/', {
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

      const data = await response.json();

      if (data.status && data.data) {
        if (editingTemplate && editingTemplate._id) {
          setTemplates(templates.map(t => (t._id === editingTemplate._id ? data.data : t)));
          showToast('Template updated successfully', 'success');
        } else {
          if (data.data._id) {
            setCurrentPage(1);
            await fetchTemplates();
            showToast('Template created successfully', 'success');
          } else {
            showToast('Created template missing _id', 'error');
          }
        }
        handleCloseModal();
      } else {
        showToast(data.message || 'Failed to save template', 'error');
      }
    } catch (err) {
      showToast('Error saving template: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyFormatting = (format: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(format, false, format === 'formatBlock' ? 'blockquote' : undefined);
    setMessage(editor.innerText);
  };

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;

    let text = editor.innerText;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const cursorPos = range.startOffset;

    const boldPattern = /\*\*(.*?)\*\*/g;
    const italicPattern = /\*(.*?)\*/g;
    const strikethroughPattern = /~~(.*?)~~/g;
    const bulletPattern = /^-\s(.*)$/gm;
    const quotePattern = /^>\s(.*)$/gm;
    const codePattern = /`(.*?)`/g;

    let modified = false;

    if (boldPattern.test(text)) {
      editor.innerHTML = text.replace(boldPattern, '<b>$1</b>');
      text = editor.innerText;
      modified = true;
    }
    if (italicPattern.test(text)) {
      editor.innerHTML = text.replace(italicPattern, '<i>$1</i>');
      text = editor.innerText;
      modified = true;
    }
    if (strikethroughPattern.test(text)) {
      editor.innerHTML = text.replace(strikethroughPattern, '<s>$1</s>');
      text = editor.innerText;
      modified = true;
    }
    if (bulletPattern.test(text)) {
      editor.innerHTML = text.replace(bulletPattern, '<ul><li>$1</li></ul>');
      text = editor.innerText;
      modified = true;
    }
    if (quotePattern.test(text)) {
      editor.innerHTML = text.replace(quotePattern, '<blockquote>$1</blockquote>');
      text = editor.innerText;
      modified = true;
    }
    if (codePattern.test(text)) {
      editor.innerHTML = text.replace(codePattern, '<code>$1</code>');
      text = editor.innerText;
      modified = true;
    }

    setMessage(text);

    if (modified && selection) {
      const newRange = document.createRange();
      const newSelection = window.getSelection();
      if (newSelection) {
        try {
          const targetNode = editor.firstChild || editor;
          const maxOffset = targetNode.nodeType === 3 ? targetNode.textContent?.length || 0 : editor.childNodes.length;
          const safeOffset = Math.min(cursorPos, maxOffset);
          newRange.setStart(targetNode, safeOffset);
          newRange.collapse(true);
          newSelection.removeAllRanges();
          newSelection.addRange(newRange);
        } catch (error) {
          console.warn('Failed to restore cursor position:', error);
          newRange.selectNodeContents(editor);
          newRange.collapse(false);
          newSelection.removeAllRanges();
          newSelection.addRange(newRange);
        }
      }
    }
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    if (!token) {
      console.warn('No token found in cookie or localStorage, redirecting to login');
      showToast('Please log in to delete template', 'error');
      router.push('/');
      return;
    }

    setIsDeleting(prev => ({ ...prev, [id]: true }));
    try {
      const response = await fetch('https://whatsapp.recuperafly.com/api/template/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId: id }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (data.status) {
        const updatedTotal = totalTemplates - 1;
        setTemplates(templates.filter(t => t._id !== id));
        setTotalTemplates(updatedTotal);

        // Adjust currentPage if necessary
        const newTotalPages = Math.ceil(updatedTotal / templatesPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        } else if (newTotalPages === 0) {
          setCurrentPage(1);
        }

        showToast(data.message || 'Template deleted successfully', 'success');
      } else {
        showToast(data.message || 'Failed to delete template', 'error');
      }
    } catch (err) {
      showToast('Error deleting template: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handlePreview = (template: Template) => {
    let content = `Message:\n${template.template.message || 'N/A'}`;
    if (template.messageType === 'Buttons') {
      if (template.template.header) {
        content = `Header: ${template.template.header}\n${content}`;
      }
      if (template.template.footer) {
        content += `\nFooter: ${template.template.footer}`;
      }
    }
    setPreviewContent(content);
    setPreviewButtons(template.template.button || []);
    setIsPreviewOpen(true);
  };

  const handleButtonChange = (index: number, field: keyof Button, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    if (field === 'type' && value !== 'URL') {
      delete newButtons[index].url;
    }
    setButtons(newButtons);
  };

  const addButton = () => {
    if (buttons.length < 3) {
      setButtons([...buttons, { name: '', type: 'REPLY' }]);
    }
  };

  const removeButton = (index: number) => {
    if (buttons.length > 1 && index > 0) {
      setButtons(buttons.filter((_, i) => i !== index));
    }
  };

  const handleVariableSelect = (value: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const placeholder = value === 'name' ? '{{name}}' : value === 'phone' ? '{{phone}}' : `{{var${value.split(' ')[1]}}}`;
    range.insertNode(document.createTextNode(placeholder));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    setMessage(editor.innerText);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-lg border backdrop-blur-sm shadow-lg transform transition-all duration-300 ease-in-out ${getToastStyles(toast.type)}`}
          >
            <div className="flex-shrink-0">
              {getToastIcon(toast.type)}
            </div>
            <div className="flex-1 text-sm font-medium">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Message Templates
            </h1>
            <p className="text-zinc-400 mt-2">Create and manage your message templates</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 py-2 h-12 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <Plus className="h-5 w-5" />
            Add Template
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-zinc-500 animate-spin mb-4" />
              <p className="text-zinc-400">Loading templates...</p>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-zinc-800 rounded-xl bg-zinc-900/50">
            <div className="text-center p-8">
              <FileText className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-300 mb-2">No Templates Found</h3>
              <p className="text-zinc-500 mb-6 max-w-md">You don't have any message templates yet. Create your first template to get started.</p>
              <button
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 h-12 rounded-xl transition-all duration-300 flex items-center gap-2 mx-auto"
                onClick={() => handleOpenModal()}
                disabled={isLoading}
              >
                <Plus className="h-5 w-5" />
                Create First Template
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-zinc-900">
                    <TableHead className="text-zinc-400 font-semibold py-4 w-1/4 text-left">Name</TableHead>
                    <TableHead className="text-zinc-400 font-semibold py-4 w-1/4 text-left">Message Type</TableHead>
                    <TableHead className="text-zinc-400 font-semibold py-4 w-1/4 text-left">Message</TableHead>
                    <TableHead className="text-zinc-400 font-semibold py-4 w-1/4 text-left">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(template => (
                    <TableRow key={template._id || Math.random().toString()} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="text-zinc-200 py-4 w-1/4 text-left">{template.name || 'Unnamed'}</TableCell>
                      <TableCell className="text-zinc-200 py-4 w-1/4 text-left">{template.messageType || 'N/A'}</TableCell>
                      <TableCell className="text-zinc-200 py-4 w-1/4 text-left">
                        <button
                          onClick={() => handlePreview(template)}
                          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </button>
                      </TableCell>
                      <TableCell className="text-zinc-200 py-4 w-1/4 text-left">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(template)}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
                            disabled={isDeleting[template._id || ''] || !template._id}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => template._id && handleDelete(template._id)}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
                            disabled={isDeleting[template._id || ''] || !template._id}
                          >
                            {isDeleting[template._id || ''] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4" />
                            )}
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Pagination */}
            {templates.length > 0 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 sm:mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-4 gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-sm">
                    Showing {(currentPage - 1) * templatesPerPage + 1}-{Math.min(currentPage * templatesPerPage, totalTemplates)} of {totalTemplates} templates
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
              </div>
            )}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Template Preview</DialogTitle>
            </DialogHeader>
            <DialogDescription className="text-zinc-400 leading-relaxed whitespace-pre-wrap mt-4">
              {previewContent}
            </DialogDescription>
            {previewButtons.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {previewButtons.map((btn, idx) => (
                  <Button
                    key={idx}
                    variant={btn.type === 'URL' ? 'default' : 'outline'}
                    className={
                      btn.type === 'URL'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-transparent border-zinc-500 text-zinc-200 hover:bg-zinc-700'
                    }
                    onClick={() => {
                      if (btn.type === 'URL' && btn.url) {
                        window.open(btn.url, '_blank');
                      } else {
                        showToast(`Quick Reply: ${btn.title || btn.name}`, 'success');
                      }
                    }}
                  >
                    {btn.title || btn.name || `Button ${idx + 1}`}
                  </Button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-zinc-900 border border-zinc-800 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 p-2 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label className="text-zinc-400 font-medium mb-2 block">Title</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                      <Input
                        className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-200 h-12 rounded-lg"
                        placeholder="Enter template name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-zinc-400 font-medium mb-2 block">Message Type</Label>
                    <div className="relative">
                      <select
                        className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 h-12 transition-all duration-300 ease-in-out"
                        value={messageType}
                        onChange={(e) => setMessageType(e.target.value)}
                      >
                        <option value="" disabled>Select message type</option>
                        <option value="Text">Text</option>
                        <option value="Buttons">Buttons</option>
                      </select>
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    </div>
                  </div>
                </div>
                {messageType === 'Buttons' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-400 font-medium mb-2 block">Header</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                        <Input
                          className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-200 h-12 rounded-lg"
                          placeholder="Enter header text"
                          value={header}
                          onChange={(e) => setHeader(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-zinc-400 font-medium mb-2 block">Footer</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                        <Input
                          className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-200 h-12 rounded-lg"
                          placeholder="Enter footer text"
                          value={footer}
                          onChange={(e) => setFooter(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid gap-3">
                  <Label className="text-zinc-400 font-medium mb-2 block">Message</Label>
                  <div className="space-y-4">
                    <div className="flex gap-3 flex-wrap items-center">
                      <select
                        className="pl-3 pr-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 h-10 transition-all duration-300 ease-in-out"
                        onChange={(e) => handleVariableSelect(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>Insert variable</option>
                        <option value="name">Name</option>
                        <option value="phone">Phone</option>
                        {Array.from({ length: 10 }, (_, i) => (
                          <option key={i} value={`variable ${i + 1}`}>
                            Variable {i + 1}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => applyFormatting('bold')}
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => applyFormatting('italic')}
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => applyFormatting('strikeThrough')}
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                      >
                        <Strikethrough className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => applyFormatting('insertUnorderedList')}
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => applyFormatting('formatBlock')}
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => applyFormatting('code')}
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                    </div>
                    <div
                      ref={editorRef}
                      contentEditable
                      className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-zinc-600"
                      onInput={handleInput}
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                </div>
                {messageType === 'Buttons' && (
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-400 font-medium">Buttons</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addButton}
                        disabled={buttons.length >= 3}
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-10 px-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Button
                      </Button>
                    </div>
                    {buttons.map((button, index) => (
                      <div key={index} className="bg-zinc-800/50 border border-zinc-700 p-4 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-zinc-200">{`Button ${index + 1}`}</h3>
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeButton(index)}
                              className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 h-8 px-3"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                          <div className="flex-1">
                            <Label className="text-zinc-400 mb-2 block">Title</Label>
                            <Input
                              className="bg-zinc-800 border-zinc-700 text-zinc-200 h-12 rounded-lg"
                              placeholder={`Enter title for Button ${index + 1}`}
                              value={button.name}
                              onChange={(e) => handleButtonChange(index, 'name', e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-zinc-400 mb-2 block">Type</Label>
                            <select
                              className="w-full pl-3 pr-4 py-3 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 h-12 transition-all duration-300 ease-in-out"
                              value={button.type}
                              onChange={(e) => handleButtonChange(index, 'type', e.target.value as Button['type'])}
                            >
                              <option value="REPLY">Quick Reply</option>
                              <option value="URL">URL</option>
                            </select>
                          </div>
                        </div>
                        {button.type === 'URL' && (
                          <div className="flex-1">
                            <Label className="text-zinc-400 mb-2 block">URL</Label>
                            <div className="relative">
                              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                              <Input
                                className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-200 h-12 rounded-lg"
                                placeholder="Enter URL"
                                value={button.url || ''}
                                onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-4 mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 h-12 px-6"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-zinc-800 text-zinc-200 hover:bg-zinc-700 h-12 px-6"
                    disabled={
                      !templateName ||
                      !messageType ||
                      !editorRef.current?.innerText ||
                      (messageType === 'Buttons' && buttons.every(btn => btn.name.trim() === '')) ||
                      (messageType === 'Buttons' && buttons.some(btn => btn.type === 'URL' && !btn.url)) ||
                      isSubmitting
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {editingTemplate ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingTemplate ? 'Update Template' : 'Add Template'
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}