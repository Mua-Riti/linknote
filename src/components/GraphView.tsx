import React, { useRef, useEffect, useCallback, useState } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import { useNoteStore } from '../store/useNoteStore';

interface GraphViewProps {
  onNavigate: (noteId: string) => void;
  onClose?: () => void;
}

const GraphView: React.FC<GraphViewProps> = ({ onNavigate, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const getGraphData = useNoteStore((s) => s.getGraphData);
  const notes = useNoteStore((s) => s.notes);
  const [hasLinks, setHasLinks] = useState(true);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const { nodes, edges } = getGraphData();
    setNodeCount(nodes.length);
    setEdgeCount(edges.length);

    if (nodes.length === 0) {
      setHasLinks(false);
      return;
    }
    setHasLinks(true);

    if (cyRef.current) cyRef.current.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#8b5cf6',
            label: 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '12px',
            'font-family': 'system-ui, -apple-system, sans-serif',
            'font-weight': 'bold' as const,
            color: '#374151',
            'text-outline-color': '#ffffff',
            'text-outline-width': 3,
            'text-wrap': 'ellipsis',
            'text-max-width': '90px',
            width: 'mapData(refCount, 0, 10, 22, 48)',
            height: 'mapData(refCount, 0, 10, 22, 48)',
            'border-width': 2,
            'border-color': '#6d28d9',
            'border-opacity': 0.4,
          } as any,
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#f59e0b',
            'border-width': 4,
            'border-opacity': 1,
          },
        },
        {
          selector: 'node.highlight',
          style: {
            'border-color': '#f59e0b',
            'border-width': 3,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#c4b5fd',
            'line-opacity': 0.6,
            'target-arrow-color': '#a78bfa',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2,
          },
        },
        {
          selector: 'edge.highlight',
          style: {
            width: 3,
            'line-color': '#fbbf24',
            'line-opacity': 1,
            'target-arrow-color': '#f59e0b',
          },
        },
      ] as any,
      elements: [
        ...nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.title.length > 12 ? n.title.substring(0, 12) + '…' : n.title,
            refCount: Math.min(n.refCount, 10),
            fullTitle: n.title,
          },
        })),
        ...edges.map((e) => ({
          data: {
            id: `${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
          },
        })),
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 1200,
        animationEasing: 'ease-in-out-cubic',
        nodeRepulsion: () => 5000,
        idealEdgeLength: () => 140,
        gravity: 0.25,
        numIter: 2000,
      } as any,
      wheelSensitivity: 0.3,
      minZoom: 0.08,
      maxZoom: 4,
    });

    // 节点点击 — 跳转
    cy.on('tap', 'node', (evt: EventObject) => {
      const nodeId = evt.target.id();
      if (nodeId) onNavigate(nodeId);
    });

    // 节点悬停 — 高亮关联
    cy.on('mouseover', 'node', (evt: EventObject) => {
      const node = evt.target;
      containerRef.current!.style.cursor = 'pointer';
      node.addClass('highlight');
      node.connectedEdges().addClass('highlight');
      node.connectedEdges().connectedNodes().addClass('highlight');

      // Tooltip
      const fullTitle = node.data('fullTitle');
      const refCount = node.data('refCount');
      const tooltip = document.createElement('div');
      tooltip.className =
        'fixed z-50 bg-gray-900/95 text-white rounded-xl px-4 py-2.5 pointer-events-none shadow-xl backdrop-blur-sm text-sm';
      tooltip.innerHTML = `
        <div class="font-semibold">${escapeHtml(fullTitle)}</div>
        <div class="text-gray-400 text-xs mt-1">被引用 <span class="text-amber-400 font-semibold">${refCount}</span> 次</div>
      `;
      tooltip.id = 'graph-tooltip';
      document.body.appendChild(tooltip);

      const moveHandler = (e: MouseEvent) => {
        tooltip.style.left = `${e.clientX + 14}px`;
        tooltip.style.top = `${e.clientY - 50}px`;
      };
      document.addEventListener('mousemove', moveHandler);

      cy.one('mouseout', 'node', () => {
        document.removeEventListener('mousemove', moveHandler);
        tooltip.remove();
        containerRef.current!.style.cursor = 'grab';
        node.removeClass('highlight');
        node.connectedEdges().removeClass('highlight');
        node.connectedEdges().connectedNodes().removeClass('highlight');
      });
    });

    // 适应画布
    cy.fit(undefined, 60);
    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [getGraphData, onNavigate]);

  useEffect(() => {
    const handleResize = () => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 30);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFit = useCallback(() => cyRef.current?.fit(undefined, 60), []);
  const handleReset = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 60);
      cyRef.current.zoom(1);
      cyRef.current.center();
    }
  }, []);

  const lonelyNodes = notes.filter((n) => {
    const { nodes: gnodes } = getGraphData();
    return !gnodes.some((gn) => gn.id === n.id);
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="lg:hidden btn-ghost p-2 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center text-sm">
              🕸️
            </span>
            知识图谱
          </h2>
          {hasLinks && (
            <div className="hidden sm:flex items-center gap-3 ml-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                {nodeCount} 节点
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-brand-300 rounded-full" />
                {edgeCount} 连线
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFit}
            className="btn-ghost px-3 py-1.5 text-xs font-medium rounded-lg"
          >
            🔍 适应
          </button>
          <button
            onClick={handleReset}
            className="btn-ghost px-3 py-1.5 text-xs font-medium rounded-lg"
          >
            🔄 重置
          </button>
        </div>
      </div>

      {/* 画布 */}
      <div className="flex-1 relative bg-gradient-page">
        {hasLinks ? (
          <div ref={containerRef} className="w-full h-full" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center
                            mb-5 animate-float">
              <span className="text-4xl opacity-50">🕸️</span>
            </div>
            <p className="text-lg font-semibold text-gray-500 mb-2">暂无关联网络</p>
            <p className="text-sm text-gray-400 mb-6 text-center max-w-xs">
              在便签内容中使用
              <code className="bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded mx-1 text-xs">
                [[便签标题]]
              </code>
              来创建关联
            </p>
          </div>
        )}

        {/* 无关联节点折叠面板 */}
        {lonelyNodes.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-72">
            <details className="glass-strong rounded-2xl overflow-hidden shadow-lg">
              <summary className="px-4 py-2.5 text-xs font-semibold text-gray-500 cursor-pointer
                                  hover:text-gray-700 transition-colors flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                {lonelyNodes.length} 个便签暂无关联
              </summary>
              <div className="max-h-40 overflow-y-auto border-t border-gray-100">
                {lonelyNodes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onNavigate(n.id)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-600
                               hover:bg-brand-50 hover:text-brand-700 transition-colors truncate"
                  >
                    {n.title}
                  </button>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
          便签节点
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-brand-300 rounded-full" />
          引用连线
        </div>
        <span className="ml-auto">💡 拖拽移动 · 滚轮缩放 · 点击跳转</span>
      </div>
    </div>
  );
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return text.replace(/[&<>"]/g, (c) => map[c] || c);
}

export default GraphView;
