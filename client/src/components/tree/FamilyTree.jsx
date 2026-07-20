import { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  NodeToolbar,
  Position,
  Background,
  Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Tree } from '@phosphor-icons/react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../hooks/useApi';
import { animateTreeIn } from '../../utils/gsapUtils';
import { buildFamilyLayout } from '../../utils/familyLayout';
import { buildTreeUrl, parseHybridSlug, buildMemberUrl } from '../../utils/treeUrl';
import TreeControls from './TreeControls';
import FamilyNode, { MarriageNode } from './FamilyNode';
import { FamilySpouseEdge, FamilyDropEdge, FamilyParentRailEdge } from './FamilyEdge';
import RelTypeModal from './RelTypeModal';
import MemberDetailPanel from './MemberDetailPanel';

/* ──────────────────────────────────────────
   Floating action pill — attached to the
   selected card via React Flow's NodeToolbar,
   which auto-positions outside the viewport
   transform so zoom/pan don't shift it.

   Admin-gated. Ponytail: NodeToolbar handles
   the anchoring — no more getBoundingClientRect
   + scroll listener hack.
   ────────────────────────────────────────── */
function ActionPill({ onAction }) {
  return (
    <div
      className="action-pill"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <button className="action-pill-btn" onClick={() => onAction('parent')}>Add Parent</button>
      <span className="action-pill-sep" />
      <button className="action-pill-btn" onClick={() => onAction('spouse')}>Add Spouse</button>
      <span className="action-pill-sep" />
      <button className="action-pill-btn" onClick={() => onAction('child')}>Add Child</button>
      <span className="action-pill-sep" />
      <button className="action-pill-btn" onClick={() => onAction('edit')}>Edit</button>
      <span className="action-pill-sep" />
      <button className="action-pill-btn danger" onClick={() => onAction('delete')}>Delete</button>
    </div>
  );
}

/* ──────────────────────────────────────────
   Node counter for the sub-header label.
   Counts unique member IDs across all roots (avoids double-counting
   spouses/children that also appear as separate roots).
   ────────────────────────────────────────── */
function collectMemberIds(node, seen = new Set()) {
  if (!node || !node.id) return seen;
  seen.add(String(node.id));
  (node.spouses || []).forEach(s => seen.add(String(s.id)));
  (node.children || []).forEach(c => collectMemberIds(c, seen));
  return seen;
}

/* ──────────────────────────────────────────
   Directional-type body for Add / Connect ops.
   Mirrors RelationshipCanvas.buildRelBody.
   ────────────────────────────────────────── */
function buildRelBody(sourceId, targetId, type, { fromPill = false, memberOrder = 1, familyId } = {}) {
  const body = { relationship_type: type };
  if (familyId !== undefined && familyId !== null) {
    body.family_id = familyId;
  }

  if (type === 'Child') {
    body.relationship_type = 'Parent';
    body.parent_id = sourceId;
    body.child_id = targetId;
    if (memberOrder !== undefined) body.member_order = memberOrder;
    return body;
  }
  if (type === 'Parent') {
    // Pill "Add Parent": selected member is the child, picked member is the new parent
    if (fromPill) {
      body.relationship_type = 'Parent';
      body.parent_id = targetId;
      body.child_id = sourceId;
      if (memberOrder !== undefined) body.member_order = memberOrder;
      return body;
    }
    body.relationship_type = 'Parent';
    body.parent_id = sourceId;
    body.child_id = targetId;
    if (memberOrder !== undefined) body.member_order = memberOrder;
    return body;
  }
  if (type === 'Spouse') {
    body.member2_id = targetId;
    body.status = 'Married';
    body.member_order = memberOrder;
    return body;
  }
  body.member2_id = targetId;
  return body;
}

/** Locate a member inside the nested tree (includes spouse back-links). */
function findTreeNode(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  for (const s of node.spouses || []) {
    if (s.id === id) {
      return {
        ...s,
        spouses: [
          { id: node.id, name: node.name },
          ...(node.spouses || []).filter(x => x.id !== s.id),
        ],
      };
    }
  }
  for (const c of node.children || []) {
    const found = findTreeNode(c, id);
    if (found) return found;
  }
  for (const p of node.parents || []) {
    const found = findTreeNode(p, id);
    if (found) return found;
  }
  return null;
}

/** Locate a member whether treeData is a single root or an array of roots. */
function findNodeInTree(treeData, id) {
  if (Array.isArray(treeData)) {
    for (const root of treeData) {
      const found = findTreeNode(root, id);
      if (found) return found;
    }
    return null;
  }
  return findTreeNode(treeData, id);
}

/* ═══════════════════════════════════════════
   Main FamilyTree — unified React Flow canvas
   with automatic layout.
   ═══════════════════════════════════════════ */
export default function FamilyTree({ publicView = false }) {
  const { memberSlug, familySlug: familySlugParam } = useParams();
  const memberId = familySlugParam ? null : parseHybridSlug(memberSlug);
  const familySlug = familySlugParam || null;
  const isFamilyView = Boolean(familySlug);
  const api = useApi();
  const navigate = useNavigate();
  const { hasAbility, activeFamily } = useContext(AuthContext);
  const { t } = useLanguage();
  const canEdit = !publicView && hasAbility('edit_tree', isFamilyView ? null : activeFamily?.id);
  const canDelete = !publicView && hasAbility('delete_member', isFamilyView ? null : activeFamily?.id);

  // ── data ──────────────────────────────────
  const [treeData,       setTreeData]       = useState(null);
  const [familyInfo,     setFamilyInfo]     = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  // ── selection ─────────────────────────────
  const [selectedMember, setSelectedMember] = useState(null);
  const [pillAction,     setPillAction]     = useState(null);

  // ── edit mode ─────────────────────────────
  const [editMode,       setEditMode]       = useState(false);
  const [editConnection, setEditConnection] = useState(null);

  // ── React Flow state ──────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [zoomLevel, setZoomLevel]       = useState(1);
  const rfRef = useRef(null);

  // ── derived ───────────────────────────────
  const selectedMemberId = useMemo(
    () => selectedMember ? `m-${selectedMember.id}` : null,
    [selectedMember],
  );
  const memberCount = useMemo(
    () => {
      if (!treeData) return 0;
      const roots = Array.isArray(treeData) ? treeData : [treeData];
      const seen = new Set();
      roots.forEach(root => collectMemberIds(root, seen));
      return seen.size;
    },
    [treeData],
  );

  const pillSpouseOptions = useMemo(() => {
    if (!pillAction || !selectedMember || !treeData) return [];
    if (pillAction.type !== 'Child' && pillAction.type !== 'Parent') return [];
    const node = findNodeInTree(treeData, selectedMember.id);
    return (node?.spouses || []).map(s => ({ id: s.id, name: s.name }));
  }, [pillAction, selectedMember, treeData]);

  /* ── API: fetch tree ─────────────────── */
  const refreshTree = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isFamilyView) {
      const [data, err] = await api.get(`/families/${familySlug}/tree`);
      if (err) setError(err);
      else {
        setTreeData(data?.roots || []);
        setFamilyInfo(data?.family || null);
      }
    } else {
      if (!memberId) return;
      const familyParam = activeFamily?.id ? `&family_id=${activeFamily.id}` : '';
      const [data, err] = await api.get(`/tree/${memberId}?ancestors=2${familyParam}`);
      if (err) setError(err);
      else setTreeData(data);
    }
    setLoading(false);
  }, [memberId, familySlug, isFamilyView, activeFamily, api]);

  useEffect(() => {
    refreshTree();
  }, [refreshTree]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── build tree layout ────────────────── */
  useEffect(() => {
    if (!treeData) {
      setNodes([]);
      setEdges([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { nodes: rfNodes, edges: rfEdges } = await buildFamilyLayout(treeData);
      if (cancelled) return;
      setNodes(rfNodes);
      setEdges(rfEdges);
    })();
    return () => { cancelled = true; };
  }, [treeData, setNodes, setEdges]);

  /* ── edit-mode handles toggle ────────── */
  useEffect(() => {
    setNodes(nds => nds.map(n =>
      n.type === 'family' ? { ...n, data: { ...n.data, editMode } } : n,
    ));
  }, [editMode, setNodes]);

  /* ── GSAP entrance animation ─────────── */
  useEffect(() => {
    if (treeData && !loading) {
      // ponytail: the ReactFlow container becomes the animation target
      const el = document.querySelector('.ft-reactflow-container');
      if (el) animateTreeIn(el);
    }
  }, [treeData, loading]);

  /* ── handlers ────────────────────────── */

  // Card click → select + show pill (NodeToolbar) + inspector
  const handleMemberClick = useCallback((member, _event) => {
    if (!member) { setSelectedMember(null); return; }
    setSelectedMember(member);
  }, []);

  // React Flow onNodeClick → extract member from node data
  const onNodeClick = useCallback((_event, node) => {
    if (node.type === 'marriage') return;
    handleMemberClick(node.data.member);
  }, [handleMemberClick]);

  // Pill button → action
  const handlePillAction = (action) => {
    if (!selectedMember) return;
    if (action === 'edit') {
      navigate(`${buildMemberUrl(selectedMember)}/edit`);
      return;
    }
    if (action === 'delete') {
      if (canDelete) handleDelete(selectedMember);
      return;
    }
    const type = action === 'parent' ? 'Parent'
              : action === 'child'  ? 'Child'
              : 'Spouse';
    setPillAction({
      type,
      sourceId: selectedMember.id,
      sourceName: selectedMember.name,
      sourceFamilyId: selectedMember.family_id,
    });
  };

  // Save new relationship from pill modal
  const handleSaveRel = async (payload) => {
    if (!pillAction) return;
    const { type, sourceId, targetId, selectedSpouses = [], memberOrder = 1 } = payload || {};
    const body = buildRelBody(Number(sourceId), Number(targetId), type, { fromPill: true, memberOrder, familyId: pillAction.sourceFamilyId });
    const [, err] = await api.post(`/members/${sourceId}/relationships`, body);
    if (err) return;

    if (type === 'Child' && selectedSpouses.length > 0) {
      for (const spouseId of selectedSpouses) {
        if (Number(spouseId) === Number(sourceId)) continue;
        const coBody = buildRelBody(Number(spouseId), Number(targetId), 'Child', { memberOrder, familyId: pillAction.sourceFamilyId });
        await api.post(`/members/${spouseId}/relationships`, coBody);
      }
    } else if (type === 'Parent' && selectedSpouses.length > 0) {
      for (const spouseId of selectedSpouses) {
        if (Number(spouseId) === Number(targetId)) continue;
        const coBody = buildRelBody(Number(spouseId), Number(sourceId), 'Child', { memberOrder, familyId: pillAction.sourceFamilyId });
        await api.post(`/members/${spouseId}/relationships`, coBody);
      }
    }

    setPillAction(null);
    await refreshTree();
  };

  // Delete member
  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.name}? This will detach their relationships.`)) return;
    const [, err] = await api.delete(`/members/${member.id}`);
    if (!err) {
      setSelectedMember(null);
      setPillAction(null);
      if (isFamilyView) {
        await refreshTree();
      } else {
        navigate(String(memberId) === String(member.id) ? '/people' : buildTreeUrl(member));
      }
    }
  };

  const handleNavigate = (member) => {
    setSelectedMember(null);
    setPillAction(null);
    if (publicView) return;
    navigate(buildTreeUrl(member));
  };

  // ── edit-mode connection ────────────── */

  /** When user drags a handle to another node, open RelTypeModal to confirm */
  const onConnect = useCallback((connection) => {
    const srcNode = nodes.find(n => n.id === connection.source);
    const tgtNode = nodes.find(n => n.id === connection.target);
    if (!srcNode?.data?.member || !tgtNode?.data?.member) return;

    setEditConnection({
      sourceId:   srcNode.data.member.id,
      sourceName: srcNode.data.member.name,
      sourceFamilyId: srcNode.data.member.family_id,
      targetId:   tgtNode.data.member.id,
      targetName: tgtNode.data.member.name,
    });
  }, [nodes]);

  /** Save connection from edit-mode drag modal */
  const handleEditConnectSave = async (payload) => {
    if (!editConnection) return;
    const { type, sourceId, targetId, selectedSpouses = [], memberOrder = 1 } = payload || {};
    const body = buildRelBody(Number(sourceId), Number(targetId), type, { memberOrder, familyId: editConnection.sourceFamilyId });
    const [, err] = await api.post(`/members/${sourceId}/relationships`, body);
    if (!err) {
      if (type === 'Child' && selectedSpouses.length > 0) {
        for (const spouseId of selectedSpouses) {
          if (Number(spouseId) === Number(sourceId)) continue;
          const coBody = buildRelBody(Number(spouseId), Number(targetId), 'Child', { memberOrder, familyId: editConnection.sourceFamilyId });
          await api.post(`/members/${spouseId}/relationships`, coBody);
        }
      } else if (type === 'Parent' && selectedSpouses.length > 0) {
        for (const spouseId of selectedSpouses) {
          if (Number(spouseId) === Number(targetId)) continue;
          const coBody = buildRelBody(Number(spouseId), Number(sourceId), 'Child', { memberOrder, familyId: editConnection.sourceFamilyId });
          await api.post(`/members/${spouseId}/relationships`, coBody);
        }
      }
      setEditConnection(null);
      await refreshTree();
    }
  };

  // ── picker exclusions ───────────────── */

  const pickerExcludeIds = (() => {
    if (!pillAction || !selectedMember) return [];
    const ids = new Set([selectedMember.id]);
    if (pillAction.type === 'Parent') {
      const collect = (n) => {
        if (!n) return;
        (n.parents || []).forEach(p => ids.add(p.id));
        (n.children || []).forEach(c => collect(c));
      };
      const node = findNodeInTree(treeData, selectedMember.id);
      if (node) collect(node);
    } else if (pillAction.type === 'Child') {
      const node = findNodeInTree(treeData, selectedMember.id);
      (node?.children || []).forEach(c => ids.add(c.id));
    }
    return Array.from(ids);
  })();

  // ── node / edge type maps ───────────── */
  const nodeTypes = useMemo(() => ({ family: FamilyNode, marriage: MarriageNode }), []);
  const edgeTypes = useMemo(() => ({
    'family-spouse': FamilySpouseEdge,
    'family-drop': FamilyDropEdge,
    'family-parent-rail': FamilyParentRailEdge,
  }), []);

  /* ── render ──────────────────────────── */

  if (!memberId && !isFamilyView) {
    return (
      <div className="tree-empty">
        <div className="tree-empty-icon"><Tree /></div>
        <h2>No family member selected</h2>
        <p>Go to People and click "View Atlas" on any person to start exploring.</p>
      </div>
    );
  }

  return (
    <div className={`ft-page${publicView ? ' ft-page-public' : ''}`}>
      <TreeControls
        zoomLevel={zoomLevel}
        onZoomIn={() => rfRef.current?.zoomIn({ duration: 200 })}
        onZoomOut={() => rfRef.current?.zoomOut({ duration: 200 })}
        onReset={() => rfRef.current?.fitView({ duration: 300, padding: 0.2 })}
        memberCount={memberCount}
        familyName={publicView ? familyInfo?.name : undefined}
        editMode={editMode}
        onToggleEditMode={isFamilyView || publicView ? undefined : () => setEditMode(m => !m)}
        publicView={publicView}
      />

      <div className="ft-reactflow-container">
        {loading && (
          <div className="ft-loading">
            <div className="ft-loading-spinner" />
            <p>Building family tree...</p>
          </div>
        )}

        {!loading && error && (
          <div className="ft-error">
            {publicView && error === 'Forbidden.'
              ? t('families.privateFamilyError')
              : 'Could not load tree. Please check the member ID and try again.'}
          </div>
        )}

        {!loading && Array.isArray(treeData) && treeData.length === 0 && isFamilyView && (
          <div className="ft-error">
            {t('families.noMembersError')}
          </div>
        )}

        {!loading && treeData && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onConnect={editMode ? onConnect : undefined}
            onInit={inst => { rfRef.current = inst; setZoomLevel(inst.getZoom?.() ?? 1); }}
            onMove={(_, vp) => setZoomLevel(vp.zoom)}
            nodesDraggable={editMode}
            nodesConnectable={editMode}
            elementsSelectable={editMode}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.25}
            maxZoom={2.5}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#E5EAF2" gap={22} size={1} />
            <Controls
              showInteractive={false}
              position="bottom-right"
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 4,
                background: 'white',
                border: '1px solid var(--border-hair, #E5EAF2)',
                borderRadius: 'var(--r-tile, 14px)',
                padding: '4px 8px',
                boxShadow: 'none',
              }}
            />

            {/* ActionPill — ability-gated, NodeToolbar-anchored to the selected card */}
            {canEdit && selectedMemberId && !editMode && (
              <NodeToolbar
                nodeId={selectedMemberId}
                position={Position.Bottom}
                align="center"
                offset={8}
              >
                <ActionPill onAction={handlePillAction} />
              </NodeToolbar>
            )}
          </ReactFlow>
        )}
      </div>

      {/* Right inspector */}
      {selectedMember && (
        <MemberDetailPanel
          member={selectedMember}
          treeData={treeData}
          onClose={() => { setSelectedMember(null); setPillAction(null); }}
          onNavigate={handleNavigate}
          publicView={publicView}
        />
      )}

      {/* Pill-action modal (targetPicker — source-only, pick target from list) */}
      <RelTypeModal
        open={!!pillAction}
        sourceId={pillAction?.sourceId}
        sourceName={pillAction?.sourceName}
        sourceFamilyId={pillAction?.sourceFamilyId}
        defaultType={pillAction?.type}
        targetPicker
        targetPickerExcludeIds={pickerExcludeIds}
        spouseOptions={pillSpouseOptions}
        onSave={handleSaveRel}
        onCancel={() => setPillAction(null)}
      />

      {/* Edit-mode drag-connect modal (both ends known) */}
      <RelTypeModal
        open={!!editConnection}
        sourceId={editConnection?.sourceId}
        sourceName={editConnection?.sourceName}
        sourceFamilyId={editConnection?.sourceFamilyId}
        targetId={editConnection?.targetId}
        targetName={editConnection?.targetName}
        onSave={handleEditConnectSave}
        onCancel={() => setEditConnection(null)}
      />
    </div>
  );
}