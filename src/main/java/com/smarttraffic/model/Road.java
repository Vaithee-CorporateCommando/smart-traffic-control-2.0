package com.smarttraffic.model;

public class Road {
    private final String id;
    private final String name;
    private final String fromJunctionId;
    private final String toJunctionId;
    private final double lengthKm;
    private final double baseSpeedKmh;
    private double currentSpeedKmh;
    private Junction.CongestionLevel congestionLevel;
    private boolean blocked;
    private String blockReason;
    private int lanes;

    public Road(String id, String name, String fromJunctionId, String toJunctionId, double lengthKm, double baseSpeedKmh, int lanes) {
        this.id = id;
        this.name = name;
        this.fromJunctionId = fromJunctionId;
        this.toJunctionId = toJunctionId;
        this.lengthKm = lengthKm;
        this.baseSpeedKmh = baseSpeedKmh;
        this.currentSpeedKmh = baseSpeedKmh;
        this.congestionLevel = Junction.CongestionLevel.LOW;
        this.blocked = false;
        this.blockReason = "";
        this.lanes = lanes;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getFromJunctionId() { return fromJunctionId; }
    public String getToJunctionId() { return toJunctionId; }
    public double getLengthKm() { return lengthKm; }
    public double getBaseSpeedKmh() { return baseSpeedKmh; }
    public double getCurrentSpeedKmh() { return currentSpeedKmh; }
    public void setCurrentSpeedKmh(double currentSpeedKmh) {
        this.currentSpeedKmh = currentSpeedKmh;
        updateCongestionFromSpeed();
    }
    public Junction.CongestionLevel getCongestionLevel() { return congestionLevel; }
    public void setCongestionLevel(Junction.CongestionLevel level) { this.congestionLevel = level; }
    public boolean isBlocked() { return blocked; }
    public void setBlocked(boolean blocked, String reason) {
        this.blocked = blocked;
        this.blockReason = reason != null ? reason : "";
        if (blocked) {
            this.congestionLevel = Junction.CongestionLevel.HIGH;
            this.currentSpeedKmh = 0;
        } else {
            updateCongestionFromSpeed();
        }
    }
    public String getBlockReason() { return blockReason; }
    public int getLanes() { return lanes; }

    public double getEstimatedTravelTimeMinutes() {
        if (blocked || currentSpeedKmh <= 0.1) {
            return 999.0;
        }
        return (lengthKm / currentSpeedKmh) * 60.0;
    }

    private void updateCongestionFromSpeed() {
        if (blocked) {
            congestionLevel = Junction.CongestionLevel.HIGH;
            return;
        }
        double ratio = currentSpeedKmh / Math.max(1.0, baseSpeedKmh);
        if (ratio >= 0.75) {
            congestionLevel = Junction.CongestionLevel.LOW;
        } else if (ratio >= 0.40) {
            congestionLevel = Junction.CongestionLevel.MEDIUM;
        } else {
            congestionLevel = Junction.CongestionLevel.HIGH;
        }
    }
}
