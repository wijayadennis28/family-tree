import FamilyTree from './FamilyTree';

/* ──────────────────────────────────────────
   Public family tree — chromeless, shareable
   canvas accessible without authentication.

   This is a thin wrapper around FamilyTree that
   activates public-view mode (no edit actions,
   no private links, full-viewport layout).
   ────────────────────────────────────────── */
export default function PublicFamilyTree() {
  return <FamilyTree publicView />;
}
