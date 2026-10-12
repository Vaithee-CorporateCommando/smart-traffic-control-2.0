// Smart Urban Traffic Control - Core Data & Network Service (Ported from Java backend)

export const MAP_CONFIG = {
  defaultCenter: [28.6315, 77.2167], // Central Delhi / Connaught Place Core
  defaultZoom: 13,
  minZoom: 10,
  maxZoom: 18,
  regionName: 'Delhi Urban Corridor Network (Sample Simulation Grid)',
  isDemoData: true,
  providers: {
    osm: {
      id: 'osm',
      name: 'Street',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: 'abc'
    },
    cartoLight: {
      id: 'cartoLight',
      name: 'Light',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
      maxNativeZoom: 16
    },
    cartoDark: {
      id: 'cartoDark',
      name: 'Dark',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
      maxNativeZoom: 16
    },
    street: {
      id: 'street',
      name: 'Street',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: 'abc'
    },
    light: {
      id: 'light',
      name: 'Light',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
      maxNativeZoom: 16
    },
    dark: {
      id: 'dark',
      name: 'Dark',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
      maxNativeZoom: 16
    }
  }
};

export const INITIAL_JUNCTIONS = [
  { id: 'J1', name: 'Central City Square', district: 'Downtown Core', landmark: 'Connaught Place Radial Hub', lat: 28.6315, lng: 77.2167, x: 410, y: 290, signalState: 'GREEN_NORTH_SOUTH', congestionLevel: 'LOW', queue: 14, cycle: 60, green: 30, manualOverride: false, overrideReason: '', cctv: true },
  { id: 'J2', name: 'North Metro Interchange', district: 'North District', landmark: 'Kashmere Gate ISBT Junction', lat: 28.6665, lng: 77.2285, x: 410, y: 110, signalState: 'GREEN_NORTH_SOUTH', congestionLevel: 'LOW', queue: 8, cycle: 60, green: 30, manualOverride: false, overrideReason: '', cctv: true },
  { id: 'J3', name: 'Tech Park Crossing', district: 'East Innovation Zone', landmark: 'Barakhamba - Mandi House Node', lat: 28.6258, lng: 77.2340, x: 660, y: 200, signalState: 'GREEN_EAST_WEST', congestionLevel: 'HIGH', queue: 34, cycle: 75, green: 40, manualOverride: false, overrideReason: '', cctv: true },
  { id: 'J4', name: 'Harbour Bridge Gateway', district: 'Maritime District', landmark: 'Pragati Maidan / River Expressway', lat: 28.6185, lng: 77.2465, x: 610, y: 460, signalState: 'GREEN_NORTH_SOUTH', congestionLevel: 'HIGH', queue: 28, cycle: 60, green: 30, manualOverride: false, overrideReason: '', cctv: true },
  { id: 'J5', name: 'West Ring Gateway', district: 'Western Suburbs', landmark: 'Karol Bagh - Pusa Arterial', lat: 28.6435, lng: 77.1895, x: 170, y: 290, signalState: 'GREEN_EAST_WEST', congestionLevel: 'LOW', queue: 11, cycle: 60, green: 30, manualOverride: false, overrideReason: '', cctv: true },
  { id: 'J6', name: 'University Circle', district: 'Academic Sector', landmark: 'Delhi North Campus Circle', lat: 28.6880, lng: 77.2085, x: 200, y: 130, signalState: 'GREEN_NORTH_SOUTH', congestionLevel: 'LOW', queue: 9, cycle: 50, green: 25, manualOverride: false, overrideReason: '', cctv: true },
  { id: 'J7', name: 'Airport Expressway Toll', district: 'Airport Corridor', landmark: 'Dhaula Kuan Highway Link', lat: 28.5910, lng: 77.1620, x: 710, y: 80, signalState: 'GREEN_NORTH_SOUTH', congestionLevel: 'LOW', queue: 15, cycle: 80, green: 45, manualOverride: false, overrideReason: '', cctv: true },
  { id: 'J8', name: 'Industrial Corridor Node', district: 'South Manufacturing', landmark: 'Okhla Phase-II Radial Node', lat: 28.5355, lng: 77.2720, x: 340, y: 480, signalState: 'GREEN_EAST_WEST', congestionLevel: 'MEDIUM', queue: 19, cycle: 60, green: 30, manualOverride: false, overrideReason: '', cctv: true },
  { id: 'J9', name: 'Grand Central Station', district: 'Transit Center', landmark: 'New Delhi Railway Station Plaza', lat: 28.6425, lng: 77.2215, x: 230, y: 420, signalState: 'GREEN_NORTH_SOUTH', congestionLevel: 'MEDIUM', queue: 22, cycle: 65, green: 35, manualOverride: false, overrideReason: '', cctv: true },
];

export const INITIAL_ROADS = [
  { id: 'R1', name: 'Central North Avenue', from: 'J1', to: 'J2', lengthKm: 3.2, baseSpeed: 50, currentSpeed: 42, lanes: 6, blocked: false, blockReason: '' },
  { id: 'R1_REV', name: 'Central North Avenue (SB)', from: 'J2', to: 'J1', lengthKm: 3.2, baseSpeed: 50, currentSpeed: 40, lanes: 6, blocked: false, blockReason: '' },

  { id: 'R2', name: 'Tech Innovation Boulevard', from: 'J1', to: 'J3', lengthKm: 4.5, baseSpeed: 60, currentSpeed: 22, lanes: 4, blocked: false, blockReason: '' },
  { id: 'R2_REV', name: 'Tech Innovation Blvd (WB)', from: 'J3', to: 'J1', lengthKm: 4.5, baseSpeed: 60, currentSpeed: 24, lanes: 4, blocked: false, blockReason: '' },

  { id: 'R3', name: 'Harbour Waterfront Expressway', from: 'J1', to: 'J4', lengthKm: 5.0, baseSpeed: 70, currentSpeed: 0, lanes: 6, blocked: true, blockReason: 'Emergency Water Main Repair near Pier 4' },
  { id: 'R3_REV', name: 'Harbour Waterfront Exp (NB)', from: 'J4', to: 'J1', lengthKm: 5.0, baseSpeed: 70, currentSpeed: 0, lanes: 6, blocked: true, blockReason: 'Emergency Water Main Repair near Pier 4' },

  { id: 'R4', name: 'West Civic Highway', from: 'J1', to: 'J5', lengthKm: 3.8, baseSpeed: 55, currentSpeed: 48, lanes: 4, blocked: false, blockReason: '' },
  { id: 'R4_REV', name: 'West Civic Highway (EB)', from: 'J5', to: 'J1', lengthKm: 3.8, baseSpeed: 55, currentSpeed: 50, lanes: 4, blocked: false, blockReason: '' },

  { id: 'R5', name: 'Metro Campus Link', from: 'J2', to: 'J6', lengthKm: 3.5, baseSpeed: 45, currentSpeed: 38, lanes: 4, blocked: false, blockReason: '' },
  { id: 'R5_REV', name: 'Metro Campus Link (EB)', from: 'J6', to: 'J2', lengthKm: 3.5, baseSpeed: 45, currentSpeed: 40, lanes: 4, blocked: false, blockReason: '' },

  { id: 'R6', name: 'Airport North Connector', from: 'J2', to: 'J7', lengthKm: 5.2, baseSpeed: 80, currentSpeed: 75, lanes: 6, blocked: false, blockReason: '' },
  { id: 'R6_REV', name: 'Airport North Connector (SB)', from: 'J7', to: 'J2', lengthKm: 5.2, baseSpeed: 80, currentSpeed: 72, lanes: 6, blocked: false, blockReason: '' },

  { id: 'R7', name: 'Silicon Airport Radial', from: 'J3', to: 'J7', lengthKm: 3.6, baseSpeed: 70, currentSpeed: 62, lanes: 4, blocked: false, blockReason: '' },
  { id: 'R7_REV', name: 'Silicon Airport Radial (SB)', from: 'J7', to: 'J3', lengthKm: 3.6, baseSpeed: 70, currentSpeed: 60, lanes: 4, blocked: false, blockReason: '' },

  { id: 'R8', name: 'East Coastal Arterial', from: 'J3', to: 'J4', lengthKm: 4.8, baseSpeed: 60, currentSpeed: 52, lanes: 4, blocked: false, blockReason: '' },
  { id: 'R8_REV', name: 'East Coastal Arterial (NB)', from: 'J4', to: 'J3', lengthKm: 4.8, baseSpeed: 60, currentSpeed: 54, lanes: 4, blocked: false, blockReason: '' },

  { id: 'R9', name: 'South Port Link', from: 'J4', to: 'J8', lengthKm: 4.2, baseSpeed: 50, currentSpeed: 38, lanes: 4, blocked: false, blockReason: '' },
  { id: 'R9_REV', name: 'South Port Link (EB)', from: 'J8', to: 'J4', lengthKm: 4.2, baseSpeed: 50, currentSpeed: 40, lanes: 4, blocked: false, blockReason: '' },

  { id: 'R10', name: 'Grand Terminal Way', from: 'J1', to: 'J9', lengthKm: 2.8, baseSpeed: 45, currentSpeed: 36, lanes: 4, blocked: false, blockReason: '' },
  { id: 'R10_REV', name: 'Grand Terminal Way (NB)', from: 'J9', to: 'J1', lengthKm: 2.8, baseSpeed: 45, currentSpeed: 38, lanes: 4, blocked: false, blockReason: '' },

  { id: 'R11', name: 'Western Ring Boulevard', from: 'J5', to: 'J6', lengthKm: 3.0, baseSpeed: 50, currentSpeed: 44, lanes: 4, blocked: false, blockReason: '' },
  { id: 'R11_REV', name: 'Western Ring Blvd (SB)', from: 'J6', to: 'J5', lengthKm: 3.0, baseSpeed: 50, currentSpeed: 42, lanes: 4, blocked: false, blockReason: '' },

  { id: 'R12', name: 'Suburban South Bypass', from: 'J5', to: 'J9', lengthKm: 2.7, baseSpeed: 45, currentSpeed: 40, lanes: 4, blocked: false, blockReason: '' },
  { id: 'R12_REV', name: 'Suburban South Bypass (NB)', from: 'J9', to: 'J5', lengthKm: 2.7, baseSpeed: 45, currentSpeed: 42, lanes: 4, blocked: false, blockReason: '' },

  { id: 'R13', name: 'Industrial Freight Way', from: 'J9', to: 'J8', lengthKm: 2.5, baseSpeed: 40, currentSpeed: 32, lanes: 4, blocked: false, blockReason: '' },
  { id: 'R13_REV', name: 'Industrial Freight Way (WB)', from: 'J8', to: 'J9', lengthKm: 2.5, baseSpeed: 40, currentSpeed: 34, lanes: 4, blocked: false, blockReason: '' },
];

export const INITIAL_CCTV = [
  { id: 'CAM-01', name: 'Central Square North PTZ', junctionId: 'J1', junctionName: 'Central City Square', direction: 'North View', online: true, resolution: '1080p 60fps', fps: 30, ip: '10.240.12.101', ptz: true },
  { id: 'CAM-02', name: 'Central Square South High-Angle', junctionId: 'J1', junctionName: 'Central City Square', direction: 'South View', online: true, resolution: '1080p 30fps', fps: 30, ip: '10.240.12.102', ptz: false },
  { id: 'CAM-03', name: 'Metro Interchange Gantry', junctionId: 'J2', junctionName: 'North Metro Interchange', direction: 'All Approaches', online: true, resolution: '4K 30fps', fps: 30, ip: '10.240.12.103', ptz: true },
  { id: 'CAM-04', name: 'Tech Park East Gate', junctionId: 'J3', junctionName: 'Tech Park Crossing', direction: 'Eastbound Corridor', online: true, resolution: '1080p 30fps', fps: 28, ip: '10.240.12.104', ptz: false },
  { id: 'CAM-05', name: 'Harbour Gateway Waterfront', junctionId: 'J4', junctionName: 'Harbour Bridge Gateway', direction: 'Bridge Approach', online: false, resolution: '1080p (Maintenance)', fps: 0, ip: '10.240.12.105', ptz: true },
  { id: 'CAM-06', name: 'West Ring Overpass', junctionId: 'J5', junctionName: 'West Ring Gateway', direction: 'Western Express', online: true, resolution: '1080p 30fps', fps: 30, ip: '10.240.12.106', ptz: true },
  { id: 'CAM-07', name: 'University Circle Roundabout', junctionId: 'J6', junctionName: 'University Circle', direction: 'Pedestrian Crossings', online: true, resolution: '1080p 30fps', fps: 30, ip: '10.240.12.107', ptz: false },
  { id: 'CAM-08', name: 'Airport Expressway Toll Plaza', junctionId: 'J7', junctionName: 'Airport Expressway Toll', direction: 'Toll Gates 1-8', online: true, resolution: '4K 60fps', fps: 60, ip: '10.240.12.108', ptz: true },
  { id: 'CAM-09', name: 'Grand Station Multimodal Hub', junctionId: 'J9', junctionName: 'Grand Central Station', direction: 'Terminal Plaza', online: true, resolution: '1080p 30fps', fps: 29, ip: '10.240.12.109', ptz: true },
];

export const INITIAL_INCIDENTS = [
  { id: 'INC-101', title: 'Water Pipe Fracture & Flooding', type: 'WATERLOGGING', severity: 'HIGH', location: 'Harbour Waterfront Expressway (Pier 4)', roadId: 'R3', lat: 28.6220, lng: 77.2410, reportedBy: 'Municipal Water Works Board', description: 'Severe water pipeline rupture resulting in full carriageway closure. Emergency diversion in place.', status: 'VERIFIED_PUBLISHED', time: '14:20:10', verifiedBy: 'Officer Priya Nair' },
  { id: 'INC-102', title: 'Multi-Vehicle Fender Bender', type: 'ACCIDENT', severity: 'MEDIUM', location: 'Tech Innovation Boulevard near Tower B', roadId: 'R2', lat: 28.6280, lng: 77.2260, reportedBy: 'Traffic Patrol Unit 7', description: 'Two private vehicles involved in minor rear-end collision. Left two lanes obstructed, slowing traffic to 22 km/h.', status: 'VERIFIED_PUBLISHED', time: '14:45:30', verifiedBy: 'Traffic Operations Directorate' },
  { id: 'INC-103', title: 'Stalled Heavy Freight Truck', type: 'VEHICLE_BREAKDOWN', severity: 'LOW', location: 'Western Ring Boulevard Exit 2', roadId: 'R11', lat: 28.6600, lng: 77.1980, reportedBy: 'Citizen Mobile App Report', description: 'Heavy container carrier stalled on shoulder. Towing truck dispatched by highway patrol.', status: 'PENDING_REVIEW', time: '15:02:15', verifiedBy: '' },
];

export const INITIAL_ROADBLOCKS = [
  { id: 'RB-201', roadId: 'R3', roadName: 'Harbour Waterfront Expressway', lat: 28.6220, lng: 77.2410, reason: 'Emergency Water Main Repair by Municipal Authority', authority: 'Civil Works & Traffic Police', time: '14:25:00', expectedClearance: '18:00 Today', status: 'ACTIVE' }
];

export const INITIAL_DISPATCHES = [
  { id: 'EMG-401', vehicleCode: 'AMB-108', type: 'AMBULANCE', mission: 'Cardiac Emergency - North Metro to City General', origin: 'North Metro Interchange', destination: 'Central City Square', corridor: ['J2', 'J1'], status: 'CORRIDOR_ACTIVE', timeSaved: 6 }
];

export const INITIAL_AUDIT = [
  { id: 'LOG-104', time: '15:10:20', admin: 'admin', action: 'INCIDENT_VERIFIED', target: 'Incident INC-102', reason: 'Validated via camera feed and dispatched public alert', result: 'SUCCESS' },
  { id: 'LOG-103', time: '14:50:00', admin: 'officer', action: 'TIMING_UPDATE', target: 'Junction J3 - Tech Park', reason: 'Adjusted peak-hour morning cycle from 60s to 75s', result: 'SUCCESS' },
  { id: 'LOG-102', time: '14:30:15', admin: 'admin', action: 'SYNC_CCTV', target: 'All Video Feeds (9 Junctions)', reason: 'Scheduled CCTV diagnostic and stream integrity check', result: 'SUCCESS' },
  { id: 'LOG-101', time: '14:00:00', admin: 'admin', action: 'SYSTEM_STARTUP', target: 'Central Traffic Controller', reason: 'Routine system boot & sensor handshake', result: 'SUCCESS' },
];

// Dijkstra Pathfinding Function avoiding roadblocks
export function calculateRoutes(originId, destId, junctions, roads) {
  if (originId === destId) {
    return [{
      name: 'Current Location Node',
      distance: 0,
      duration: 0,
      typical: 0,
      delay: 0,
      recommended: true,
      note: 'Origin and destination are the same intersection.',
      pathJunctions: [originId],
      pathRoads: []
    }];
  }

  // Helper Dijkstra
  function findPath(penalizedRoadIds = new Set()) {
    const dist = {};
    const prevJ = {};
    const prevR = {};
    const unvisited = new Set();

    junctions.forEach(j => {
      dist[j.id] = Infinity;
      unvisited.add(j.id);
    });
    dist[originId] = 0;

    let encounteredBlock = false;

    while (unvisited.size > 0) {
      let current = null;
      let minD = Infinity;
      unvisited.forEach(jId => {
        if (dist[jId] < minD) {
          minD = dist[jId];
          current = jId;
        }
      });

      if (!current || minD === Infinity || current === destId) break;
      unvisited.delete(current);

      const outgoing = roads.filter(r => r.from === current);
      outgoing.forEach(road => {
        if (!unvisited.has(road.to)) return;

        if (road.blocked) {
          encounteredBlock = true;
          return; // Skip blocked roads
        }

        const currentSpeed = Math.max(1, road.currentSpeed || road.baseSpeed);
        let weight = (road.lengthKm / currentSpeed) * 60; // minutes

        if (penalizedRoadIds.has(road.id)) {
          weight *= 2.5; // Penalty for alternative diversity
        }

        const alt = dist[current] + weight;
        if (alt < dist[road.to]) {
          dist[road.to] = alt;
          prevJ[road.to] = current;
          prevR[road.to] = road;
        }
      });
    }

    if (dist[destId] === Infinity) return null;

    // Reconstruct
    const pJunctions = [];
    const pRoads = [];
    let curr = destId;
    let totalKm = 0;
    let totalMins = 0;
    let typicalMins = 0;

    while (curr) {
      pJunctions.unshift(curr);
      const road = prevR[curr];
      if (road) {
        pRoads.unshift(road);
        totalKm += road.lengthKm;
        const spd = Math.max(1, road.currentSpeed || road.baseSpeed);
        totalMins += (road.lengthKm / spd) * 60;
        typicalMins += (road.lengthKm / road.baseSpeed) * 60;
      }
      curr = prevJ[curr];
    }

    return {
      distance: totalKm,
      duration: totalMins,
      typical: typicalMins,
      delay: Math.max(0, totalMins - typicalMins),
      pathJunctions: pJunctions,
      pathRoads: pRoads,
      hadBlock: encounteredBlock
    };
  }

  const best = findPath();
  if (!best) return [];

  const results = [];
  results.push({
    name: 'Fastest Route (Recommended)',
    distance: Number(best.distance.toFixed(1)),
    duration: Number(best.duration.toFixed(1)),
    typical: Number(best.typical.toFixed(1)),
    delay: Number(best.delay.toFixed(1)),
    recommended: true,
    note: best.hadBlock ?
      'Bypasses active roadblocks with optimized signal timings.' :
      'Optimal route based on real-time traffic speeds and low queue delays.',
    pathJunctions: best.pathJunctions,
    pathRoads: best.pathRoads
  });

  // Alternative Route
  const penalized = new Set(best.pathRoads.map(r => r.id));
  const alt = findPath(penalized);
  if (alt && alt.pathRoads.length > 0 && alt.pathRoads.map(r => r.id).join() !== best.pathRoads.map(r => r.id).join()) {
    results.push({
      name: 'Alternative Scenic Bypass',
      distance: Number(alt.distance.toFixed(1)),
      duration: Number(alt.duration.toFixed(1)),
      typical: Number(alt.typical.toFixed(1)),
      delay: Number(alt.delay.toFixed(1)),
      recommended: false,
      note: 'Secondary corridor offering steady flow with fewer traffic signals.',
      pathJunctions: alt.pathJunctions,
      pathRoads: alt.pathRoads
    });
  }

  return results;
}
