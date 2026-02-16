export function ToothStatusBoxes() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="flex items-center justify-center bg-[#F3EBD7] rounded-md h-[65px]">
          <p className="font-[Verdana] text-[14px] leading-[26px] tracking-[-0.02em] text-center text-black">
            Teeth in mouth
            <br />
            #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
          </p>
        </div>
        <div className="flex items-center justify-center bg-[#E9E8E7] rounded-md h-[65px]">
          <p className="font-[Verdana] text-[14px] leading-[26px] tracking-[-0.02em] text-center text-black">
            Missing teeth
            <br />
            #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="flex items-center justify-center bg-[#E92520] rounded-md h-[65px]">
          <p className="font-[Verdana] text-[14px] font-bold leading-[26px] tracking-[-0.02em] text-center text-white">
            Will extract on delivery
            <br />
            #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
          </p>
        </div>
        <div className="flex items-center justify-center bg-[#A0F69A] rounded-md h-[65px]">
          <p className="font-[Verdana] text-[14px] leading-[26px] tracking-[-0.02em] text-center text-black">
            Fix/Repair
            <br />
            #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center justify-center bg-[#FFD1F9] rounded-md h-[65px]">
          <p className="font-[Verdana] text-[14px] leading-[26px] tracking-[-0.02em] text-center text-black">
            Clasp
            <br />
            #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
          </p>
        </div>
        <div className="flex items-center justify-center bg-[#0CE7C6] rounded-md h-[65px]">
          <p className="font-[Verdana] text-[14px] leading-[26px] tracking-[-0.02em] text-center text-black">
            Custom tooth status
            <br />
            #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
          </p>
        </div>
      </div>
    </>
  );
}
