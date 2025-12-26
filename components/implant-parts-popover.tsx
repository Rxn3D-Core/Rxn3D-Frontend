import React from 'react'

interface ImplantPartsPopoverProps {
  onImplantPartsIncluded?: () => void
  onEnterManually?: () => void
}

export const ImplantPartsPopover: React.FC<ImplantPartsPopoverProps> = ({
  onImplantPartsIncluded,
  onEnterManually
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        width: '293px',
        height: '104px',
        left: '50%',
        top: '-120px',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '0px',
        gap: '20px',
        zIndex: 10
      }}
    >
      {/* Frame 2428 - Implant parts Included */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px',
          gap: '10px',
          width: '235px',
          height: '42px',
          background: '#FFFFFF',
          boxShadow: '1px 1px 5px rgba(0, 0, 0, 0.25)',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={onImplantPartsIncluded}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '1px 1px 8px rgba(0, 0, 0, 0.35)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '1px 1px 5px rgba(0, 0, 0, 0.25)'
        }}
      >
        <span
          style={{
            width: '215px',
            height: '22px',
            fontFamily: 'Verdana',
            fontStyle: 'normal',
            fontWeight: 700,
            fontSize: '17px',
            lineHeight: '22px',
            letterSpacing: '-0.02em',
            color: '#000000',
            textAlign: 'center'
          }}
        >
          Implant parts Included
        </span>
      </div>

      {/* Frame 2431 - Enter Implant parts manually */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px',
          gap: '10px',
          width: '293px',
          height: '42px',
          background: '#DFEEFB',
          boxShadow: '1px 1px 5px #1162A8',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={onEnterManually}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '1px 1px 8px #1162A8'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '1px 1px 5px #1162A8'
        }}
      >
        <span
          style={{
            width: '273px',
            height: '22px',
            fontFamily: 'Verdana',
            fontStyle: 'normal',
            fontWeight: 700,
            fontSize: '17px',
            lineHeight: '22px',
            letterSpacing: '-0.02em',
            color: '#000000',
            textAlign: 'center'
          }}
        >
          Enter Implant parts manually
        </span>
      </div>
    </div>
  )
}

