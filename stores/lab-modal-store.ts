import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Lab {
  id: string
  name: string
  location: string
  logo: string
  email?: string
  phone?: string
  address?: string
  isConnected?: boolean
  status?: "connected" | "requested" | "available"
}

export interface LabModalState {
  // Modal state
  isOpen: boolean
  searchTerm: string
  sortBy: string
  showDetails: string | null
  
  // Data state
  labs: Lab[]
  filteredLabs: Lab[]
  isLoading: boolean
  error: string | null
  
  // Connection state
  selectedLabForConnection: Lab | null
  showConnectionModal: boolean
  isSendingRequest: boolean
  requestSent: boolean
  
  // Invite state
  showInviteModal: boolean
  inviteLabName: string
  inviteEmail: string
  
  // Toast state
  customToast: {
    title: string
    description: string
    variant: "default" | "destructive"
    show: boolean
  } | null
  
  // Actions
  setOpen: (open: boolean) => void
  setSearchTerm: (term: string) => void
  setSortBy: (sort: string) => void
  setShowDetails: (id: string | null) => void
  
  setLabs: (labs: Lab[]) => void
  setFilteredLabs: (labs: Lab[]) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  setSelectedLabForConnection: (lab: Lab | null) => void
  setShowConnectionModal: (show: boolean) => void
  setIsSendingRequest: (sending: boolean) => void
  setRequestSent: (sent: boolean) => void
  
  setShowInviteModal: (show: boolean) => void
  setInviteLabName: (name: string) => void
  setInviteEmail: (email: string) => void
  
  showCustomToast: (title: string, description: string, variant?: "default" | "destructive") => void
  hideCustomToast: () => void
  
  // Computed values
  getSortedLabs: () => Lab[]
  
  // Reset actions
  resetModal: () => void
  resetInviteForm: () => void
  
  // Additional actions
  retrySearch: () => void
}

const initialState = {
  isOpen: false,
  searchTerm: "",
  sortBy: "name-az",
  showDetails: null,
  labs: [],
  filteredLabs: [],
  isLoading: false,
  error: null,
  selectedLabForConnection: null,
  showConnectionModal: false,
  isSendingRequest: false,
  requestSent: false,
  showInviteModal: false,
  inviteLabName: "",
  inviteEmail: "",
  customToast: null,
}

export const useLabModalStore = create<LabModalState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Modal actions
      setOpen: (open) => set({ isOpen: open }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setShowDetails: (id) => set({ showDetails: id }),
      
      // Data actions
      setLabs: (labs) => set({ labs, filteredLabs: labs }),
      setFilteredLabs: (labs) => set({ filteredLabs: labs }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      // Connection actions
      setSelectedLabForConnection: (lab) => set({ selectedLabForConnection: lab }),
      setShowConnectionModal: (show) => set({ showConnectionModal: show }),
      setIsSendingRequest: (sending) => set({ isSendingRequest: sending }),
      setRequestSent: (sent) => set({ requestSent: sent }),
      
      // Invite actions
      setShowInviteModal: (show) => set({ showInviteModal: show }),
      setInviteLabName: (name) => set({ inviteLabName: name }),
      setInviteEmail: (email) => set({ inviteEmail: email }),
      
      // Toast actions
      showCustomToast: (title, description, variant = "default") => {
        set({ 
          customToast: { title, description, variant, show: true } 
        })
        setTimeout(() => {
          get().hideCustomToast()
        }, 5000)
      },
      hideCustomToast: () => set({ customToast: null }),
      
      // Computed values
      getSortedLabs: () => {
        const { filteredLabs, sortBy } = get()
        return [...filteredLabs].sort((a, b) => {
          switch (sortBy) {
            case "name-az":
              return a.name.localeCompare(b.name)
            case "name-za":
              return b.name.localeCompare(a.name)
            case "location":
              return a.location.localeCompare(b.location)
            default:
              return 0
          }
        })
      },
      
      // Reset actions
      resetModal: () => set(initialState),
      resetInviteForm: () => set({ 
        inviteLabName: "", 
        inviteEmail: "", 
        showInviteModal: false 
      }),
      
      // Additional actions
      retrySearch: () => {
        const { searchTerm } = get()
        set({ error: null })
        // This will trigger the search in the hook
      },
    }),
    {
      name: 'lab-modal-store',
    }
  )
)
