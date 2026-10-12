package com.smarttraffic.model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class RoadBlock {
    public enum Status {
        ACTIVE,
        CLEARED
    }

    private final String id;
    private final String roadId;
    private final String roadName;
    private final String reason;
    private final String authorityInCharge;
    private final LocalDateTime reportedTime;
    private String expectedClearance;
    private Status status;
    private String clearedBy;
    private LocalDateTime clearedTime;

    public RoadBlock(String id, String roadId, String roadName, String reason,
                     String authorityInCharge, String expectedClearance) {
        this.id = id;
        this.roadId = roadId;
        this.roadName = roadName;
        this.reason = reason;
        this.authorityInCharge = authorityInCharge;
        this.reportedTime = LocalDateTime.now();
        this.expectedClearance = expectedClearance;
        this.status = Status.ACTIVE;
        this.clearedBy = "";
    }

    public String getId() { return id; }
    public String getRoadId() { return roadId; }
    public String getRoadName() { return roadName; }
    public String getReason() { return reason; }
    public String getAuthorityInCharge() { return authorityInCharge; }
    public LocalDateTime getReportedTime() { return reportedTime; }
    public String getFormattedTime() {
        return reportedTime.format(DateTimeFormatter.ofPattern("HH:mm:ss"));
    }
    public String getExpectedClearance() { return expectedClearance; }
    public void setExpectedClearance(String expectedClearance) { this.expectedClearance = expectedClearance; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getClearedBy() { return clearedBy; }
    public void setClearedBy(String clearedBy) { this.clearedBy = clearedBy; }
    public LocalDateTime getClearedTime() { return clearedTime; }
    public void setClearedTime(LocalDateTime clearedTime) { this.clearedTime = clearedTime; }
}
