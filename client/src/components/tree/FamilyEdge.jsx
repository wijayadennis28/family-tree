import { getStraightPath } from '@xyflow/react';

/* ──────────────────────────────────────────
   Custom edges — paths use absolute flow
   coordinates from familyLayout (no ELK).
   Plain <path> avoids BaseEdge transform bugs
   that hid marriage→child lines.
   ────────────────────────────────────────── */

function routeToPath(route, fallback) {
  if (route && route.length >= 2) {
    return route.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  }
  return fallback;
}

/** Horizontal bar between spouses */
export function FamilySpouseEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const [fallback] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <path
      id={id}
      d={routeToPath(data?.route, fallback)}
      fill="none"
      className="family-edge family-spouse-edge"
    />
  );
}

/** Vertical / T-connector for parent→child */
export function FamilyDropEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const [fallback] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <path
      id={id}
      d={routeToPath(data?.route, fallback)}
      fill="none"
      className="family-edge family-drop-edge"
    />
  );
}

/** U-rail under a couple — down from each parent, bar between them */
export function FamilyParentRailEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const [fallback] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <path
      id={id}
      d={routeToPath(data?.route, fallback)}
      fill="none"
      className="family-edge family-parent-rail-edge"
    />
  );
}
