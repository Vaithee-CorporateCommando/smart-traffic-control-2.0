package com.smarttraffic.model;

import java.util.Collections;
import java.util.List;

public class RouteOption {
    private final String routeName;
    private final List<Junction> junctions;
    private final List<Road> roads;
    private final double totalDistanceKm;
    private final double estimatedDurationMinutes;
    private final double typicalDurationMinutes;
    private final boolean recommended;
    private final String summaryNote;

    public RouteOption(String routeName, List<Junction> junctions, List<Road> roads,
                       double totalDistanceKm, double estimatedDurationMinutes,
                       double typicalDurationMinutes, boolean recommended, String summaryNote) {
        this.routeName = routeName;
        this.junctions = junctions;
        this.roads = roads;
        this.totalDistanceKm = totalDistanceKm;
        this.estimatedDurationMinutes = estimatedDurationMinutes;
        this.typicalDurationMinutes = typicalDurationMinutes;
        this.recommended = recommended;
        this.summaryNote = summaryNote;
    }

    public String getRouteName() { return routeName; }
    public List<Junction> getJunctions() { return Collections.unmodifiableList(junctions); }
    public List<Road> getRoads() { return Collections.unmodifiableList(roads); }
    public double getTotalDistanceKm() { return totalDistanceKm; }
    public double getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public double getTypicalDurationMinutes() { return typicalDurationMinutes; }
    public double getDelayMinutes() { return Math.max(0, estimatedDurationMinutes - typicalDurationMinutes); }
    public boolean isRecommended() { return recommended; }
    public String getSummaryNote() { return summaryNote; }

    public Junction.CongestionLevel getOverallCongestion() {
        int high = 0;
        int med = 0;
        for (Road r : roads) {
            if (r.getCongestionLevel() == Junction.CongestionLevel.HIGH) high++;
            else if (r.getCongestionLevel() == Junction.CongestionLevel.MEDIUM) med++;
        }
        if (high > 0) return Junction.CongestionLevel.HIGH;
        if (med > 0) return Junction.CongestionLevel.MEDIUM;
        return Junction.CongestionLevel.LOW;
    }
}
