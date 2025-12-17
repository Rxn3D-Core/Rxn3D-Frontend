export interface Slip {
  id: number
  createdAt: string
  pan: string
  officeCode: string
  stageCode: string
  patient: string
  status: "In Process" | "Hold" | "Ready/2Go" | "Draft" | "Canceled" | "Finished" | "On Hold" | "Trash"
  dueDate: string
  daysLeft: number
  panColor: string
  office?: string
  doctor?: string
  case?: string
  location?: string
  pickupDate?: string
  deliveryDate?: string
  deliveryTime?: string
  productType?: string
  material?: string
  grade?: string
  stage?: string
  impressions?: string
  stageNotes?: string
  additionalNotes?: string
  selectedTeeth?: number[]
  productLocation?: "upper" | "lower"
}
