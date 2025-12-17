"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export default function LabConnectModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] rounded-xl p-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between px-8 pt-6 pb-0">
        <DialogTitle className="text-lg font-medium text-black-900 border-b border-gray-200 pb-3 w-full">
            Lab connect
        </DialogTitle>
        <DialogDescription className="sr-only">
          Confirmation dialog to send case to other connected labs
        </DialogDescription>
          <button
            className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        <div className="flex items-start gap-6 px-8 py-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 flex-shrink-0">
          <svg width="31" height="40" viewBox="0 0 31 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.96929 8.21454V12.9073C8.96918 13.1697 9.03771 13.4279 9.16859 13.6581L13.6507 21.542C13.7862 21.7802 13.855 22.0483 13.8501 22.3198C13.8452 22.5913 13.7669 22.857 13.6229 23.0906C13.4788 23.3242 13.274 23.5177 13.0286 23.6521C12.7831 23.7865 12.5055 23.8571 12.2231 23.8571H2.46174C2.17929 23.8571 1.90169 23.7865 1.65626 23.6521C1.41082 23.5177 1.206 23.3242 1.06196 23.0906C0.917907 22.857 0.839592 22.5913 0.834715 22.3198C0.829839 22.0483 0.898569 21.7802 1.03414 21.542L5.51622 13.6581C5.6471 13.4279 5.71563 13.1697 5.71552 12.9073V8.21454" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.82959 18.3817H11.8539" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4.49597 8.21454H10.1901" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22.8041 17.3676V22.2887C21.4933 22.6645 20.3671 23.4813 19.6312 24.5898C18.8953 25.6983 18.599 27.0245 18.7965 28.3258C18.9939 29.6271 19.672 30.8166 20.7066 31.6768C21.7412 32.5369 23.0632 33.0103 24.4309 33.0103C25.7987 33.0103 27.1207 32.5369 28.1553 31.6768C29.1899 30.8166 29.8679 29.6271 30.0654 28.3258C30.2629 27.0245 29.9666 25.6983 29.2307 24.5898C28.4948 23.4813 27.3686 22.6645 26.0578 22.2887V17.3676" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.7368 27.5348H30.125" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21.5845 17.3676H27.2786" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.3182 34.2215C17.3521 35.2159 16.1083 35.9212 14.7366 36.2521C13.3649 36.583 11.9241 36.5256 10.5878 36.0866C9.25157 35.6476 8.077 34.8459 7.20578 33.7781C6.33456 32.7103 5.8039 31.4222 5.67782 30.0689L5.3949 26.9231" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.06177 30.3569L5.39465 26.9199L8.95984 30.1153" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11.889 5.39759C12.8675 4.41573 14.1201 3.72657 15.4957 3.41323C16.8712 3.0999 18.311 3.17578 19.6413 3.63172C20.9716 4.08766 22.1357 4.90419 22.9931 5.98281C23.8504 7.06143 24.3645 8.35608 24.4732 9.71059L24.7159 12.8593" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M28.0919 9.46686L24.7154 12.861L21.1913 9.62027" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 pt-1">
            <p className="text-lg text-gray-900 leading-relaxed">
              Are you sure you want to send case to{' '}
              <span className="font-semibold">other connected labs?</span>
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-4 px-8 pb-8">
          <Button 
            variant="outline" 
            className="min-w-[120px] border-gray-300 text-gray-700 hover:bg-gray-50 h-11" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] h-11" 
            onClick={onConfirm}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}