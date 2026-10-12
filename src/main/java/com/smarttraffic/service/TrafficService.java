package com.smarttraffic.service;

import com.smarttraffic.model.*;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.util.Duration;

import java.util.*;

public class TrafficService {
    private static TrafficService instance;

    private final Map<String, Junction> junctionMap = new LinkedHashMap<>();
    private final Map<String, Road> roadMap = new LinkedHashMap<>();
    private final ObservableList<Junction> junctions = FXCollections.observableArrayList();
    private final ObservableList<Road> roads = FXCollections.observableArrayList();
    private final ObservableList<CctvFeed> cctvFeeds = FXCollections.observableArrayList();
    private final ObservableList<Incident> incidents = FXCollections.observableArrayList();
    private final ObservableList<RoadBlock> roadBlocks = FXCollections.observableArrayList();
    private final ObservableList<EmergencyDispatch> emergencyDispatches = FXCollections.observableArrayList();

    private Timeline simulationTimeline;
    private final List<Runnable> updateListeners = new ArrayList<>();
    private boolean simulationRunning = true;

    private TrafficService() {
        initNetwork();
        initCctvFeeds();
        initIncidentsAndRoadBlocks();
        initEmergencyDispatches();
        startSimulationPulse();
    }

    public static synchronized TrafficService getInstance() {
        if (instance == null) {
            instance = new TrafficService();
        }
        return instance;
    }

    private void initNetwork() {
        // Create 9 key urban junctions
        addJunction(new Junction("J1", "Central City Square", "Downtown Core", 410, 290));
        addJunction(new Junction("J2", "North Metro Interchange", "North District", 410, 110));
        addJunction(new Junction("J3", "Tech Park Crossing", "East Innovation Zone", 660, 200));
        addJunction(new Junction("J4", "Harbour Bridge Gateway", "Maritime District", 610, 460));
        addJunction(new Junction("J5", "West Ring Gateway", "Western Suburbs", 170, 290));
        addJunction(new Junction("J6", "University Circle", "Academic Sector", 200, 130));
        addJunction(new Junction("J7", "Airport Expressway Toll", "Airport Corridor", 710, 80));
        addJunction(new Junction("J8", "Industrial Corridor Node", "South Manufacturing", 340, 480));
        addJunction(new Junction("J9", "Grand Central Station", "Transit Center", 230, 420));

        // Connect roads
        // Format: ID, Name, From, To, Length (km), Base Speed (km/h), Lanes
        addRoad(new Road("R1", "Central North Avenue", "J1", "J2", 3.2, 50, 6));
        addRoad(new Road("R1_REV", "Central North Avenue (SB)", "J2", "J1", 3.2, 50, 6));

        addRoad(new Road("R2", "Tech Innovation Boulevard", "J1", "J3", 4.5, 60, 4));
        addRoad(new Road("R2_REV", "Tech Innovation Blvd (WB)", "J3", "J1", 4.5, 60, 4));

        addRoad(new Road("R3", "Harbour Waterfront Expressway", "J1", "J4", 5.0, 70, 6));
        addRoad(new Road("R3_REV", "Harbour Waterfront Exp (NB)", "J4", "J1", 5.0, 70, 6));

        addRoad(new Road("R4", "West Civic Highway", "J1", "J5", 3.8, 55, 4));
        addRoad(new Road("R4_REV", "West Civic Highway (EB)", "J5", "J1", 3.8, 55, 4));

        addRoad(new Road("R5", "Metro Campus Link", "J2", "J6", 3.5, 45, 4));
        addRoad(new Road("R5_REV", "Metro Campus Link (EB)", "J6", "J2", 3.5, 45, 4));

        addRoad(new Road("R6", "Airport North Connector", "J2", "J7", 5.2, 80, 6));
        addRoad(new Road("R6_REV", "Airport North Connector (SB)", "J7", "J2", 5.2, 80, 6));

        addRoad(new Road("R7", "Silicon Airport Radial", "J3", "J7", 3.6, 70, 4));
        addRoad(new Road("R7_REV", "Silicon Airport Radial (SB)", "J7", "J3", 3.6, 70, 4));

        addRoad(new Road("R8", "East Coastal Arterial", "J3", "J4", 4.8, 60, 4));
        addRoad(new Road("R8_REV", "East Coastal Arterial (NB)", "J4", "J3", 4.8, 60, 4));

        addRoad(new Road("R9", "South Port Link", "J4", "J8", 4.2, 50, 4));
        addRoad(new Road("R9_REV", "South Port Link (EB)", "J8", "J4", 4.2, 50, 4));

        addRoad(new Road("R10", "Grand Terminal Way", "J1", "J9", 2.8, 45, 4));
        addRoad(new Road("R10_REV", "Grand Terminal Way (NB)", "J9", "J1", 2.8, 45, 4));

        addRoad(new Road("R11", "Western Ring Boulevard", "J5", "J6", 3.0, 50, 4));
        addRoad(new Road("R11_REV", "Western Ring Blvd (SB)", "J6", "J5", 3.0, 50, 4));

        addRoad(new Road("R12", "Suburban South Bypass", "J5", "J9", 2.7, 45, 4));
        addRoad(new Road("R12_REV", "Suburban South Bypass (NB)", "J9", "J5", 2.7, 45, 4));

        addRoad(new Road("R13", "Industrial Freight Way", "J9", "J8", 2.5, 40, 4));
        addRoad(new Road("R13_REV", "Industrial Freight Way (WB)", "J8", "J9", 2.5, 40, 4));

        // Set realistic initial speeds and congestion
        Road r2 = roadMap.get("R2");
        if (r2 != null) r2.setCurrentSpeedKmh(22.0); // Medium/Heavy Congestion on Tech Blvd

        Road r1 = roadMap.get("R1");
        if (r1 != null) r1.setCurrentSpeedKmh(42.0); // Low Congestion on Central North

        Road r3 = roadMap.get("R3");
        if (r3 != null) {
            r3.setBlocked(true, "Emergency Water Main Repair near Pier 4");
        }

        junctionMap.get("J1").setCongestionLevel(Junction.CongestionLevel.MEDIUM);
        junctionMap.get("J3").setCongestionLevel(Junction.CongestionLevel.HIGH);
        junctionMap.get("J4").setCongestionLevel(Junction.CongestionLevel.HIGH);
        junctionMap.get("J2").setCongestionLevel(Junction.CongestionLevel.LOW);
    }

    private void addJunction(Junction j) {
        junctionMap.put(j.getId(), j);
        junctions.add(j);
    }

    private void addRoad(Road r) {
        roadMap.put(r.getId(), r);
        roads.add(r);
        Junction fromJ = junctionMap.get(r.getFromJunctionId());
        if (fromJ != null) fromJ.addConnectedRoad(r.getId());
    }

    private void initCctvFeeds() {
        cctvFeeds.add(new CctvFeed("CAM-01", "Central Square North PTZ", "J1", "Central City Square", "North View", true, "1080p 60fps", 30, "10.240.12.101", true));
        cctvFeeds.add(new CctvFeed("CAM-02", "Central Square South High-Angle", "J1", "Central City Square", "South View", true, "1080p 30fps", 30, "10.240.12.102", false));
        cctvFeeds.add(new CctvFeed("CAM-03", "Metro Interchange Gantry", "J2", "North Metro Interchange", "All Approaches", true, "4K 30fps", 30, "10.240.12.103", true));
        cctvFeeds.add(new CctvFeed("CAM-04", "Tech Park East Gate", "J3", "Tech Park Crossing", "Eastbound Corridor", true, "1080p 30fps", 28, "10.240.12.104", false));
        cctvFeeds.add(new CctvFeed("CAM-05", "Harbour Gateway Waterfront", "J4", "Harbour Bridge Gateway", "Bridge Approach", false, "1080p (Maintenance)", 0, "10.240.12.105", true));
        cctvFeeds.add(new CctvFeed("CAM-06", "West Ring Overpass", "J5", "West Ring Gateway", "Western Express", true, "1080p 30fps", 30, "10.240.12.106", true));
        cctvFeeds.add(new CctvFeed("CAM-07", "University Circle Roundabout", "J6", "University Circle", "Pedestrian Crossings", true, "1080p 30fps", 30, "10.240.12.107", false));
        cctvFeeds.add(new CctvFeed("CAM-08", "Airport Expressway Toll Plaza", "J7", "Airport Expressway Toll", "Toll Gates 1-8", true, "4K 60fps", 60, "10.240.12.108", true));
        cctvFeeds.add(new CctvFeed("CAM-09", "Grand Station Multimodal Hub", "J9", "Grand Central Station", "Terminal Plaza", true, "1080p 30fps", 29, "10.240.12.109", true));
    }

    private void initIncidentsAndRoadBlocks() {
        // Initial verified incident
        Incident inc1 = new Incident("INC-101", "Water Pipe Fracture & Flooding",
                Incident.Type.WATERLOGGING, Incident.Severity.HIGH,
                "Harbour Waterfront Expressway (Pier 4)", "R3",
                "Municipal Water Works Board",
                "Severe water pipeline rupture resulting in full carriageway closure. Emergency diversion in place.",
                Incident.Status.VERIFIED_PUBLISHED);
        incidents.add(inc1);

        Incident inc2 = new Incident("INC-102", "Multi-Vehicle Fender Bender",
                Incident.Type.ACCIDENT, Incident.Severity.MEDIUM,
                "Tech Innovation Boulevard near Tower B", "R2",
                "Traffic Patrol Vehicle Unit 7",
                "Two private vehicles involved in minor rear-end collision. Left two lanes obstructed, slowing traffic to 20 km/h.",
                Incident.Status.VERIFIED_PUBLISHED);
        incidents.add(inc2);

        Incident inc3 = new Incident("INC-103", "Stalled Heavy Freight Truck",
                Incident.Type.VEHICLE_BREAKDOWN, Incident.Severity.LOW,
                "Western Ring Boulevard Exit 2", "R11",
                "Citizen Mobile App Report",
                "Heavy container carrier stalled on shoulder. Towing truck dispatched by highway patrol.",
                Incident.Status.PENDING_REVIEW);
        incidents.add(inc3);

        // Corresponding road block
        RoadBlock rb1 = new RoadBlock("RB-201", "R3", "Harbour Waterfront Expressway",
                "Water Main Repair by Municipal Authority", "Civil Works & Traffic Police", "18:00 Today");
        roadBlocks.add(rb1);
    }

    private void initEmergencyDispatches() {
        EmergencyDispatch amb = new EmergencyDispatch("EMG-401", "AMB-108",
                EmergencyDispatch.VehicleType.AMBULANCE,
                "Cardiac Emergency - North Metro to City General",
                "North Metro Interchange", "Central City Square",
                List.of("J2", "J1"));
        emergencyDispatches.add(amb);
    }

    public void startSimulationPulse() {
        if (simulationTimeline != null && simulationTimeline.getStatus() == Timeline.Status.RUNNING) {
            return;
        }
        try {
            Platform.runLater(() -> {
                try {
                    if (simulationTimeline == null) {
                        simulationTimeline = new Timeline(new KeyFrame(Duration.seconds(3.0), event -> {
                            if (!simulationRunning) return;
                            tickTrafficSimulation();
                        }));
                        simulationTimeline.setCycleCount(Timeline.INDEFINITE);
                    }
                    simulationTimeline.play();
                } catch (Exception ignored) {}
            });
        } catch (IllegalStateException e) {
            // JavaFX toolkit not initialized yet; will start when UI launches
        }
    }

    private void tickTrafficSimulation() {
        Random rnd = new Random();
        for (Junction j : junctions) {
            if (!j.isManualOverrideActive()) {
                // Rotate automatic signal phase smoothly
                if (j.getCurrentSignalState() == Junction.SignalState.GREEN_NORTH_SOUTH) {
                    if (rnd.nextDouble() > 0.6) {
                        j.setCurrentSignalState(Junction.SignalState.GREEN_EAST_WEST);
                    }
                } else if (j.getCurrentSignalState() == Junction.SignalState.GREEN_EAST_WEST) {
                    if (rnd.nextDouble() > 0.6) {
                        j.setCurrentSignalState(Junction.SignalState.GREEN_NORTH_SOUTH);
                    }
                }
            }

            // Slight dynamic jitter in queue length
            int delta = rnd.nextInt(5) - 2;
            int newQueue = Math.max(2, Math.min(65, j.getVehicleQueueLength() + delta));
            j.setVehicleQueueLength(newQueue);
        }

        // Notify UI listeners
        Platform.runLater(() -> {
            for (Runnable r : updateListeners) {
                try {
                    r.run();
                } catch (Exception ignored) {}
            }
        });
    }

    public void addUpdateListener(Runnable listener) {
        updateListeners.add(listener);
    }

    public void removeUpdateListener(Runnable listener) {
        updateListeners.remove(listener);
    }

    public Map<String, Junction> getJunctionMap() { return junctionMap; }
    public Map<String, Road> getRoadMap() { return roadMap; }
    public ObservableList<Junction> getJunctions() { return junctions; }
    public ObservableList<Road> getRoads() { return roads; }
    public ObservableList<CctvFeed> getCctvFeeds() { return cctvFeeds; }
    public ObservableList<Incident> getIncidents() { return incidents; }
    public ObservableList<RoadBlock> getRoadBlocks() { return roadBlocks; }
    public ObservableList<EmergencyDispatch> getEmergencyDispatches() { return emergencyDispatches; }

    public Junction getJunction(String id) { return junctionMap.get(id); }
    public Road getRoad(String id) { return roadMap.get(id); }

    public void createRoadBlock(String roadId, String reason, String authority, String expectedClearance) {
        Road road = roadMap.get(roadId);
        if (road != null) {
            road.setBlocked(true, reason);
            String id = "RB-" + (200 + roadBlocks.size() + 1);
            RoadBlock rb = new RoadBlock(id, roadId, road.getName(), reason, authority, expectedClearance);
            roadBlocks.add(0, rb);
            AuditService.getInstance().log("admin", "ROAD_BLOCK_CREATED", road.getName(),
                    reason, AuditRecord.Result.SUCCESS);
        }
    }

    public void clearRoadBlock(RoadBlock rb) {
        rb.setStatus(RoadBlock.Status.CLEARED);
        rb.setClearedTime(java.time.LocalDateTime.now());
        rb.setClearedBy("Traffic Authority");
        Road road = roadMap.get(rb.getRoadId());
        if (road != null) {
            road.setBlocked(false, "");
        }
        AuditService.getInstance().log("admin", "ROAD_BLOCK_CLEARED", rb.getRoadName(),
                "Obstruction cleared; traffic restored", AuditRecord.Result.SUCCESS);
    }

    public void verifyIncident(Incident inc, String officerName) {
        inc.setStatus(Incident.Status.VERIFIED_PUBLISHED);
        inc.setVerifiedBy(officerName);
        inc.setVerifiedTime(java.time.LocalDateTime.now());
        AuditService.getInstance().log(officerName, "INCIDENT_VERIFIED", inc.getTitle(),
                "Validated via camera feed and dispatched public alert", AuditRecord.Result.SUCCESS);
    }

    public void resolveIncident(Incident inc, String officerName) {
        inc.setStatus(Incident.Status.RESOLVED);
        AuditService.getInstance().log(officerName, "INCIDENT_RESOLVED", inc.getTitle(),
                "Scene cleared and marked resolved", AuditRecord.Result.SUCCESS);
    }

    public void addIncidentReport(Incident incident) {
        incidents.add(0, incident);
    }

    public double getCitywideCongestionIndex() {
        int total = 0;
        int weighted = 0;
        for (Road r : roads) {
            total++;
            if (r.isBlocked() || r.getCongestionLevel() == Junction.CongestionLevel.HIGH) {
                weighted += 100;
            } else if (r.getCongestionLevel() == Junction.CongestionLevel.MEDIUM) {
                weighted += 60;
            } else {
                weighted += 25;
            }
        }
        return total > 0 ? (double) weighted / total : 0;
    }
}
