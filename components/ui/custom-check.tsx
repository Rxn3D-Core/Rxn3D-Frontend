import React, { useId } from "react";

interface CheckProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function Check({ size = 16, className, fill, ...props }: CheckProps) {
  const gradientId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 181.91 162.9"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <radialGradient
          id={gradientId}
          cx="96.59"
          cy="76.54"
          fx="96.59"
          fy="76.54"
          r="126.3"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#19a747" />
          <stop offset="0.15" stopColor="#1fa846" />
          <stop offset="0.36" stopColor="#30ad45" />
          <stop offset="0.6" stopColor="#4cb543" />
          <stop offset="0.85" stopColor="#73bf40" />
          <stop offset="1" stopColor="#8dc73f" />
        </radialGradient>
      </defs>
      <g>
        <path
          d="M181.91,0c-3.22,2.02-6.11,5.56-8.82,8.21-27.95,27.33-49.2,60.54-68.07,94.58-5.88,10.61-11.46,21.39-16.73,32.31-3.95,8.19-7.23,19.27-14.69,25.01-3.98,3.12-10.26,4.11-14.19.37-15.69-14.95-36.04-35.48-59.42-23.83,20.44-22.29,43.79-7.47,63.56,6.96C90.34,87.19,128.37,33.67,181.91,0Z"
          fill={fill || `url(#${gradientId})`}
        />
      </g>
    </svg>
  );
}
