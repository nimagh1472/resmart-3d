'use client';

import { useEffect, useRef } from 'react';
import { useRoleStore } from '@/hooks/useRoleStore';
import { vehicleTelemetry } from '@/hooks/useVehicleTelemetry';
import { CASHBACK_PICKUPS, STATIONS, WORLD_BOUNDS } from '@/lib/pitchData';

const MAP_WIDTH = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
const MAP_DEPTH = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
const ZONE_MARKER_RADIUS = 4;
const VEHICLE_MARKER_RADIUS = 3;

/**
 * Live top-down SVG map of the play area. The <svg> viewBox is set to
 * exactly WORLD_BOUNDS, so zone and vehicle world X/Z coordinates are used
 * directly as SVG coordinates — no separate percentage-mapping math needed.
 * The vehicle marker updates via its own requestAnimationFrame loop reading
 * the shared vehicleTelemetry singleton and writing the SVG attribute
 * directly, bypassing React state so the 60fps position feed never
 * triggers a re-render.
 */
export function MiniMap() {
  const completedStations = useRoleStore((state) => state.completedStations);
  const activeRole = useRoleStore((state) => state.activeRole);
  const collectedPickupIds = useRoleStore((state) => state.collectedPickupIds);
  const vehicleMarkerRef = useRef<SVGCircleElement>(null);

  const visibleStations = activeRole ? STATIONS.filter((station) => station.visibleTo.includes(activeRole)) : STATIONS;

  useEffect(() => {
    let frameId: number;

    const tick = () => {
      const marker = vehicleMarkerRef.current;
      if (marker) {
        marker.setAttribute('cx', vehicleTelemetry.x.toFixed(2));
        marker.setAttribute('cy', vehicleTelemetry.z.toFixed(2));
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden h-32 w-32 overflow-hidden rounded-xl border border-white/40 bg-white/70 shadow md:block">
      <svg
        viewBox={`${WORLD_BOUNDS.minX} ${WORLD_BOUNDS.minZ} ${MAP_WIDTH} ${MAP_DEPTH}`}
        className="h-full w-full"
        aria-hidden="true"
      >
        {visibleStations.map((station) => {
          const isCompleted = completedStations.includes(station.id);
          return (
            <circle
              key={station.id}
              cx={station.position[0]}
              cy={station.position[2]}
              r={ZONE_MARKER_RADIUS}
              fill={isCompleted ? '#22c55e' : '#3b82f6'}
            />
          );
        })}
        {activeRole === 'CUSTOMER' &&
          CASHBACK_PICKUPS.map((pickup) => (
            <circle
              key={pickup.id}
              cx={pickup.position[0]}
              cy={pickup.position[2]}
              r={ZONE_MARKER_RADIUS * 0.5}
              fill="#facc15"
              opacity={collectedPickupIds.includes(pickup.id) ? 0.2 : 1}
            />
          ))}
        <circle
          ref={vehicleMarkerRef}
          cx={0}
          cy={0}
          r={VEHICLE_MARKER_RADIUS}
          fill="#f8fafc"
          stroke="#0f172a"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
