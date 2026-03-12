"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Filter, Columns, MoreVertical, Paperclip, ChevronDown, Check, Trash2, Eye, Copy, Phone, Printer, Download, Plus, X } from "lucide-react"
import { format } from "date-fns"
import { useSlipContext, SlipProvider } from "./SlipContext";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import FileAttachmentModalContent from "@/components/file-attachment-modal-content"
import ChangeDateModal from "@/components/change-date-modal"
import DriverHistoryModal from "@/components/driver-history-modal"
import AddOnsModal from "@/components/add-ons-modal"
import CallLogModal from "@/components/call-log-modal"
import PrintPreviewModal from "@/components/print-preview-modal"
import PrintDriverTagsModal from "@/components/print-driver-tags-modal"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast";
import { HIPAAComplianceBanner } from "@/components/hipaa-compliance-banner"

// Utility to decode and print base64 HTML
function printPaperSlip(base64Html: string) {
  const html = atob(base64Html);
  
  // Create a temporary iframe for printing
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'absolute';
  printFrame.style.left = '-9999px';
  printFrame.style.top = '-9999px';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = 'none';
  
  document.body.appendChild(printFrame);
  
  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    
    // Wait for content to load then print
    printFrame.onload = () => {
      printFrame.contentWindow?.print();
      // Remove the iframe after printing
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    };
  }
}

export default function LabSlipPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  // Get customerType from localStorage and use as userRole
  let userRole = 'lab';
  if (typeof window !== 'undefined') {
    const storedType = localStorage.getItem('customerType');
    if (storedType) userRole = storedType;
  }
  const [search, setSearch] = useState("")
  const [office, setOffice] = useState("All")
  const [status, setStatus] = useState("All")
  const [location, setLocation] = useState(() => searchParams.get("location") || "All")
  const [showWithAttachments, setShowWithAttachments] = useState(false)
  const [showLabConnect, setShowLabConnect] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showColumnsDialog, setShowColumnsDialog] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    office: true,
    patient: true,
    caseNumber: true,
    pan: true,
    product: true,
    status: true,
    location: true,
    attachment: true,
    due: true,
    actions: true,
  })
  const [selected, setSelected] = useState<number[]>([])
  const [menuRow, setMenuRow] = useState<number | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<number | null>(null)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [dateRange, setDateRange] = useState<{ start?: Date, end?: Date }>({})
  const [patientSearch, setPatientSearch] = useState("")
  const [productType, setProductType] = useState("All")
  const [doctorFilter, setDoctorFilter] = useState("All")
  const [userFilter, setUserFilter] = useState("All")
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [selectedSlipForAttachment, setSelectedSlipForAttachment] = useState<any>(null)
  const [showChangeDateModal, setShowChangeDateModal] = useState(false)
  const [selectedSlipForDateChange, setSelectedSlipForDateChange] = useState<any>(null)
  const [showDriverHistoryModal, setShowDriverHistoryModal] = useState(false)
  const [selectedSlipForDriverHistory, setSelectedSlipForDriverHistory] = useState<any>(null)
  const [printDropdownOpen, setPrintDropdownOpen] = useState<number | null>(null)
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [selectedSlipForAddOns, setSelectedSlipForAddOns] = useState<any>(null)
  const [showCallLogModal, setShowCallLogModal] = useState(false)
  const [selectedSlipForCallLog, setSelectedSlipForCallLog] = useState<any>(null)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [selectedSlipForPrint, setSelectedSlipForPrint] = useState<any>(null)
  const [showPrintDriverTags, setShowPrintDriverTags] = useState(false)
  const [selectedSlipForDriverTags, setSelectedSlipForDriverTags] = useState<any>(null)
  const router = useRouter()
  const [selectedSlipForStatement, setSelectedSlipForStatement] = useState<any>(null)

  const { slips, loading, fetchLabSlips, fetchDriverPrintData, createCustomDeliveryDate, fetchOfficeSlips, fetchCustomDeliveryDates } = useSlipContext();
  const { fetchProductAddons } = useSlipCreation();
  const { generatePaperSlips } = useSlipCreation();

  useEffect(() => {
    fetchLabSlips(1); // Or use customer_id dynamically
  }, [fetchLabSlips]);

  const allOffices = useMemo(() => Array.from(new Set(slips.map((s) => s.officeCode))), [slips])
  const allStatuses = useMemo(() => Array.from(new Set(slips.map((s) => s.status))), [slips])
  const allLocations = useMemo(() => Array.from(new Set(slips.map((s) => s.location))), [slips])
  const allDoctors = useMemo(() => Array.from(new Set(slips.map((s) => s.doctor || "Unknown"))), [slips])
  const allUsers = useMemo(() => Array.from(new Set(slips.map((s) => s.user || "Unknown"))), [slips])
  const allProductTypes = useMemo(() => Array.from(new Set(slips.map((s) => s.productType || "Unknown"))), [slips])

  // Filtering
  const filteredSlips = useMemo(() => {
    let result = slips
    if (search) result = result.filter((s) =>
      s.patient.toLowerCase().includes(search.toLowerCase())
      || s.officeCode.toLowerCase().includes(search.toLowerCase())
      || s.product.toLowerCase().includes(search.toLowerCase())
    )
    if (office !== "All") result = result.filter((s) => s.officeCode === office)
    if (status !== "All") result = result.filter((s) => s.status === status)
    if (location !== "All") result = result.filter((s) => s.location === location)
    if (showWithAttachments) result = result.filter((s) => s.attachment)
    return result
  }, [search, office, status, location, showWithAttachments, slips])

  // Paging
  const maxPage = Math.ceil(filteredSlips.length / itemsPerPage)
  const slipsPage = filteredSlips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const allOnPageSelected = slipsPage.length && slipsPage.every((s) => selected.includes(s.id))
  const someOnPageSelected = slipsPage.some((s) => selected.includes(s.id))

  const handleSelectAllPage = () => {
    if (allOnPageSelected) {
      setSelected(selected.filter((id) => !slipsPage.map((s) => s.id).includes(id)))
    } else {
      setSelected([...selected, ...slipsPage.filter((s) => !selected.includes(s.id)).map((s) => s.id)])
    }
  }

  const handleColumnChange = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Archive Confirm
  const handleArchive = (id: number) => {
    setArchiveConfirm(id)
    setMenuRow(null)
  }
  const closeArchive = () => setArchiveConfirm(null)
  const confirmArchive = () => {
    // Implement deletion or archiving logic here
    closeArchive()
  }

  const handleAttachmentClick = (slip: any) => {
    setSelectedSlipForAttachment(slip)
    setShowAttachModal(true)
  }

  const handleAttachmentsUploaded = (attachments: any[]) => {
    // Handle the uploaded attachments if needed
    // You could update the slip data here or refresh the list
  }

  const handleDateIconClick = (slip: any) => {
    setSelectedSlipForDateChange(slip)
    setShowChangeDateModal(true)
  }

  const handleLocationIconClick = (slip: any) => {
    setSelectedSlipForDriverHistory(slip)
    setShowDriverHistoryModal(true)
  }

  const handleDateChange = async (date: string, time: string, reason: string) => {
    if (!selectedSlipForDateChange) return;
    try {
      const slipId = selectedSlipForDateChange.id;
      const res = await createCustomDeliveryDate(slipId, date, time, reason);
      if (res && res.success) {
        toast({ title: 'Saved', description: res.message || 'Custom delivery date created', duration: 3000 });
        // refresh slips for current customer
        try {
          if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const customerId = user?.customers?.[0]?.id;
            const customerType = localStorage.getItem('customerType');
            if (customerId) {
              if (customerType === 'lab') {
                void fetchLabSlips(customerId);
              } else if (customerType === 'office') {
                void fetchOfficeSlips(customerId);
              } else {
                void fetchLabSlips(customerId);
                void fetchOfficeSlips(customerId);
              }
            }
          }
        } catch (err) {
          console.error('Error refreshing slips after creating custom date:', err);
        }
      } else {
        toast({ title: 'Save failed', description: res?.message || 'Failed to save custom delivery date', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error saving custom delivery date:', err);
      toast({ title: 'Error', description: 'Unexpected error while saving', variant: 'destructive' });
    }
  }

  const handleAddOnsClick = (slip: any) => {
    if (slip?.id) {
      fetchProductAddons(slip?.id);
    }
    setSelectedSlipForAddOns(slip)
    setShowAddOnsModal(true)
  }

  const handleAddAddOns = (addOns: any[]) => {
    // You can update the slip or refresh the list here if needed
    setShowAddOnsModal(false)
  }

  const handleCallLogClick = (slip: any) => {
    setSelectedSlipForCallLog(slip)
    setShowCallLogModal(true)
  }


  // Individual print handler - opens in new window
  const handlePrintPaperSlip = async (slip: any) => {
    // Determine which ID to use based on customerType
    let customerType = 'lab';
    if (typeof window !== 'undefined') {
      const storedType = localStorage.getItem('customerType');
      if (storedType) customerType = storedType;
    }
    let idToSend: number | null = null;
    if (customerType === 'lab') {
      idToSend = (typeof slip.id === 'number' && !isNaN(slip.id)) ? slip.id : null;
    } else if (customerType === 'office') {
      idToSend = (typeof slip.caseId === 'number' && !isNaN(slip.caseId)) ? slip.caseId : null;
    } else {
      idToSend = (typeof slip.id === 'number' && !isNaN(slip.id)) ? slip.id : null;
    }
    if (idToSend === null) {
      toast({
        title: "No valid slip",
        description: "This slip does not have a valid slip ID.",
        variant: "destructive"
      });
      return;
    }
    try {
      const data = await generatePaperSlips([idToSend]);
      // API returns { paper_slips: <base64> } or { paper_slips: [<base64>] }
      if (data?.paper_slips) {
        let base64Html;
        if (Array.isArray(data.paper_slips)) {
          base64Html = data.paper_slips[0];
        } else {
          base64Html = data.paper_slips;
        }
        // Use the printPaperSlip utility to trigger print dialog
        printPaperSlip(base64Html);
      } else {
        toast({
          title: "No paper slip data returned.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to generate paper slip",
        description: err?.message || String(err),
        variant: "destructive"
      });
    }
  }

  // Function to print content directly without new window
  const openPrintWindow = (base64Html: string, slip: any) => {
    const html = atob(base64Html);
    
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);
    
    // Enhanced HTML for printing
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Slip - ${slip.patient} - ${slip.id}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            background: white;
          }
          .print-content {
            width: 100%;
          }
          @media print {
            body { 
              margin: 0; 
            }
            .print-content {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-content">
          ${html}
        </div>
      </body>
      </html>
    `;
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();
      
      // Wait for content to load then print
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Remove iframe after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  }

  // Bulk print handler - opens each slip in new window
  const handleBulkPrintPaperSlip = async () => {
    if (!selected.length) return;

    try {
      const selectedRows = slips.filter(slip => selected.includes(slip.id));


      // Only send valid slip IDs (not null/undefined/NaN)
      const slipIds = selectedRows
        .map(r => (typeof r.caseId === 'number' && !isNaN(r.caseId)) ? r.caseId : (typeof r.id === 'number' && !isNaN(r.id) ? r.id : null))
        .filter(id => typeof id === 'number' && !isNaN(id));

      if (!slipIds.length) {
        toast({
          title: "No valid slips",
          description: "Please select slips with valid slip IDs.",
          variant: "destructive",
        });
        return;
      }

      const data = await generatePaperSlips(slipIds);

      if (data?.paper_slips) {
        const arr = Array.isArray(data.paper_slips)
          ? data.paper_slips
          : [data.paper_slips];

        arr.forEach((base64Html: string, index: number) => {
          const row = selectedRows[index] || selectedRows[0];
          setTimeout(() => openPrintWindow(base64Html, row), index * 200);
        });

        toast({ title: "Paper slips generated", description: `${arr.length} slip(s) ready to print.` });
      } else {
        toast({
          title: "No paper slip data returned",
          description: "The server didn't return any printable content.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to generate paper slips",
        description: err?.message || String(err),
        variant: "destructive",
      });
    }
  };


  const handlePrintDriverLabel = (slip: any) => {
    setSelectedSlipForDriverTags(slip)
    setShowPrintDriverTags(true)
  }

  // Function to generate driver labels and open in new window
  const handleGenerateDriverLabels = async (slip: any, selectedSlots: boolean[]) => {
    // Create driver label content based on selected slots
    const selectedSlotIndices = selectedSlots
      .map((selected, index) => selected ? index : -1)
      .filter(index => index !== -1);
    
    if (selectedSlotIndices.length === 0) {
      alert('Please select at least one slot to generate labels.');
      return;
    }

    try {
      // Fetch driver print data from API
      const driverPrintData = await fetchDriverPrintData([slip.id]);
      
      if (!driverPrintData || !driverPrintData.slips.length) {
        alert('Failed to fetch driver print data.');
        return;
      }

      // Use the API data for printing
      openDriverLabelsWindow(driverPrintData.slips[0], selectedSlotIndices);
    } catch (error) {
      console.error('Error generating driver labels:', error);
      alert('Failed to generate driver labels.');
    }
  }

  // Function to handle regular print (all slots)
  const handleRegularDriverPrint = async (slip: any, allSlots: boolean[]) => {
    const selectedSlotIndices = allSlots.map((v, i) => v ? i : -1).filter(i => i !== -1);
    
    if (selectedSlotIndices.length === 0) {
      alert('No slots available for printing.');
      return;
    }

    try {
      // Fetch driver print data from API
      const driverPrintData = await fetchDriverPrintData([slip.id]);
      
      if (!driverPrintData || !driverPrintData.slips.length) {
        alert('Failed to fetch driver print data.');
        return;
      }

      // Use the API data for printing
      openDriverLabelsWindow(driverPrintData.slips[0], selectedSlotIndices);
    } catch (error) {
      console.error('Error printing driver labels:', error);
      alert('Failed to print driver labels.');
    }
  }

  // Function to handle bulk driver print
  const handleBulkDriverPrint = async () => {
    if (!selected.length) {
      alert('Please select slips to print.');
      return;
    }

    try {
      // Fetch driver print data for all selected slips
      const driverPrintData = await fetchDriverPrintData(selected);
      
      if (!driverPrintData || !driverPrintData.slips.length) {
        alert('Failed to fetch driver print data.');
        return;
      }

      // Generate all 8 slots for each slip
      const allSlots = Array.from({ length: 8 }, (_, i) => i);
      
      // Print each slip with a small delay between them
      driverPrintData.slips.forEach((driverSlip, index) => {
        setTimeout(() => {
          openDriverLabelsWindow(driverSlip, allSlots);
        }, index * 500); // 500ms delay between each slip
      });
    } catch (error) {
      console.error('Error bulk printing driver labels:', error);
      alert('Failed to bulk print driver labels.');
    }
  }

  // Function to print driver labels directly without new window
  const openDriverLabelsWindow = (driverSlip: any, selectedSlots: number[]) => {

    // Generate label content for each selected slot using QR codes from API
    const labelContent = selectedSlots.map((slotIndex) => {
      return `
      <div class="driver-label" style="
        width: 4in; 
        height: 2.5in; 
        border: 2px solid #000; 
        margin: 10px; 
        padding: 15px; 
        page-break-after: always;
        font-family: Arial, sans-serif;
        position: relative;
        background: white;
        display: inline-block;
      ">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div style="flex: 1;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${driverSlip.lab_name || 'HMC INNOVS LLC'}</div>
            <div style="font-size: 12px; margin-bottom: 2px;"><strong>OFC:</strong> ${driverSlip.office_code || 'HMD'}</div>
            <div style="font-size: 12px; margin-bottom: 2px;"><strong>PT:</strong> ${driverSlip.pt_name || 'Mary Gutierrez'}</div>
            <div style="font-size: 12px;"><strong>DR:</strong> ${driverSlip.doctor_name || 'Cody Mugglestone'}</div>
          </div>
          <div style="width: 60px; height: 60px; border: 1px solid #000; display: flex; align-items: center; justify-content: center;">
            <img src="${driverSlip.qr_code || ''}" style="width: 58px; height: 58px; object-fit: contain;" alt="QR Code" />
          </div>
        </div>
        
        <div style="margin-top: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="font-size: 12px;"><strong>Stage:</strong> ${driverSlip.stage_code || 'FR'}-${driverSlip.stage_name || 'SC-FD-BB'}</span>
            <span style="font-size: 12px;"><strong>PAN #:</strong> ${driverSlip.case_pan_number || '0080'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="font-size: 12px;"><strong>PKU:</strong> ${driverSlip.pickup_date ? new Date(driverSlip.pickup_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '01/08/2025'}</span>
            <span style="font-size: 12px;"><strong>CASE #:</strong> ${driverSlip.case_number || 'C0123546'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 12px;"><strong>DEL:</strong> ${driverSlip.delivery_date ? new Date(driverSlip.delivery_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' @ ' + (driverSlip.delivery_time || '4pm') : '01/25/2025 @ 4pm'}</span>
            <span style="font-size: 12px;"><strong>SLIP #:</strong> ${driverSlip.slip_number || '01234568'}</span>
          </div>
        </div>
        
        <div style="position: absolute; bottom: 5px; right: 5px; font-size: 10px; color: #666;">
          Slot ${slotIndex + 1}
        </div>
      </div>
    `}).join('');

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);

    const labelsHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Driver Tags</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            background: white;
          }
          .labels-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(4, 1fr);
            gap: 15px;
            width: 100%;
            max-width: 8.5in;
            margin: 0 auto;
            page-break-inside: avoid;
          }
          .driver-label {
            width: 100%;
            height: 240px;
            border: 2px solid #000;
            padding: 12px;
            font-family: Arial, sans-serif;
            position: relative;
            background: white;
            display: block;
            box-sizing: border-box;
          }
          .empty-slot {
            background: transparent;
            border: none;
            visibility: hidden;
          }
          @media print {
            body { 
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .labels-grid {
              width: 100%;
              max-width: none;
              gap: 15px;
            }
            .driver-label {
              page-break-inside: avoid;
              height: 240px;
            }
          }
          .qr-code {
            width: 58px !important;
            height: 58px !important;
          }
        </style>
      </head>
      <body>
        <div class="labels-grid">
          ${Array.from({ length: 8 }, (_, index) => {
            if (selectedSlots.includes(index)) {
              return `
                <div class="driver-label">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="flex: 1;">
                      <div style="font-weight: bold; font-size: 14px; margin-bottom: 3px;">${driverSlip.lab_name || 'HMC innovs LLC'}</div>
                      <div style="font-size: 11px; margin-bottom: 1px;"><strong>OFC:</strong> ${driverSlip.office_code || '4MD00001'}</div>
                      <div style="font-size: 11px; margin-bottom: 1px;"><strong>PT:</strong> ${driverSlip.pt_name || 'Gilbert TUazon'}</div>
                      <div style="font-size: 11px;"><strong>DR:</strong> ${driverSlip.doctor_name || 'Michael Chen'}</div>
                    </div>
                    <div style="width: 60px; height: 60px; border: 1px solid #000; display: flex; align-items: center; justify-content: center;">
                      <img src="${driverSlip.qr_code || ''}" style="width: 58px; height: 58px; object-fit: contain;" alt="QR Code" />
                    </div>
                  </div>
                  
                  <div style="border-top: 1px solid #ccc; padding-top: 6px; margin-top: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                      <span style="font-size: 11px;"><strong>Stage:</strong> ${driverSlip.stage_code || 'BTI'}-${driverSlip.stage_name || 'Bisque/Try In'}</span>
                      <span style="font-size: 11px;"><strong>PAN #:</strong> ${driverSlip.case_pan_number || '001'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                      <span style="font-size: 11px;"><strong>PKU:</strong> ${driverSlip.pickup_date ? new Date(driverSlip.pickup_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '08/13/2025'}</span>
                      <span style="font-size: 11px;"><strong>CASE #:</strong> ${driverSlip.case_number || 'C00001'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 11px;"><strong>DEL:</strong> ${driverSlip.delivery_date ? new Date(driverSlip.delivery_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' @ ' + (driverSlip.delivery_time || '17:00') : '08/14/2025 @ 17:00'}</span>
                      <span style="font-size: 11px;"><strong>SLIP #:</strong> ${driverSlip.slip_number || 'C00001-S01'}</span>
                    </div>
                  </div>
                </div>
              `;
            } else {
              return '<div class="empty-slot"></div>';
            }
          }).join('')}
        </div>

        <script>
          // Auto-print after content loads
          setTimeout(() => {
            window.focus();
            window.print();
          }, 500); // Reduced delay since we don't need to generate QR codes
        </script>
      </body>
      </html>
    `;
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(labelsHtml);
      iframeDoc.close();
      // No extra print call here; print is triggered only from inside the iframe's script
      // Remove iframe after a delay to allow print dialog to finish (optional, or can be handled in iframe script)
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    }
  }

  const handlePrintStatement = (slip: any) => {
    setSelectedSlipForStatement(slip)
    // Direct print preview like driver tags
    openStatementPrintWindow(slip)
  }

  // Function to generate statement and open print preview directly
  const openStatementPrintWindow = (slip: any) => {
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);

    // Use real slip data and create rows for each product
    const statementCases = slip.products?.map((product: any) => ({
      patient: slip.case?.patient_name || 'N/A',
      ul: product.type?.charAt(0) || 'U', // U for Upper, L for Lower
      product: product.name || 'Lab Service',
      grade: slip.casepan?.name || 'Regular', // Using casepan name as grade
      stage: 'Finish', // Default stage, could be dynamic based on status
      total: 75, // Default price, should come from product pricing
      addOn: '-',
      qty: '1',
      totalRt: '-',
      rt: '-',
      dueDate: slip.delivery_date?.final_date ? new Date(slip.delivery_date.final_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A',
      finalTotal: 75 // Default total, should be calculated
    })) || [
      {
        patient: slip.case?.patient_name || 'N/A',
        ul: 'U',
        product: 'Lab Service',
        grade: slip.casepan?.name || 'Regular',
        stage: 'Finish',
        total: 75,
        addOn: '-',
        qty: '1',
        totalRt: '-',
        rt: '-',
        dueDate: slip.delivery_date?.final_date ? new Date(slip.delivery_date.final_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A',
        finalTotal: 75
      }
    ];

    // Calculate totals
    const subtotal = statementCases.reduce((sum: number, caseItem: any) => sum + caseItem.finalTotal, 0);
    const refund = 0; // Could be dynamic based on business logic
    const grandTotal = subtotal + refund;

    // Generate statement HTML content matching the provided format
    const statementHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Statement - No. ${slip.slip_number || slip.id} - Date: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            background: white;
            color: #000;
            font-size: 11px;
          }
          .statement-container {
            max-width: 8.5in;
            margin: 0 auto;
            background: white;
            padding: 20px;
          }
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }
          .company-logo {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo-placeholder {
            width: 80px;
            height: 40px;
            background: linear-gradient(45deg, #4CAF50, #2196F3, #FF9800);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
          }
          .company-info {
            margin-left: 10px;
          }
          .company-name {
            font-weight: bold;
            font-size: 12px;
          }
          .company-address {
            font-size: 10px;
            color: #666;
          }
          .statement-header {
            text-align: right;
          }
          .statement-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .statement-number {
            font-size: 11px;
            margin-bottom: 2px;
          }
          .statement-date {
            font-size: 11px;
          }
          .customer-info {
            margin: 20px 0;
            padding: 10px;
            border: 1px solid #ccc;
          }
          .customer-name {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 5px;
          }
          .customer-address {
            font-size: 10px;
            line-height: 1.3;
          }
          .statement-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 9px;
          }
          .statement-table th {
            background-color: #f5f5f5;
            border: 1px solid #000;
            padding: 4px 2px;
            text-align: center;
            font-weight: bold;
            font-size: 8px;
          }
          .statement-table td {
            border: 1px solid #000;
            padding: 4px 2px;
            text-align: center;
            vertical-align: middle;
          }
          .patient-cell {
            text-align: left !important;
            font-size: 8px;
            width: 120px;
          }
          .product-cell {
            text-align: left !important;
            font-size: 8px;
            width: 100px;
          }
          .stage-cell {
            text-align: left !important;
            font-size: 8px;
            width: 120px;
          }
          .grade-cell {
            font-size: 8px;
            width: 50px;
          }
          .total-cell {
            font-weight: bold;
            width: 40px;
          }
          .date-cell {
            font-size: 8px;
            width: 60px;
          }
          .small-cell {
            width: 25px;
          }
          .totals-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 20px;
          }
          .patient-summary {
            font-size: 11px;
            font-weight: bold;
          }
          .financial-totals {
            text-align: right;
            font-size: 11px;
          }
          .total-line {
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
            width: 150px;
          }
          .grand-total {
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          @media print {
            body { 
              margin: 0;
              padding: 15px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .statement-container {
              width: 100%;
              max-width: none;
              padding: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="statement-container">
          <!-- Header Section -->
          <div class="header-section">
            <div class="company-logo">
              <div class="logo-placeholder">INNOVS</div>
              <div class="company-info">
                <div class="company-name">HMC INNOVS</div>
                <div class="company-address">3180 W. Sahara Ave C26, 89102</div>
              </div>
            </div>
            <div class="statement-header">
              <div class="statement-title">Statement</div>
              <div class="statement-number">No. ${slip.slip_number || slip.id}</div>
              <div class="statement-date">Date: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</div>
            </div>
          </div>

          <!-- Customer Information -->
          <div class="customer-info">
            <div class="customer-name">${slip.office?.name || 'Dental Office'}</div>
            <div class="customer-address">
              ${slip.office?.code || ''}<br>
              Office Location
            </div>
          </div>

          <!-- Statement Table -->
          <table class="statement-table">
            <thead>
              <tr>
                <th class="patient-cell">Patient</th>
                <th class="small-cell">UL</th>
                <th class="product-cell">Product</th>
                <th class="grade-cell">Grade</th>
                <th class="stage-cell">Stage</th>
                <th class="total-cell">Total</th>
                <th class="small-cell">Add On</th>
                <th class="small-cell">Qty</th>
                <th class="small-cell">Total</th>
                <th class="small-cell">Rt.</th>
                <th class="date-cell">Due Date</th>
                <th class="total-cell">Total</th>
              </tr>
            </thead>
            <tbody>
              ${statementCases.map((caseItem: any) => `
                <tr>
                  <td class="patient-cell">${caseItem.patient}</td>
                  <td class="small-cell">${caseItem.ul}</td>
                  <td class="product-cell">${caseItem.product}</td>
                  <td class="grade-cell">${caseItem.grade}</td>
                  <td class="stage-cell">${caseItem.stage}</td>
                  <td class="total-cell">$${caseItem.total}</td>
                  <td class="small-cell">${caseItem.addOn}</td>
                  <td class="small-cell">${caseItem.qty}</td>
                  <td class="small-cell">${caseItem.totalRt}</td>
                  <td class="small-cell">${caseItem.rt}</td>
                  <td class="date-cell">${caseItem.dueDate}</td>
                  <td class="total-cell">$${caseItem.finalTotal}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals Section -->
          <div class="totals-section">
            <div class="patient-summary">
              ${slip.case?.patient_name || 'Patient'} - Dr. ${slip.case?.doctor?.name || 'Unknown'}
            </div>
            <div class="financial-totals">
              <div class="total-line">
                <span>Total</span>
                <span>$${subtotal}</span>
              </div>
              ${refund > 0 ? `
              <div class="total-line">
                <span>Refund</span>
                <span>$${refund}</span>
              </div>
              ` : ''}
              <div class="total-line grand-total">
                <span>Total</span>
                <span><strong>$${grandTotal}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <script>
          // Auto-print after content loads
          setTimeout(() => {
            window.focus();
            window.print();
          }, 500);
        </script>
      </body>
      </html>
    `;
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(statementHtml);
      iframeDoc.close();
      
      // Remove iframe after printing
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    }
  }

  const handleRowClick = (slip: any, event: React.MouseEvent) => {
    // Don't navigate if clicked on a button, icon, or interactive element
    const target = event.target as HTMLElement
    const isInteractiveElement = target.closest('button, a, svg, input, [role="button"]')
    
    if (!isInteractiveElement) {
      // Navigate to virtual slip page
      window.open(`/virtual-slip/${slip.id}`, '_blank')
    }
  }

  const getChangeDateHistory = (slipId: number) => {
    return [
      {
        id: 1,
        user: "John Smith",
        date: "2024-01-15 10:30 AM",
        oldDate: "2024-01-20",
        newDate: "2024-01-25",
        reason: "Patient requested schedule change due to vacation"
      },
      {
        id: 2,
        user: "Jane Doe",
        date: "2024-01-10 2:15 PM",
        oldDate: "2024-01-18",
        newDate: "2024-01-20",
        reason: "Lab scheduling conflict, moved to accommodate rush order"
      }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HIPAA Compliance Banner */}
      <div className="px-4 py-2">
        <HIPAAComplianceBanner variant="default" showDetails={false} />
      </div>

      <div className="w-full px-4 py-8">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center mb-4 rounded-lg bg-white shadow-sm px-4 py-3">
          <Input
            className="w-72 bg-white border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
            placeholder="Search by patient, office, doctor, case..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select value={office} onValueChange={setOffice}>
            <SelectTrigger className="w-40 bg-white border-gray-300">
              <SelectValue placeholder="All offices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All offices</SelectItem>
              {allOffices.filter(o => o).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40 bg-white border-gray-300">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All status</SelectItem>
              {allStatuses.filter(s => s).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-40 bg-white border-gray-300">
              <SelectValue placeholder="All location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All location</SelectItem>
              {allLocations.filter(l => l).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="flex items-center gap-2 text-gray-700 border-gray-300"
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          >
            <Filter className="h-4 w-4" /> Advance Filter
          </Button>
          <Button variant="outline" className="flex items-center gap-2 text-gray-700 border-gray-300">
            <Columns className="h-4 w-4" />
            <Popover open={showColumnsDialog} onOpenChange={setShowColumnsDialog}>
              <PopoverTrigger asChild>
                <span>Columns</span>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 border border-gray-200 rounded-lg shadow-lg">
                <div className="p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">Show/Hide Columns</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(visibleColumns).map(([key, val]) => {
                      const labels = {
                        timestamp: "Time Stamp",
                        office: "Office Code",
                        patient: "Patient",
                        caseNumber: "Case Number",
                        pan: "Pan",
                        product: "Product",
                        status: "Status",
                        location: "Location",
                        attachment: "Attachment",
                        due: "Due Date",
                        actions: "Actions"
                      }
                      const isRequired = key === 'actions' || key === 'office' || key === 'patient' || key === 'pan'
                      return (
                        <label key={key} className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={val}
                              onCheckedChange={() => handleColumnChange(key as keyof typeof visibleColumns)}
                              disabled={isRequired}
                              className="border-gray-400"
                              style={{
                                accentColor: val ? "#1162A8" : "#fff",
                                borderColor: "#1162A8",
                                backgroundColor: val ? "#1162A8" : "transparent"
                              }}
                            />
                            <span className="text-sm text-gray-700">{labels[key as keyof typeof labels]}</span>
                          </div>
                          {isRequired && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Required</span>
                          )}
                        </label>
                      )
                    })}
                    <div className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-200">
                      Settings saved automatically
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </Button>
        </div>

        {/* Advanced Filter Section */}
        {showAdvancedFilter && (
          <div className="rounded-lg bg-white shadow-sm px-4 py-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700"
                onClick={() => {
                  setDateRange({})
                  setPatientSearch("")
                  setProductType("All")
                  setDoctorFilter("All")
                  setUserFilter("All")
                }}
              >
                Clear all Filters
              </Button>
            </div>

            {/* First Row */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal text-xs"
                    >
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      {dateRange.start ? (
                        format(dateRange.start, "PPP")
                      ) : (
                        <span className="text-gray-500">Start Date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.start}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal text-xs"
                    >
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      {dateRange.end ? (
                        format(dateRange.end, "PPP")
                      ) : (
                        <span className="text-gray-500">End Date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.end}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                      disabled={(date) =>
                        date > new Date() ||
                        date < new Date("1900-01-01") ||
                        (dateRange.start && date < dateRange.start)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Input
                placeholder="Search patient name, slip #..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="text-xs"
              />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  {allStatuses.filter(s => s).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={office} onValueChange={setOffice}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Offices/Lab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Offices/Lab</SelectItem>
                  {allOffices.filter(o => o).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All users</SelectItem>
                  {allUsers.filter(u => u).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All product type</SelectItem>
                  {allProductTypes.filter(p => p).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value="All Stages" onValueChange={() => { }}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Stages</SelectItem>
                </SelectContent>
              </Select>
              <Select value="All Doctors" onValueChange={setDoctorFilter}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Doctors</SelectItem>
                  {allDoctors.filter(d => d).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value="All Office & Lab" onValueChange={() => { }}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Office & Lab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Office & Lab</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Third Row - Toggles */}
            <div className="flex items-center gap-6 mt-3">
              <Select value="All Location" onValueChange={setLocation}>
                <SelectTrigger className="w-40 text-xs">
                  <SelectValue placeholder="All Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Location</SelectItem>
                  {allLocations.filter(l => l).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-xs">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showWithAttachments}
                    onChange={(e) => setShowWithAttachments(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${showWithAttachments ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${showWithAttachments ? 'translate-x-5' : 'translate-x-0.5'} translate-y-0.5`}></div>
                  </div>
                </div>
                Show only cases with attachments
              </label>
              <label className="flex items-center gap-2 text-xs">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showLabConnect}
                    onChange={(e) => setShowLabConnect(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${showLabConnect ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${showLabConnect ? 'translate-x-5' : 'translate-x-0.5'} translate-y-0.5`}></div>
                  </div>
                </div>
                Show only Lab Connect cases
              </label>
            </div>
          </div>
        )}

        {/* Move Pagination to Top */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1}
            -
            {Math.min(currentPage * itemsPerPage, filteredSlips.length)}
            {" "}of {filteredSlips.length} entries
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600 mr-2">Show</span>
            <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
              <SelectTrigger className="w-20 bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600 ml-2 mr-4">entries</span>
            <Button variant="outline" size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-gray-300">
              Prev
            </Button>
            <span className="text-sm text-gray-600 mx-2">{currentPage} / {maxPage || 1}</span>
            <Button variant="outline" size="sm"
              onClick={() => setCurrentPage(Math.min(maxPage, currentPage + 1))}
              disabled={currentPage === maxPage}
              className="border-gray-300">
              Next
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selected.length > 0 && (
          <div className="sticky top-20 z-20 flex flex-wrap gap-2 items-center px-4 py-3 mb-2 rounded-lg bg-blue-50 border border-blue-200 animate-fade-in">
            <span className="font-semibold text-blue-700 mr-3">Bulk actions:</span>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><Check className="h-4 w-4" />Pick up</Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100" onClick={handleBulkDriverPrint}>Print Driver label</Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100" onClick={handleBulkPrintPaperSlip}>Print Paper slip</Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100">Print Statement</Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><Plus className="h-4 w-4" />Send back to office</Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><ChevronDown className="h-4 w-4" />Rush case</Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-red-600 hover:bg-red-50" onClick={() => setArchiveConfirm(-1)}><Trash2 className="h-4 w-4" />Archive case</Button>
          </div>
        )}

        {/* Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 w-12 whitespace-nowrap">
                  <Checkbox
                    checked={allOnPageSelected}
                    indeterminate={!allOnPageSelected && someOnPageSelected}
                    onCheckedChange={handleSelectAllPage}
                    aria-label="Select all"
                    className="border-gray-400"
                    style={{
                      accentColor: allOnPageSelected ? "#1162A8" : "#fff",
                      borderColor: "#1162A8",
                      backgroundColor: allOnPageSelected ? "#1162A8" : "transparent"
                    }}
                  />
                </th>
                {visibleColumns.timestamp && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Timestamp</th>}
                {visibleColumns.office && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Office Code</th>}
                {visibleColumns.patient && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Patient</th>}
                {visibleColumns.caseNumber && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Case Number</th>}
                {visibleColumns.pan && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Pan</th>}
                {visibleColumns.product && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Product</th>}
                {visibleColumns.status && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Status</th>}
                {visibleColumns.location && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Location</th>}
                {visibleColumns.attachment && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Attachment</th>}
                {visibleColumns.due && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Due date</th>}
                {visibleColumns.actions && <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                // Skeleton loading rows
                Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Skeleton className="h-4 w-4" />
                    </td>
                    {visibleColumns.timestamp && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Skeleton className="h-4 w-32" />
                      </td>
                    )}
                    {visibleColumns.office && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    )}
                    {visibleColumns.patient && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Skeleton className="h-4 w-32" />
                      </td>
                    )}
                    {visibleColumns.caseNumber && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    )}
                    {visibleColumns.pan && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Skeleton className="h-5 w-12 rounded" />
                      </td>
                    )}
                    {visibleColumns.product && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Skeleton className="h-4 w-40" />
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                    )}
                    {visibleColumns.location && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Skeleton className="h-4 w-48" />
                      </td>
                    )}
                    {visibleColumns.attachment && (
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <Skeleton className="h-4 w-4 mx-auto" />
                      </td>
                    )}
                    {visibleColumns.due && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Skeleton className="h-4 w-28" />
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-7 w-7 rounded" />
                          <Skeleton className="h-7 w-7 rounded" />
                          <Skeleton className="h-7 w-7 rounded" />
                          <Skeleton className="h-7 w-7 rounded" />
                          <Skeleton className="h-7 w-7 rounded" />
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : slipsPage.length === 0 ? (
                <tr>
                  <td 
                    colSpan={
                      1 + // checkbox column
                      (visibleColumns.timestamp ? 1 : 0) +
                      (visibleColumns.office ? 1 : 0) +
                      (visibleColumns.patient ? 1 : 0) +
                      (visibleColumns.caseNumber ? 1 : 0) +
                      (visibleColumns.pan ? 1 : 0) +
                      (visibleColumns.product ? 1 : 0) +
                      (visibleColumns.status ? 1 : 0) +
                      (visibleColumns.location ? 1 : 0) +
                      (visibleColumns.attachment ? 1 : 0) +
                      (visibleColumns.due ? 1 : 0) +
                      (visibleColumns.actions ? 1 : 0)
                    } 
                    className="py-8 text-center text-gray-500"
                  >
                    No slips found for selected filters.
                  </td>
                </tr>
              ) : (
                slipsPage.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`transition-all duration-150 cursor-pointer ${selected.includes(row.id)
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : "hover:bg-gray-50"}`}
                    onClick={(e) => handleRowClick(row, e)}
                    title="Click to view virtual slip"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Checkbox
                        checked={selected.includes(row.id)}
                        onCheckedChange={() =>
                          setSelected(selected.includes(row.id)
                            ? selected.filter(id => id !== row.id)
                            : [...selected, row.id])
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="border-gray-400"
                        style={{
                          accentColor: selected.includes(row.id) ? "#1162A8" : "#fff",
                          borderColor: "#1162A8",
                          backgroundColor: selected.includes(row.id) ? "#1162A8" : "transparent"
                        }}
                      />
                    </td>
                    {visibleColumns.timestamp && <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      <span className="inline-flex items-center gap-1.5 text-black">
                        <svg width="18" height="19" viewBox="0 0 22 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                          <path d="M8.21875 3.70044H4.71875C3.75225 3.70044 2.96875 4.52125 2.96875 5.53377V9.20044C2.96875 10.213 3.75225 11.0338 4.71875 11.0338H8.21875C9.18525 11.0338 9.96875 10.213 9.96875 9.20044V5.53377C9.96875 4.52125 9.18525 3.70044 8.21875 3.70044Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.46875 11.0337V14.7004C6.46875 15.1866 6.65312 15.6529 6.98131 15.9967C7.3095 16.3405 7.75462 16.5337 8.21875 16.5337H11.7188" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M16.9688 12.8672H13.4688C12.5023 12.8672 11.7188 13.688 11.7188 14.7005V18.3672C11.7188 19.3797 12.5023 20.2005 13.4688 20.2005H16.9688C17.9352 20.2005 18.7188 19.3797 18.7188 18.3672V14.7005C18.7188 13.688 17.9352 12.8672 16.9688 12.8672Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-xs">{row.createdAt}</span>
                      </span>
                    </td>}
                    {visibleColumns.office && <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900 text-xs">{row.officeCode}</td>}
                    {visibleColumns.patient && <td className="px-3 py-2 whitespace-nowrap text-gray-900 text-xs">{row.patient}</td>}
                    {visibleColumns.caseNumber && <td className="px-3 py-2 whitespace-nowrap text-gray-900 font-mono text-xs">{row.caseNumber || '-'}</td>}
                    {visibleColumns.pan &&
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`inline-block w-12 text-center py-0.5 rounded text-white font-mono text-xs`}
                          style={row.panColorStyle}
                        >
                          {row.pan}
                        </span>
                      </td>}
                    {visibleColumns.product && <td className="px-3 py-2 whitespace-nowrap text-gray-900 text-xs">{row.product}</td>}
                    {visibleColumns.status &&
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex gap-1.5 items-center">
                          {row.rush && (
                            <Badge className="!rounded-md bg-red-600 text-white font-medium px-1.5 py-0.5 text-xs flex items-center gap-0.5 border-0">
                              <svg width="8" height="10" viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                                <path d="M8.15625 7.91504V2.66504L2.53125 10.915H6.90625L6.90625 16.165L12.5313 7.91504L8.15625 7.91504Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Rush
                            </Badge>
                          )}
                          {row.status === "In Progress" && (
                            <Badge className="!rounded-md bg-green-100 text-green-800 border border-green-200 font-medium px-1.5 py-0.5 text-xs whitespace-nowrap">In Progress</Badge>
                          )}
                          {row.status === "On Hold" && (
                            <Badge className="!rounded-md bg-yellow-100 text-yellow-800 border border-yellow-200 font-medium px-1.5 py-0.5 text-xs whitespace-nowrap">On Hold</Badge>
                          )}
                          {row.status === "Cancelled" && (
                            <Badge className="!rounded-md bg-gray-100 text-gray-600 border border-gray-200 font-medium px-1.5 py-0.5 text-xs whitespace-nowrap">Cancelled</Badge>
                          )}
                          {row.status === "Draft" && (
                            <Badge className="!rounded-md bg-gray-100 text-gray-600 border border-gray-200 font-medium px-1.5 py-0.5 text-xs whitespace-nowrap">Draft</Badge>
                          )}
                        </div>
                      </td>}
                    {visibleColumns.location &&
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.location.includes("In office ready to pickup") && (
                          <span className="inline-flex items-center gap-1.5 text-green-700">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLocationIconClick(row)
                              }}
                              className="hover:bg-gray-100 p-0.5 rounded transition-colors flex-shrink-0"
                              title="View driver history"
                            >
                              <svg width="18" height="26" viewBox="0 0 22 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_4629_90148)">
                                <path d="M8.30289 6.72046H2.50289C1.5143 6.72046 0.712891 7.52187 0.712891 8.51046V15.4605C0.712891 16.449 1.5143 17.2505 2.50289 17.2505H8.30289C9.29148 17.2505 10.0929 16.449 10.0929 15.4605V8.51046C10.0929 7.52187 9.29148 6.72046 8.30289 6.72046Z" stroke="#119933" strokeMiterlimit="10"/>
                                <path d="M5.40359 17.7905L1.68359 22.1805H9.13359L5.40359 17.7905Z" stroke="#119933" strokeMiterlimit="10"/>
                                <path d="M5.40234 22.1804V31.0404" stroke="#119933" strokeMiterlimit="10"/>
                                <path d="M17.7737 6.31044C19.2539 6.31044 20.4537 5.11056 20.4537 3.63044C20.4537 2.15032 19.2539 0.950439 17.7737 0.950439C16.2936 0.950439 15.0938 2.15032 15.0938 3.63044C15.0938 5.11056 16.2936 6.31044 17.7737 6.31044Z" stroke="#119933" strokeMiterlimit="10"/>
                                <path d="M12.0523 14.4405L17.2023 8.48047H18.6823C19.0723 8.48047 19.4323 8.67047 19.6923 9.00047L20.3923 9.90047C20.6623 10.2505 20.8123 10.6805 20.8123 11.1205V18.5605L15.3523 24.6505V28.3905C15.3523 29.1605 15.1423 29.9305 14.6923 30.5205C14.6123 30.6205 14.5423 30.7005 14.4823 30.7405C14.2023 30.9205 13.4923 30.8805 13.1923 30.7405C13.1323 30.7105 13.0523 30.6505 12.9623 30.5705C12.4623 30.0905 12.2023 29.3705 12.2023 28.6305V24.8705L17.0523 18.7805L16.8623 13.8405L13.8723 17.4105H5.40234" stroke="#119933" strokeMiterlimit="10"/>
                                <path d="M21.2234 20.8206V28.0306C21.2234 28.8006 21.0534 29.5706 20.6934 30.1606C20.6334 30.2606 20.5734 30.3406 20.5234 30.3806C20.3034 30.5606 19.7234 30.5206 19.4834 30.3806C19.4334 30.3506 19.3734 30.2906 19.3034 30.2106C18.9034 29.7306 18.6934 29.0106 18.6934 28.2706V24.5106" stroke="#119933" strokeMiterlimit="10"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_4629_90148">
                                <rect width="21.51" height="30.91" fill="white" transform="translate(0.212891 0.450439)"/>
                                </clipPath>
                                </defs>
                                </svg>

                            </button>
                            <span className="text-xs">{row.location}</span>
                          </span>
                        )}
                        {row.location.includes("On route to the lab") && (
                          <span className="inline-flex items-center gap-1.5 text-red-600">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLocationIconClick(row)
                              }}
                              className="hover:bg-gray-100 p-0.5 rounded transition-colors flex-shrink-0"
                              title="View driver history"
                            >
                              <svg width="18" height="26" viewBox="0 0 23 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="cursor-pointer">
                                <path d="M8.84977 18.0735H3.04977C2.06118 18.0735 1.25977 18.8749 1.25977 19.8635V26.8135C1.25977 27.8021 2.06118 28.6035 3.04977 28.6035H8.84977C9.83836 28.6035 10.6398 27.8021 10.6398 26.8135V19.8635C10.6398 18.8749 9.83836 18.0735 8.84977 18.0735Z" stroke="#CF0202" strokeMiterlimit="10" />
                                <path d="M5.95383 17.3179L9.67383 12.9279L2.22383 12.9279L5.95383 17.3179Z" stroke="#CF0202" strokeMiterlimit="10" />
                                <path d="M5.95312 12.928L5.95312 4.06798" stroke="#CF0202" strokeMiterlimit="10" />
                                <path d="M18.3206 6.74794C19.8007 6.74794 21.0006 5.54806 21.0006 4.06794C21.0006 2.58782 19.8007 1.38794 18.3206 1.38794C16.8405 1.38794 15.6406 2.58782 15.6406 4.06794C15.6406 5.54806 16.8405 6.74794 18.3206 6.74794Z" stroke="#CF0202" strokeMiterlimit="10" />
                                <path d="M12.5992 14.878L17.7492 8.91797H19.2292C19.6192 8.91797 19.9792 9.10797 20.2392 9.43797L20.9392 10.338C21.2092 10.688 21.3592 11.118 21.3592 11.558V18.998L15.8992 25.088V28.828C15.8992 29.598 15.6892 30.368 15.2392 30.958C15.1592 31.058 15.0892 31.138 15.0292 31.178C14.7492 31.358 14.0392 31.318 13.7392 31.178C13.6792 31.148 13.5992 31.088 13.5092 31.008C13.0092 30.528 12.7492 29.808 12.7492 29.068V25.308L17.5992 19.218L17.4092 14.278L14.4192 17.848H5.94922" stroke="#CF0202" strokeMiterlimit="10" />
                                <path d="M21.7702 21.2581V28.4681C21.7702 29.2381 21.6002 30.0081 21.2402 30.5981C21.1802 30.6981 21.1202 30.7781 21.0702 30.8181C20.8502 30.9981 20.2702 30.9581 20.0302 30.8181C19.9802 30.7881 19.9202 30.7281 19.8502 30.6481C19.4502 30.1681 19.2402 29.4481 19.2402 28.7081V24.9481" stroke="#CF0202" strokeMiterlimit="10" />
                              </svg>
                            </button>
                            <span className="text-xs">{row.location}</span>
                          </span>
                        )}
                        {row.location.includes("In lab") && (
                          <span className="inline-flex items-center gap-1.5 text-red-600">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLocationIconClick(row)
                              }}
                              className="hover:bg-gray-100 p-0.5 rounded transition-colors flex-shrink-0"
                              title="View driver history"
                            >
                              <svg width="18" height="26" viewBox="0 0 23 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="cursor-pointer">
                                <path d="M8.84977 18.0735H3.04977C2.06118 18.0735 1.25977 18.8749 1.25977 19.8635V26.8135C1.25977 27.8021 2.06118 28.6035 3.04977 28.6035H8.84977C9.83836 28.6035 10.6398 27.8021 10.6398 26.8135V19.8635C10.6398 18.8749 9.83836 18.0735 8.84977 18.0735Z" stroke="#CF0202" strokeMiterlimit="10" />
                                <path d="M5.95383 17.3179L9.67383 12.9279L2.22383 12.9279L5.95383 17.3179Z" stroke="#CF0202" strokeMiterlimit="10" />
                                <path d="M5.95312 12.928L5.95312 4.06798" stroke="#CF0202" strokeMiterlimit="10" />
                                <path d="M18.3206 6.74794C19.8007 6.74794 21.0006 5.54806 21.0006 4.06794C21.0006 2.58782 19.8007 1.38794 18.3206 1.38794C16.8405 1.38794 15.6406 2.58782 15.6406 4.06794C15.6406 5.54806 16.8405 6.74794 18.3206 6.74794Z" stroke="#CF0202" strokeMiterlimit="10" />
                                <path d="M12.5992 14.878L17.7492 8.91797H19.2292C19.6192 8.91797 19.9792 9.10797 20.2392 9.43797L20.9392 10.338C21.2092 10.688 21.3592 11.118 21.3592 11.558V18.998L15.8992 25.088V28.828C15.8992 29.598 15.6892 30.368 15.2392 30.958C15.1592 31.058 15.0892 31.138 15.0292 31.178C14.7492 31.358 14.0392 31.318 13.7392 31.178C13.6792 31.148 13.5992 31.088 13.5092 31.008C13.0092 30.528 12.7492 29.808 12.7492 29.068V25.308L17.5992 19.218L17.4092 14.278L14.4192 17.848H5.94922" stroke="#CF0202" strokeMiterlimit="10" />
                                <path d="M21.7702 21.2581V28.4681C21.7702 29.2381 21.6002 30.0081 21.2402 30.5981C21.1802 30.6981 21.1202 30.7781 21.0702 30.8181C20.8502 30.9981 20.2702 30.9581 20.0302 30.8181C19.9802 30.7881 19.9202 30.7281 19.8502 30.6481C19.4502 30.1681 19.2402 29.4481 19.2402 28.7081V24.9481" stroke="#CF0202" strokeMiterlimit="10" />
                              </svg>
                            </button>
                            <span className="text-xs">{row.location}</span>
                          </span>
                        )}
                      </td>}
                    {visibleColumns.attachment &&
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAttachmentClick(row)
                          }}
                          className="hover:bg-gray-100 p-0.5 rounded transition-colors"
                          title={row.attachment ? "View attachments" : "Add attachments"}
                        >
                          {row.attachment
                            ? <Paperclip className="h-3.5 w-3.5 text-blue-600 inline-block" />
                            : <Paperclip className="h-3.5 w-3.5 text-gray-300 inline-block" />}
                        </button>
                      </td>}
                    {visibleColumns.due &&
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDateIconClick(row)
                            }}
                            className="hover:bg-gray-100 p-0.5 rounded transition-colors flex-shrink-0"
                            title="Change due date"
                          >
                            <svg width="16" height="16" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="cursor-pointer">
                              <path d="M5.12109 2.55518V4.24268M12.9961 2.55518V4.24268M2.30859 14.3677V5.93018C2.30859 5.48262 2.48638 5.0534 2.80285 4.73693C3.11932 4.42047 3.54854 4.24268 3.99609 4.24268H14.1211C14.5686 4.24268 14.9979 4.42047 15.3143 4.73693C15.6308 5.0534 15.8086 5.48262 15.8086 5.93018V14.3677M2.30859 14.3677C2.30859 14.8152 2.48638 15.2445 2.80285 15.5609C3.11932 15.8774 3.54854 16.0552 3.99609 16.0552H14.1211C14.5686 16.0552 14.9979 15.8774 15.3143 15.5609C15.6308 15.2445 15.8086 14.8152 15.8086 14.3677M2.30859 14.3677V8.74268C2.30859 8.29512 2.48638 7.8659 2.80285 7.54943C3.11932 7.23297 3.54854 7.05518 3.99609 7.05518H14.1211C14.5686 7.05518 14.9979 7.23297 15.3143 7.54943C15.6308 7.8659 15.8086 8.29512 15.8086 8.74268V14.3677M9.05859 9.86768H9.06459V9.87368H9.05859V9.86768ZM9.05859 11.5552H9.06459V11.5612H9.05859V11.5552ZM9.05859 13.2427H9.06459V13.2487H9.05859V13.2427ZM7.37109 11.5552H7.37709V11.5612H7.37109V11.5552ZM7.37109 13.2427H7.37709V13.2487H7.37109V13.2427ZM5.68359 11.5552H5.68959V11.5612H5.68359V11.5552ZM5.68359 13.2427H5.68959V13.2487H5.68359V13.2427ZM10.7461 9.86768H10.7521V9.87368H10.7461V9.86768ZM10.7461 11.5552H10.7521V11.5612H10.7461V11.5552ZM10.7461 13.2427H10.7521V13.2487H10.7461V13.2427ZM12.4336 9.86768H12.4396V9.87368H12.4336V9.86768ZM12.4336 11.5552H12.4396V11.5612H12.4336V11.5552Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          </button>
                          <span className="text-gray-900 text-xs">{row.dueDate}</span>
                          {row.rush && <span className="text-red-500 flex-shrink-0">
                            <svg width="10" height="12" viewBox="0 0 16 19" fill="none">
                              <path d="M8.71094 8.41504V3.16504L3.08594 11.415H7.46094L7.46094 16.665L13.0859 7.91504L8.71094 7.91504Z" stroke="#CF0202" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>}
                          {row.overdue && <Badge className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 whitespace-nowrap">Overdue</Badge>}
                        </div>
                      </td>}
                    {visibleColumns.actions &&
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-0.5">
                          <Popover open={printDropdownOpen === row.id} onOpenChange={open => setPrintDropdownOpen(open ? row.id : null)}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 hover:bg-gray-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg width="16" height="16" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4.875 6.83887V1.58887H13.875V6.83887M4.875 13.5889H3.375C2.97718 13.5889 2.59564 13.4308 2.31434 13.1495C2.03304 12.8682 1.875 12.4867 1.875 12.0889V8.33887C1.875 7.94104 2.03304 7.55951 2.31434 7.27821C2.59564 6.9969 2.97718 6.83887 3.375 6.83887H15.375C15.7728 6.83887 16.1544 6.9969 16.4357 7.27821C16.717 7.55951 16.875 7.94104 16.875 8.33887V12.0889C16.875 12.4867 16.717 12.8682 16.4357 13.1495C16.1544 13.4308 15.7728 13.5889 15.375 13.5889H13.875M4.875 10.5889H13.875V16.5889H4.875V10.5889Z" stroke="#1162A8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0 border border-gray-200 rounded-lg shadow-lg">
                              <div className="py-2">
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm"
                                  onClick={() => {
                                  handlePrintPaperSlip(row);
                                  }}
                                >
                                  Print Paper Slip
                                </button>
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm"
                                  onClick={() => handlePrintDriverLabel(row)}
                                >
                                  Print Driver Label
                                </button>
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm"
                                  onClick={() => handlePrintStatement(row)}
                                >
                                  Print Statement
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddOnsClick(row)
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M4.39844 9.08887H14.8984" stroke="#1162A8" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M9.64844 3.83887V14.3389" stroke="#1162A8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 hover:bg-gray-100"  
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCallLogClick(row)
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11.2959 12.5149C11.4508 12.586 11.6253 12.6023 11.7906 12.5609C11.956 12.5196 12.1024 12.4232 12.2056 12.2876L12.4719 11.9389C12.6116 11.7526 12.7928 11.6014 13.0011 11.4972C13.2093 11.3931 13.439 11.3389 13.6719 11.3389H15.9219C16.3197 11.3389 16.7012 11.4969 16.9825 11.7782C17.2638 12.0595 17.4219 12.441 17.4219 12.8389V15.0889C17.4219 15.4867 17.2638 15.8682 16.9825 16.1495C16.7012 16.4308 16.3197 16.5889 15.9219 16.5889C12.3415 16.5889 8.90767 15.1666 6.37593 12.6348C3.84419 10.1031 2.42188 6.66929 2.42188 3.08887C2.42187 2.69104 2.57991 2.30951 2.86121 2.02821C3.14252 1.7469 3.52405 1.58887 3.92188 1.58887H6.17188C6.5697 1.58887 6.95123 1.7469 7.23253 2.02821C7.51384 2.30951 7.67188 2.69104 7.67188 3.08887V5.33887C7.67188 5.57173 7.61766 5.8014 7.51352 6.00969C7.40937 6.21797 7.25817 6.39915 7.07187 6.53887L6.72087 6.80212C6.58319 6.90725 6.48614 7.05681 6.44622 7.22538C6.4063 7.39395 6.42596 7.57115 6.50188 7.72687C7.52689 9.80877 9.21269 11.4925 11.2959 12.5149Z" stroke="#1162A8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 hover:bg-gray-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg width="14" height="14" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14.5031 5.57471H7.10957C6.2929 5.57471 5.63086 6.23675 5.63086 7.05342V14.447C5.63086 15.2636 6.2929 15.9257 7.10957 15.9257H14.5031C15.3198 15.9257 15.9818 15.2636 15.9818 14.447V7.05342C15.9818 6.23675 15.3198 5.57471 14.5031 5.57471Z" stroke="#1162A8" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M2.67402 11.4896C1.86073 11.4896 1.19531 10.8242 1.19531 10.0109V2.61738C1.19531 1.80409 1.86073 1.13867 2.67402 1.13867H10.0676C10.8809 1.13867 11.5463 1.80409 11.5463 2.61738" stroke="#1162A8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Button>
                          <Popover open={menuRow === row.id} onOpenChange={open => setMenuRow(open ? row.id : null)}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 hover:bg-gray-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0 border border-gray-200 rounded-lg shadow-lg">
                              <div className="py-1">
                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                                  Edit Case
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                                  Duplicate
                                </button>
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm"
                                  onClick={() => handleDateIconClick(row)}
                                >
                                  Change due date
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                                  Print Driver label
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                                  Print Paper slip
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                                  Print Statement
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                                  Send back to office
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                                  Rush case
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                                  Cancel
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination at Bottom */}
        <div className="flex items-center justify-between mt-4 border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1}
            -
            {Math.min(currentPage * itemsPerPage, filteredSlips.length)}
            {" "}of {filteredSlips.length} entries
          </div>
          <div className="flex items-center space-x-1">
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              «
            </button>
            {Array.from({ length: Math.min(5, maxPage) }, (_, i) => {
              let pageNum: number;
              if (maxPage <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= maxPage - 2) {
                pageNum = maxPage - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                    pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              onClick={() => setCurrentPage(Math.min(maxPage, currentPage + 1))}
              disabled={currentPage === maxPage}
            >
              »
            </button>
          </div>
        </div>

        {/* Archive Confirm Dialog */}
        <Dialog open={archiveConfirm !== null} onOpenChange={v => { if (!v) closeArchive() }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive Case</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              Are you sure you want to archive {archiveConfirm === -1 ? 'the selected cases' : 'this case'}?
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={closeArchive}>Cancel</Button>
              <Button variant="destructive" onClick={confirmArchive}>Archive</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* File Attachment Modal */}
        <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
          <DialogContent className="max-w-[1000px] w-[95vw] max-h-[min(750px,85vh)] p-0 overflow-hidden">
            {selectedSlipForAttachment && (
              <FileAttachmentModalContent
                setShowAttachModal={setShowAttachModal}
                isCaseSubmitted={selectedSlipForAttachment.status === "Completed" || selectedSlipForAttachment.status === "Cancelled"}
                slipId={selectedSlipForAttachment.id}
                onAttachmentsUploaded={handleAttachmentsUploaded}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Change Date Modal */}
        {selectedSlipForDateChange && (
          <ChangeDateModal
            open={showChangeDateModal}
            onClose={() => {
              setShowChangeDateModal(false)
              setSelectedSlipForDateChange(null)
            }}
            patient={selectedSlipForDateChange.patient}
            stage={selectedSlipForDateChange.product || "Unknown Stage"}
            currentDate={new Date().toLocaleDateString()}
            deliveryDate={selectedSlipForDateChange.dueDate}
            deliveryTime="10:00"
            slipId={selectedSlipForDateChange.id}
            history={getChangeDateHistory(selectedSlipForDateChange.id)}
            onSave={handleDateChange}
          />
        )}

        {/* Driver History Modal */}
        <DriverHistoryModal
          isOpen={showDriverHistoryModal}
          onClose={() => setShowDriverHistoryModal(false)}
          slip={selectedSlipForDriverHistory}
        />

        {/* Add Ons Modal */}
        <AddOnsModal
          isOpen={showAddOnsModal}
          onClose={() => setShowAddOnsModal(false)}
          onAddAddOns={handleAddAddOns}
          labId={selectedSlipForAddOns?.labId || 0}
          productId={selectedSlipForAddOns?.productId || 0}
          existingAddOns={selectedSlipForAddOns?.addOns || []}
        />

        {/* Call Log Modal */}
        <CallLogModal
          isOpen={showCallLogModal}
          onClose={() => setShowCallLogModal(false)}
          slipNumber={selectedSlipForCallLog?.id ? String(selectedSlipForCallLog.id) : ""}
        />

        {/* Print Preview Modal */}
        <PrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          caseData={
            selectedSlipForPrint
              ? {
                  lab: selectedSlipForPrint.labName || "",
                  address: selectedSlipForPrint.labAddress || "",
                  office: selectedSlipForPrint.officeCode || "",
                  doctor: selectedSlipForPrint.doctor || "",
                  patient: selectedSlipForPrint.patient || "",
                  pickupDate: selectedSlipForPrint.pickupDate || "",
                  panNumber: selectedSlipForPrint.panNumber || "",
                  caseNumber: selectedSlipForPrint.caseNumber || "",
                  slipNumber: selectedSlipForPrint.id ? String(selectedSlipForPrint.id) : "",
                  products: selectedSlipForPrint.products || [],
                  contact: selectedSlipForPrint.labContact || "",
                  email: selectedSlipForPrint.labEmail || "",
                }
              : {
                  lab: "",
                  address: "",
                  office: "",
                  doctor: "",
                  patient: "",
                  pickupDate: "",
                  panNumber: "",
                  caseNumber: "",
                  slipNumber: "",
                  products: [],
                  contact: "",
                  email: "",
                }
          }
        />

        {/* Print Driver Tags Modal */}
        <PrintDriverTagsModal
          isOpen={showPrintDriverTags}
          slip={selectedSlipForDriverTags}
          onClose={() => setShowPrintDriverTags(false)}
          onRegularPrint={async (slip, allSlots) => {
            if (slip) {
              await handleRegularDriverPrint(slip, allSlots);
            }
          }}
          onGenerateLabels={async (slip, selectedSlots) => {
            if (slip) {
              await handleGenerateDriverLabels(slip, selectedSlots);
            }
          }}
        />

        {/* Print Statement Modal removed: now handled by print-statement page */}
      </div>
    </div>
  )
}

