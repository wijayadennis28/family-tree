/* ──────────────────────────────────────────
   Family Layout — deterministic (no ELK).
   ────────────────────────────────────────── */

const CARD_W = 170;
const CARD_H = 175;
const SPOUSE_GAP = 40;
const CHILD_GAP = 40;
const JUNCTION_TO_CHILD = 48;
const BAR_ABOVE_CHILD = 10;
const PARENT_RAIL_OFFSET = 12;

function mkId(prefix, id) {
  return `${prefix}-${id}`;
}

function topCenter(pos) {
  return { x: pos.x + CARD_W / 2, y: pos.y };
}

function bottomCenter(pos) {
  return { x: pos.x + CARD_W / 2, y: pos.y + CARD_H };
}

function coupleJunction(memberPos, spousePos) {
  return coupleStemPoint(memberPos, spousePos);
}

/** Horizontal rail Y just below both parent cards. */
function parentRailY(leftPos, rightPos) {
  return Math.max(leftPos.y, rightPos.y) + CARD_H + PARENT_RAIL_OFFSET;
}

/** Center point on the rail where the child stem drops. */
function coupleStemPoint(leftPos, rightPos) {
  const l = bottomCenter(leftPos);
  const r = bottomCenter(rightPos);
  return { x: (l.x + r.x) / 2, y: parentRailY(leftPos, rightPos) };
}

/** U-rail: down from each parent bottom, connected by horizontal bar (green sketch). */
function coupleBracketRoute(leftPos, rightPos) {
  const railY = parentRailY(leftPos, rightPos);
  const l = bottomCenter(leftPos);
  const r = bottomCenter(rightPos);
  return [
    { x: l.x, y: l.y },
    { x: l.x, y: railY },
    { x: r.x, y: railY },
    { x: r.x, y: r.y },
  ];
}

function spouseRoute(leftPos, rightPos) {
  const y = leftPos.y + CARD_H / 2;
  return [
    { x: leftPos.x + CARD_W, y },
    { x: rightPos.x, y },
  ];
}

function dropRoute(from, to) {
  return [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
}

function findSpouseEdge(nodeId, edges, prefixes = null) {
  return edges.find((e) => {
    if (e.type !== 'family-spouse') return false;
    if (prefixes && !prefixes.some(p => e.id.startsWith(p))) return false;
    return e.source === nodeId || e.target === nodeId;
  });
}

/** T-drop from couple junction to one child card top. */
function childDropRoute(junction, childTop, barY) {
  if (Math.abs(junction.x - childTop.x) < 2) {
    return dropRoute(junction, childTop);
  }
  return [
    { x: junction.x, y: junction.y },
    { x: junction.x, y: barY },
    { x: childTop.x, y: barY },
    { x: childTop.x, y: childTop.y },
  ];
}

function mkMemberNode(member, pos) {
  return {
    id: mkId('m', member.id),
    type: 'family',
    position: { x: pos.x, y: pos.y },
    data: { member, width: CARD_W, height: CARD_H },
    draggable: false,
    selectable: true,
  };
}

function mkEdge(id, type, source, target, route) {
  return { id, type, source, target, data: { route }, animated: false, selectable: false };
}

function coupleRowWidth(spouseCount, spouseGap = SPOUSE_GAP) {
  if (spouseCount <= 0) return CARD_W;
  return CARD_W + spouseCount * (CARD_W + spouseGap);
}

/** Width of the ancestor column above one person. */
function ancestorColumnWidth(parents) {
  if (!parents || parents.length === 0) return CARD_W;
  if (parents.length === 1) return CARD_W;
  return coupleRowWidth(1);
}

/** Extra horizontal gap so two ancestor columns don't overlap. */
function minSpouseGapForAncestors(member) {
  const rootAnc = ancestorColumnWidth(member.parents);
  let gap = SPOUSE_GAP;
  for (const spouse of member.spouses || []) {
    const needed = (rootAnc + ancestorColumnWidth(spouse.parents)) / 2 - CARD_W;
    gap = Math.max(gap, needed);
  }
  return gap;
}

function measureSubtree(member) {
  const rowW = coupleRowWidth((member.spouses || []).length);
  const children = member.children || [];
  if (!children.length) return rowW;
  const kidsW = children.reduce(
    (sum, c, i) => sum + measureSubtree(c) + (i > 0 ? CHILD_GAP : 0),
    0,
  );
  return Math.max(rowW, kidsW);
}

function upsertMemberNode(nodes, seen, member, pos) {
  const id = mkId('m', member.id);
  if (seen.has(id)) {
    const existing = nodes.find(n => n.id === id);
    if (existing) existing.position = { x: pos.x, y: pos.y };
    return id;
  }
  seen.add(id);
  nodes.push(mkMemberNode(member, pos));
  return id;
}

function sortSpouses(spouses) {
  return [...(spouses || [])].sort((a, b) => {
    const orderA = a.relationship?.member_order ?? 1;
    const orderB = b.relationship?.member_order ?? 1;
    return orderA - orderB;
  });
}

function placeCoupleRow(member, leftX, y, seen, nodes, edges, idPrefix = '', spouseGap = SPOUSE_GAP) {
  const sortedSpouses = sortSpouses(member.spouses);

  // member_order === 0 places the spouse on the left of the focus member;
  // member_order > 0 places the spouse on the right.
  const leftSpouses = sortedSpouses.filter(s => (s.relationship?.member_order ?? 1) === 0);
  const rightSpouses = sortedSpouses.filter(s => (s.relationship?.member_order ?? 1) !== 0);

  const rowMembers = [...leftSpouses, member, ...rightSpouses];
  const positions = new Map();
  let x = leftX;

  for (const m of rowMembers) {
    const pos = { x, y };
    const nodeId = upsertMemberNode(nodes, seen, m, pos);
    positions.set(String(m.id), { pos, nodeId });
    x += CARD_W + spouseGap;
  }

  const memberData = positions.get(String(member.id));
  const memberPos = memberData.pos;
  const memberNodeId = memberData.nodeId;
  const spouseEntries = [];

  for (const spouse of sortedSpouses) {
    const sData = positions.get(String(spouse.id));
    spouseEntries.push(sData);

    const [leftPos, rightPos] = memberPos.x < sData.pos.x
      ? [memberPos, sData.pos]
      : [sData.pos, memberPos];

    edges.push(mkEdge(
      `${idPrefix}e-sp-${member.id}-${spouse.id}`,
      'family-spouse',
      memberNodeId,
      sData.nodeId,
      spouseRoute(leftPos, rightPos),
    ));
  }

  const rowW = coupleRowWidth(rowMembers.length - 1, spouseGap);
  let junction = bottomCenter(memberPos);
  if (spouseEntries.length > 0) {
    junction = coupleJunction(memberPos, spouseEntries[0].pos);
  }

  return { memberPos, rowLeftX: leftX, rowW, junction, memberNodeId, spouseNodeId: spouseEntries[0]?.nodeId };
}

function sortChildren(children) {
  return [...(children || [])].sort((a, b) => {
    const orderA = a.child_order ?? 0;
    const orderB = b.child_order ?? 0;
    return orderA - orderB;
  });
}

function layoutSubtree(member, leftX, y, seen, nodes, edges, spouseGap = SPOUSE_GAP) {
  const row = placeCoupleRow(member, leftX, y, seen, nodes, edges, '', spouseGap);
  const children = sortChildren(dedupeById(member.children || []));
  const rowCenterX = row.rowLeftX + row.rowW / 2;

  if (children.length > 0) {
    const childY = row.junction.y + JUNCTION_TO_CHILD;
    const widths = children.map(c => measureSubtree(c));
    const totalW = widths.reduce((s, w, i) => s + w + (i > 0 ? CHILD_GAP : 0), 0);
    let cx = rowCenterX - totalW / 2;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const w = widths[i];
      const childLeftX = cx + (w - coupleRowWidth((child.spouses || []).length)) / 2;

      edges.push(mkEdge(
        `e-child-${member.id}-${child.id}`,
        'family-drop',
        row.memberNodeId,
        mkId('m', child.id),
        [], // rebuilt in finalizeEdgeRoutes
      ));

      layoutSubtree(child, childLeftX, childY, seen, nodes, edges);
      cx += w + CHILD_GAP;
    }
  }
}

function dedupeById(list) {
  const seen = new Set();
  return list.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function layoutAncestorCouple(pA, pB, childPos, childNodeId, seen, nodes, edges) {
  const rowW = coupleRowWidth(1);
  const leftX = childPos.x + CARD_W / 2 - rowW / 2;
  const y = childPos.y - CARD_H - LAYER_GAP;
  const idPrefix = `anc-${childNodeId}-`;

  const fakeParent = { ...pA, spouses: [{ ...pB }] };
  placeCoupleRow(fakeParent, leftX, y, seen, nodes, edges, idPrefix);

  edges.push(mkEdge(
    `e-anc-cpl-${pA.id}-${pB.id}-to-${childNodeId}`,
    'family-drop',
    mkId('m', pA.id),
    childNodeId,
    [],
  ));
}

const LAYER_GAP = 72;

function layoutAncestors(parents, childPos, childNodeId, seen, nodes, edges) {
  if (!parents.length) return;

  if (parents.length >= 2) {
    layoutAncestorCouple(parents[0], parents[1], childPos, childNodeId, seen, nodes, edges);
    return;
  }

  const p = parents[0];
  const pPos = { x: childPos.x, y: childPos.y - CARD_H - LAYER_GAP };
  const pId = upsertMemberNode(nodes, seen, p, pPos);
  edges.push(mkEdge(
    `e-anc-solo-${p.id}-to-${childNodeId}`,
    'family-drop',
    pId,
    childNodeId,
    [],
  ));
}

/** True when the focus row (member + any spouse) has at least one parent to show above. */
function rowHasAncestors(member) {
  if ((member.parents || []).length > 0) return true;
  return (member.spouses || []).some(s => (s.parents || []).length > 0);
}

/** Lay ancestors above each person in the focus couple row (dual columns). */
function layoutFocusRowAncestors(member, nodes, seen, edges) {
  const rootId = mkId('m', member.id);
  const rootNode = nodes.find(n => n.id === rootId);
  if (!rootNode) return;

  if ((member.parents || []).length > 0) {
    layoutAncestors(member.parents, rootNode.position, rootId, seen, nodes, edges);
  }

  for (const spouse of member.spouses || []) {
    if (!(spouse.parents || []).length) continue;
    const spouseNodeId = mkId('m', spouse.id);
    const spouseNode = nodes.find(n => n.id === spouseNodeId);
    if (!spouseNode) continue;
    layoutAncestors(spouse.parents, spouseNode.position, spouseNodeId, seen, nodes, edges);
  }
}

/** Rebuild every edge route from final node positions (fixes gaps). */
function finalizeEdgeRoutes(nodes, edges) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const bracketAdded = new Set();

  function addCoupleBracket(parentNode, spouseNode, prefix = '') {
    const key = prefix + [parentNode.id, spouseNode.id].sort().join('--');
    if (bracketAdded.has(key)) {
      return coupleStemPoint(parentNode.position, spouseNode.position);
    }
    bracketAdded.add(key);
    edges.push(mkEdge(
      `${prefix}e-bracket-${key}`,
      'family-parent-rail',
      parentNode.id,
      spouseNode.id,
      coupleBracketRoute(parentNode.position, spouseNode.position),
    ));
    return coupleStemPoint(parentNode.position, spouseNode.position);
  }

  for (const e of edges) {
    if (e.type === 'family-spouse') {
      const src = byId.get(e.source);
      const tgt = byId.get(e.target);
      if (src && tgt) e.data.route = spouseRoute(src.position, tgt.position);
    }
  }

  for (const e of edges) {
    if (!e.id.startsWith('e-anc-solo-')) continue;
    const src = byId.get(e.source);
    const tgt = byId.get(e.target);
    if (!src || !tgt) continue;
    const childTop = topCenter(tgt.position);
    const barY = tgt.position.y - BAR_ABOVE_CHILD;
    e.data.route = childDropRoute(bottomCenter(src.position), childTop, barY);
  }

  const childGroups = new Map();
  for (const e of edges) {
    if (!e.id.startsWith('e-child-')) continue;
    const parentId = e.id.split('-')[2];
    if (!childGroups.has(parentId)) childGroups.set(parentId, []);
    childGroups.get(parentId).push(e);
  }

  for (const [, group] of childGroups) {
    const parentNode = byId.get(group[0].source);
    if (!parentNode) continue;

    const spouseEdge = findSpouseEdge(parentNode.id, edges, ['e-sp-']);

    let stem = bottomCenter(parentNode.position);
    if (spouseEdge) {
      const spouseId = spouseEdge.source === parentNode.id ? spouseEdge.target : spouseEdge.source;
      const spouseNode = byId.get(spouseId);
      if (spouseNode) {
        stem = addCoupleBracket(parentNode, spouseNode);
      }
    }

    const childNodes = group.map(e => byId.get(e.target)).filter(Boolean);
    const barY = Math.min(...childNodes.map(n => n.position.y)) - BAR_ABOVE_CHILD;

    for (const e of group) {
      const child = byId.get(e.target);
      if (!child) continue;
      e.data.route = childDropRoute(stem, topCenter(child.position), barY);
    }
  }

  for (const e of edges) {
    if (!e.id.startsWith('e-anc-cpl-')) continue;
    const src = byId.get(e.source);
    const tgt = byId.get(e.target);
    if (!src || !tgt) continue;

    const spouseEdge = findSpouseEdge(src.id, edges);
    const childNodeId = e.id.split('-to-')[1];
    const bracketPrefix = childNodeId ? `anc-${childNodeId}-` : 'anc-';

    let stem = bottomCenter(src.position);
    if (spouseEdge) {
      const spouseId = spouseEdge.source === src.id ? spouseEdge.target : spouseEdge.source;
      const spouseNode = byId.get(spouseId);
      if (spouseNode) stem = addCoupleBracket(src, spouseNode, bracketPrefix);
    }

    const childTop = topCenter(tgt.position);
    const barY = tgt.position.y - BAR_ABOVE_CHILD;
    e.data.route = childDropRoute(stem, childTop, barY);
  }
}

function buildDeterministicLayout(treeData) {
  const seen = new Set();
  const nodes = [];
  const edges = [];
  const hasAncestors = rowHasAncestors(treeData);
  const rootY = hasAncestors ? CARD_H + LAYER_GAP : 0;
  const rootSpouseGap = hasAncestors ? minSpouseGapForAncestors(treeData) : SPOUSE_GAP;

  layoutSubtree(treeData, 0, rootY, seen, nodes, edges, rootSpouseGap);

  if (hasAncestors) {
    layoutFocusRowAncestors(treeData, nodes, seen, edges);
  }

  const minX = nodes.reduce((m, n) => Math.min(m, n.position.x), Infinity);
  const shift = Number.isFinite(minX) ? -minX : 0;
  if (shift) {
    for (const n of nodes) n.position.x += shift;
  }

  finalizeEdgeRoutes(nodes, edges);

  return { nodes, edges };
}

export async function buildFamilyLayout(treeData) {
  if (!treeData) return { nodes: [], edges: [] };

  // Support an array of disconnected trees (whole family view)
  const roots = Array.isArray(treeData) ? treeData : [treeData];
  if (roots.length === 0) return { nodes: [], edges: [] };

  let offsetX = 0;
  const allNodes = [];
  const allEdges = [];

  for (const root of roots) {
    const { nodes, edges } = buildDeterministicLayout(root);
    if (nodes.length === 0) continue;

    // Shift this subtree by the current offset
    for (const n of nodes) {
      n.position.x += offsetX;
    }

    // Recalculate edge routes after shifting
    const shiftX = offsetX;
    for (const e of edges) {
      if (Array.isArray(e.data?.route)) {
        e.data.route = e.data.route.map(p => ({ x: p.x + shiftX, y: p.y }));
      }
    }

    allNodes.push(...nodes);
    allEdges.push(...edges);

    // Compute width of this subtree for the next offset
    const maxX = nodes.reduce((m, n) => Math.max(m, n.position.x + (n.data?.width || CARD_W)), 0);
    offsetX = maxX + 80;
  }

  return { nodes: allNodes, edges: allEdges };
}
