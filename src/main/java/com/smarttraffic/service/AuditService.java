package com.smarttraffic.service;

import com.smarttraffic.model.AuditRecord;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;

import java.util.concurrent.atomic.AtomicInteger;

public class AuditService {
    private static AuditService instance;

    private final ObservableList<AuditRecord> auditRecords = FXCollections.observableArrayList();
    private final AtomicInteger idCounter = new AtomicInteger(100);

    private AuditService() {
        // Preload baseline audit entries
        log("admin", "SYSTEM_STARTUP", "Central Traffic Controller", "Routine system boot & sensor handshake", AuditRecord.Result.SUCCESS);
        log("admin", "SYNC_CCTV", "All Video Feeds (9 Junctions)", "Scheduled CCTV diagnostic and stream integrity check", AuditRecord.Result.SUCCESS);
        log("officer", "TIMING_UPDATE", "Junction J3 - Tech Park", "Adjusted peak-hour morning cycle from 60s to 75s", AuditRecord.Result.SUCCESS);
        log("admin", "INCIDENT_VERIFIED", "Incident INC-102 (Accident)", "Verified citizen report and dispatched road incident alert", AuditRecord.Result.SUCCESS);
    }

    public static synchronized AuditService getInstance() {
        if (instance == null) {
            instance = new AuditService();
        }
        return instance;
    }

    public void log(String adminUser, String action, String target, String reason, AuditRecord.Result result) {
        String id = "LOG-" + idCounter.incrementAndGet();
        AuditRecord record = new AuditRecord(id, adminUser, action, target, reason, result);
        auditRecords.add(0, record); // add at top
    }

    public ObservableList<AuditRecord> getAuditRecords() {
        return auditRecords;
    }
}
