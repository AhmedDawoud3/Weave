import { useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { X } from 'lucide-react';
import { useWeaveStore } from '../store/useWeaveStore';

export function WeaveEdge({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const [isHovered, setIsHovered] = useState(false);
  const removeEdge = useWeaveStore((state) => state.removeEdge);

  // Selectors optimized to query primitive values from the source node.
  // This prevents the edge component from re-rendering when other nodes are dragged.
  const outputShapeStr = useWeaveStore((state) => state.nodes.find((n) => n.id === source)?.data?.outputShape?.join(','));
  const isSourceError = useWeaveStore((state) => !!state.nodes.find((n) => n.id === source)?.data?.error);

  const outputShape = outputShapeStr ? outputShapeStr.split(',').map(Number) : undefined;
  const hasShape = !!outputShape && outputShape.length > 0;

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    removeEdge(id);
  };

  const showDelete = isHovered || selected;

  // Compute animation speed based on source node tensor output volume
  let numElements = 1;
  if (hasShape && outputShape) {
    numElements = outputShape.reduce((a: number, b: number) => a * b, 1);
  }

  // Large tensors float slower; smaller tensors pulse faster
  // speed range: 0.5s (fast) to 3.0s (slow)
  const speed = Math.max(0.6, Math.min(3.0, 1.2 + Math.log10(numElements / 1000)));

  let strokeColor = 'stroke-weave-teal/25';
  if (isSourceError) {
    strokeColor = 'stroke-red-500/40';
  } else if (hasShape) {
    strokeColor = 'stroke-weave-teal/35';
  }

  // Shape label — uses × as separator for tensor notation: 32×64×7×7
  const shapeLabel = hasShape && outputShape ? outputShape.join('×') : null;

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group cursor-pointer"
    >
      {/* Invisible thicker path for easier edge selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={15}
        className="reactflow__edge-interaction"
      />

      {/* Visual path — transition-colors only (not path geometry) to avoid drag lag */}
      <path
        id={id}
        className={`reactflow__edge-path transition-colors duration-300 ${strokeColor} group-hover:stroke-weave-teal`}
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
        style={{
          ...style,
          strokeWidth: showDelete ? 3.5 : 2.5,
        }}
      />

      {/* Flow animation particle */}
      {hasShape && !isSourceError && (
        <path
          className="animate-flow-path stroke-weave-teal opacity-80"
          d={edgePath}
          fill="none"
          strokeWidth={2}
          style={{
            ['--flow-speed' as any]: `${speed}s`,
          }}
        />
      )}

      <EdgeLabelRenderer>
        {/* ── Always-visible tensor shape pill ──
            Dims are shown as 32×64×7×7 notation (familiar to researchers).
            Fades out when hovered so the delete button is readable. */}
        {shapeLabel && !isSourceError && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="nodrag nopan z-40"
          >
            <div
              className={`
                px-[5px] py-[2px] rounded-full
                bg-slate-950/85 border border-weave-teal/20
                backdrop-blur-sm
                text-weave-teal/80 font-mono font-semibold text-[7.5px] tracking-tight
                whitespace-nowrap select-none
                transition-opacity duration-150
                ${showDelete ? 'opacity-20' : 'opacity-100'}
              `}
            >
              {shapeLabel}
            </div>
          </div>
        )}

        {/* ── Hover-only delete button at same midpoint ── */}
        {showDelete && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan z-50"
          >
            <button
              onClick={onEdgeClick}
              className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center border border-[#070709] shadow-lg transition-transform hover:scale-110 active:scale-95 duration-200"
              title="Delete Connection"
            >
              <X size={10} strokeWidth={3.5} />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </g>
  );
}
