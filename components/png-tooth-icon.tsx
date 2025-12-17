"use client"

import React from 'react';
import Image from 'next/image';

export interface PNGToothIconProps {
  toothNumber?: number;
  status?: 'teeth_in_mouth' | 'missing_teeth' | 'prepped' | 'will_extract' | 'extracted' | 'repair' | 'clasp' | 'implant';
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

// Map tooth statuses to PNG image numbers
const STATUS_TO_IMAGE_MAP = {
  teeth_in_mouth: 1,
  missing_teeth: 2,
  will_extract: 3,
  extracted: 4,
  prepped: 5,
  repair: 6,
  clasp: 7,
  implant: 7              // 8. Implant (using 7.png until 8.png is added) 8
};

const SIZE_MAP = {
  small: { width: 16, height: 24 },
  medium: { width: 32, height: 49 },
  large: { width: 48, height: 73 },
  xlarge: { width: 64, height: 98 }
};

export const PNGToothIcon: React.FC<PNGToothIconProps> = ({
  toothNumber,
  status = 'teeth_in_mouth',
  size = 'medium',
  className = '',
  onClick,
  isSelected = false
}) => {
  const sizeConfig = SIZE_MAP[size];
  const imageNumber = STATUS_TO_IMAGE_MAP[status];
  const imagePath = `/images/tooth-mapping/${imageNumber}.png`;

  return (
    <div 
      className={`inline-block cursor-pointer transition-all duration-200 ${className}`}
      onClick={onClick}
      title={`Tooth ${toothNumber} - ${status.replace('_', ' ')}`}
    >
      <Image
        src={imagePath}
        alt={`Tooth ${toothNumber || ''} - ${status.replace('_', ' ')}`}
        width={sizeConfig.width}
        height={sizeConfig.height}
        className="drop-shadow-sm"
        style={{
          width: sizeConfig.width,
          height: sizeConfig.height,
        }}
      />
    </div>
  );
};

export default PNGToothIcon;
