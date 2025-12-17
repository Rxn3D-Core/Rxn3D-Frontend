export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="px-6 py-4 bg-white border-b">
      <div className="relative h-1 bg-[#e4e6ef] rounded-full max-w-3xl mx-auto">
        <div
          className="absolute h-1 bg-[#1162a8] rounded-full"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="text-right max-w-3xl mx-auto mt-1 text-sm">
        {progress}% complete
      </div>
    </div>
  

  )
}
