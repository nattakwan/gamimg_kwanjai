/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Wire3DRenderer — Laboratory Alligator Clip Test Leads (ปากคีบจระเข้) & Catenary Cables with Three.js / SVG.
 * Features:
 * - Genuine Laboratory Alligator Clips (ปากคีบจระเข้) at both wire terminations (Image 4):
 *   * Stamped metallic nickel jaws with interlocking serrated saw-teeth
 *   * Center pivot rivet pin and mechanical torsion tension spring
 *   * Color-coded flexible vinyl insulating boots (Red / Black / Blue) with grip ribs
 *   * Clips naturally orient along the wire tangent entering each terminal post
 * - Natural physical catenary gravity sag (droop factor proportional to distance)
 * - Cylindrical 3D lighting simulation (drop shadow, core cable body, specular reflection highlight)
 * - Animated flowing electron pulse stream when current flows
 * - Interactive hover highlight and click-to-delete
 */

import React from 'react';
import { CircuitWire } from '../../types/game';

interface Wire3DRendererProps {
  wires: CircuitWire[];
  terminalCoords: Record<string, { x: number; y: number }>;
  isEnergized?: boolean;
  isShortCircuit?: boolean;
  onRemoveWire?: (wireId: string) => void;
  className?: string;
}

/**
 * Procedural Vector Alligator Clip (ปากคีบจระเข้)
 * Origin (0,0) = Clip mouth tip gripping the terminal post.
 * Angle = Rotation toward the incoming wire tangent.
 */
const AlligatorClipSVG: React.FC<{
  x: number;
  y: number;
  angleRad: number;
  bootColor: string;
}> = ({ x, y, angleRad, bootColor }) => {
  const angleDeg = (angleRad * 180) / Math.PI;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angleDeg})`} className="transition-transform duration-150">
      {/* 1. Underlying Drop Shadow */}
      <path
        d="M 0 0 L 16 -6 L 32 -4 L 34 0 L 32 4 L 16 6 Z"
        fill="#020617"
        opacity="0.45"
        transform="translate(1, 3)"
      />

      {/* 2. Stamped Metallic Nickel Jaws (Chrome / Steel) */}
      {/* Upper Sawtooth Jaw */}
      <path
        d="M 1 -1.5 
           L 4 -4.5 
           L 6 -2.5 
           L 9 -5 
           L 11 -3 
           L 14 -5.5 
           L 17 -4 
           L 18 0 
           L 14 -1 
           L 10 -0.5 
           L 6 -0.5 
           Z"
        fill="#cbd5e1"
        stroke="#475569"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Lower Sawtooth Jaw */}
      <path
        d="M 1 1.5 
           L 4 4.5 
           L 6 2.5 
           L 9 5 
           L 11 3 
           L 14 5.5 
           L 17 4 
           L 18 0 
           L 14 1 
           L 10 0.5 
           L 6 0.5 
           Z"
        fill="#94a3b8"
        stroke="#475569"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Inner Jaw Serration Shadows */}
      <line x1="3" y1="-1" x2="15" y2="-1" stroke="#334155" strokeWidth="0.7" />
      <line x1="3" y1="1" x2="15" y2="1" stroke="#334155" strokeWidth="0.7" />

      {/* Pivot Spring Coil Details */}
      <circle cx="16" cy="0" r="3.2" fill="#64748b" stroke="#334155" strokeWidth="0.8" />
      <circle cx="16" cy="0" r="1.6" fill="#f8fafc" />

      {/* 3. Flexible Vinyl Insulating Boot (Rubber Boot Sleeve) */}
      {/* Boot Base Shape */}
      <path
        d="M 16 -5.5
           C 20 -6.5, 26 -6, 32 -3.5
           C 35 -2, 35 2, 32 3.5
           C 26 6, 20 6.5, 16 5.5
           C 14.5 3, 14.5 -3, 16 -5.5 Z"
        fill={bootColor}
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Specular Highlight along Upper Boot Ridge */}
      <path
        d="M 17 -4 C 21 -4.8, 26 -4.2, 31 -2.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.0"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Rubber Grip Ribs */}
      <line x1="22" y1="-5.2" x2="22" y2="5.2" stroke="#0f172a" strokeWidth="1.0" opacity="0.6" />
      <line x1="26" y1="-4.6" x2="26" y2="4.6" stroke="#0f172a" strokeWidth="1.0" opacity="0.6" />
      <line x1="30" y1="-3.8" x2="30" y2="3.8" stroke="#0f172a" strokeWidth="1.0" opacity="0.6" />

      {/* Wire Collar Neck (where wire enters the boot) */}
      <rect x="31" y="-3.0" width="4" height="6.0" rx="1.5" fill="#0f172a" />

      {/* 4. Terminal Contact Clamp Dot at Mouth Tip */}
      <circle cx="0" cy="0" r="3" fill="#f59e0b" stroke="#d97706" strokeWidth="1.2" />
      <circle cx="0" cy="0" r="1.2" fill="#020617" />
    </g>
  );
};

export const Wire3DRenderer: React.FC<Wire3DRendererProps> = ({
  wires,
  terminalCoords,
  isEnergized = false,
  isShortCircuit = false,
  onRemoveWire,
  className = '',
}) => {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none z-15 ${className}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Drop shadow filter for cable depth */}
        <filter id="wire-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#020617" floodOpacity="0.7" />
        </filter>

        {/* Glow filter for energized electrons */}
        <filter id="electron-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {wires.map((wire) => {
        const p1 = terminalCoords[wire.fromTerminalId];
        const p2 = terminalCoords[wire.toTerminalId];
        if (!p1 || !p2) return null;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Natural catenary droop (gravity sag)
        const sag = Math.min(75, Math.max(32, dist * 0.22));
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2 + sag;

        const pathD = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;

        // Color theme: red for positive, blue/black for negative/ground
        const baseColor = isShortCircuit
          ? '#f43f5e'
          : wire.color ||
            (wire.fromTerminalId.includes('pos') || wire.toTerminalId.includes('pos')
              ? '#ef4444'
              : '#3b82f6');

        const bootColor =
          wire.color === '#ef4444' || wire.fromTerminalId.includes('pos') || wire.toTerminalId.includes('pos')
            ? '#dc2626'
            : wire.color === '#18181b' || wire.color === '#000000'
            ? '#1e293b'
            : '#2563eb';

        // Calculate tangent angles at both terminal endpoints
        // Tangent at p1 points toward (midX, midY)
        const angleP1 = Math.atan2(midY - p1.y, midX - p1.x);

        // Tangent at p2 points toward (midX, midY) (away from terminal toward wire)
        const angleP2 = Math.atan2(midY - p2.y, midX - p2.x);

        return (
          <g
            key={wire.id}
            className="group cursor-pointer pointer-events-auto"
            onClick={() => onRemoveWire && onRemoveWire(wire.id)}
          >
            {/* 1. Underlying Drop Shadow */}
            <path
              d={pathD}
              fill="none"
              stroke="#020617"
              strokeWidth="10"
              strokeLinecap="round"
              filter="url(#wire-drop-shadow)"
              opacity="0.8"
            />

            {/* 2. Outer Rubber Insulation Jacket */}
            <path
              d={pathD}
              fill="none"
              stroke="#0f172a"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* 3. Main Colored Silicone Wire Body */}
            <path
              d={pathD}
              fill="none"
              stroke={baseColor}
              strokeWidth="5.5"
              strokeLinecap="round"
              className="transition-colors duration-300 group-hover:brightness-125"
            />

            {/* 4. Cylindrical Specular Highlight (3D Curved Sheen) */}
            <path
              d={pathD}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.45"
            />

            {/* 5. Animated Flowing Electron Stream (when energized) */}
            {isEnergized && (
              <>
                <path
                  d={pathD}
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth="2.5"
                  strokeDasharray="8 16"
                  strokeLinecap="round"
                  filter="url(#electron-glow)"
                  className="animate-[dash_0.8s_linear_infinite]"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                  strokeDasharray="4 20"
                  strokeLinecap="round"
                  className="animate-[dash_0.8s_linear_infinite]"
                />
              </>
            )}

            {/* 6. Alligator Clips (ปากคีบจระเข้) Clamped at Terminal P1 & P2 */}
            <AlligatorClipSVG
              x={p1.x}
              y={p1.y}
              angleRad={angleP1}
              bootColor={bootColor}
            />

            <AlligatorClipSVG
              x={p2.x}
              y={p2.y}
              angleRad={angleP2}
              bootColor={bootColor}
            />
          </g>
        );
      })}
    </svg>
  );
};
