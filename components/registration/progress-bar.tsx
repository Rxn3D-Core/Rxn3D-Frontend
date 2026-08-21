export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Registration progress</span>
          <span className="text-[#1162A8]">{progress}%</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#1162A8] to-[#2AA6DE] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
