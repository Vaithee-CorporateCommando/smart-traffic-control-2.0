package com.smarttraffic.model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class Incident {
    public enum Type {
        ACCIDENT,
        VEHICLE_BREAKDOWN,
        ROAD_WORK,
        WATERLOGGING,
        SIGNAL_MALFUNCTION,
        PROTEST_DIVERSION
    }

    public enum Severity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public enum Status {
        PENDING_REVIEW,
        VERIFIED_PUBLISHED,
        RESOLVED
    }

    private final String id;
    private final String title;
    private final Type type;
    private final Severity severity;
    private final String locationName;
    private final String roadOrJunctionId;
    private final String reportedBy;
    private final LocalDateTime reportedTime;
    private Status status;
    private String verifiedBy;
    private LocalDateTime verifiedTime;
    private String description;

    public Incident(String id, String title, Type type, Severity severity,
                    String locationName, String roadOrJunctionId, String reportedBy,
                    String description, Status status) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.severity = severity;
        this.locationName = locationName;
        this.roadOrJunctionId = roadOrJunctionId;
        this.reportedBy = reportedBy;
        this.reportedTime = LocalDateTime.now();
        this.status = status;
        this.verifiedBy = status == Status.VERIFIED_PUBLISHED ? "Traffic Control Officer #42" : "";
        this.verifiedTime = status == Status.VERIFIED_PUBLISHED ? LocalDateTime.now() : null;
        this.description = description;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public Type getType() { return type; }
    public Severity getSeverity() { return severity; }
    public String getLocationName() { return locationName; }
    public String getRoadOrJunctionId() { return roadOrJunctionId; }
    public String getReportedBy() { return reportedBy; }
    public LocalDateTime getReportedTime() { return reportedTime; }
    public String getFormattedTime() {
        return reportedTime.format(DateTimeFormatter.ofPattern("HH:mm:ss"));
    }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }
    public LocalDateTime getVerifiedTime() { return verifiedTime; }
    public void setVerifiedTime(LocalDateTime verifiedTime) { this.verifiedTime = verifiedTime; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
