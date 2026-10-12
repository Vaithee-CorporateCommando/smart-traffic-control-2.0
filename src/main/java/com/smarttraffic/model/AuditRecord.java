package com.smarttraffic.model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class AuditRecord {
    public enum Result {
        SUCCESS,
        WARNING,
        DENIED,
        FAILED
    }

    private final String id;
    private final LocalDateTime timestamp;
    private final String administrator;
    private final String action;
    private final String target;
    private final String reason;
    private final Result result;

    public AuditRecord(String id, String administrator, String action, String target, String reason, Result result) {
        this.id = id;
        this.timestamp = LocalDateTime.now();
        this.administrator = administrator;
        this.action = action;
        this.target = target;
        this.reason = reason;
        this.result = result;
    }

    public String getId() { return id; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getFormattedTimestamp() {
        return timestamp.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
    public String getAdministrator() { return administrator; }
    public String getAction() { return action; }
    public String getTarget() { return target; }
    public String getReason() { return reason; }
    public Result getResult() { return result; }
}
