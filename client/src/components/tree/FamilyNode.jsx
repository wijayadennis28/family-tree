import { Handle, Position } from '@xyflow/react';
import MemberCard from './TreeNode';

/* ──────────────────────────────────────────
   React Flow custom node — renders MemberCard
   inside the React Flow viewport.

   onClick is handled by React Flow's onNodeClick
   at the <ReactFlow> level, so we don't duplicate
   it here. MemberCard's hover animations (GSAP)
   still fire via its internal mouse handlers.

   Handles: rendered ONLY in edit mode. In read-only,
   our custom edges draw from ELK's absolute route
   points (data.route), so no handles are needed —
   the cards stay clean and edges still attach
   correctly to node bounds.

   Ponytail: thin wrapper so MemberCard's Phase A
   styling stays untouched; React Flow just owns
   the positioning.
   ────────────────────────────────────────── */

const handleStyle = {
  width: 10,
  height: 10,
  background: 'var(--accent, #2F6BFF)',
  border: '2px solid #fff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
};

export default function FamilyNode({ data, selected }) {
  if (!data.member) return null;

  const editMode = data.editMode;

  return (
    <div
      className={`family-node${editMode ? ' edit-mode' : ''}`}
      style={{ width: data.width || 142, height: data.height || 128 }}
    >
      {/* Handles — always present so ReactFlow has anchor points for edges.
          Read-only mode: invisible + non-interactive (edges still compute correct
          sourceX/Y/targetX/Y from their positions). Edit mode: visible, clickable. */}
      <>
        <Handle type="source" position={Position.Top}    id="t" className="family-handle" style={{ ...handleStyle, opacity: editMode ? 1 : 0, pointerEvents: editMode ? 'auto' : 'none' }} />
        <Handle type="source" position={Position.Bottom} id="b" className="family-handle" style={{ ...handleStyle, opacity: editMode ? 1 : 0, pointerEvents: editMode ? 'auto' : 'none' }} />
        <Handle type="source" position={Position.Left}   id="l" className="family-handle" style={{ ...handleStyle, opacity: editMode ? 1 : 0, pointerEvents: editMode ? 'auto' : 'none' }} />
        <Handle type="source" position={Position.Right}  id="r" className="family-handle" style={{ ...handleStyle, opacity: editMode ? 1 : 0, pointerEvents: editMode ? 'auto' : 'none' }} />
      </>

      <MemberCard
        member={data.member}
        isSelected={selected}
        enterDelay="0ms"
      />
    </div>
  );
}

/* ──────────────────────────────────────────
   Marriage node — invisible dot that ELK uses
   to center children between spouse pairs. The
   node is tiny (12px) and faded — users barely
   see it, but React Flow needs a DOM element
   for hit-detection to skip it on click.
   ────────────────────────────────────────── */

export function MarriageNode() {
  return <div className="marriage-node" />;
}