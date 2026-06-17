import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { animateTreeIn, panelIn } from '../../utils/gsapUtils';
import TreeControls from './TreeControls';
import MemberCard from './TreeNode';

function FamilyUnit({ node, depth, maxDepth, onMemberClick }) {
  if (!node) return null;
  const showChildren = depth < maxDepth && node.children?.length > 0;

  return (
    <div className="ft-family-unit">
      <div className="ft-couple-row">
        <MemberCard member={node} onClick={() => onMemberClick(node)} />
        {node.spouses?.map(spouse => (
          <div key={spouse.id} className="ft-spouse-pair">
            <div className="ft-spouse-line" />
            <MemberCard member={spouse} onClick={() => onMemberClick(spouse)} />
          </div>
        ))}
      </div>

      {showChildren && (
        <div className="ft-children-section">
          <div className="ft-drop-line" />
          <div className="ft-children-row">
            {node.children.map(child => (
              <div key={child.id} className="ft-child-item">
                <FamilyUnit node={child} depth={depth + 1} maxDepth={maxDepth} onMemberClick={onMemberClick} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberDetailPanel({ member, onClose, onNavigate }) {
  const panelRef = useRef(null);
  useEffect(() => { panelIn(panelRef.current); }, [member]);

  const isDeceased = !member.is_living;
  const initials = member.name
    ? member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="member-detail-overlay" onClick={onClose}>
      <div ref={panelRef} className="member-detail-panel" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <button className="detail-close" onClick={onClose}>x</button>
          <div className={`detail-avatar${isDeceased ? ' is-deceased' : ''}`}>
            {member.photo ? <img src={member.photo} alt={member.name} /> : initials}
          </div>
          <div className="detail-name">{member.name}</div>
          {member.chinese_name && <div className="detail-chinese">{member.chinese_name}</div>}
          <span className={`detail-badge ${isDeceased ? 'badge-deceased' : 'badge-living'}`}>
            {isDeceased ? 'Deceased' : 'Living'}
          </span>
        </div>

        <div className="detail-body">
          {member.dob && (
            <div className="detail-row">
              <span className="detail-row-label">Born</span>
              <span className="detail-row-value">{member.dob}</span>
            </div>
          )}
          {member.dod && (
            <div className="detail-row">
              <span className="detail-row-label">Died</span>
              <span className="detail-row-value">{member.dod}</span>
            </div>
          )}
          {member.place_of_birth && (
            <div className="detail-row">
              <span className="detail-row-label">Birthplace</span>
              <span className="detail-row-value">{member.place_of_birth}</span>
            </div>
          )}
          {member.gender && (
            <div className="detail-row">
              <span className="detail-row-label">Gender</span>
              <span className="detail-row-value">{member.gender}</span>
            </div>
          )}
          {member.biography && (
            <div className="detail-row" style={{ flexDirection: 'column', gap: 4 }}>
              <span className="detail-row-label">Biography</span>
              <span className="detail-bio">{member.biography}</span>
            </div>
          )}
        </div>

        <div className="detail-actions">
          <button className="btn-accent" onClick={() => onNavigate(member.id)}>View Their Tree</button>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function countNodes(node, depth, maxDepth) {
  if (!node || depth > maxDepth) return 0;
  let count = 1 + (node.spouses?.length || 0);
  if (node.children) node.children.forEach(c => { count += countNodes(c, depth + 1, maxDepth); });
  return count;
}

export default function FamilyTree() {
  const { memberId } = useParams();
  const api = useApi();
  const navigate = useNavigate();

  const [treeData,       setTreeData]       = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [depth,          setDepth]          = useState(3);
  const [selectedMember, setSelectedMember] = useState(null);
  const [zoom,           setZoom]           = useState(1);
  const [pan,            setPan]            = useState({ x: 0, y: 0 });
  const [isPanning,      setIsPanning]      = useState(false);

  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const treeRef  = useRef(null);
  const viewRef  = useRef(null);
  const touchStart = useRef(null);

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const [data, err] = await api.get(`/tree/${memberId}?depth=${depth}&ancestors=2`);
      if (cancelled) return;
      if (err) setError(err);
      else setTreeData(data);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, depth]);

  useEffect(() => {
    if (treeData && treeRef.current && !loading) animateTreeIn(treeRef.current);
  }, [treeData, loading]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(z => parseFloat(Math.min(Math.max(z + delta, 0.25), 2.5).toFixed(2)));
  }, []);

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  };
  const handleMouseUp = () => setIsPanning(false);

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
  };
  const handleTouchMove = (e) => {
    if (!touchStart.current || e.touches.length !== 1) return;
    e.preventDefault();
    setPan({
      x: touchStart.current.panX + (e.touches[0].clientX - touchStart.current.x),
      y: touchStart.current.panY + (e.touches[0].clientY - touchStart.current.y),
    });
  };

  const handleNavigate = (id) => {
    setSelectedMember(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    navigate(`/tree/${id}`);
  };

  const memberCount = treeData ? countNodes(treeData, 0, depth) : 0;

  if (!memberId) {
    return (
      <div className="tree-empty">
        <div className="tree-empty-icon">tree</div>
        <h2>No family member selected</h2>
        <p>Go to Members and click "View Tree" on any person to start exploring.</p>
      </div>
    );
  }

  return (
    <div className="ft-page">
      <TreeControls
        depth={depth} onDepthChange={setDepth}
        zoom={zoom}
        onZoomIn={() => setZoom(z => parseFloat(Math.min(z + 0.1, 2.5).toFixed(2)))}
        onZoomOut={() => setZoom(z => parseFloat(Math.max(z - 0.1, 0.25).toFixed(2)))}
        onReset={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
        memberName={treeData?.name}
        memberCount={memberCount}
      />

      <div
        ref={viewRef}
        className="ft-viewport"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { touchStart.current = null; }}
      >
        {loading && (
          <div className="ft-loading">
            <div className="ft-loading-spinner" />
            <p>Building family tree...</p>
          </div>
        )}

        {!loading && error && (
          <div className="ft-error">Could not load tree. Please check the member ID and try again.</div>
        )}

        {!loading && treeData && (
          <div
            className="ft-canvas"
            ref={treeRef}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center top',
            }}
          >
            {treeData.parents?.length > 0 && (
              <div className="ft-parents-section">
                <div className="ft-parents-row">
                  {treeData.parents.map(parent => (
                    <div key={parent.id} className="ft-parent-item">
                      <MemberCard member={parent} compact onClick={() => setSelectedMember(parent)} />
                      {parent.spouses?.map(s => (
                        <div key={s.id} className="ft-spouse-pair">
                          <div className="ft-spouse-line" />
                          <MemberCard member={s} compact onClick={() => setSelectedMember(s)} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <FamilyUnit
              node={treeData}
              depth={0}
              maxDepth={depth}
              onMemberClick={setSelectedMember}
            />
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberDetailPanel
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
