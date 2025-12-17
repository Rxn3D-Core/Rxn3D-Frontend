"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Zap } from "lucide-react"

interface SlipHeaderProps {
  lab: string
  doctor: string
  patient: string
  panNumber: string
  caseNumber: string
  slipNumber: string
  createdBy: string
  location: string
  caseStatus: string
  pickupDate: string
  deliveryDate: string
  deliveryTime: string
  onLabChange: (value: string) => void
  onDoctorChange: (value: string) => void
  onPatientChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCaseNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSlipNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCreatedByChange: (value: string) => void
  onLocationChange: (value: string) => void
  onCaseStatusChange: (value: string) => void
  onPickupDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDeliveryDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDeliveryTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function SlipHeader({
  lab,
  doctor,
  patient,
  panNumber,
  caseNumber,
  slipNumber,
  createdBy,
  location,
  caseStatus,
  pickupDate,
  deliveryDate,
  deliveryTime,
  onLabChange,
  onDoctorChange,
  onPatientChange,
  onCaseNumberChange,
  onSlipNumberChange,
  onCreatedByChange,
  onLocationChange,
  onCaseStatusChange,
  onPickupDateChange,
  onDeliveryDateChange,
  onDeliveryTimeChange,
}: SlipHeaderProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-4 p-6 bg-white">
      {/* Lab/Doctor/Patient Info */}
      <div className="col-span-full lg:col-span-6 xl:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="col-span-1">
          <Label htmlFor="company">Company</Label>
          <Select value={lab} onValueChange={onLabChange}>
            <SelectTrigger id="company">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hmc-innovs">HMC Innovs LLC</SelectItem>
              <SelectItem value="other-lab">Other Lab</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1">
          <Label htmlFor="doctor">Doctor</Label>
          <Select value={doctor} onValueChange={onDoctorChange}>
            <SelectTrigger id="doctor">
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cody">Cody Mugglestone</SelectItem>
              <SelectItem value="jane-doe">Jane Doe</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1">
          <Label htmlFor="patient">Patient</Label>
          <Input id="patient" value={patient} onChange={onPatientChange} />
        </div>
      </div>

      {/* Case/Slip Numbers */}
      <div className="col-span-full lg:col-span-6 xl:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="col-span-1">
          <Label htmlFor="pan-number">Pan #:</Label>
          <Input id="pan-number" value={panNumber} readOnly />
        </div>
        <div className="col-span-1">
          <Label htmlFor="case-number">Case #</Label>
          <Input id="case-number" value={caseNumber} onChange={onCaseNumberChange} />
        </div>
        <div className="col-span-1">
          <Label htmlFor="slip-number">Slip #:</Label>
          <Input id="slip-number" value={slipNumber} onChange={onSlipNumberChange} />
        </div>
      </div>

      {/* Creation/Location/Status Details */}
      <div className="col-span-full lg:col-span-6 xl:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="col-span-1">
          <Label htmlFor="created-by">Created By</Label>
          <Select value={createdBy} onValueChange={onCreatedByChange}>
            <SelectTrigger id="created-by">
              <SelectValue placeholder="Select creator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="heide"></SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1">
          <Label htmlFor="location">Location</Label>
          <Select value={location} onValueChange={onLocationChange}>
            <SelectTrigger id="location">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1">
          <Label htmlFor="case-status">Case Status</Label>
          <Select value={caseStatus} onValueChange={onCaseStatusChange}>
            <SelectTrigger id="case-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pick-up/Delivery Dates and Times */}
      <div className="col-span-full lg:col-span-6 xl:col-span-full grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="col-span-1">
          <Label htmlFor="pickup-date">Pick up Date</Label>
          <div className="flex items-center gap-2">
            <Input id="pickup-date" type="date" value={pickupDate} onChange={onPickupDateChange} />
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        <div className="col-span-1">
          <Label htmlFor="delivery-date">Delivery Date</Label>
          <div className="flex items-center gap-2">
            <Input id="delivery-date" type="date" value={deliveryDate} onChange={onDeliveryDateChange} />
            <Zap className="w-4 h-4 text-red-500" />
          </div>
        </div>
        <div className="col-span-1">
          <Label htmlFor="delivery-time">Delivery Time</Label>
          <div className="flex items-center gap-2">
            <Input id="delivery-time" type="time" value={deliveryTime} onChange={onDeliveryTimeChange} />
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
