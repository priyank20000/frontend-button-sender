import React, { useState, useEffect, useCallback } from 'react'
import StyledButton from '../components/common/StyledButton'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

// Component imports
import TemplateHeader from '../components/templates/TemplateHeader'
import TemplateTable from '../components/templates/TemplateTable'
import TemplatePreviewDialog from '../components/templates/TemplatePreviewDialog'
import TemplateFormDialog from '../components/templates/TemplateFormDialog'

const Templates = () => {
  const toast = useToast()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [buttons, setButtons] = useState([])
  const [messageType, setMessageType] = useState('Text')
  const [templateName, setTemplateName] = useState('')
  const [templateMessage, setTemplateMessage] = useState('')
  const [header, setHeader] = useState('')
  const [footer, setFooter] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTemplates, setTotalTemplates] = useState(0)
  const templatesPerPage = 10

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.post('/template/all/', { 
        page: currentPage - 1, 
        limit: templatesPerPage 
      })
      
      if (response.data.status) {
        setTemplates(response.data.templates || [])
        setTotalTemplates(response.data.total || 0)
      } else {
        toast.error(response.data.message || 'Failed to load templates')
      }
    } catch (error) {
      console.error('Fetch templates error:', error)
      toast.error('Error loading templates. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, templatesPerPage])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleCreateTemplate = async (values) => {
    setIsSubmitting(true)
    try {
      console.log('Creating template with data:', {
        name: templateName,
        messageType: messageType,
        template: {
          header: messageType === 'Buttons' ? header : '',
          message: templateMessage,
          footer: messageType === 'Buttons' ? footer : '',
          button: messageType === 'Buttons' ? buttons.filter(btn => btn.title?.trim()) : []
        }
      })

      const templateData = {
        name: templateName,
        messageType: messageType,
        template: {
          header: messageType === 'Buttons' ? header : '',
          message: templateMessage,
          footer: messageType === 'Buttons' ? footer : '',
          button: messageType === 'Buttons' ? buttons.filter(btn => btn.title?.trim()) : []
        }
      }

      const response = await api.post('/template/', templateData)
      
      console.log('Template creation response:', response.data)
      
      if (response.data.status) {
        toast.success('Template Created Successfully!')
        setShowCreateModal(false)
        resetForm()
        fetchTemplates()
      } else {
        console.error('Template creation failed:', response.data)
        toast.error(response.data.message || 'Failed to create template')
      }
    } catch (error) {
      console.error('Create template error:', error)
      console.error('Error response:', error.response?.data)
      toast.error(error.response?.data?.message || 'Error creating template')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditTemplate = async (values) => {
    setIsSubmitting(true)
    try {
      const templateData = {
        templateId: editingTemplate._id,
        name: templateName,
        messageType: messageType,
        template: {
          header: messageType === 'Buttons' ? header : '',
          message: templateMessage,
          footer: messageType === 'Buttons' ? footer : '',
          button: messageType === 'Buttons' ? buttons.filter(btn => btn.title?.trim()) : []
        }
      }

      const response = await api.post('/template/edit/', templateData)
      
      if (response.data.status) {
        toast.success('Template Updated Successfully!')
        setShowEditModal(false)
        setEditingTemplate(null)
        resetForm()
        fetchTemplates()
      } else {
        toast.error(response.data.message || 'Failed to update template')
      }
    } catch (error) {
      console.error('Edit template error:', error)
      toast.error('Error updating template')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    setIsDeleting(prev => ({ ...prev, [templateId]: true }))
    try {
      const response = await api.post('/template/delete/', { templateId })
      
      if (response.data.status) {
        toast.success('Template Deleted Successfully!')
        fetchTemplates()
      } else {
        toast.error(response.data.message || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Delete template error:', error)
      toast.error('Error deleting template')
    } finally {
      setIsDeleting(prev => ({ ...prev, [templateId]: false }))
    }
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (template) => {
    setEditingTemplate(template)
    setMessageType(template.messageType)
    setTemplateName(template.name)
    setTemplateMessage(template.template.message)
    setHeader(template.template.header || '')
    setFooter(template.template.footer || '')
    setButtons(template.template.button?.length > 0 ? template.template.button : [])
    setShowEditModal(true)
  }

  const openPreviewModal = (template) => {
    setPreviewTemplate(template)
    setShowPreviewModal(true)
  }

  const resetForm = () => {
    setTemplateName('')
    setTemplateMessage('')
    setHeader('')
    setFooter('')
    setButtons([])
    setMessageType('Text')
    setEditingTemplate(null)
  }

  const totalPages = Math.ceil(totalTemplates / templatesPerPage)

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <div style={{ padding: '24px', background: '#000000', minHeight: '100vh' }}>
      <TemplateHeader
        isLoading={loading}
        onCreateTemplate={openCreateModal}
      />

      <TemplateTable
        templates={templates}
        isDeleting={isDeleting}
        currentPage={currentPage}
        totalPages={totalPages}
        templatesPerPage={templatesPerPage}
        totalTemplates={totalTemplates}
        onEdit={openEditModal}
        onDelete={handleDeleteTemplate}
        onPreview={openPreviewModal}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Create Template Modal */}
      <TemplateFormDialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTemplate}
        editingTemplate={null}
        templateName={templateName}
        setTemplateName={setTemplateName}
        messageType={messageType}
        setMessageType={setMessageType}
        message={templateMessage}
        setMessage={setTemplateMessage}
        buttons={buttons}
        setButtons={setButtons}
        header={header}
        setHeader={setHeader}
        footer={footer}
        setFooter={setFooter}
        isSubmitting={isSubmitting}
      />

      {/* Edit Template Modal */}
      <TemplateFormDialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingTemplate(null)
          resetForm()
        }}
        onSubmit={handleEditTemplate}
        editingTemplate={editingTemplate}
        templateName={templateName}
        setTemplateName={setTemplateName}
        messageType={messageType}
        setMessageType={setMessageType}
        message={templateMessage}
        setMessage={setTemplateMessage}
        buttons={buttons}
        setButtons={setButtons}
        header={header}
        setHeader={setHeader}
        footer={footer}
        setFooter={setFooter}
        isSubmitting={isSubmitting}
      />

      {/* Preview Modal */}
      <TemplatePreviewDialog
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        template={previewTemplate}
        previewContent=""
        previewButtons={previewTemplate?.template?.button || []}
      />
    </div>
  )
}

export default Templates