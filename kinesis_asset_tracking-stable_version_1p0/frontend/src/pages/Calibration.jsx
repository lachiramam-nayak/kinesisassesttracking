import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, AlertTriangle, Wrench, CheckCircle, Search, Edit, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const WS_URL = BACKEND_URL.replace('http', 'ws');

const Calibration = () => {
  const [calibrationData, setCalibrationData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingItem, setEditingItem] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const initialized = useRef(false);

  useEffect(() => {
    let ws;
    const connect = () => {
      ws = new WebSocket(`${WS_URL}/api/ws/rtls`);
      ws.onopen = () => console.log('Connected to calibration data');
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'tag_update') {
          setAvailableTags(message.data.filter(t => t.status === 'online'));
          
          // Initialize data only once
          if (!initialized.current && calibrationData.length === 0) {
            const onlineTags = message.data.filter(t => t.status === 'online').slice(0, 5);
            if (onlineTags.length >= 5) {
              generateInitialData(onlineTags);
              initialized.current = true;
            }
          }
        }
      };
      ws.onerror = () => console.log('WS error');
      ws.onclose = () => setTimeout(connect, 3000);
    };
    connect();
    return () => ws && ws.close();
  }, []);

  const generateInitialData = (onlineTags) => {
    const statuses = ['overdue', 'overdue', 'maintenance', 'calibrated', 'calibrated'];
    const now = new Date();
    
    const calibrations = onlineTags.map((tag, idx) => {
      const status = statuses[idx];
      let lastCalibration, nextDue;

      if (status === 'overdue') {
        lastCalibration = new Date(now.getTime() - (180 + Math.random() * 90) * 24 * 60 * 60 * 1000);
        nextDue = new Date(lastCalibration.getTime() + 180 * 24 * 60 * 60 * 1000);
      } else if (status === 'maintenance') {
        lastCalibration = new Date(now.getTime() - (60 + Math.random() * 30) * 24 * 60 * 60 * 1000);
        nextDue = new Date(lastCalibration.getTime() + 180 * 24 * 60 * 60 * 1000);
      } else {
        lastCalibration = new Date(now.getTime() - (10 + Math.random() * 20) * 24 * 60 * 60 * 1000);
        nextDue = new Date(lastCalibration.getTime() + 180 * 24 * 60 * 60 * 1000);
      }

      return {
        id: `cal-${idx}`,
        device_id: tag.device_id,
        equipment_name: `Medical Equipment ${idx + 1}`,
        equipment_type: ['Ventilator', 'X-Ray Machine', 'ECG Monitor', 'Defibrillator', 'Infusion Pump'][idx],
        status,
        lastCalibration: lastCalibration.toISOString().split('T')[0],
        nextDue: nextDue.toISOString().split('T')[0],
        location: tag.position_ref || 'Unknown',
        calibrationCycle: 180,
        certificationNumber: `CERT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        technician: ['John Smith', 'Sarah Johnson', 'Mike Brown', 'Emily Davis', 'Tom Wilson'][idx],
        notes: ''
      };
    });

    setCalibrationData(calibrations);
  };

  const handleEdit = (item) => {
    setEditingItem({ ...item });
    setIsEditOpen(true);
  };

  const handleSave = () => {
    setCalibrationData(prev => 
      prev.map(item => item.id === editingItem.id ? editingItem : item)
    );
    toast.success('Calibration record updated successfully');
    setIsEditOpen(false);
    setEditingItem(null);
  };

  const handleAdd = (newItem) => {
    const id = `cal-${Date.now()}`;
    setCalibrationData(prev => [...prev, { ...newItem, id }]);
    toast.success('Equipment added successfully');
    setIsAddOpen(false);
  };

  const handleDelete = (id) => {
    setCalibrationData(prev => prev.filter(item => item.id !== id));
    toast.success('Equipment removed successfully');
  };

  const getDaysUntilDue = (nextDue) => {
    const now = new Date();
    const due = new Date(nextDue);
    return Math.floor((due - now) / (1000 * 60 * 60 * 24));
  };

  const filteredData = calibrationData.filter(item => {
    const matchesSearch = item.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.equipment_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: calibrationData.length,
    overdue: calibrationData.filter(d => d.status === 'overdue').length,
    maintenance: calibrationData.filter(d => d.status === 'maintenance').length,
    calibrated: calibrationData.filter(d => d.status === 'calibrated').length
  };

  const getStatusConfig = (status) => {
    const configs = {
      overdue: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-600', label: 'Overdue' },
      maintenance: { icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-500', label: 'Under Maintenance' },
      calibrated: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-600', label: 'Calibrated' }
    };
    return configs[status];
  };

  const EquipmentForm = ({ item, onSave, onCancel, isEdit }) => {
    const [formData, setFormData] = useState(item || {
      device_id: '',
      equipment_name: '',
      equipment_type: '',
      status: 'calibrated',
      lastCalibration: new Date().toISOString().split('T')[0],
      nextDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      location: '',
      calibrationCycle: 180,
      certificationNumber: `CERT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      technician: '',
      notes: ''
    });

    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Equipment Name *</Label>
            <Input value={formData.equipment_name} onChange={(e) => setFormData({...formData, equipment_name: e.target.value})} className="mt-2" />
          </div>
          <div>
            <Label>Equipment Type *</Label>
            <Input value={formData.equipment_type} onChange={(e) => setFormData({...formData, equipment_type: e.target.value})} className="mt-2" />
          </div>
        </div>

        {!isEdit && (
          <div>
            <Label>Select BLE Tag</Label>
            <Select value={formData.device_id} onValueChange={(val) => setFormData({...formData, device_id: val})}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a tag..." />
              </SelectTrigger>
              <SelectContent>
                {availableTags.map(tag => (
                  <SelectItem key={tag.device_id} value={tag.device_id}>{tag.device_id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="calibrated">Calibrated</SelectItem>
              <SelectItem value="maintenance">Under Maintenance</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Last Calibration Date</Label>
            <Input type="date" value={formData.lastCalibration} onChange={(e) => setFormData({...formData, lastCalibration: e.target.value})} className="mt-2" />
          </div>
          <div>
            <Label>Next Due Date</Label>
            <Input type="date" value={formData.nextDue} onChange={(e) => setFormData({...formData, nextDue: e.target.value})} className="mt-2" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Calibration Cycle (days)</Label>
            <Input type="number" value={formData.calibrationCycle} onChange={(e) => setFormData({...formData, calibrationCycle: parseInt(e.target.value)})} className="mt-2" />
          </div>
          <div>
            <Label>Technician</Label>
            <Input value={formData.technician} onChange={(e) => setFormData({...formData, technician: e.target.value})} className="mt-2" />
          </div>
        </div>

        <div>
          <Label>Location</Label>
          <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="mt-2" />
        </div>

        <div>
          <Label>Notes</Label>
          <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full mt-2 p-2 border rounded-md" rows="3" />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-[#006CDD] text-white">
            {isEdit ? 'Save Changes' : 'Add Equipment'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Asset Calibration Management</h1>
          <p className="text-gray-600 mt-2">Track equipment calibration and maintenance schedules</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Equipment</DialogTitle>
            </DialogHeader>
            <EquipmentForm onSave={handleAdd} onCancel={() => setIsAddOpen(false)} isEdit={false} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-2 border-gray-300 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-red-300 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Overdue</CardTitle>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-orange-300 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Under Maintenance</CardTitle>
              <Wrench className="w-5 h-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-500">{stats.maintenance}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-green-300 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-600">Calibrated</CardTitle>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{stats.calibrated}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by device ID or equipment name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="maintenance">Under Maintenance</SelectItem>
                <SelectItem value="calibrated">Calibrated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {filteredData.map((item) => {
          const config = getStatusConfig(item.status);
          const Icon = config.icon;
          const daysUntilDue = getDaysUntilDue(item.nextDue);

          return (
            <Card key={item.id} className={`bg-white hover:shadow-xl transition-all border-l-4 ${
              item.status === 'overdue' ? 'border-l-red-600' :
              item.status === 'maintenance' ? 'border-l-orange-500' : 'border-l-green-600'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${config.color}`} />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{item.equipment_name}</h3>
                      <p className="text-sm text-gray-600">{item.equipment_type}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">{item.device_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${config.bg} text-white`}>{config.label}</Badge>
                    <Dialog open={isEditOpen && editingItem?.id === item.id} onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setEditingItem(null); } }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Calibration Record</DialogTitle>
                        </DialogHeader>
                        {editingItem && (
                          <EquipmentForm item={editingItem} onSave={handleSave} onCancel={() => setIsEditOpen(false)} isEdit={true} />
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Last Calibration</p>
                    <p className="font-semibold text-gray-900">{new Date(item.lastCalibration).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Next Due</p>
                    <p className="font-semibold text-gray-900">{new Date(item.nextDue).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Days Until Due</p>
                    <p className={`font-bold text-lg ${daysUntilDue < 0 ? 'text-red-600' : daysUntilDue < 30 ? 'text-orange-500' : 'text-green-600'}`}>
                      {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} overdue` : daysUntilDue}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Technician</p>
                    <p className="font-semibold text-gray-900">{item.technician}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-semibold text-gray-700">{item.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Calibration Cycle</p>
                    <p className="text-sm font-semibold text-gray-700">{item.calibrationCycle} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Certification #</p>
                    <p className="text-sm font-mono text-gray-700">{item.certificationNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Calibration;
