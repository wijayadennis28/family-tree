import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, House, GitBranch } from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

function FamilyNode({ data }) {
  return (
    <div className="bg-white border-2 border-ft-accent rounded-2xl p-4 shadow-ft-md min-w-[180px] text-center">
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-ft-accent" />
      <div className="w-10 h-10 rounded-full bg-ft-accent-light text-ft-accent flex items-center justify-center mx-auto mb-2">
        <House className="text-lg" />
      </div>
      <h3 className="font-extrabold text-ft-text-1 text-base">{data.name}</h3>
      {data.description && <p className="text-xs text-ft-text-3 mt-1">{data.description}</p>}
      <p className="text-xs text-ft-text-2 mt-2 font-semibold">{data.members_count} members</p>
    </div>
  );
}

function BranchNode({ data }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-ft-sm min-w-[160px] text-center hover:border-ft-accent/40 transition-colors">
      <Handle type="target" position={Position.Top} id="top" className="!bg-ft-accent" />
      <div className="w-8 h-8 rounded-full bg-ft-accent-light/60 text-ft-accent flex items-center justify-center mx-auto mb-2">
        <GitBranch className="text-sm" />
      </div>
      <h4 className="font-bold text-ft-text-1 text-sm">{data.name}</h4>
      {data.description && <p className="text-xs text-ft-text-3 mt-1 truncate">{data.description}</p>}
      <p className="text-xs text-ft-text-2 mt-1 font-medium">{data.members_count} members</p>
    </div>
  );
}

export default function BranchTree() {
  const { familyId } = useParams();
  const api = useApi();
  const toast = useToast();
  const { t } = useLanguage();

  const [family, setFamily] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, err] = await api.get(`/families/${familyId}/branch-tree`);
    if (err) {
      setError(typeof err === 'string' ? err : t('branchTree.loadError'));
      toast.addToast(t('branchTree.loadError'), 'error');
    } else {
      setFamily(data.family);
      setBranches(data.branches);
    }
    setLoading(false);
  }, [api, familyId, toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const nodes = [];
  const edges = [];

  if (family) {
    nodes.push({
      id: 'family',
      type: 'family',
      position: { x: 0, y: 0 },
      data: family,
    });

    const branchCount = branches.length;
    const spacing = 220;
    const totalWidth = (branchCount - 1) * spacing;
    const startX = -totalWidth / 2;

    branches.forEach((branch, index) => {
      const x = startX + index * spacing;
      const y = 180;
      nodes.push({
        id: `branch-${branch.id}`,
        type: 'branch',
        position: { x, y },
        data: branch,
      });
      edges.push({
        id: `family-branch-${branch.id}`,
        source: 'family',
        target: `branch-${branch.id}`,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'smoothstep',
        style: { stroke: '#2f6bff', strokeWidth: 2 },
      });
    });
  }

  const nodeTypes = { family: FamilyNode, branch: BranchNode };

  return (
    <div className="min-h-full bg-ft-bg">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-ft-text-1 tracking-tight">
              {family ? family.name : t('branchTree.title')}
            </h1>
            <p className="text-sm text-ft-text-3 mt-0.5">
              {family ? t('branchTree.subtitle', {
                count: branches.length,
                family: family.name,
                branchesLabel: branches.length === 1 ? t('branchTree.branchesLabelOne') : t('branchTree.branchesLabel')
              }) : t('common.loading')}
            </p>
          </div>            <Link
              to="/families"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ft-header text-white text-xs font-bold no-underline hover:bg-ft-header/90 transition-colors"
            >
              <ArrowLeft /> {t('branchTree.backToFamilies')}
            </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-24 lg:pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-ft-text-2">
            <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-ft-accent animate-spin" />
            <p className="text-sm">{t('branchTree.loading')}</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl p-4 text-sm font-semibold">
            {error}
          </div>
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-ft-accent-light text-ft-accent flex items-center justify-center text-2xl mb-4">
              <GitBranch />
            </div>
            <h2 className="text-xl font-bold text-ft-text-1 mb-1">{t('branchTree.noBranches')}</h2>
            <p className="text-sm text-ft-text-3 mb-6 max-w-md">
              {t('branchTree.noBranchesHint')}
            </p>
            <Link
              to="/families"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ft-accent text-white font-bold text-sm hover:bg-ft-accent-hover transition-colors"
            >
              <ArrowLeft /> {t('branchTree.backToFamilies')}
            </Link>
          </div>
        ) : (
          <div className="h-[70vh] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-ft-sm">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.25}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#E5EAF2" gap={22} size={1} />
              <Controls showInteractive={false} position="bottom-right" />
            </ReactFlow>
          </div>
        )}
      </div>
    </div>
  );
}
