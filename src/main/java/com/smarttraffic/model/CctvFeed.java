package com.smarttraffic.model;

public class CctvFeed {
    private final String id;
    private final String name;
    private final String junctionId;
    private final String junctionName;
    private final String direction;
    private boolean online;
    private final String resolution;
    private final int targetFps;
    private double currentFps;
    private final String ipAddress;
    private final boolean ptzCapable;

    public CctvFeed(String id, String name, String junctionId, String junctionName,
                    String direction, boolean online, String resolution, int targetFps,
                    String ipAddress, boolean ptzCapable) {
        this.id = id;
        this.name = name;
        this.junctionId = junctionId;
        this.junctionName = junctionName;
        this.direction = direction;
        this.online = online;
        this.resolution = resolution;
        this.targetFps = targetFps;
        this.currentFps = online ? targetFps : 0.0;
        this.ipAddress = ipAddress;
        this.ptzCapable = ptzCapable;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getJunctionId() { return junctionId; }
    public String getJunctionName() { return junctionName; }
    public String getDirection() { return direction; }
    public boolean isOnline() { return online; }
    public void setOnline(boolean online) {
        this.online = online;
        this.currentFps = online ? targetFps : 0.0;
    }
    public String getResolution() { return resolution; }
    public int getTargetFps() { return targetFps; }
    public double getCurrentFps() { return currentFps; }
    public void setCurrentFps(double currentFps) { this.currentFps = currentFps; }
    public String getIpAddress() { return ipAddress; }
    public boolean isPtzCapable() { return ptzCapable; }

    @Override
    public String toString() {
        return name + " (" + junctionName + " - " + direction + ")";
    }
}
