'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type RoomSize = 'small' | 'medium' | 'large';
type ObjectCategory = 'furniture' | 'electronics' | 'evidence';
type Rotation = 0 | 90 | 180 | 270;

interface PlacedObject {
  id: string;
  type: string;
  gridX: number;
  gridZ: number;
  rotation: Rotation;
}

interface ObjectDef {
  type: string;
  displayName: string;
  category: ObjectCategory;
  gridWidth: number;
  gridDepth: number;
  canPlaceOnFloor: boolean;
  icon: string;
  collisionEnabled: boolean;
}

const ROOM_SIZES: Record<RoomSize, { width: number; depth: number; label: string }> = {
  small: { width: 20, depth: 15, label: 'Small (20x15)' },
  medium: { width: 30, depth: 20, label: 'Medium (30x20)' },
  large: { width: 40, depth: 30, label: 'Large (40x30)' },
};

const OBJECT_DEFINITIONS: ObjectDef[] = [
  // Furniture
  { type: 'desk', displayName: 'Desk', category: 'furniture', gridWidth: 2, gridDepth: 1, canPlaceOnFloor: true, icon: '🪑', collisionEnabled: true },
  { type: 'desk_large', displayName: 'L-Desk', category: 'furniture', gridWidth: 3, gridDepth: 2, canPlaceOnFloor: true, icon: '🔲', collisionEnabled: true },
  { type: 'table', displayName: 'Table', category: 'furniture', gridWidth: 2, gridDepth: 1, canPlaceOnFloor: true, icon: '🪑', collisionEnabled: true },
  { type: 'chair', displayName: 'Chair', category: 'furniture', gridWidth: 1, gridDepth: 1, canPlaceOnFloor: true, icon: '🪑', collisionEnabled: true },
  { type: 'cabinet', displayName: 'Cabinet', category: 'furniture', gridWidth: 1, gridDepth: 1, canPlaceOnFloor: true, icon: '🗄️', collisionEnabled: true },
  { type: 'shelf', displayName: 'Bookshelf', category: 'furniture', gridWidth: 2, gridDepth: 1, canPlaceOnFloor: true, icon: '📚', collisionEnabled: true },
  { type: 'whiteboard', displayName: 'Whiteboard', category: 'furniture', gridWidth: 2, gridDepth: 1, canPlaceOnFloor: true, icon: '📋', collisionEnabled: false },
  // Electronics
  { type: 'computer', displayName: 'Desktop PC', category: 'electronics', gridWidth: 1, gridDepth: 1, canPlaceOnFloor: false, icon: '🖥️', collisionEnabled: false },
  { type: 'laptop', displayName: 'Laptop', category: 'electronics', gridWidth: 1, gridDepth: 1, canPlaceOnFloor: false, icon: '💻', collisionEnabled: false },
  { type: 'phone', displayName: 'Cell Phone', category: 'electronics', gridWidth: 1, gridDepth: 1, canPlaceOnFloor: false, icon: '📱', collisionEnabled: false },
  { type: 'keyboard', displayName: 'Keyboard', category: 'electronics', gridWidth: 1, gridDepth: 1, canPlaceOnFloor: false, icon: '⌨️', collisionEnabled: false },
  { type: 'mouse', displayName: 'Mouse', category: 'electronics', gridWidth: 1, gridDepth: 1, canPlaceOnFloor: false, icon: '🖱️', collisionEnabled: false },
  // Evidence
  { type: 'thumbdrive', displayName: 'USB Drive', category: 'evidence', gridWidth: 1, gridDepth: 1, canPlaceOnFloor: false, icon: '💾', collisionEnabled: false },
  { type: 'harddrive', displayName: 'Hard Drive', category: 'evidence', gridWidth: 1, gridDepth: 1, canPlaceOnFloor: false, icon: '💿', collisionEnabled: false },
  { type: 'server_rack', displayName: 'Server Rack', category: 'evidence', gridWidth: 1, gridDepth: 2, canPlaceOnFloor: true, icon: '🖧', collisionEnabled: true },
];

function MapBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapId = searchParams.get('id');

  const [mapName, setMapName] = useState('New Map');
  const [roomSize, setRoomSize] = useState<RoomSize>('medium');
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null);
  const [currentRotation, setCurrentRotation] = useState<Rotation>(0);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!mapId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; z: number } | null>(null);

  // Load existing map
  useEffect(() => {
    if (!mapId) return;

    const loadMap = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('id', mapId)
        .single() as { data: any; error: any };

      if (error) {
        console.error('Error loading map:', error);
        router.push('/dashboard/maps');
        return;
      }

      setMapName(data.name);
      setRoomSize(data.room_size as RoomSize);
      setPlacedObjects((data.map_data as { objects: PlacedObject[] })?.objects || []);
      setLoading(false);
    };

    loadMap();
  }, [mapId, router]);

  // Draw grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dims = ROOM_SIZES[roomSize];
    const cellSize = Math.min(
      (canvas.width - 40) / dims.width,
      (canvas.height - 40) / dims.depth
    );
    const offsetX = (canvas.width - dims.width * cellSize) / 2;
    const offsetY = (canvas.height - dims.depth * cellSize) / 2;

    // Clear
    ctx.fillStyle = '#0a0f14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#1a2530';
    ctx.lineWidth = 1;

    for (let x = 0; x <= dims.width; x++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + x * cellSize, offsetY);
      ctx.lineTo(offsetX + x * cellSize, offsetY + dims.depth * cellSize);
      ctx.stroke();
    }

    for (let z = 0; z <= dims.depth; z++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + z * cellSize);
      ctx.lineTo(offsetX + dims.width * cellSize, offsetY + z * cellSize);
      ctx.stroke();
    }

    // Draw walls (border)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, dims.width * cellSize, dims.depth * cellSize);

    // Draw placed objects
    placedObjects.forEach((obj) => {
      const def = OBJECT_DEFINITIONS.find((d) => d.type === obj.type);
      if (!def) return;

      const isRotated = obj.rotation === 90 || obj.rotation === 270;
      const w = isRotated ? def.gridDepth : def.gridWidth;
      const d = isRotated ? def.gridWidth : def.gridDepth;

      const x = offsetX + obj.gridX * cellSize;
      const y = offsetY + obj.gridZ * cellSize;

      // Object background
      const isSelected = selectedPlacedId === obj.id;
      ctx.fillStyle = isSelected ? 'rgba(0, 240, 255, 0.3)' : 'rgba(0, 200, 100, 0.2)';
      ctx.fillRect(x, y, w * cellSize, d * cellSize);

      // Object border
      ctx.strokeStyle = isSelected ? '#00f0ff' : '#00c864';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x, y, w * cellSize, d * cellSize);

      // Object icon
      ctx.font = `${cellSize * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(def.icon, x + (w * cellSize) / 2, y + (d * cellSize) / 2);
    });

    // Draw hover preview
    if (hoveredCell && selectedObjectType) {
      const def = OBJECT_DEFINITIONS.find((d) => d.type === selectedObjectType);
      if (def) {
        const isRotated = currentRotation === 90 || currentRotation === 270;
        const w = isRotated ? def.gridDepth : def.gridWidth;
        const d = isRotated ? def.gridWidth : def.gridDepth;

        const x = offsetX + hoveredCell.x * cellSize;
        const y = offsetY + hoveredCell.z * cellSize;

        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fillRect(x, y, w * cellSize, d * cellSize);

        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, w * cellSize, d * cellSize);
        ctx.setLineDash([]);

        ctx.font = `${cellSize * 0.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(def.icon, x + (w * cellSize) / 2, y + (d * cellSize) / 2);
        ctx.globalAlpha = 1;
      }
    }
  }, [roomSize, placedObjects, hoveredCell, selectedObjectType, currentRotation, selectedPlacedId]);

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const dims = ROOM_SIZES[roomSize];
      const cellSize = Math.min(
        (canvas.width - 40) / dims.width,
        (canvas.height - 40) / dims.depth
      );
      const offsetX = (canvas.width - dims.width * cellSize) / 2;
      const offsetY = (canvas.height - dims.depth * cellSize) / 2;

      const gridX = Math.floor((x - offsetX) / cellSize);
      const gridZ = Math.floor((y - offsetY) / cellSize);

      if (gridX >= 0 && gridX < dims.width && gridZ >= 0 && gridZ < dims.depth) {
        return { x: gridX, z: gridZ };
      }
      return null;
    },
    [roomSize]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getCellFromEvent(e);
      if (!cell) return;

      // Check if clicked on existing object
      const clickedObj = placedObjects.find((obj) => {
        const def = OBJECT_DEFINITIONS.find((d) => d.type === obj.type);
        if (!def) return false;

        const isRotated = obj.rotation === 90 || obj.rotation === 270;
        const w = isRotated ? def.gridDepth : def.gridWidth;
        const d = isRotated ? def.gridWidth : def.gridDepth;

        return (
          cell.x >= obj.gridX &&
          cell.x < obj.gridX + w &&
          cell.z >= obj.gridZ &&
          cell.z < obj.gridZ + d
        );
      });

      if (clickedObj) {
        setSelectedPlacedId(clickedObj.id);
        setSelectedObjectType(null);
        return;
      }

      // Place new object
      if (selectedObjectType) {
        const def = OBJECT_DEFINITIONS.find((d) => d.type === selectedObjectType);
        if (!def) return;

        const newObj: PlacedObject = {
          id: crypto.randomUUID(),
          type: selectedObjectType,
          gridX: cell.x,
          gridZ: cell.z,
          rotation: currentRotation,
        };

        setPlacedObjects([...placedObjects, newObj]);
        setSelectedPlacedId(null);
      } else {
        setSelectedPlacedId(null);
      }
    },
    [getCellFromEvent, placedObjects, selectedObjectType, currentRotation]
  );

  const handleCanvasRightClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const cell = getCellFromEvent(e);
      if (!cell) return;

      // Find and remove object at this cell
      const objIndex = placedObjects.findIndex((obj) => {
        const def = OBJECT_DEFINITIONS.find((d) => d.type === obj.type);
        if (!def) return false;

        const isRotated = obj.rotation === 90 || obj.rotation === 270;
        const w = isRotated ? def.gridDepth : def.gridWidth;
        const d = isRotated ? def.gridWidth : def.gridDepth;

        return (
          cell.x >= obj.gridX &&
          cell.x < obj.gridX + w &&
          cell.z >= obj.gridZ &&
          cell.z < obj.gridZ + d
        );
      });

      if (objIndex !== -1) {
        const newObjects = [...placedObjects];
        newObjects.splice(objIndex, 1);
        setPlacedObjects(newObjects);
        setSelectedPlacedId(null);
      }
    },
    [getCellFromEvent, placedObjects]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getCellFromEvent(e);
      setHoveredCell(cell);
    },
    [getCellFromEvent]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setCurrentRotation((prev) => ((prev + 90) % 360) as Rotation);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPlacedId) {
          setPlacedObjects(placedObjects.filter((o) => o.id !== selectedPlacedId));
          setSelectedPlacedId(null);
        }
      }
      if (e.key === 'Escape') {
        setSelectedObjectType(null);
        setSelectedPlacedId(null);
      }
    },
    [selectedPlacedId, placedObjects]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Not logged in');
      setSaving(false);
      return;
    }

    const mapData = { objects: placedObjects };

    if (mapId) {
      // Update existing map
      const { error } = await (supabase
        .from('maps') as any)
        .update({
          name: mapName,
          room_size: roomSize,
          map_data: mapData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mapId);

      if (error) {
        alert('Failed to save: ' + error.message);
      } else {
        alert('Map saved!');
      }
    } else {
      // Create new map
      const { data, error } = await (supabase
        .from('maps') as any)
        .insert({
          created_by: user.id,
          name: mapName,
          room_size: roomSize,
          map_data: mapData,
        })
        .select('id')
        .single();

      if (error) {
        alert('Failed to save: ' + error.message);
      } else {
        router.push(`/dashboard/maps/builder?id=${data.id}`);
        alert('Map created!');
      }
    }

    setSaving(false);
  };

  const getObjectsByCategory = (category: ObjectCategory) =>
    OBJECT_DEFINITIONS.filter((d) => d.category === category);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🗺️</div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-cyber-dark">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/maps"
            className="text-muted-foreground hover:text-foreground"
          >
            Back
          </Link>
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            className="bg-transparent border-b border-border text-lg font-medium focus:outline-none focus:border-cyber-blue"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {placedObjects.length} objects
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-cyber-green/10 border border-cyber-green text-cyber-green rounded hover:bg-cyber-green/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Object Palette */}
        <div className="w-56 border-r border-border bg-cyber-dark overflow-y-auto p-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Objects</h3>

          {(['furniture', 'electronics', 'evidence'] as ObjectCategory[]).map((category) => (
            <div key={category} className="mb-4">
              <h4 className="text-xs uppercase text-muted-foreground mb-2">{category}</h4>
              <div className="space-y-1">
                {getObjectsByCategory(category).map((def) => (
                  <button
                    key={def.type}
                    onClick={() => {
                      setSelectedObjectType(def.type);
                      setSelectedPlacedId(null);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                      selectedObjectType === def.type
                        ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue'
                        : 'hover:bg-cyber-dark border border-transparent'
                    }`}
                  >
                    <span>{def.icon}</span>
                    <span>{def.displayName}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {def.gridWidth}x{def.gridDepth}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-4 p-2 bg-cyber-darker rounded text-xs text-muted-foreground">
            <p className="mb-1"><strong>R</strong> - Rotate</p>
            <p className="mb-1"><strong>Click</strong> - Place</p>
            <p className="mb-1"><strong>Right-click</strong> - Remove</p>
            <p><strong>Del</strong> - Delete selected</p>
          </div>
        </div>

        {/* Center - Grid Canvas */}
        <div className="flex-1 flex items-center justify-center bg-cyber-darker p-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onClick={handleCanvasClick}
            onContextMenu={handleCanvasRightClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredCell(null)}
            className="border border-border rounded cursor-crosshair"
          />
        </div>

        {/* Right Panel - Properties */}
        <div className="w-56 border-l border-border bg-cyber-dark p-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Properties</h3>

          {/* Room size */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground block mb-1">Room Size</label>
            <select
              value={roomSize}
              onChange={(e) => setRoomSize(e.target.value as RoomSize)}
              className="w-full bg-cyber-darker border border-border rounded px-2 py-1.5 text-sm"
            >
              {Object.entries(ROOM_SIZES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          {/* Current rotation */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground block mb-1">Rotation</label>
            <div className="flex gap-1">
              {([0, 90, 180, 270] as Rotation[]).map((rot) => (
                <button
                  key={rot}
                  onClick={() => setCurrentRotation(rot)}
                  className={`flex-1 py-1 text-sm rounded ${
                    currentRotation === rot
                      ? 'bg-cyber-blue/20 border border-cyber-blue text-cyber-blue'
                      : 'bg-cyber-darker border border-border'
                  }`}
                >
                  {rot}
                </button>
              ))}
            </div>
          </div>

          {/* Selected object info */}
          {selectedObjectType && (
            <div className="mb-4 p-2 bg-cyber-darker rounded">
              <p className="text-sm font-medium mb-1">
                {OBJECT_DEFINITIONS.find((d) => d.type === selectedObjectType)?.displayName}
              </p>
              <p className="text-xs text-muted-foreground">
                Click on grid to place
              </p>
            </div>
          )}

          {selectedPlacedId && (
            <div className="mb-4 p-2 bg-cyber-darker rounded">
              <p className="text-sm font-medium mb-2">Selected Object</p>
              <button
                onClick={() => {
                  setPlacedObjects(placedObjects.filter((o) => o.id !== selectedPlacedId));
                  setSelectedPlacedId(null);
                }}
                className="w-full px-2 py-1 bg-cyber-red/10 border border-cyber-red text-cyber-red text-sm rounded hover:bg-cyber-red/20"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MapBuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🗺️</div>
          <p className="text-muted-foreground">Loading builder...</p>
        </div>
      </div>
    }>
      <MapBuilderContent />
    </Suspense>
  );
}
