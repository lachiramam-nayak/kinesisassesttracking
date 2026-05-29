import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Droplets, RefreshCcw, Thermometer, Wifi } from 'lucide-react';
import EnvironmentGaugeCard from '../components/EnvironmentGaugeCard';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

const hasNumber = (value) => Number.isFinite(Number(value));

const formatReading = (value, unit) => {
  if (!hasNumber(value)) return 'N/A';
  return `${Math.round(Number(value))} ${unit}`;
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'N/A';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(diffMs)) return 'N/A';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const EnvironmentTelemetry = () => {
  const [tags, setTags] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [metric, setMetric] = useState('temperature');
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/tags/status`);
      if (!response.ok) throw new Error('Failed to load tag telemetry');
      const data = await response.json();
      setTags(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (requestError) {
      console.error(requestError);
      setError('Could not load tag telemetry from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

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

  const tagsWithTemperature = useMemo(
    () => tags.filter((tag) => hasNumber(tag.temperature)),
    [tags]
  );
  const tagsWithHumidity = useMemo(
    () => tags.filter((tag) => hasNumber(tag.humidity)),
    [tags]
  );
  const environmentTags = useMemo(
    () => tags.filter((tag) => hasNumber(tag.temperature) || hasNumber(tag.humidity)),
    [tags]
  );

  useEffect(() => {
    const selectableTags = environmentTags.length > 0 ? environmentTags : tags;
    if (selectableTags.length === 0) return;

    const selectedStillExists = selectableTags.some((tag) => tag.device_id === selectedDeviceId);
    if (!selectedStillExists) setSelectedDeviceId(selectableTags[0].device_id);
  }, [environmentTags, selectedDeviceId, tags]);

  const selectedTag = useMemo(() => {
    return (
      tags.find((tag) => tag.device_id === selectedDeviceId) ||
      environmentTags[0] ||
      tags[0] ||
      null
    );
  }, [environmentTags, selectedDeviceId, tags]);

  useEffect(() => {
    if (!selectedTag) return;
    if (metric === 'temperature' && !hasNumber(selectedTag.temperature) && hasNumber(selectedTag.humidity)) {
      setMetric('humidity');
    }
    if (metric === 'humidity' && !hasNumber(selectedTag.humidity) && hasNumber(selectedTag.temperature)) {
      setMetric('temperature');
    }
  }, [metric, selectedTag]);

  const tagsWithBoth = environmentTags.filter(
    (tag) => hasNumber(tag.temperature) && hasNumber(tag.humidity)
  ).length;

  const metrics = [
    { label: 'Tags received', value: tags.length, icon: Wifi, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Temperature tags', value: tagsWithTemperature.length, icon: Thermometer, tone: 'bg-orange-50 text-orange-600' },
    { label: 'Humidity tags', value: tagsWithHumidity.length, icon: Droplets, tone: 'bg-cyan-50 text-cyan-600' },
    { label: 'Both readings', value: tagsWithBoth, icon: Activity, tone: 'bg-emerald-50 text-emerald-600' },
  ];

  const listTags = environmentTags.length > 0 ? environmentTags : tags.slice(0, 12);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={wsConnected ? 'success' : 'secondary'}>
              {wsConnected ? 'Live telemetry' : 'Polling telemetry'}
            </Badge>
            {lastUpdated ? (
              <span className="text-xs font-medium text-slate-500">
                Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-4xl font-bold text-gray-900">Tag Temperature & Humidity</h1>
          <p className="mt-2 max-w-3xl text-gray-600">
            Real telemetry readings from Kinesis tags, mapped from each tag's latest telemetry payload.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={loadTags} disabled={loading} className="gap-2 self-start lg:self-auto">
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex justify-center xl:justify-start">
          <EnvironmentGaugeCard tag={selectedTag} metric={metric} onMetricChange={setMetric} />
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="border border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className={`mb-4 inline-flex rounded-xl p-3 ${item.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-medium text-slate-500">{item.label}</div>
                    <div className="mt-2 text-3xl font-bold text-slate-900">{item.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Tags With Environment Telemetry</CardTitle>
            </CardHeader>
            <CardContent>
              {environmentTags.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  <div className="font-semibold">No tags currently expose temperature or humidity fields.</div>
                  <p className="mt-2">
                    The page is connected to the live tag stream. When Kinesis returns temperature or humidity in latest telemetry, tags will appear here automatically.
                  </p>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {listTags.map((tag) => {
                  const active = tag.device_id === selectedTag?.device_id;
                  return (
                    <button
                      key={tag.device_id}
                      type="button"
                      onClick={() => setSelectedDeviceId(tag.device_id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? 'border-[#006CDD] bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-[#006CDD]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-sm font-semibold text-slate-900">{tag.device_id}</div>
                          <div className="mt-1 truncate text-sm text-slate-500">{tag.location_name || tag.position_ref || 'Unknown room'}</div>
                        </div>
                        <Badge variant={tag.status === 'online' ? 'success' : 'secondary'}>
                          {tag.status || 'offline'}
                        </Badge>
                      </div>
                      <div className="invisible mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Temp</div>
                          <div className="font-semibold text-slate-900">{formatReading(tag.temperature, 'C')}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Humidity</div>
                          <div className="font-semibold text-slate-900">{formatReading(tag.humidity, '%')}</div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">Seen {formatTimeAgo(tag.last_seen)}</div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Selected Telemetry Fields</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(selectedTag?.telemetry_fields || []).length === 0 ? (
                <span className="text-sm text-slate-500">No latest telemetry field names returned for the selected tag.</span>
              ) : (
                selectedTag.telemetry_fields.map((field) => (
                  <span key={field} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    {field}
                  </span>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentTelemetry;
