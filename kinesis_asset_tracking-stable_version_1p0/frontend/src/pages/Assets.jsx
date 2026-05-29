import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Search, Battery, Clock, Activity, MapPin, Filter, Package, Edit2, Save, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('http', 'ws');

const EQUIPMENT_TYPES = [
  'None',
  'Ventilator',
  'X-Ray Machine',
  'ECG Monitor',
  'Defibrillator',
  'Infusion Pump',
  'Wheelchair',
  'Hospital Bed',
  'Ultrasound Machine',
  'CT Scanner',
  'MRI Machine',
  'Oxygen Tank',
  'IV Stand',
  'Patient Monitor'
];

const Assets = () => {
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wsConnected, setWsConnected] = useState(false);
  const [equipmentAssignments, setEquipmentAssignments] = useState({});
  const [editingTag, setEditingTag] = useState(null);

  // Load equipment assignments from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('equipmentAssignments');
    if (saved) {
      setEquipmentAssignments(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    let ws;
    const connect = () => {
      ws = new WebSocket(`${WS_URL}/api/ws/rtls`);
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'tag_update') {
          setTags(message.data);
        }
      };
      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connect, 3000);
      };
    };
    connect();
    return () => ws && ws.close();
  }, []);

  const saveEquipmentAssignment = (deviceId, equipmentType) => {
    const updated = { ...equipmentAssignments };
    if (equipmentType === 'None') {
      delete updated[deviceId];
    } else {
      updated[deviceId] = equipmentType;
    }
    setEquipmentAssignments(updated);
    localStorage.setItem('equipmentAssignments', JSON.stringify(updated));
    setEditingTag(null);
    toast.success(`Equipment assignment ${equipmentType === 'None' ? 'removed' : 'saved'}`);
  };

  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.device_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tag.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const formatBattery = (battery) => {
    if (!battery) return 'N/A';
    const voltage = battery / 1000;
    return `${voltage.toFixed(2)}V`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Asset Directory</h1>
          <p className="text-gray-600 mt-2">Complete list of all tracked BLE assets</p>
        </div>
        <Badge variant={wsConnected ? 'success' : 'secondary'} className="text-sm px-4 py-2">
          {wsConnected ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                data-testid="asset-search"
                placeholder="Search by device ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredTags.length} of {tags.length} assets
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTags.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-gray-500">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No assets found</p>
              <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
            </CardContent>
          </Card>
        ) : (
          filteredTags.map((tag) => {
            const equipment = equipmentAssignments[tag.device_id];
            const isEditing = editingTag === tag.device_id;
            
            return (
              <Card key={tag.device_id} className="bg-white hover:shadow-xl transition-all duration-200 border-2 border-gray-200 hover:border-[#006CDD]" data-testid={`asset-card-${tag.device_id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold truncate">{tag.device_id}</CardTitle>
                    <Badge variant={tag.status === 'online' ? 'success' : 'secondary'}>
                      {tag.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Equipment Assignment Section */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-semibold text-gray-700">Equipment</span>
                      </div>
                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTag(tag.device_id)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-2">
                        <Select
                          value={equipment || 'None'}
                          onValueChange={(val) => saveEquipmentAssignment(tag.device_id, val)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EQUIPMENT_TYPES.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTag(null)}
                          className="w-full h-6 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Badge className={equipment ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}>
                        {equipment || 'Not Assigned'}
                      </Badge>
                    )}
                  </div>

                  {tag.battery && (
                    <div className="flex items-center gap-2 text-sm">
                      <Battery className={`w-4 h-4 ${tag.battery > 2800 ? 'text-green-600' : 'text-amber-600'}`} />
                      <span className="text-gray-700">Battery:</span>
                      <span className="font-semibold">{formatBattery(tag.battery)}</span>
                    </div>
                  )}
                  {tag.last_seen && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">Last Seen:</span>
                      <span className="font-mono text-xs">{formatTimestamp(tag.last_seen)}</span>
                    </div>
                  )}
                  {tag.motion_state && (
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">Motion:</span>
                      <span className="font-semibold capitalize">{tag.motion_state}</span>
                    </div>
                  )}
                  {tag.position_ref && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span className="text-gray-700">Near:</span>
                      <span className="font-mono text-xs">{tag.position_ref.slice(-8)}</span>
                    </div>
                  )}
                  {tag.x !== null && tag.y !== null && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-600">
                        Position: <span className="font-mono">({Math.round(tag.x)}, {Math.round(tag.y)})</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Assets;
