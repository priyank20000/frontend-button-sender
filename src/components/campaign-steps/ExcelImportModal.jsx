import React, { useState } from 'react'
import { 
  Modal, 
  Button, 
  Typography, 
  Select, 
  Table, 
  Upload, 
  Space,
  Pagination,
  Row,
  Col,
  message
} from 'antd'
import { 
  UploadOutlined, 
  LeftOutlined, 
  RightOutlined, 
  ThunderboltOutlined 
} from '@ant-design/icons'
import * as XLSX from 'xlsx'

const { Title, Text } = Typography
const { Option } = Select
const { Dragger } = Upload

const ExcelImportModal = ({
  open,
  onOpenChange,
  antdContacts,
  setAntdContacts,
  setRecipients,
  showToast,
  setNumVariables,
  numVariables = 10
}) => {
  const [excelData, setExcelData] = useState([])
  const [excelHeaders, setExcelHeaders] = useState([])
  const [isExcelDataLoaded, setIsExcelDataLoaded] = useState(false)
  const [showColumnMapping, setShowColumnMapping] = useState(false)
  const [columnMappings, setColumnMappings] = useState({
    name: '',
    phone: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12 // 12 fields per page

  const handleFileUpload = (file) => {
    console.log('File upload started:', file.name)
    
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      showToast('Please upload a valid Excel or CSV file', 'error')
      return false
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        console.log('File read successfully')
        const data = e.target?.result
        let jsonData
        
        if (file.name.endsWith('.csv')) {
          const text = data
          const rows = text.split('\n').map(row => 
            row.split(',').map(cell => cell.trim().replace(/"/g, ''))
          )
          jsonData = rows.filter(row => row.some(cell => cell && cell.length > 0))
        } else {
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false })
        }

        console.log('Parsed data:', jsonData)

        if (jsonData.length === 0) {
          showToast('The uploaded file is empty', 'error')
          return
        }

        if (jsonData.length < 2) {
          showToast('File must contain at least a header row and one data row', 'error')
          return
        }

        const headers = jsonData[0].map((header, idx) => {
          const cleanHeader = header ? header.toString().trim() : `Column ${idx + 1}`
          return cleanHeader || `Column ${idx + 1}`
        })
        
        console.log('Headers:', headers)
        setExcelHeaders(headers)

        // Use current numVariables or calculate based on headers
        const maxVars = Math.min(Math.max(headers.length - 2, 10), 30)
        const finalNumVars = numVariables || maxVars
        
        const initialMappings = {
          name: '',
          phone: '',
          ...Object.fromEntries(
            Array.from({ length: finalNumVars }, (_, idx) => [`var${idx + 1}`, ''])
          )
        }
        setColumnMappings(initialMappings)

        const rows = jsonData.slice(1).map((row, rowIndex) => {
          const rowData = {}
          headers.forEach((header, idx) => {
            const value = row[idx]
            rowData[header] = value ? value.toString().trim() : ''
          })
          rowData._originalIndex = rowIndex
          return rowData
        }).filter(row => {
          // Filter out completely empty rows
          const values = Object.values(row).filter(val => val && val !== '')
          return values.length > 1 // At least 2 non-empty values
        })

        console.log('Processed rows:', rows)

        if (rows.length === 0) {
          showToast('No valid data rows found in the file', 'error')
          return
        }

        setExcelData(rows)
        setIsExcelDataLoaded(true)
        setShowColumnMapping(false) // Show preview first
        setCurrentPage(1)

        // Update numVariables in parent component
        if (setNumVariables) {
          setNumVariables(finalNumVars)
        }

        // Warn if columns were truncated
        if (headers.length - 2 > 30) {
          showToast(`Excel file has ${headers.length} columns, but only the first 30 variables (plus name and phone) can be mapped.`, 'warning')
        }

        showToast(`File loaded successfully! Found ${rows.length} data rows.`, 'success')
      } catch (err) {
        console.error('Error parsing file:', err)
        showToast('Error parsing file: The file may be corrupted or in an unsupported format.', 'error')
      }
    }

    reader.onerror = () => {
      console.error('Error reading file')
      showToast('Error reading the file', 'error')
    }

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }

    return false // Prevent upload
  }

  const handleColumnMappingChange = (field, header) => {
    console.log('Mapping change:', field, header)
    setColumnMappings(prev => ({ ...prev, [field]: header === 'none' ? '' : header }))
  }

  // Auto mapping function
  const handleAutoMap = () => {
    const newMappings = { ...columnMappings }
    
    // Common patterns for name fields
    const namePatterns = [
      /^name$/i,
      /^full.?name$/i,
      /^customer.?name$/i,
      /^contact.?name$/i,
      /^person.?name$/i,
      /^user.?name$/i,
      /^client.?name$/i,
      /^first.?name$/i,
      /^naam$/i,
      /^नाम$/i
    ]

    // Common patterns for phone fields
    const phonePatterns = [
      /^phone$/i,
      /^mobile$/i,
      /^number$/i,
      /^phone.?number$/i,
      /^mobile.?number$/i,
      /^contact.?number$/i,
      /^whatsapp$/i,
      /^whatsapp.?number$/i,
      /^cell$/i,
      /^telephone$/i,
      /^tel$/i,
      /^mob$/i,
      /^फोन$/i,
      /^मोबाइल$/i
    ]

    // Auto-map name field
    for (const header of excelHeaders) {
      if (namePatterns.some(pattern => pattern.test(header))) {
        newMappings.name = header
        break
      }
    }

    // Auto-map phone field
    for (const header of excelHeaders) {
      if (phonePatterns.some(pattern => pattern.test(header))) {
        newMappings.phone = header
        break
      }
    }

    // Auto-map variable fields based on common patterns
    const variablePatterns = [
      /^var\d+$/i,
      /^variable\d+$/i,
      /^field\d+$/i,
      /^custom\d+$/i,
      /^data\d+$/i,
      /^value\d+$/i,
      /^param\d+$/i,
      /^attr\d+$/i,
      /^property\d+$/i,
      /^extra\d+$/i
    ]

    // Get remaining headers (not used for name/phone)
    const remainingHeaders = excelHeaders.filter(header => 
      header !== newMappings.name && header !== newMappings.phone
    )

    // Map variables in order
    let varIndex = 1
    for (const header of remainingHeaders) {
      if (varIndex > 30) break // Max 30 variables
      
      const varKey = `var${varIndex}`
      if (varKey in newMappings) {
        newMappings[varKey] = header
        varIndex++
      }
    }

    setColumnMappings(newMappings)
    
    // Show success message with mapping summary
    const mappedCount = Object.values(newMappings).filter(value => value !== '').length
    showToast(`Auto-mapped ${mappedCount} columns successfully!`, 'success')
  }

  const handleImportRecipients = () => {
    console.log('Starting import with mappings:', columnMappings)
    
    if (!columnMappings.name || !columnMappings.phone) {
      showToast('Please map both Name and Phone columns', 'error')
      return
    }

    const currentNumVars = Object.keys(columnMappings).filter(key => key.startsWith('var')).length
    console.log('Number of variables:', currentNumVars)
    
    const newContacts = excelData.map((row, index) => {
      const contact = {
        key: `imported_${Date.now()}_${index}`,
        name: row[columnMappings.name] || '',
        number: row[columnMappings.phone] || '',
      }

      // Add variables dynamically
      Object.keys(columnMappings).forEach((key) => {
        if (key.startsWith('var') && columnMappings[key]) {
          contact[key] = row[columnMappings[key]] || ''
        } else if (key.startsWith('var')) {
          contact[key] = '' // Initialize empty variables
        }
      })

      return contact
    }).filter(contact => {
      const hasName = contact.name && contact.name.trim() !== ''
      const hasNumber = contact.number && contact.number.trim() !== ''
      return hasName && hasNumber
    })

    console.log('Filtered contacts:', newContacts)

    if (newContacts.length === 0) {
      showToast('No valid contacts found. Please check your data and column mappings.', 'error')
      return
    }

    const updatedContacts = [...antdContacts, ...newContacts]
    setAntdContacts(updatedContacts)
    
    // Update recipients state
    const updatedRecipients = updatedContacts.map(contact => ({
      phone: contact.number,
      name: contact.name,
      variables: Object.fromEntries(
        Array.from({ length: currentNumVars }, (_, i) => [
          `var${i + 1}`,
          contact[`var${i + 1}`] || ''
        ])
      )
    }))
    setRecipients(updatedRecipients)
    
    console.log('Updated recipients:', updatedRecipients)
    
    // Reset modal state
    handleClose()
    message.success(`Successfully imported ${newContacts.length} contacts!`)
  }

  const handleClose = () => {
    onOpenChange(false)
    setExcelData([])
    setExcelHeaders([])
    setIsExcelDataLoaded(false)
    setShowColumnMapping(false)
    setColumnMappings({ name: '', phone: '' })
    setCurrentPage(1)
  }

  // Pagination logic for column mapping
  const allFields = ['name', 'phone', ...Object.keys(columnMappings).filter(field => field.startsWith('var'))]
  const totalPages = Math.ceil(allFields.length / itemsPerPage)
  const paginatedFields = allFields.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Table columns for preview
  const previewColumns = excelHeaders.slice(0, 10).map((header, idx) => ({
    title: (
      <Text style={{ color: '#ffffff', fontSize: '12px' }}>
        {header}
      </Text>
    ),
    dataIndex: header,
    key: idx,
    width: 120,
    render: (text) => (
      <Text style={{ color: '#ffffff', fontSize: '12px' }}>
        {text || '-'}
      </Text>
    )
  }))

  return (
    <Modal
      title={<span style={{ color: '#ffffff' }}>Import Recipients from Excel/CSV</span>}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={1200}
      centered
      destroyOnClose
      styles={{
        header: {
          backgroundColor: 'transparent',
          borderBottom: 'none',
          padding: '20px 24px 0'
        },
        content: {
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '12px',
          maxHeight: '85vh',
          overflow: 'hidden'
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)'
        }
      }}
    >
      <div style={{ padding: '0 24px 24px', maxHeight: '75vh', overflowY: 'auto' }}>
        <Text style={{ color: '#888888', marginBottom: '24px', display: 'block' }}>
          Upload Excel (.xlsx, .xls) or CSV file and map columns to import recipients
        </Text>
        
        {!isExcelDataLoaded ? (
          <div style={{ marginBottom: '24px' }}>
            <Dragger
              accept=".xlsx,.xls,.csv"
              beforeUpload={handleFileUpload}
              showUploadList={false}
              style={{
                background: '#1a1a1a',
                border: '2px dashed #333333',
                borderRadius: '8px',
                padding: '40px 20px'
              }}
            >
              <p style={{ fontSize: '48px', color: '#4a9eff', margin: '20px 0' }}>
                <UploadOutlined />
              </p>
              <p style={{ color: '#ffffff', fontSize: '16px', margin: '10px 0' }}>
                Click or drag file to this area to upload
              </p>
              <p style={{ color: '#888888', fontSize: '14px' }}>
                Support for Excel (.xlsx, .xls) and CSV files. First row should contain column headers.
              </p>
            </Dragger>
          </div>
        ) : !showColumnMapping ? (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Text strong style={{ color: '#ffffff' }}>
                Preview Data ({excelData.length} rows found)
              </Text>
              <Text style={{ color: '#888888', fontSize: '12px' }}>
                Showing first 5 rows and up to 10 columns
              </Text>
            </div>
            
            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              border: '1px solid #333333',
              borderRadius: '8px',
              background: '#1a1a1a'
            }}>
              <Table
                columns={previewColumns}
                dataSource={excelData.slice(0, 5).map((row, idx) => ({ ...row, key: idx }))}
                pagination={false}
                scroll={{ x: 'max-content' }}
                size="small"
                style={{ background: '#1a1a1a' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <Button
                onClick={handleClose}
                style={{
                  background: '#1a1a1a',
                  borderColor: '#333333',
                  color: '#ffffff'
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={() => setShowColumnMapping(true)}
                style={{
                  background: '#4a9eff',
                  borderColor: '#4a9eff'
                }}
              >
                Map Columns
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <Text strong style={{ color: '#ffffff' }}>
                Map Columns to Fields
              </Text>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={handleAutoMap}
                style={{
                  background: '#1a1a1a',
                  borderColor: '#333333',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Auto Map
              </Button>
            </div>
            
            <Row gutter={[16, 16]}>
              {paginatedFields.map(field => (
                <Col xs={24} md={12} lg={8} key={field}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text style={{ 
                      color: (field === 'name' || field === 'phone') ? '#ff6b6b' : '#888888',
                      fontWeight: (field === 'name' || field === 'phone') ? 'bold' : 'normal'
                    }}>
                      {field === 'name' ? 'Name *' : field === 'phone' ? 'Phone *' : `Variable ${field.slice(3)}`}
                    </Text>
                  </div>
                  <Select
                    value={columnMappings[field] || undefined}
                    onChange={(value) => handleColumnMappingChange(field, value)}
                    placeholder={`Select column for ${field}`}
                    style={{ width: '100%' }}
                    dropdownStyle={{
                      background: '#1a1a1a',
                      border: '1px solid #333333'
                    }}
                  >
                    <Option value="none">None</Option>
                    {excelHeaders.map(header => (
                      <Option key={header} value={header}>{header}</Option>
                    ))}
                  </Select>
                </Col>
              ))}
            </Row>

            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '16px',
                marginTop: '24px'
              }}>
                <Button
                  icon={<LeftOutlined />}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    background: '#1a1a1a',
                    borderColor: '#333333',
                    color: '#ffffff'
                  }}
                />
                <Text style={{ color: '#888888' }}>
                  Page {currentPage} of {totalPages}
                </Text>
                <Button
                  icon={<RightOutlined />}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    background: '#1a1a1a',
                    borderColor: '#333333',
                    color: '#ffffff'
                  }}
                />
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
              <Text style={{ color: '#888888', fontSize: '12px' }}>
                {Object.values(columnMappings).filter(v => v).length} columns mapped
              </Text>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  onClick={() => setShowColumnMapping(false)}
                  style={{
                    background: '#1a1a1a',
                    borderColor: '#333333',
                    color: '#ffffff'
                  }}
                >
                  Back to Preview
                </Button>
                <Button
                  type="primary"
                  onClick={handleImportRecipients}
                  disabled={!columnMappings.name || !columnMappings.phone}
                  style={{
                    background: !columnMappings.name || !columnMappings.phone ? '#666666' : '#4a9eff',
                    borderColor: !columnMappings.name || !columnMappings.phone ? '#666666' : '#4a9eff'
                  }}
                >
                  Import {excelData.length} Contacts
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ExcelImportModal