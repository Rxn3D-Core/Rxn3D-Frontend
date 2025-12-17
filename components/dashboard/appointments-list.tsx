import { Calendar } from "lucide-react"

export function AppointmentsList() {
  const appointments = [
    {
      id: 1,
      date: "16",
      month: "APR",
      name: "Mary Wilson",
      time: "9:00 am - 9:30 am",
      location: "Edge Dental & Orthodontics",
      notes: "Need help with implant coping",
    },
    {
      id: 2,
      date: "22",
      month: "APR",
      name: "Tina Montgomery",
      time: "4:00 pm - 4:30 pm",
      location: "Dentist of St. Rose",
      notes: 'Dr request help as this is a "trouble patient"',
    },
    {
      id: 3,
      date: "25",
      month: "APR",
      name: "Rafael Dinglasan",
      time: "9:00 am - 9:30am",
      location: "Nevada Dental Benefits Durango",
      notes: "All on 4 case",
    },
    {
      id: 4,
      date: "28",
      month: "APR",
      name: "Valerie Szajcv",
      time: "9:00 am - 9:30am",
      location: "Mountain Dental Group",
      notes: "All on x case",
    },
  ]

  return (
    <div className="bg-white border border-[#d9d9d9] rounded-lg">
      <div className="flex justify-between items-center p-4 border-b border-[#d9d9d9]">
        <h2 className="font-bold text-lg">Upcoming Appointments</h2>
        <Calendar className="h-5 w-5 text-[#1162a8]" />
      </div>
      <div className="p-4 border-b border-[#d9d9d9] text-sm text-[#a19d9d]">Today is Monday, June 2, 2025</div>
      <div className="divide-y divide-[#f0f0f0]">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="flex p-4">
            <div className="flex flex-col items-center justify-center border border-[#1162a8] text-[#1162a8] rounded p-2 mr-4 w-16 h-16">
              <div className="text-xl font-bold">{appointment.date}</div>
              <div className="text-xs">{appointment.month}</div>
            </div>
            <div>
              <div className="font-bold text-base">{appointment.name}</div>
              <div className="text-sm text-[#a19d9d]">
                {appointment.time} {appointment.location}
              </div>
              <div className="text-sm text-[#a19d9d] italic">{appointment.notes}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
