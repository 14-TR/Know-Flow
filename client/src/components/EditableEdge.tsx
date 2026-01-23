import { memo, useCallback, useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  useReactFlow,
  Position,
} from '@xyflow/react';
import type { ProcessEdge, Waypoint } from '../types';

interface EditableEdgeData extends ProcessEdge {
  onWaypointsChange?: (edgeId: string, waypoints: Waypoint[]) => void;
}

// Helper to safely parse waypoints (handles string, array, null, undefined)
function parseWaypoints(waypoints: unknown): Waypoint[] {
  if (!waypoints) return [];
  if (Array.isArray(waypoints)) return waypoints;
  if (typeof waypoints === 'string') {
    try {
      const parsed = JSON.parse(waypoints);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Calculate distance from a point to a line segment
function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

// Determine segment direction: 'up', 'down', 'left', 'right', or 'none'
function getDirection(dx: number, dy: number): 'up' | 'down' | 'left' | 'right' | 'none' {
  // Use threshold to handle floating point
  const threshold = 0.5;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < threshold && absDy < threshold) return 'none';

  // Determine primary direction
  if (absDx > absDy) {
    return dx > 0 ? 'right' : 'left';
  } else {
    return dy > 0 ? 'down' : 'up';
  }
}

// Build an orthogonal path with rounded corners
function buildOrthogonalPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  waypoints: Waypoint[],
  borderRadius: number = 12
): string {
  const points = [
    { x: sourceX, y: sourceY },
    ...waypoints,
    { x: targetX, y: targetY },
  ];

  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const nextNext = i < points.length - 2 ? points[i + 2] : null;

    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const segLen = Math.abs(dx) + Math.abs(dy); // Manhattan distance for orthogonal

    if (!nextNext) {
      // Last segment - draw straight to end
      path += ` L ${next.x} ${next.y}`;
      continue;
    }

    const nextDx = nextNext.x - next.x;
    const nextDy = nextNext.y - next.y;
    const nextSegLen = Math.abs(nextDx) + Math.abs(nextDy);

    const dir = getDirection(dx, dy);
    const nextDir = getDirection(nextDx, nextDy);

    // Check for actual direction change (corner)
    const isCorner = dir !== nextDir && dir !== 'none' && nextDir !== 'none';

    if (isCorner) {
      // Calculate radius - limit to half the shorter segment
      const radius = Math.max(1, Math.min(borderRadius, segLen / 2, nextSegLen / 2));

      // Calculate the point just before the corner
      let beforeX = next.x;
      let beforeY = next.y;
      if (dir === 'right') beforeX = next.x - radius;
      else if (dir === 'left') beforeX = next.x + radius;
      else if (dir === 'down') beforeY = next.y - radius;
      else if (dir === 'up') beforeY = next.y + radius;

      // Calculate the point just after the corner
      let afterX = next.x;
      let afterY = next.y;
      if (nextDir === 'right') afterX = next.x + radius;
      else if (nextDir === 'left') afterX = next.x - radius;
      else if (nextDir === 'down') afterY = next.y + radius;
      else if (nextDir === 'up') afterY = next.y - radius;

      // Draw line to before corner, then quadratic curve around corner
      path += ` L ${beforeX} ${beforeY}`;
      path += ` Q ${next.x} ${next.y}, ${afterX} ${afterY}`;
    } else {
      // No corner or same direction - straight line
      path += ` L ${next.x} ${next.y}`;
    }
  }

  return path;
}

function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  label,
}: EdgeProps) {
  const edgeData = data as EditableEdgeData;
  const waypoints: Waypoint[] = parseWaypoints(edgeData?.waypoints);
  const { setEdges, screenToFlowPosition } = useReactFlow();

  // Generate orthogonal waypoints based on source/target positions
  // Creates minimal waypoints - just the corner points needed for orthogonal routing
  const effectiveWaypoints = useMemo(() => {
    if (waypoints.length > 0) return waypoints;

    const minOffset = 50; // Minimum distance for terminal segments

    const sourceIsVertical = sourcePosition === Position.Top || sourcePosition === Position.Bottom;
    const targetIsVertical = targetPosition === Position.Top || targetPosition === Position.Bottom;
    const sourceGoingDown = sourcePosition === Position.Bottom;
    const sourceGoingRight = sourcePosition === Position.Right;
    const targetFromTop = targetPosition === Position.Top;
    const targetFromLeft = targetPosition === Position.Left;

    // For same-axis connections (both vertical or both horizontal)
    if (sourceIsVertical && targetIsVertical) {
      // Both vertical - create path: down/up, horizontal, down/up
      // Calculate the Y level for the horizontal segment
      let horizontalY: number;

      if (sourceGoingDown && targetFromTop) {
        // Source going down, target entered from top (most common)
        // Horizontal segment should be between them
        horizontalY = Math.max(sourceY + minOffset, Math.min(targetY - minOffset, (sourceY + targetY) / 2));
      } else if (!sourceGoingDown && !targetFromTop) {
        // Source going up, target entered from bottom
        horizontalY = Math.min(sourceY - minOffset, Math.max(targetY + minOffset, (sourceY + targetY) / 2));
      } else if (sourceGoingDown && !targetFromTop) {
        // Source going down, target entered from bottom - need to go around
        horizontalY = Math.max(sourceY, targetY) + minOffset;
      } else {
        // Source going up, target entered from top - need to go around
        horizontalY = Math.min(sourceY, targetY) - minOffset;
      }

      // Two corner points
      return [
        { x: sourceX, y: horizontalY },
        { x: targetX, y: horizontalY },
      ];
    }

    if (!sourceIsVertical && !targetIsVertical) {
      // Both horizontal - create path: left/right, vertical, left/right
      let verticalX: number;

      if (sourceGoingRight && targetFromLeft) {
        verticalX = Math.max(sourceX + minOffset, Math.min(targetX - minOffset, (sourceX + targetX) / 2));
      } else if (!sourceGoingRight && !targetFromLeft) {
        verticalX = Math.min(sourceX - minOffset, Math.max(targetX + minOffset, (sourceX + targetX) / 2));
      } else if (sourceGoingRight && !targetFromLeft) {
        verticalX = Math.max(sourceX, targetX) + minOffset;
      } else {
        verticalX = Math.min(sourceX, targetX) - minOffset;
      }

      return [
        { x: verticalX, y: sourceY },
        { x: verticalX, y: targetY },
      ];
    }

    // Mixed connections (one vertical, one horizontal) - just need one corner
    if (sourceIsVertical) {
      // Source vertical, target horizontal - corner at (sourceX, targetY)
      return [{ x: sourceX, y: targetY }];
    } else {
      // Source horizontal, target vertical - corner at (targetX, sourceY)
      return [{ x: targetX, y: sourceY }];
    }
  }, [waypoints, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);

  // Build path - always use orthogonal path with effective waypoints for consistent smooth corners
  const path = useMemo(() => {
    return buildOrthogonalPath(sourceX, sourceY, targetX, targetY, effectiveWaypoints, 12);
  }, [sourceX, sourceY, targetX, targetY, effectiveWaypoints]);

  // Calculate segments for dragging
  const segments = useMemo(() => {
    const points = [
      { x: sourceX, y: sourceY },
      ...effectiveWaypoints,
      { x: targetX, y: targetY },
    ];

    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const isHorizontal = Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y);
      segs.push({
        index: i,
        p1,
        p2,
        isHorizontal,
      });
    }
    return segs;
  }, [sourceX, sourceY, targetX, targetY, effectiveWaypoints]);

  // Update waypoints and persist
  const updateWaypoints = useCallback(
    (newWaypoints: Waypoint[]) => {
      setEdges((edges) =>
        edges.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...edge.data, waypoints: newWaypoints } }
            : edge
        )
      );

      // Persist to backend
      if (edgeData?.onWaypointsChange) {
        edgeData.onWaypointsChange(id, newWaypoints);
      }
    },
    [id, setEdges, edgeData]
  );

  // Handle double-click to add waypoint
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();

      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // Start with current or effective waypoints
      const newWaypoints = waypoints.length === 0 ? [...effectiveWaypoints] : [...waypoints];

      // Find closest segment using point-to-segment distance
      let closestSegIdx = 0;
      let minDist = Infinity;

      segments.forEach((seg, idx) => {
        const dist = pointToSegmentDistance(
          flowPos.x, flowPos.y,
          seg.p1.x, seg.p1.y,
          seg.p2.x, seg.p2.y
        );
        if (dist < minDist) {
          minDist = dist;
          closestSegIdx = idx;
        }
      });

      // Insert three waypoints to create a rectangular detour while maintaining orthogonality
      const seg = segments[closestSegIdx];
      if (seg.isHorizontal) {
        // Horizontal segment: create vertical detour
        // 1. Leave the line at click X
        // 2. Go to click position
        // 3. Return to original Y at end X
        newWaypoints.splice(closestSegIdx, 0,
          { x: flowPos.x, y: seg.p1.y },   // On the original line
          { x: flowPos.x, y: flowPos.y },  // At click position (vertical move)
          { x: seg.p2.x, y: flowPos.y }    // Back to end X (horizontal move)
        );
      } else {
        // Vertical segment: create horizontal detour
        // 1. Leave the line at click Y
        // 2. Go to click position
        // 3. Return to original X at end Y
        newWaypoints.splice(closestSegIdx, 0,
          { x: seg.p1.x, y: flowPos.y },   // On the original line
          { x: flowPos.x, y: flowPos.y },  // At click position (horizontal move)
          { x: flowPos.x, y: seg.p2.y }    // Back to end Y (vertical move)
        );
      }

      updateWaypoints(newWaypoints);
    },
    [waypoints, effectiveWaypoints, segments, screenToFlowPosition, updateWaypoints]
  );

  // Handle segment drag
  const handleSegmentMouseDown = useCallback(
    (segmentIndex: number, event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();

      const segment = segments[segmentIndex];
      const isFirstSegment = segmentIndex === 0;
      const isLastSegment = segmentIndex === segments.length - 1;
      const startWaypoints = waypoints.length === 0 ? [...effectiveWaypoints] : [...waypoints];

      // For terminal segments, we need to insert waypoints to create a detour
      // This maintains orthogonality while allowing the user to reshape the path
      if (isFirstSegment || isLastSegment) {
        const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });

        // Create new waypoints that form an orthogonal detour
        const newWaypoints = [...startWaypoints];

        if (isFirstSegment) {
          // First segment: source -> waypoint[0]
          // Insert waypoints at the beginning to create a detour from source
          if (segment.isHorizontal) {
            // Horizontal first segment - create vertical detour
            newWaypoints.unshift(
              { x: sourceX, y: flowPos.y },  // Go perpendicular first
              { x: flowPos.x, y: flowPos.y } // Then to click position
            );
          } else {
            // Vertical first segment - create horizontal detour
            newWaypoints.unshift(
              { x: flowPos.x, y: sourceY },  // Go perpendicular first
              { x: flowPos.x, y: flowPos.y } // Then to click position
            );
          }
        } else {
          // Last segment: waypoint[n-1] -> target
          // Insert waypoints at the end to create a detour to target
          if (segment.isHorizontal) {
            // Horizontal last segment - create vertical detour
            newWaypoints.push(
              { x: flowPos.x, y: flowPos.y }, // Click position
              { x: flowPos.x, y: targetY }    // Then go perpendicular to target
            );
          } else {
            // Vertical last segment - create horizontal detour
            newWaypoints.push(
              { x: flowPos.x, y: flowPos.y }, // Click position
              { x: targetX, y: flowPos.y }    // Then go perpendicular to target
            );
          }
        }

        updateWaypoints(newWaypoints);
        return; // Don't start drag - we've inserted the waypoints
      }

      const onMouseMove = (e: MouseEvent) => {
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

        setEdges((edges) =>
          edges.map((edge) => {
            if (edge.id !== id) return edge;

            const currentWaypoints = parseWaypoints((edge.data as EditableEdgeData)?.waypoints);
            const baseWaypoints = currentWaypoints.length > 0 ? currentWaypoints : startWaypoints;
            const newWaypoints = [...baseWaypoints];

            // Adjust waypoints based on segment being dragged
            if (segment.isHorizontal) {
              // Horizontal segment - adjust Y positions of both endpoints
              if (segmentIndex > 0 && segmentIndex - 1 < newWaypoints.length) {
                newWaypoints[segmentIndex - 1] = {
                  ...newWaypoints[segmentIndex - 1],
                  y: flowPos.y
                };
              }
              if (segmentIndex < newWaypoints.length) {
                newWaypoints[segmentIndex] = {
                  ...newWaypoints[segmentIndex],
                  y: flowPos.y
                };
              }
            } else {
              // Vertical segment - adjust X positions of both endpoints
              if (segmentIndex > 0 && segmentIndex - 1 < newWaypoints.length) {
                newWaypoints[segmentIndex - 1] = {
                  ...newWaypoints[segmentIndex - 1],
                  x: flowPos.x
                };
              }
              if (segmentIndex < newWaypoints.length) {
                newWaypoints[segmentIndex] = {
                  ...newWaypoints[segmentIndex],
                  x: flowPos.x
                };
              }
            }

            return { ...edge, data: { ...edge.data, waypoints: newWaypoints } };
          })
        );
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Persist to backend
        setEdges((edges) => {
          const edge = edges.find((e) => e.id === id);
          if (edge && edgeData?.onWaypointsChange) {
            const finalWaypoints = parseWaypoints((edge.data as EditableEdgeData)?.waypoints);
            edgeData.onWaypointsChange(id, finalWaypoints);
          }
          return edges;
        });
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [segments, waypoints, effectiveWaypoints, id, setEdges, screenToFlowPosition, edgeData]
  );

  // Calculate label position - use middle of the path
  const labelPos = useMemo(() => {
    const points = [
      { x: sourceX, y: sourceY },
      ...effectiveWaypoints,
      { x: targetX, y: targetY },
    ];
    const midIdx = Math.floor(points.length / 2);
    return {
      x: points[midIdx].x,
      y: points[midIdx].y - 10,
    };
  }, [sourceX, sourceY, targetX, targetY, effectiveWaypoints]);

  // Find which segment was clicked using proper point-to-segment distance
  const handlePathMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!selected) return;

      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // Find the closest segment using point-to-line-segment distance
      let closestSegIdx = 0;
      let minDist = Infinity;

      segments.forEach((seg, idx) => {
        const dist = pointToSegmentDistance(
          flowPos.x, flowPos.y,
          seg.p1.x, seg.p1.y,
          seg.p2.x, seg.p2.y
        );
        if (dist < minDist) {
          minDist = dist;
          closestSegIdx = idx;
        }
      });

      // Start dragging that segment
      handleSegmentMouseDown(closestSegIdx, event);
    },
    [selected, screenToFlowPosition, segments, handleSegmentMouseDown]
  );

  return (
    <>
      {/* Invisible wider path for interaction */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handlePathMouseDown}
        style={{
          cursor: selected ? 'move' : 'pointer',
          pointerEvents: 'stroke',
        }}
        className="react-flow__edge-interaction"
      />

      {/* Visible edge path */}
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: selected ? '#2196f3' : '#b1b1b7',
          strokeWidth: selected ? 2 : 1.5,
        }}
      />

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelPos.x}px, ${labelPos.y}px)`,
              background: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              border: '1px solid #ddd',
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(EditableEdge);
