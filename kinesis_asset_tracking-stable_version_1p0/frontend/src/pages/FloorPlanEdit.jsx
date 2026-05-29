import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Upload, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const FloorPlanEdit = () => {
  const [floorPlan, setFloorPlan] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newAnchor, setNewAnchor] = useState({ device_id: '', name: '', x: 0, y: 0 });
  const [clickPosition, setClickPosition] = useState(null);
  const fileInputRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    loadFloorPlan();
  }, []);

  const loadFloorPlan = async () => {
    try {
      const response = await fetch(`${API}/floor-plan`);
      const data = await response.json();
      setFloorPlan(data);
    } catch (error) {
      console.error('Error loading floor plan:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API}/floor-plan/image`, { method: 'POST', body: formData });
      if (response.ok) {
        toast.success('Floor plan uploaded successfully');
        loadFloorPlan();
      } else {
        toast.error('Failed to upload floor plan');
      }
    } catch (error) {
      toast.error('Error uploading floor plan');
    } finally {
      setUploading(false);
    }
  };

  const handleSvgClick = (e) => {
    if (!editMode || !floorPlan) return;
    
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;

    const viewBox = svg.viewBox.baseVal;
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;

    const x = svgX * scaleX;
    const y = svgY * scaleY;

    setClickPosition({ x, y });
    setNewAnchor(prev => ({ ...prev, x, y }));
  };

  const handleAddAnchor = async () => {
    if (!newAnchor.device_id || !newAnchor.name) {
      toast.error('Please enter device ID and name');
      return;
    }

    try {
      const response = await fetch(`${API}/floor-plan/anchors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `anchor-${Date.now()}`, ...newAnchor, status: 'offline' }),
      });

      if (response.ok) {
        toast.success('Anchor added successfully');
        setNewAnchor({ device_id: '', name: '', x: 0, y: 0 });
        setClickPosition(null);
        loadFloorPlan();
      } else {
        toast.error('Failed to add anchor');
      }
    } catch (error) {
      toast.error('Error adding anchor');
    }
  };

  const handleDeleteAnchor = async (anchorId) => {
    try {
      const response = await fetch(`${API}/floor-plan/anchors/${anchorId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Anchor deleted');
        loadFloorPlan();
      } else {
        toast.error('Failed to delete anchor');
      }
    } catch (error) {
      toast.error('Error deleting anchor');
    }
  };

  const drawFloorPlan = () => {
    if (!floorPlan) return null;

    const width = floorPlan.width || 800;
    const height = floorPlan.height || 600;
    const containerWidth = 1000;
    const aspectRatio = width / height;
    const containerHeight = containerWidth / aspectRatio;

    return (
      <div className="w-full flex justify-center">
        <svg 
          ref={svgRef}
          width={containerWidth}
          height={containerHeight}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="border-2 border-gray-300 rounded-lg bg-slate-50 shadow-md"
          onClick={handleSvgClick}
          style={{ cursor: editMode ? 'crosshair' : 'default', maxWidth: '100%' }}
        >
          <defs>
            <pattern id="grid-edit" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E2E8F0" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid-edit)" />
          
          {floorPlan.image && (
            <image 
              href={floorPlan.image} 
              width={width} 
              height={height} 
              preserveAspectRatio="xMidYMid meet"
              opacity="0.8" 
            />
          )}
          
          {floorPlan.anchors?.map((anchor, idx) => (
            <g key={idx}>
              <circle 
                cx={anchor.x} 
                cy={anchor.y} 
                r="12" 
                fill="#10B981" 
                stroke="#fff" 
                strokeWidth="3" 
              />
              <text 
                x={anchor.x + 18} 
                y={anchor.y + 6} 
                fontSize="14" 
                fill="#1E293B" 
                fontWeight="bold"
                fontFamily="Inter"
              >
                {anchor.name}
              </text>
            </g>
          ))}
          
          {clickPosition && editMode && (
            <g>
              <circle 
                cx={clickPosition.x} 
                cy={clickPosition.y} 
                r="15" 
                fill="#EF4444" 
                stroke="#fff" 
                strokeWidth="3" 
                opacity="0.8"
              >
                <animate 
                  attributeName="r" 
                  values="12;18;12" 
                  dur="1s" 
                  repeatCount="indefinite" 
                />
              </circle>
              <text 
                x={clickPosition.x + 20} 
                y={clickPosition.y + 6} 
                fontSize="14" 
                fill="#EF4444" 
                fontWeight="bold"
                fontFamily="Inter"
              >
                New
              </text>
            </g>
          )}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Floor Plan Management</h1>
        <p className="text-gray-600 mt-2">Upload floor plans and configure anchor positions</p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Upload Floor Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-[#006CDD] text-white hover:bg-[#0056b3]">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Image'}
            </Button>
            <p className="text-sm text-gray-600">Upload a floor plan image (PNG, JPG). The image will maintain its original aspect ratio.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Manage Anchors</CardTitle>
            <Button 
              onClick={() => { setEditMode(!editMode); setClickPosition(null); }} 
              variant={editMode ? 'default' : 'outline'} 
              className={editMode ? 'bg-[#006CDD] text-white hover:bg-[#0056b3]' : ''}
            >
              {editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>{drawFloorPlan()}</div>

          {editMode && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Add New Anchor</h3>
                <p className="text-sm text-gray-600 mt-1">Click anywhere on the floor plan above to set the anchor position</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Device ID</Label>
                  <Input 
                    placeholder="e.g., ANCH-001" 
                    value={newAnchor.device_id} 
                    onChange={(e) => setNewAnchor(prev => ({ ...prev, device_id: e.target.value }))} 
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Anchor Name</Label>
                  <Input 
                    placeholder="e.g., North Entrance" 
                    value={newAnchor.name} 
                    onChange={(e) => setNewAnchor(prev => ({ ...prev, name: e.target.value }))} 
                    className="mt-2" 
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddAnchor} 
                    disabled={!clickPosition || !newAnchor.device_id || !newAnchor.name} 
                    className="w-full bg-green-600 text-white hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Anchor
                  </Button>
                </div>
              </div>
              
              {clickPosition && (
                <div className="bg-white rounded-md p-3 border border-blue-200">
                  <p className="text-sm font-semibold text-gray-700">
                    Selected position: <span className="font-mono text-blue-600">X: {Math.round(clickPosition.x)}, Y: {Math.round(clickPosition.y)}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-lg">Existing Anchors ({floorPlan?.anchors?.length || 0})</h3>
            {floorPlan?.anchors && floorPlan.anchors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {floorPlan.anchors.map((anchor) => (
                  <div key={anchor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">{anchor.name}</p>
                      <p className="text-sm text-gray-600 mt-1">Device: <span className="font-mono">{anchor.device_id}</span></p>
                      <p className="text-xs text-gray-500 mt-1">Position: <span className="font-mono">({Math.round(anchor.x)}, {Math.round(anchor.y)})</span></p>
                    </div>
                    <Button onClick={() => handleDeleteAnchor(anchor.id)} variant="destructive" size="sm" className="hover:bg-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">No anchors added yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Enter Edit Mode" and then click on the floor plan to add anchors</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FloorPlanEdit;
