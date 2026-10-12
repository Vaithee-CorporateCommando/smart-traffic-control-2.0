package com.smarttraffic.model;

import java.util.ArrayList;
import java.util.List;

public class Junction {
    public enum SignalState {
        GREEN_NORTH_SOUTH,
        GREEN_EAST_WEST,
        ALL_RED,
        EMERGENCY_OVERRIDE
    }

    public enum CongestionLevel {
        LOW,
        MEDIUM,
        HIGH
    }

    private final String id;
    private final String name;
    private final String district;
    private final double x;
    private final double y;
    private SignalState currentSignalState;
    private CongestionLevel congestionLevel;
    private int vehicleQueueLength;
    private int cycleDurationSeconds;
    private int greenDurationSeconds;
    private boolean manualOverrideActive;
    private String manualOverrideReason;
    private boolean isCctvOperational;
    private final List<String> connectedRoadIds;

    public Junction(String id, String name, String district, double x, double y) {
        this.id = id;
        this.name = name;
        this.district = district;
        this.x = x;
        this.y = y;
        this.currentSignalState = SignalState.GREEN_NORTH_SOUTH;
        this.congestionLevel = CongestionLevel.LOW;
        this.vehicleQueueLength = 12;
        this.cycleDurationSeconds = 60;
        this.greenDurationSeconds = 30;
        this.manualOverrideActive = false;
        this.manualOverrideReason = "";
        this.isCctvOperational = true;
        this.connectedRoadIds = new ArrayList<>();
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getDistrict() { return district; }
    public double getX() { return x; }
    public double getY() { return y; }
    public SignalState getCurrentSignalState() { return currentSignalState; }
    public void setCurrentSignalState(SignalState currentSignalState) { this.currentSignalState = currentSignalState; }
    public CongestionLevel getCongestionLevel() { return congestionLevel; }
    public void setCongestionLevel(CongestionLevel congestionLevel) { this.congestionLevel = congestionLevel; }
    public int getVehicleQueueLength() { return vehicleQueueLength; }
    public void setVehicleQueueLength(int vehicleQueueLength) { this.vehicleQueueLength = vehicleQueueLength; }
    public int getCycleDurationSeconds() { return cycleDurationSeconds; }
    public void setCycleDurationSeconds(int cycleDurationSeconds) { this.cycleDurationSeconds = cycleDurationSeconds; }
    public int getGreenDurationSeconds() { return greenDurationSeconds; }
    public void setGreenDurationSeconds(int greenDurationSeconds) { this.greenDurationSeconds = greenDurationSeconds; }
    public boolean isManualOverrideActive() { return manualOverrideActive; }
    public void setManualOverrideActive(boolean manualOverrideActive) { this.manualOverrideActive = manualOverrideActive; }
    public String getManualOverrideReason() { return manualOverrideReason; }
    public void setManualOverrideReason(String manualOverrideReason) { this.manualOverrideReason = manualOverrideReason; }
    public boolean isCctvOperational() { return isCctvOperational; }
    public void setCctvOperational(boolean cctvOperational) { isCctvOperational = cctvOperational; }
    public List<String> getConnectedRoadIds() { return connectedRoadIds; }
    public void addConnectedRoad(String roadId) { connectedRoadIds.add(roadId); }

    @Override
    public String toString() {
        return name + " (" + district + ")";
    }
}
