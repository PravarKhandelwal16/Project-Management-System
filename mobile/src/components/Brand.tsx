import React from "react";
import Svg, { Rect, Path, Defs, LinearGradient, Stop } from "react-native-svg";
export function Brand({ size = 44 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      accessibilityLabel="ProjectMaster logo"
    >
      <Defs>
        <LinearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#2563eb" />
          <Stop offset="1" stopColor="#4338ca" />
        </LinearGradient>
      </Defs>
      <Rect width="48" height="48" rx="14" fill="url(#brand)" />
      <Path
        d="M13 14h10a7 7 0 0 1 0 14h-4v7h-6V14Zm6 6v3h4a1.5 1.5 0 0 0 0-3h-4Z"
        fill="white"
      />
      <Path
        d="m27 31 4 4 8-10"
        stroke="#a5f3fc"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
