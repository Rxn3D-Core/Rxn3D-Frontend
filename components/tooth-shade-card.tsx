"use client"

import React from 'react'

interface ToothShadeCardProps {
  shadeName: string
  shadeGradient: string
  onClick?: () => void
  isHovered?: boolean
  isSelected?: boolean
}

const shadeGradients: { [key: string]: string } = {
  'A1': 'linear-gradient(0deg, #E2DEDB 0.05%, #E9E3E0 19.04%, #ECE6E3 50.02%, #EDE8E5 81.01%, #F1EFED 96%, #F3F2F0 100%)',
  'A2': 'linear-gradient(0deg, #E1DDD4 0.05%, #E2DED5 2.05%, #ECE5DC 22.04%, #EFE8DF 50.02%, #EFE9E1 80.01%, #F1EDE9 96%, #F3EFED 100%)',
  'A3': 'linear-gradient(0deg, #DBD8D3 0.05%, #E0DCD5 7.04%, #EAE3DA 25.04%, #EDE6DC 50.02%, #EEE7DE 78.01%, #F2ECE6 92%, #F6F1EE 100%)',
  'A3.5': 'linear-gradient(0deg, #DAC6B2 0.05%, #E2C9AE 9.04%, #ECCDAA 26.04%, #EFCFA9 50.02%, #EFD0AB 76.01%, #F0D6B3 89.01%, #F3E2C1 100%)',
  'A4': 'linear-gradient(0deg, #D7C4AC 0.05%, #DCC3A1 11.04%, #E1C397 27.03%, #E3C395 50.02%, #E3C497 74.01%, #E4C89F 86.01%, #E7CFAC 96%, #E9D4B4 100%)',
  'B1': 'linear-gradient(0deg, #DAD3C4 0.05%, #E1D9C9 8.04%, #EBE0CF 26.04%, #EEE3D1 50.02%, #EEE4D3 81.01%, #F1E9DB 96%, #F2EBDE 100%)',
  'B2': 'linear-gradient(0deg, #DDD4CB 0.05%, #DED4C9 2.05%, #E8D8C2 22.04%, #EBDAC0 50.02%, #EBDBC2 78.01%, #EFE0CA 92%, #F3E7D3 100%)',
  'B3': 'linear-gradient(0deg, #D8CAAA 0.05%, #DBCBA9 5.05%, #E5CEA8 24.04%, #E8D0A8 50.02%, #E9D1AA 76.01%, #ECD6B2 89.01%, #F2DEBF 99%, #F3E0C1 100%)',
  'B4': 'linear-gradient(0deg, #D9C9B1 0.05%, #E4CCA9 11.04%, #EED0A3 28.03%, #F1D1A2 50.02%, #F1D2A4 77.01%, #F2D6AC 90%, #F4DDB8 100%)',
  'C1': 'linear-gradient(0deg, #D8CCBE 0.05%, #DDCFBE 7.04%, #E7D6C0 25.04%, #EAD8C1 50.02%, #EBDAC3 81.01%, #EFE2CB 98%, #F0E4CD 100%)',
  'C2': 'linear-gradient(0deg, #D1C4B1 0.05%, #D7C7B0 8.04%, #E1CCAF 25.04%, #E4CEAF 50.02%, #E5D0B1 78.01%, #E8D6B9 92%, #ECDEC1 100%)',
  'C3': 'linear-gradient(0deg, #D2BEAB 0.05%, #D3BEA9 2.05%, #DDC4A0 22.04%, #E0C69E 50.02%, #E0C7A0 73.01%, #E2CBA8 85.01%, #E4D1B5 95%, #E7D8C1 100%)',
  'C4': 'linear-gradient(0deg, #CFBBA0 0.05%, #D2BB9A 7.04%, #D9BC90 25.04%, #DBBD8E 50.02%, #DCBE90 75.01%, #E0C398 87.01%, #E8CDA5 97%, #ECD1AB 100%)',
  'D2': 'linear-gradient(0deg, #DED2C7 0.05%, #E3D4C4 7.04%, #EDD9C1 25.04%, #F0DBC0 50.02%, #F0DCC2 76.01%, #F1E0CA 90%, #F3E7D7 100%)',
  'D3': 'linear-gradient(0deg, #DECFBD 0.05%, #E6D4BB 9.04%, #F0DABA 26.04%, #F3DCBA 50.02%, #F2DCBC 75.01%, #F2DFC4 88.01%, #F1E4D1 97%, #F1E6D6 100%)',
  'D4': 'linear-gradient(0deg, #D6CBBA 0.05%, #DDCDB4 8.04%, #E7D0AD 26.04%, #EAD1AB 50.02%, #EAD2AD 75.01%, #EBD6B5 87.01%, #EEDEC2 97%, #EFE2C8 100%)',
  'OM1': 'linear-gradient(0deg, #E2DEDB 0.05%, #E9E3E0 19.04%, #ECE6E3 50.02%, #EDE8E5 81.01%, #F1EFED 96%, #F3F2F0 100%)',
  'OM2': 'linear-gradient(0deg, #E1DDD4 0.05%, #E2DED5 2.05%, #ECE5DC 22.04%, #EFE8DF 50.02%, #EFE9E1 80.01%, #F1EDE9 96%, #F3EFED 100%)',
  'OM3': 'linear-gradient(0deg, #D4CBBB 0.05%, #DACDB6 8.04%, #E4D0AF 25.04%, #E7D1AE 50.02%, #E7D2B0 75.01%, #E9D6B8 87.01%, #EDDEC5 97%, #EFE2CB 100%)',
}

const shineGradient = 'linear-gradient(90deg, #DDD4CB 0.02%, #E2D9CB 7.04%, #ECE1CD 25.07%, #EFE4CE 50.11%, #EFE5D0 81.17%, #F1E9D8 98.2%, #F2EADA 100.2%)'

export function ToothShadeCard({
  shadeName,
  shadeGradient,
  onClick,
  isHovered = false,
  isSelected = false
}: ToothShadeCardProps) {
  const gradient = shadeGradients[shadeName] || shadeGradient

  return (
    <div
      className={`relative cursor-pointer transition-transform duration-200 ${
        isHovered ? 'scale-105' : ''
      } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      onClick={onClick}
      style={{
        filter: 'drop-shadow(2px 7px 8px rgba(35, 31, 32, 0.2))',
        width: '80px',
        height: '120px'
      }}
    >
      {/* Tooth card with realistic gradients */}
      <div className="relative w-full h-full">
        {/* Base/Gum */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: '20%',
            background: '#8F8C88'
          }}
        />

        {/* Main tooth body with gradient */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: '80%',
            background: gradient,
            borderRadius: '4px 4px 0 0'
          }}
        >
          {/* Shine layer 1 */}
          <div
            className="absolute inset-0"
            style={{
              background: shineGradient,
              backgroundBlendMode: 'screen',
              mixBlendMode: 'screen',
              opacity: 0.42,
              top: '30%',
              height: '15%'
            }}
          />

          {/* Shine layer 2 */}
          <div
            className="absolute inset-0"
            style={{
              background: shineGradient,
              backgroundBlendMode: 'screen',
              mixBlendMode: 'screen',
              opacity: 0.42,
              top: '45%',
              height: '18%'
            }}
          />

          {/* Shine layer 3 */}
          <div
            className="absolute inset-0"
            style={{
              background: shineGradient,
              backgroundBlendMode: 'screen',
              mixBlendMode: 'screen',
              opacity: 0.42,
              top: '65%',
              height: '22%'
            }}
          />
        </div>

        {/* Bottom shadow/depth */}
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-around items-end"
          style={{ height: '8%' }}
        >
          <div style={{ width: '25%', height: '100%', background: '#191814' }} />
          <div style={{ width: '25%', height: '80%', background: '#191814' }} />
          <div style={{ width: '25%', height: '100%', background: '#191814' }} />
        </div>
      </div>

      {/* Label */}
      <div className="absolute -bottom-8 left-0 right-0 text-center">
        <span className="text-xs font-medium text-gray-700">{shadeName}</span>
      </div>
    </div>
  )
}
