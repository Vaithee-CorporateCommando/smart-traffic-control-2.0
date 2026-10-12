package com.smarttraffic.service;

import com.smarttraffic.model.AuditRecord;
import com.smarttraffic.model.EmergencyDispatch;
import com.smarttraffic.model.Junction;

import java.util.List;

public class SignalService {
    private static SignalService instance;

    private SignalService() {}

    public static synchronized SignalService getInstance() {
        if (instance == null) {
            instance = new SignalService();
        }
        return instance;
    }

    public boolean applyManualOverride(String junctionId, Junction.SignalState state, String reason, String adminUser) {
        if (reason == null || reason.trim().length() < 3) {
            AuditService.getInstance().log(adminUser, "MANUAL_OVERRIDE_REJECTED", "Junction " + junctionId,
                    "Failed validation: Mandatory justification reason missing", AuditRecord.Result.DENIED);
            return false;
        }

        Junction j = TrafficService.getInstance().getJunction(junctionId);
        if (j != null) {
            j.setManualOverrideActive(true);
            j.setManualOverrideReason(reason.trim());
            j.setCurrentSignalState(state);
            AuditService.getInstance().log(adminUser, "MANUAL_OVERRIDE_APPLIED", j.getName(),
                    "Force state " + state + " - Reason: " + reason.trim(), AuditRecord.Result.SUCCESS);
            return true;
        }
        return false;
    }

    public void revertToAutomaticCycle(String junctionId, String adminUser) {
        Junction j = TrafficService.getInstance().getJunction(junctionId);
        if (j != null) {
            j.setManualOverrideActive(false);
            j.setManualOverrideReason("");
            j.setCurrentSignalState(Junction.SignalState.GREEN_NORTH_SOUTH);
            AuditService.getInstance().log(adminUser, "AUTO_CYCLE_RESTORED", j.getName(),
                    "Manual override released; adaptive cycle resumed", AuditRecord.Result.SUCCESS);
        }
    }

    public void updateSignalTimings(String junctionId, int cycleSeconds, int greenSeconds, String adminUser) {
        Junction j = TrafficService.getInstance().getJunction(junctionId);
        if (j != null) {
            j.setCycleDurationSeconds(cycleSeconds);
            j.setGreenDurationSeconds(greenSeconds);
            AuditService.getInstance().log(adminUser, "SIGNAL_TIMINGS_UPDATED", j.getName(),
                    "Cycle=" + cycleSeconds + "s, Green Split=" + greenSeconds + "s", AuditRecord.Result.SUCCESS);
        }
    }

    public void activateGreenWavePreemption(EmergencyDispatch dispatch, String adminUser) {
        List<String> corridor = dispatch.getCorridorJunctionIds();
        for (String jId : corridor) {
            Junction j = TrafficService.getInstance().getJunction(jId);
            if (j != null) {
                j.setManualOverrideActive(true);
                j.setManualOverrideReason("EMERGENCY GREEN WAVE PREEMPTION: " + dispatch.getVehicleCode());
                j.setCurrentSignalState(Junction.SignalState.EMERGENCY_OVERRIDE);
            }
        }
        dispatch.setStatus(EmergencyDispatch.PriorityStatus.CORRIDOR_ACTIVE);
        AuditService.getInstance().log(adminUser, "EMERGENCY_GREEN_WAVE_ACTIVATED",
                dispatch.getVehicleCode(), "Corridor preemption on junctions: " + corridor,
                AuditRecord.Result.SUCCESS);
    }

    public void deactivateGreenWavePreemption(EmergencyDispatch dispatch, String adminUser) {
        List<String> corridor = dispatch.getCorridorJunctionIds();
        for (String jId : corridor) {
            Junction j = TrafficService.getInstance().getJunction(jId);
            if (j != null) {
                j.setManualOverrideActive(false);
                j.setManualOverrideReason("");
                j.setCurrentSignalState(Junction.SignalState.GREEN_NORTH_SOUTH);
            }
        }
        dispatch.setStatus(EmergencyDispatch.PriorityStatus.ARRIVED);
        AuditService.getInstance().log(adminUser, "EMERGENCY_PREEMPTION_RELEASED",
                dispatch.getVehicleCode(), "Emergency vehicle reached destination; corridors restored",
                AuditRecord.Result.SUCCESS);
    }
}
