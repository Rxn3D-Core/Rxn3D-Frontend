"use client"

import type React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import {
  CalendarIcon,
  Upload,
  User,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  DollarSign,
  CalendarPlus2Icon as CalendarIcon2,
  ChevronLeft,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

// Form schema
const userFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  userType: z.string().min(1, "Please select a user type"),
  joinDate: z.date(),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(5, "Please enter a valid address"),
  apartment: z.string().optional(),
  city: z.string().min(2, "Please enter a valid city"),
  state: z.string().min(2, "Please select a state"),
  zipCode: z.string().min(5, "Please enter a valid zip code"),
  position: z.string().min(2, "Please enter a valid position"),
  payType: z.string().min(1, "Please select a pay type"),
  payRate: z.string().min(1, "Please enter a pay rate"),
  birthday: z.date().optional(),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface AddUserFormProps {
  onCancel: () => void
  onSuccess: () => void
}

export function AddUserForm({ onCancel, onSuccess }: AddUserFormProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"personal" | "permission">("personal")
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Initialize form with default values
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      userType: "",
      joinDate: new Date(),
      email: "",
      phone: "",
      address: "",
      apartment: "",
      city: "",
      state: "",
      zipCode: "",
      position: "",
      payType: "",
      payRate: "",
      birthday: undefined,
    },
  })

  // Handle form submission
  const onSubmit = (data: UserFormValues) => {

    toast({
      title: "User Added",
      description: `${data.firstName} ${data.lastName} has been added successfully.`,
    })

    onSuccess()
  }

  // Handle photo upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Tab navigation */}
      <div className="bg-white border-b">
        <div className="flex">
          <button
            className={`px-8 py-4 font-medium ${
              activeTab === "personal"
                ? "bg-white text-gray-900 border-b-2 border-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("personal")}
          >
            Personal Information
          </button>
          <button
            className={`px-8 py-4 font-medium ${
              activeTab === "permission"
                ? "bg-white text-gray-900 border-b-2 border-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("permission")}
          >
            Permission
          </button>
        </div>
      </div>

      {/* Back to list link */}
      <div className="px-6 py-4">
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 flex items-center text-sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to List
        </button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {activeTab === "personal" ? (
            <div className="px-6 pb-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    User Details
                    <span className="text-gray-400">📋</span>
                  </h3>

                  <div className="space-y-6">
                    {/* Name fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input placeholder="First Name *" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Last Name *" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* User type and join date */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="userType"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                                  <SelectTrigger className="pl-10">
                                    <SelectValue placeholder="User Type *" />
                                  </SelectTrigger>
                                </div>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Lab Admin">Lab Admin</SelectItem>
                                <SelectItem value="User">User</SelectItem>
                                <SelectItem value="Technician">Technician</SelectItem>
                                <SelectItem value="Manager">Manager</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="joinDate"
                        render={({ field }) => (
                          <FormItem>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !field.value && "text-muted-foreground",
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Join date</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input type="email" placeholder="Email Address *" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input placeholder="Phone Number *" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Address fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input placeholder="Address *" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="apartment"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Apartment, Suite, Etc" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* City, State, Zip */}
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="City *" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="New York">New York</SelectItem>
                                <SelectItem value="Los Angeles">Los Angeles</SelectItem>
                                <SelectItem value="Chicago">Chicago</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="State / Province *" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="NY">New York</SelectItem>
                                <SelectItem value="CA">California</SelectItem>
                                <SelectItem value="TX">Texas</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Zip Code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Position */}
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input placeholder="Position" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Pay type and rate */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="payType"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pay Type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Hourly">Hourly</SelectItem>
                                <SelectItem value="Salary">Salary</SelectItem>
                                <SelectItem value="Commission">Commission</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="payRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input placeholder="Pay Rate" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Birthday */}
                    <FormField
                      control={form.control}
                      name="birthday"
                      render={({ field }) => (
                        <FormItem>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon2 className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : <span>Birthday</span>}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                captionLayout="dropdown-buttons"
                                fromYear={1940}
                                toYear={2010}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Photo upload */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        {photoPreview ? (
                          <img
                            src={photoPreview || "/placeholder.svg"}
                            alt="Profile preview"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Mail className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500">Upload preview</p>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        className="bg-[#1162a8] hover:bg-blue-700"
                        onClick={() => document.getElementById("photo-upload")?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                        <input
                          id="photo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-8">
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={() => setActiveTab("permission")} className="bg-[#1162a8]">
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="px-6 pb-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-6">Permissions</h3>

                  <div className="space-y-6">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Module</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">View</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Create</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Edit</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {[
                            "Dashboard",
                            "Lab Profile",
                            "Product Management",
                            "Lab Management",
                            "Case Management",
                            "User Management",
                            "Production",
                            "Billing",
                            "System Settings",
                          ].map((module) => (
                            <tr key={module} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium">{module}</td>
                              <td className="px-4 py-3 text-center">
                                <Checkbox defaultChecked />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Checkbox defaultChecked={module !== "System Settings"} />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Checkbox defaultChecked={module !== "System Settings"} />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Checkbox
                                  defaultChecked={["Product Management", "Lab Management", "User Management"].includes(
                                    module,
                                  )}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setActiveTab("personal")}>
                        Back
                      </Button>
                      <Button type="submit" className="bg-[#1162a8]">
                        Save User
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}
