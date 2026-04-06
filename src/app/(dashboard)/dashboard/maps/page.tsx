'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface MapItem {
  id: string;
  name: string;
  description: string | null;
  room_size: 'small' | 'medium' | 'large';
  created_at: string;
  updated_at: string;
}

export default function MapsPage() {
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaps = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('maps')
        .select('id, name, description, room_size, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching maps:', error);
      } else {
        setMaps(data || []);
      }
      setLoading(false);
    };

    fetchMaps();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this map?')) return;

    const supabase = createClient();
    const { error } = await supabase.from('maps').delete().eq('id', id);

    if (error) {
      alert('Failed to delete map');
    } else {
      setMaps(maps.filter((m) => m.id !== id));
    }
  };

  const getRoomSizeLabel = (size: string) => {
    switch (size) {
      case 'small':
        return '20x15';
      case 'medium':
        return '30x20';
      case 'large':
        return '40x30';
      default:
        return size;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Maps</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your game environments
          </p>
        </div>
        <Link
          href="/dashboard/maps/builder"
          className="flex items-center gap-2 px-4 py-2 bg-cyber-blue/10 border border-cyber-blue text-cyber-blue rounded-lg hover:bg-cyber-blue/20 transition-all"
        >
          <span>+</span>
          Create Map
        </Link>
      </div>

      {/* Maps grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-4xl animate-pulse mb-4">🗺️</div>
          <p className="text-muted-foreground">Loading maps...</p>
        </div>
      ) : maps.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <div className="text-4xl mb-4">🏗️</div>
          <h3 className="text-lg font-medium mb-2">No maps yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first map to use in game sessions
          </p>
          <Link
            href="/dashboard/maps/builder"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyber-blue text-white rounded-lg hover:bg-cyber-blue/80 transition-all"
          >
            Create Your First Map
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((map) => (
            <div
              key={map.id}
              className="bg-cyber-dark border border-border rounded-lg p-4 hover:border-cyber-blue/50 transition-all"
            >
              {/* Map preview placeholder */}
              <div className="aspect-video bg-cyber-darker rounded-lg mb-4 flex items-center justify-center border border-border">
                <span className="text-4xl">🗺️</span>
              </div>

              {/* Map info */}
              <h3 className="font-medium text-lg mb-1">{map.name}</h3>
              {map.description && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {map.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <span className="px-2 py-0.5 bg-cyber-purple/10 border border-cyber-purple/30 rounded">
                  {getRoomSizeLabel(map.room_size)}
                </span>
                <span>
                  Updated {new Date(map.updated_at).toLocaleDateString()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/maps/builder?id=${map.id}`}
                  className="flex-1 text-center px-3 py-1.5 bg-cyber-blue/10 border border-cyber-blue text-cyber-blue text-sm rounded hover:bg-cyber-blue/20 transition-all"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(map.id)}
                  className="px-3 py-1.5 bg-cyber-red/10 border border-cyber-red text-cyber-red text-sm rounded hover:bg-cyber-red/20 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
