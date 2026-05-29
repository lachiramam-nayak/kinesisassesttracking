# RTLS Platform - P0 Features Testing Plan

## Features Implemented:

### 1. Tag Clustering & Visibility
- **Cluster Detection**: Tags within 30px are grouped into clusters
- **Cluster Display**: Show count in a circle (color-coded: red if low battery)
- **Click to Expand**: Click cluster to spread tags in spider pattern
- **Single Tag Display**: Non-overlapping tags show individually with labels

### 2. Status Filter & Tag Selection
- **Segmented Toggle**: All | Online | Offline filter
- **Search**: Search tags by device ID
- **Multi-Select**: Checkbox list to select specific tags to display
- **Filter Panel**: Collapsible sidebar with all filters

### 3. Patient Name Display
- **Purple Tags**: Patient-assigned tags show in purple with "P" icon
- **Patient Name Label**: Shows patient's first name below tag
- **Asset List**: Shows patient name, ID, and ward in sidebar

### 4. Equipment Assignment
- **Assets Page**: Each asset card has equipment assignment section
- **Equipment Types**: Ventilator, X-Ray, ECG Monitor, Wheelchair, etc.
- **Orange Tags**: Equipment-assigned tags show in orange with "E" icon
- **Equipment Label**: Shows equipment type below tag on map

### 5. History Mode
- **Live Updates Paused**: When playing history, live WebSocket updates are stopped
- **Badge Indicator**: Shows "Live Updates Paused" when in history mode
- **Resume**: Exiting history mode resumes live updates

## Test Scenarios:

### Test 1: Filter Functionality
1. Navigate to RTLS page
2. Click "Online" filter - verify only online tags show
3. Click "Offline" filter - verify only offline tags show
4. Click "All" filter - verify all tags show
5. Search for specific device ID - verify filtering works

### Test 2: Tag Clustering
1. Navigate to RTLS page with floor plan loaded
2. Verify tags are clustered when close together
3. Click on a cluster - verify it expands in spider pattern
4. Click again - verify it collapses back to cluster

### Test 3: Patient Assignment Display
1. Navigate to Patient-Tags page
2. Assign a tag to a patient
3. Navigate back to RTLS page
4. Verify tag shows in purple with patient name
5. Verify "P" icon appears in the tag circle
6. Verify asset list shows patient details

### Test 4: Equipment Assignment Display
1. Navigate to Assets page
2. Click edit icon on equipment section
3. Select an equipment type (e.g., Wheelchair)
4. Navigate to RTLS page
5. Verify tag shows in orange with equipment name
6. Verify "E" icon appears in the tag circle

### Test 5: History Mode
1. Navigate to RTLS page
2. Select a device from dropdown
3. Click "Load History"
4. Click Play button
5. Verify "Live Updates Paused" badge appears
6. Verify WebSocket updates are not affecting the display
7. Click Reset - verify live mode resumes

