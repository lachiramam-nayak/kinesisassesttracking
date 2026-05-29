import React, { useMemo } from 'react';
import { MapPin, RadioTower, Wifi, WifiOff } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const MAP_SRC = '/assets/asset-tracking-map.png';
const MAP_SIZE = { width: 872, height: 1000 };
const DEFAULT_ANCHORS = [
  {
    id: 'office-hall',
    device_id: '343a20c6f30c',
    name: 'Office Hall',
    x: 610,
    y: 205,
    status: 'online',
  },
  {
    id: 'conference',
    device_id: '343a20c70d78',
    name: 'Conference',
    x: 180,
    y: 850,
    status: 'online',
  },
];

const isNumber = (value) => Number.isFinite(Number(value));

const toPercent = (value, total) => `${(Number(value) / total) * 100}%`;

const formatSeen = (timestamp) => {
  if (!timestamp) return 'No timestamp';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'No timestamp';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
};

const AssetTrackingMap = ({ tags = [], floorPlan, selectedDeviceId, onSelectTag }) => {
  const coordinateSpace = MAP_SIZE;

  const anchors = useMemo(() => {
    const configuredAnchors = Array.isArray(floorPlan?.anchors) ? floorPlan.anchors : [];
    const configuredRefs = new Set(configuredAnchors.map((anchor) => anchor.device_id));
    const fallbackAnchors = DEFAULT_ANCHORS.filter((anchor) => !configuredRefs.has(anchor.device_id));
    return [...configuredAnchors, ...fallbackAnchors];
  }, [floorPlan]);

  const anchorLookup = useMemo(() => {
    return anchors.reduce((lookup, anchor) => {
      lookup[anchor.device_id] = anchor;
      return lookup;
    }, {});
  }, [anchors]);

  const tagsByAnchor = useMemo(() => {
    const groups = anchors.map((anchor) => ({
      anchor,
      tags: tags.filter((tag) => tag.position_ref === anchor.device_id),
    }));

    const unassigned = tags.filter((tag) => !tag.position_ref || !anchorLookup[tag.position_ref]);
    return unassigned.length > 0
      ? [...groups, { anchor: { device_id: 'unassigned', name: 'Unassigned' }, tags: unassigned }]
      : groups;
  }, [anchorLookup, anchors, tags]);

  const selectedTag = useMemo(
    () => tags.find((tag) => tag.device_id === selectedDeviceId) || null,
    [selectedDeviceId, tags]
  );

  const selectedAnchor = selectedTag?.position_ref ? anchorLookup[selectedTag.position_ref] : null;
  const selectedPoint = selectedTag && {
    x: selectedAnchor?.x ?? selectedTag.x,
    y: selectedAnchor?.y ?? selectedTag.y,
  };
  const hasSelectedPoint = selectedPoint && isNumber(selectedPoint.x) && isNumber(selectedPoint.y);

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-xl">Asset Tracking</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span>{MAP_SIZE.width} x {MAP_SIZE.height} map</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{anchors.length} anchors</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{tags.length} tags</span>
          </div>
        </div>
        <Badge variant={hasSelectedPoint ? 'success' : 'secondary'}>
          {hasSelectedPoint ? 'Asset selected' : 'Select a tag'}
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="max-h-[760px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="space-y-3">
              {tagsByAnchor.map(({ anchor, tags: anchorTags }) => (
                <section key={anchor.device_id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{anchor.name || anchor.device_id}</div>
                      <div className="mt-1 truncate font-mono text-[11px] text-slate-500">{anchor.device_id}</div>
                    </div>
                    <Badge variant={anchorTags.length > 0 ? 'success' : 'secondary'}>
                      {anchorTags.length}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2">
                    {anchorTags.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-xs font-medium text-slate-400">
                        No tags near this anchor
                      </div>
                    ) : (
                      anchorTags.map((tag) => {
                        const active = tag.device_id === selectedDeviceId;
                        const online = tag.status === 'online';

                        return (
                          <button
                            key={tag.device_id}
                            type="button"
                            onClick={() => onSelectTag?.(tag.device_id)}
                            className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                              active
                                ? 'border-[#006CDD] bg-blue-50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-[#006CDD] hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate font-mono text-xs font-semibold text-slate-900">{tag.device_id}</span>
                              {online ? <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                            </div>
                            <div className="mt-1 text-[11px] font-medium text-slate-500">Seen {formatSeen(tag.last_seen)}</div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-inner">
              <img
                src={MAP_SRC}
                alt="Office asset tracking floor map"
                className="block h-auto w-full select-none"
                draggable="false"
              />

              {anchors.map((anchor) => {
                if (!isNumber(anchor.x) || !isNumber(anchor.y)) return null;

                return (
                  <div
                    key={anchor.id || anchor.device_id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: toPercent(anchor.x, coordinateSpace.width),
                      top: toPercent(anchor.y, coordinateSpace.height),
                    }}
                    title={anchor.device_id}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-md">
                      <RadioTower className="h-3.5 w-3.5" />
                    </div>
                  </div>
                );
              })}

              {hasSelectedPoint ? (
                <div
                  key={selectedTag.device_id}
                  className="asset-focus-marker absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: toPercent(selectedPoint.x, coordinateSpace.width),
                    top: toPercent(selectedPoint.y, coordinateSpace.height),
                  }}
                  title={`${selectedTag.device_id} - ${selectedTag.position_ref || 'no anchor ref'}`}
                >
                  <span className="asset-focus-ring asset-focus-ring-one" />
                  <span className="asset-focus-ring asset-focus-ring-two" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#006CDD] text-white shadow-xl">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="absolute left-1/2 top-12 max-w-40 -translate-x-1/2 truncate rounded bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-lg">
                    {selectedTag.device_id}
                  </div>
                </div>
              ) : null}

              {!hasSelectedPoint ? (
                <div className="absolute inset-x-4 bottom-4 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 text-sm font-medium text-slate-600 shadow">
                  Select a tag from the anchor sidebar to focus it on the map.
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#006CDD]" />
                Selected tag
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                Anchor
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetTrackingMap;
