import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import AssetTrackingMap from '../components/AssetTrackingMap';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

const AssetTracking = () => {
  const [tags, setTags] = useState([]);
  const [floorPlan, setFloorPlan] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadTrackingData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tagsResponse, floorPlanResponse] = await Promise.all([
        fetch(`${API}/tags/status`),
        fetch(`${API}/floor-plan`),
      ]);

      if (!tagsResponse.ok) throw new Error('Failed to load tags');
      if (!floorPlanResponse.ok) throw new Error('Failed to load floor plan');

      const tagsData = await tagsResponse.json();
      const floorPlanData = await floorPlanResponse.json();

      setTags(Array.isArray(tagsData) ? tagsData : []);
      setFloorPlan(floorPlanData);
      setLastUpdated(new Date());
    } catch (requestError) {
      console.error(requestError);
      setError('Could not load asset tracking data from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  useEffect(() => {
    let ws;
    let retryTimeout;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}/api/ws/rtls`);
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'tag_update' && Array.isArray(message.data)) {
            setTags(message.data);
            setLastUpdated(new Date());
          }
        } catch (parseError) {
          console.error(parseError);
        }
      };
      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => {
        setWsConnected(false);
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={wsConnected ? 'success' : 'secondary'}>
              {wsConnected ? 'Live tracking' : 'Polling tracking'}
            </Badge>
            {lastUpdated ? (
              <span className="text-xs font-medium text-slate-500">
                Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-4xl font-bold text-gray-900">Asset Tracking</h1>
          <p className="mt-2 max-w-3xl text-gray-600">
            Select a tag by anchor reference to focus its current zone on the office map.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={loadTrackingData} disabled={loading} className="gap-2 self-start lg:self-auto">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <AssetTrackingMap
        tags={tags}
        floorPlan={floorPlan}
        selectedDeviceId={selectedDeviceId}
        onSelectTag={setSelectedDeviceId}
      />
    </div>
  );
};

export default AssetTracking;
