import { memo, useCallback, type MouseEvent } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { X, AlertTriangle } from 'lucide-react';
import { useShapeStore } from '../../store/shapeStore';

function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const edgeValidation = useShapeStore((state) => state.edgeValidations.get(id));
  
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const handleDelete = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setEdges((edges) => edges.filter((edge) => edge.id !== id));
    },
    [id, setEdges]
  );

  // Check for shape validation errors
  const hasError = edgeValidation && !edgeValidation.isValid;
  const errorMessage = edgeValidation?.error;

  // Determine edge color based on state
  const getEdgeColor = () => {
    if (hasError) return '#ef4444'; // Red for errors
    if (selected) return '#60a5fa'; // Blue when selected
    return style?.stroke ?? '#64748b'; // Default gray
  };

  const edgeStyle = {
    ...style,
    stroke: getEdgeColor(),
    strokeWidth: selected || hasError ? 3 : (style?.strokeWidth as number) ?? 2,
    strokeDasharray: hasError ? '5,5' : undefined,
    zIndex: selected ? 1000 : 0,
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        {/* Delete button (shown when selected) */}
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            visibility: selected ? 'visible' : 'hidden',
            zIndex: 1001,
          }}
        >
          <button
            onClick={handleDelete}
            aria-label="Delete connection"
            title="Delete connection"
            style={{
              display: 'flex',
              width: 22,
              height: 22,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: `2px solid ${hasError ? '#ef4444' : '#60a5fa'}`,
              backgroundColor: '#1e293b',
              color: '#f87171',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
        
        {/* Error indicator (shown when there's a shape mismatch) */}
        {hasError && !selected && (
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            title={errorMessage || 'Shape mismatch'}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: '#7f1d1d',
                border: '2px solid #ef4444',
              }}
            >
              <AlertTriangle style={{ width: 12, height: 12, color: '#fca5a5' }} />
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(DeletableEdge);
