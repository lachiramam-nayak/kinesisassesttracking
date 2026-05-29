import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Clock, User, Activity, Bed, CheckCircle, Calendar, Edit, Wifi } from 'lucide-react';
import { toast } from 'sonner';

const OTStatus = () => {
  const [otRooms, setOtRooms] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingRoom, setEditingRoom] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    const rooms = [
      { id: 'OT-1', name: 'Operation Theater 1', status: 'in-progress', patientName: 'Rakesh', patientId: 'P-2024-001', macId: 'd05f6451fdb0', procedure: 'Cardiac Bypass Surgery', surgeon: 'Dr. Bharath', startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), estimatedEnd: new Date(Date.now() + 1 * 60 * 60 * 1000), team: ['Dr. Bharath', 'Dr. Nithin', 'Nurse Geeta'] },
      { id: 'OT-2', name: 'Operation Theater 2', status: 'recovery', patientName: 'Sanjay', patientId: 'P-2024-002', macId: 'd05f6451fdb1', procedure: 'Hip Replacement', surgeon: 'Dr. Karthik', startTime: new Date(Date.now() - 4 * 60 * 60 * 1000), completedTime: new Date(Date.now() - 30 * 60 * 1000), team: ['Dr. Kamlesh M', 'Nurse Priya'] },
      { id: 'OT-3', name: 'Operation Theater 3', status: 'patient-arrived', patientName: 'Rahul', patientId: 'P-2024-003', macId: 'd05f6451fdb2', procedure: 'Appendectomy', surgeon: 'Dr. Lina A', arrivedTime: new Date(Date.now() - 15 * 60 * 1000), scheduledTime: new Date(Date.now() + 15 * 60 * 1000), team: ['Dr. Lina A', 'Dr. Mithal'] },
      { id: 'OT-4', name: 'Operation Theater 4', status: 'booked', patientName: 'Gautham', patientId: 'P-2024-004', macId: 'd05f6451fdb3', procedure: 'Knee Arthroscopy', surgeon: 'Dr. Shetty', scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), team: ['Dr. Shetty'] },
      { id: 'OT-5', name: 'Operation Theater 5', status: 'shifted', patientName: 'Raksha', patientId: 'P-2024-005', macId: 'd05f6451fdb4', procedure: 'Hernia ', surgeon: 'Dr. Anand', shiftedTime: new Date(Date.now() - 10 * 60 * 1000), bedNumber: 'ICU-12', team: ['Dr. Anand'] }
    ];
    setOtRooms(rooms);
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = (status) => {
    const configs = {
      'booked': { label: 'OT Booked', color: 'bg-blue-500', icon: Calendar, textColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
      'patient-arrived': { label: 'Patient Arrived', color: 'bg-purple-500', icon: User, textColor: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-500' },
      'in-progress': { label: 'Surgery in Progress', color: 'bg-red-500', icon: Activity, textColor: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
      'recovery': { label: 'Under Recovery', color: 'bg-orange-500', icon: Bed, textColor: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-500' },
      'shifted': { label: 'Shifted to Bed', color: 'bg-green-500', icon: CheckCircle, textColor: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-500' }
    };
    return configs[status];
  };

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDuration = (start, end) => {
    const diff = Math.abs(end - start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleEdit = (room) => {
    setEditingRoom({
      ...room,
      scheduledTime: room.scheduledTime?.toISOString().slice(0, 16) || '',
      startTime: room.startTime?.toISOString().slice(0, 16) || '',
      estimatedEnd: room.estimatedEnd?.toISOString().slice(0, 16) || '',
      arrivedTime: room.arrivedTime?.toISOString().slice(0, 16) || '',
      completedTime: room.completedTime?.toISOString().slice(0, 16) || '',
      shiftedTime: room.shiftedTime?.toISOString().slice(0, 16) || '',
      teamString: room.team.join(', ')
    });
    setIsEditOpen(true);
  };

  const handleSave = () => {
    const updatedRoom = {
      ...editingRoom,
      scheduledTime: editingRoom.scheduledTime ? new Date(editingRoom.scheduledTime) : null,
      startTime: editingRoom.startTime ? new Date(editingRoom.startTime) : null,
      estimatedEnd: editingRoom.estimatedEnd ? new Date(editingRoom.estimatedEnd) : null,
      arrivedTime: editingRoom.arrivedTime ? new Date(editingRoom.arrivedTime) : null,
      completedTime: editingRoom.completedTime ? new Date(editingRoom.completedTime) : null,
      shiftedTime: editingRoom.shiftedTime ? new Date(editingRoom.shiftedTime) : null,
      team: editingRoom.teamString.split(',').map(t => t.trim()).filter(t => t)
    };
    setOtRooms(prev => prev.map(room => room.id === updatedRoom.id ? updatedRoom : room));
    toast.success('OT information updated successfully');
    setIsEditOpen(false);
    setEditingRoom(null);
  };

  const stats = {
    total: otRooms.length,
    booked: otRooms.filter(r => r.status === 'booked').length,
    active: otRooms.filter(r => r.status === 'in-progress').length,
    recovery: otRooms.filter(r => r.status === 'recovery').length,
    completed: otRooms.filter(r => r.status === 'shifted').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Operation Theater Utilization</h1>
          <p className="text-gray-600 mt-2">OT status and patient journey tracking</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Current Time</p>
          <p className="text-2xl font-bold text-gray-900">{formatTime(currentTime)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: 'Total OTs', value: stats.total, color: 'gray' },
          { label: 'Booked', value: stats.booked, color: 'blue' },
          { label: 'In Progress', value: stats.active, color: 'red' },
          { label: 'Recovery', value: stats.recovery, color: 'orange' },
          { label: 'Completed', value: stats.completed, color: 'green' }
        ].map((stat, idx) => (
          <Card key={idx} className={`bg-white border-2 border-${stat.color}-300`}>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {otRooms.map((room) => {
          const config = getStatusConfig(room.status);
          const Icon = config.icon;

          return (
            <Card key={room.id} className={`bg-white hover:shadow-2xl transition-all border-l-8 ${config.borderColor}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center`}>
                      <Icon className={`w-8 h-8 ${config.textColor}`} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{room.name}</h2>
                      <Badge className={`${config.color} text-white mt-2`}>{config.label}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Room ID</p>
                      <p className="text-xl font-bold text-gray-900">{room.id}</p>
                    </div>
                    <Dialog open={isEditOpen && editingRoom?.id === room.id} onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setEditingRoom(null); } }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(room)}>
                          <Edit className="w-4 h-4 mr-2" />Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit OT Information - {room.id}</DialogTitle>
                        </DialogHeader>
                        {editingRoom && (
                          <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div><Label>Patient Name</Label><Input value={editingRoom.patientName} onChange={(e) => setEditingRoom({...editingRoom, patientName: e.target.value})} className="mt-2" /></div>
                              <div><Label>Patient ID</Label><Input value={editingRoom.patientId} onChange={(e) => setEditingRoom({...editingRoom, patientId: e.target.value})} className="mt-2" /></div>
                            </div>
                            <div><Label>Procedure</Label><Input value={editingRoom.procedure} onChange={(e) => setEditingRoom({...editingRoom, procedure: e.target.value})} className="mt-2" /></div>
                            <div>
                              <Label>Status</Label>
                              <Select value={editingRoom.status} onValueChange={(val) => setEditingRoom({...editingRoom, status: val})}>
                                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="booked">OT Booked</SelectItem>
                                  <SelectItem value="patient-arrived">Patient Arrived</SelectItem>
                                  <SelectItem value="in-progress">Surgery in Progress</SelectItem>
                                  <SelectItem value="recovery">Under Recovery</SelectItem>
                                  <SelectItem value="shifted">Shifted to Bed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>BLE Tag MAC ID</Label><Input value={editingRoom.macId || ''} onChange={(e) => setEditingRoom({...editingRoom, macId: e.target.value})} className="mt-2" placeholder="d05f6451fdb0" /></div>
                            <div><Label>Lead Surgeon</Label><Input value={editingRoom.surgeon} onChange={(e) => setEditingRoom({...editingRoom, surgeon: e.target.value})} className="mt-2" /></div>
                            <div><Label>Team Members (comma separated)</Label><Input value={editingRoom.teamString} onChange={(e) => setEditingRoom({...editingRoom, teamString: e.target.value})} className="mt-2" /></div>
                            {editingRoom.status === 'booked' && <div><Label>Scheduled Time</Label><Input type="datetime-local" value={editingRoom.scheduledTime} onChange={(e) => setEditingRoom({...editingRoom, scheduledTime: e.target.value})} className="mt-2" /></div>}
                            {editingRoom.status === 'shifted' && <div className="grid grid-cols-2 gap-4"><div><Label>Shifted Time</Label><Input type="datetime-local" value={editingRoom.shiftedTime} onChange={(e) => setEditingRoom({...editingRoom, shiftedTime: e.target.value})} className="mt-2" /></div><div><Label>Bed Number</Label><Input value={editingRoom.bedNumber || ''} onChange={(e) => setEditingRoom({...editingRoom, bedNumber: e.target.value})} className="mt-2" /></div></div>}
                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                              <Button onClick={handleSave} className="bg-[#006CDD] text-white">Save Changes</Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">Patient Information</h3>
                    <div><p className="text-xs text-gray-500">Patient Name</p><p className="font-semibold text-gray-900">{room.patientName}</p></div>
                    <div><p className="text-xs text-gray-500">Patient ID</p><p className="font-mono text-sm text-gray-700">{room.patientId}</p></div>
                    {room.macId && (
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <p className="text-xs text-gray-500 mb-1">BLE Tag (MAC ID)</p>
                        <div className="flex items-center gap-2">
                          <Wifi className="w-3 h-3 text-blue-600" />
                          <p className="font-mono text-xs font-bold text-blue-700">{room.macId}</p>
                        </div>
                      </div>
                    )}
                    <div><p className="text-xs text-gray-500">Procedure</p><p className="font-semibold text-gray-900">{room.procedure}</p></div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">Timeline</h3>
                    {room.status === 'in-progress' && <><div><p className="text-xs text-gray-500">Started</p><p className="font-semibold text-red-600">{formatTime(room.startTime)}</p></div><div><p className="text-xs text-gray-500">Duration</p><p className="font-bold text-lg">{formatDuration(room.startTime, currentTime)}</p></div></>}
                    {room.status === 'shifted' && <><div><p className="text-xs text-gray-500">Shifted At</p><p className="font-semibold text-green-600">{formatTime(room.shiftedTime)}</p></div><div><p className="text-xs text-gray-500">Bed</p><p className="font-bold text-lg">{room.bedNumber}</p></div></>}
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">Medical Team</h3>
                    <div><p className="text-xs text-gray-500">Lead Surgeon</p><p className="font-semibold text-gray-900">{room.surgeon}</p></div>
                    <div><p className="text-xs text-gray-500 mb-2">Team</p>{room.team.map((m, i) => <div key={i} className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div><p className="text-sm text-gray-700">{m}</p></div>)}</div>
                  </div>
                </div>
                {room.status === 'in-progress' && room.estimatedEnd && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between mb-2"><p className="text-sm font-semibold">Progress</p><p className="text-sm">{Math.min(100, Math.round((currentTime - room.startTime) / (room.estimatedEnd - room.startTime) * 100))}%</p></div>
                    <div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-red-600 h-3 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((currentTime - room.startTime) / (room.estimatedEnd - room.startTime) * 100))}%` }}></div></div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OTStatus;
