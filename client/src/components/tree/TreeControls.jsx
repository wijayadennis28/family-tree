import { Pencil, Eye, MagnifyingGlassPlus, MagnifyingGlassMinus, ArrowsOut } from '@phosphor-icons/react';
import { useLanguage } from '../../context/LanguageContext';

/* ──────────────────────────────────────────
   Tree sub-header — read-only / edit mode label,
   member count, generation depth popover, and
   zoom controls.

   Ponytail: zoom delegates to ReactFlow API via
   callbacks passed from FamilyTree (which holds
   the ReactFlow ref). No useReactFlow() needed —
   TreeControls is a plain component.
   ────────────────────────────────────────── */
export default function TreeControls({
  zoomLevel, onZoomIn, onZoomOut, onReset,
  memberCount, familyName, editMode, onToggleEditMode,
  publicView = false,
}) {
  const { t } = useLanguage();

  const pillBtn =
    'w-8 h-8 flex items-center justify-center rounded-full text-ft-text-2 hover:bg-ft-accent-light hover:text-ft-accent transition-colors';

  return (
    <div className="flex items-center justify-between h-[60px] px-4 md:px-5 bg-white border-b border-ft-border-hair shrink-0 z-30">
      {/* Left — status + count */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[13px] font-bold text-ft-text-1 truncate">
          {publicView && familyName ? familyName : (editMode ? t('treeControls.editingTree') : t('treeControls.familyTree'))}
        </span>
        {memberCount !== undefined && memberCount !== null && (
          <>
            <span className="text-[13px] font-bold text-ft-text-3">•</span>
            <span className="text-[13px] font-bold text-ft-text-1">
              {memberCount} {memberCount === 1 ? t('treeControls.person') : t('treeControls.people')}
            </span>
          </>
        )}
      </div>

      {/* Right — hints + compact controls */}
      <div className="flex items-center gap-3">
        {!editMode && (
          <span className="hidden lg:inline text-[12px] font-medium text-ft-text-2 whitespace-nowrap">
            {t('treeControls.scrollHint')}
          </span>
        )}

        <div className="flex items-center gap-1 p-1 rounded-full bg-white border border-ft-border-hair shadow-ft-sm">
          {!editMode ? (
            <>
              {/* Zoom */}
              <button className={pillBtn} onClick={onZoomOut} title={t('treeControls.zoomOut')} aria-label={t('treeControls.zoomOut')}>
                <MagnifyingGlassMinus />
              </button>
              <span className="min-w-[42px] text-center text-[12px] font-bold text-ft-text-2">
                {Math.round((zoomLevel ?? 1) * 100)}%
              </span>
              <button className={pillBtn} onClick={onZoomIn} title={t('treeControls.zoomIn')} aria-label={t('treeControls.zoomIn')}>
                <MagnifyingGlassPlus />
              </button>

              <span className="w-px h-5 bg-ft-border-hair" />

              {/* Reset */}
              <button className={pillBtn} onClick={onReset} title={t('treeControls.resetView')} aria-label={t('treeControls.resetView')}>
                <ArrowsOut />
              </button>
            </>
          ) : null}

          {/* Edit / View toggle */}
          {onToggleEditMode && (
            <>
              {!editMode && <span className="w-px h-5 bg-ft-border-hair" />}
              <button
                onClick={onToggleEditMode}
                className={`${pillBtn} ${editMode ? 'bg-ft-accent text-white hover:bg-ft-accent-hover' : ''}`}
                title={editMode ? t('treeControls.exitEditMode') : t('treeControls.editRelationships')}
                aria-label={editMode ? t('treeControls.switchToViewMode') : t('treeControls.switchToEditMode')}
              >
                {editMode ? <Eye /> : <Pencil />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}