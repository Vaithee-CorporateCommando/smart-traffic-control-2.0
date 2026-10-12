package com.smarttraffic.model;

import java.time.LocalDateTime;
import java.util.List;

public class EmergencyDispatch {
    public enum VehicleType {
        AMBULANCE,
        FIRE_ENGINE,
        POLICE_ESCORT,
        DISASTER_RESPONSE
    }

    public enum PriorityStatus {
        STANDBY,
        CORRIDOR_ACTIVE,
        ARRIVED,
        CANCELLED
    }

    private final String id;
    private final String vehicleCode;
    private final VehicleType vehicleType;
    private final String incidentReference;
    private final String originName;
    private final String destinationName;
    private final List<String> corridorJunctionIds;
    private int currentJunctionIndex;
    private PriorityStatus status;
    private final LocalDateTime dispatchTime;
    private int estimatedMinutesSaved;

    public EmergencyDispatch(String id, String vehicleCode, VehicleType vehicleType,
                             String incidentReference, String originName, String destinationName,
                             List<String> corridorJunctionIds) {
        this.id = id;
        this.vehicleCode = vehicleCode;
        this.vehicleType = vehicleType;
        this.incidentReference = incidentReference;
        this.originName = originName;
        this.destinationName = destinationName;
        this.corridorJunctionIds = corridorJunctionIds;
        this.currentJunctionIndex = 0;
        this.status = PriorityStatus.CORRIDOR_ACTIVE;
        this.dispatchTime = LocalDateTime.now();
        this.estimatedMinutesSaved = 6;
    }

    public String getId() { return id; }
    public String getVehicleCode() { return vehicleCode; }
    public VehicleType getVehicleType() { return vehicleType; }
    public String getIncidentReference() { return incidentReference; }
    public String getOriginName() { return originName; }
    public String getDestinationName() { return destinationName; }
    public List<String> getCorridorJunctionIds() { return corridorJunctionIds; }
    public int getCurrentJunctionIndex() { return currentJunctionIndex; }
    public void setCurrentJunctionIndex(int currentJunctionIndex) { this.currentJunctionIndex = currentJunctionIndex; }
    public PriorityStatus getStatus() { return status; }
    public void setStatus(PriorityStatus status) { this.status = status; }
    public LocalDateTime getDispatchTime() { return dispatchTime; }
    public int getEstimatedMinutesSaved() { return estimatedMinutesSaved; }
    public void setEstimatedMinutesSaved(int estimatedMinutesSaved) { this.estimatedMinutesSaved = estimatedMinutesSaved; }

    public String getCurrentJunctionId() {
        if (currentJunctionIndex >= 0 && currentJunctionIndex < corridorJunctionIds.size()) {
            return corridorJunctionIds.get(currentJunctionIndex);
        }
        return corridorJunctionIds.isEmpty() ? "" : corridorJunctionIds.get(corridorJunctionIds.size() - 1);
    }
}
