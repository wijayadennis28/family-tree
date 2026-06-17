export default function TreeControls({
  depth, onDepthChange,
  zoom, onZoomIn, onZoomOut, onReset,
  memberName, memberCount,
}) {
  return (
    <div className="ft-controls">
      <span className="ft-controls-title">
        🌳 {memberName ? `${memberName}'s Tree` : 'Family Tree'}
      </span>

      <div className="ft-controls-sep" />

      <span className="ft-depth-label">Generations</span>
      <div className="ft-depth-btns">
        {[1, 2, 3, 4, 5].map(d => (
          <button
            key={d}
            className={depth === d ? 'active' : ''}
            onClick={() => onDepthChange(d)}
            title={`Show ${d} generation${d > 1 ? 's' : ''} down`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="ft-controls-sep" />

      <span className="ft-depth-label">Zoom</span>
      <div className="ft-zoom-btns">
        <button onClick={onZoomOut} title="Zoom out">−</button>
        <span className="ft-zoom-level">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} title="Zoom in">+</button>
        <button onClick={onReset} title="Reset view" style={{ fontSize: '0.75rem' }}>⌂</button>
      </div>

      {memberCount > 0 && (
        <span className="ft-member-count">{memberCount} people shown</span>
      )}
    </div>
  );
}
