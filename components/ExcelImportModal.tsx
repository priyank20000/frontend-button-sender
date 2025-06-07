"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { message as antMessage } from 'antd';

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  antdContacts: any[];
  setAntdContacts: (contacts: any[]) => void;
  setRecipients: (recipients: any[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

interface ExcelRow {
  [key: string]: string;
}

export default function ExcelImportModal({
  open,
  onOpenChange,
  antdContacts,
  setAntdContacts,
  setRecipients,
  showToast
}: ExcelImportModalProps) {
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [isExcelDataLoaded, setIsExcelDataLoaded] = useState(false);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMappings, setColumnMappings] = useState<{ [key: string]: string }>({
    name: '',
    phone: '',
    var1: '',
    var2: '',
    var3: '',
    var4: '',
    var5: '',
    var6: '',
    var7: '',
    var8: '',
    var9: '',
    var10: ''
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      showToast('Please upload a valid Excel or CSV file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer | string;
        let jsonData: string[][];
        
        if (file.name.endsWith('.csv')) {
          const text = data as string;
          const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
          jsonData = rows.filter(row => row.some(cell => cell));
        } else {
          const workbook = XLSX.read(data, { type: file.name.endsWith('.csv') ? 'string' : 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as string[][];
        }

        if (jsonData.length === 0) {
          showToast('The uploaded file is empty', 'error');
          return;
        }

        const headers = jsonData[0].map((header, idx) => header || `Column ${idx + 1}`);
        setExcelHeaders(headers);

        const rows = jsonData.slice(1).map((row) =>
          row.reduce((obj, value, idx) => {
            obj[headers[idx]] = value?.toString() || '';
            return obj;
          }, {} as ExcelRow)
        );

        setExcelData(rows);
        setIsExcelDataLoaded(true);
        setShowColumnMapping(true);
      } catch (err) {
        showToast('Error parsing file: The file may be corrupted or in an unsupported format.', 'error');
        console.error(err);
      }
    };

    reader.onerror = () => {
      showToast('Error reading the file', 'error');
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleColumnMappingChange = (field: string, header: string) => {
    setColumnMappings(prev => ({ ...prev, [field]: header === 'none' ? '' : header }));
  };

  const handleImportRecipients = () => {
    if (!columnMappings.name || !columnMappings.phone) {
      showToast('Please map both Name and Phone columns', 'error');
      return;
    }

    const newContacts = excelData.map((row, index) => {
      return {
        key: (Date.now() + index).toString(),
        sn: antdContacts.length + index + 1,
        name: row[columnMappings.name] || '',
        number: row[columnMappings.phone] || '',
        var1: columnMappings.var1 && row[columnMappings.var1] ? row[columnMappings.var1] : '',
        var2: columnMappings.var2 && row[columnMappings.var2] ? row[columnMappings.var2] : '',
        var3: columnMappings.var3 && row[columnMappings.var3] ? row[columnMappings.var3] : '',
        var4: columnMappings.var4 && row[columnMappings.var4] ? row[columnMappings.var4] : '',
        var5: columnMappings.var5 && row[columnMappings.var5] ? row[columnMappings.var5] : '',
        var6: columnMappings.var6 && row[columnMappings.var6] ? row[columnMappings.var6] : '',
        var7: columnMappings.var7 && row[columnMappings.var7] ? row[columnMappings.var7] : '',
        var8: columnMappings.var8 && row[columnMappings.var8] ? row[columnMappings.var8] : '',
        var9: columnMappings.var9 && row[columnMappings.var9] ? row[columnMappings.var9] : '',
        var10: columnMappings.var10 && row[columnMappings.var10] ? row[columnMappings.var10] : '',
      };
    }).filter(contact => contact.name && contact.number);

    const updatedContacts = [...antdContacts, ...newContacts];
    setAntdContacts(updatedContacts);
    
    // Update recipients state
    const updatedRecipients = updatedContacts.map(contact => ({
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
    
    // Reset modal state
    onOpenChange(false);
    setExcelData([]);
    setExcelHeaders([]);
    setIsExcelDataLoaded(false);
    setShowColumnMapping(false);
    setColumnMappings({
      name: '',
      phone: '',
      var1: '',
      var2: '',
      var3: '',
      var4: '',
      var5: '',
      var6: '',
      var7: '',
      var8: '',
      var9: '',
      var10: ''
    });
    antMessage.success('Contacts imported successfully');
  };

  const handleClose = () => {
    onOpenChange(false);
    setExcelData([]);
    setExcelHeaders([]);
    setIsExcelDataLoaded(false);
    setShowColumnMapping(false);
    setColumnMappings({
      name: '',
      phone: '',
      var1: '',
      var2: '',
      var3: '',
      var4: '',
      var5: '',
      var6: '',
      var7: '',
      var8: '',
      var9: '',
      var10: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Import Recipients</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Upload Excel or CSV file and map columns to import recipients
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          {!isExcelDataLoaded ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-lg py-12">
              <Upload className="h-12 w-12 text-zinc-500 mb-4" />
              <Label className="text-zinc-400 mb-4">Upload .xlsx, .xls or .csv file</Label>
              <Button
                type="button"
                variant="outline"
                className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Select File
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          ) : !showColumnMapping ? (
            <div className="space-y-4">
              <Label className="text-zinc-400 font-medium">Preview Data</Label>
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      {excelHeaders.map((header, idx) => (
                        <TableHead key={idx} className="text-zinc-400">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelData.slice(0, 5).map((row, rowIdx) => (
                      <TableRow key={rowIdx} className="border-zinc-800">
                        {excelHeaders.map((header, colIdx) => (
                          <TableCell key={colIdx} className="text-zinc-200">
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowColumnMapping(true)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white"
                >
                  Map Columns
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Label className="text-zinc-400 font-medium">Map Columns</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['name', 'phone', ...Array.from({ length: 10 }, (_, i) => `var${i + 1}`)].map(field => (
                  <div key={field} className="space-y-2">
                    <Label className="text-zinc-400">{field === 'name' ? 'Name *' : field === 'phone' ? 'Phone *' : `Variable ${field.slice(3)}`}</Label>
                    <Select
                      value={columnMappings[field]}
                      onValueChange={(value) => handleColumnMappingChange(field, value)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                        <SelectValue placeholder={`Select column for ${field}`} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200">
                        <SelectItem value="none">None</SelectItem>
                        {excelHeaders.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowColumnMapping(false)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleImportRecipients}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white"
                  disabled={!columnMappings.name || !columnMappings.phone}
                >
                  Import
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}