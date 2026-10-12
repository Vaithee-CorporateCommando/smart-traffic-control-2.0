package com.smarttraffic.service;

import com.smarttraffic.model.Junction;
import com.smarttraffic.model.Road;
import com.smarttraffic.model.RouteOption;

import java.util.*;

public class RouteService {
    private static RouteService instance;

    private RouteService() {}

    public static synchronized RouteService getInstance() {
        if (instance == null) {
            instance = new RouteService();
        }
        return instance;
    }

    public List<RouteOption> findRoutes(String originJunctionId, String destJunctionId) {
        List<RouteOption> results = new ArrayList<>();
        TrafficService ts = TrafficService.getInstance();
        Junction start = ts.getJunction(originJunctionId);
        Junction target = ts.getJunction(destJunctionId);

        if (start == null || target == null) {
            return results;
        }

        if (originJunctionId.equals(destJunctionId)) {
            results.add(new RouteOption("Current Location Node",
                    List.of(start), List.of(), 0.0, 0.0, 0.0, true,
                    "Origin and destination are the same junction point."));
            return results;
        }

        // 1. Calculate best route avoiding roadblocks and minimizing travel time
        PathResult best = dijkstra(originJunctionId, destJunctionId, Collections.emptySet(), true);
        if (best != null && !best.roads.isEmpty()) {
            double typicalMinutes = calculateTypicalTime(best.roads);
            String note = best.hadBlockedAvoidance ?
                    "Bypasses active roadblocks with optimized signal timings." :
                    "Optimal route based on real-time traffic speeds and low queue delays.";

            results.add(new RouteOption("Fastest Route (Recommended)",
                    best.junctions, best.roads, best.distanceKm,
                    best.travelTimeMinutes, typicalMinutes, true, note));

            // 2. Calculate alternative route by penalizing roads used in the best route
            Set<String> penalizedRoads = new HashSet<>();
            for (Road r : best.roads) {
                penalizedRoads.add(r.getId());
            }

            PathResult alt = dijkstra(originJunctionId, destJunctionId, penalizedRoads, true);
            if (alt != null && !alt.roads.isEmpty() && !isSamePath(best.roads, alt.roads)) {
                double altTypical = calculateTypicalTime(alt.roads);
                results.add(new RouteOption("Alternative Scenic Bypass",
                        alt.junctions, alt.roads, alt.distanceKm,
                        alt.travelTimeMinutes, altTypical, false,
                        "Secondary corridor offering steady flow with fewer traffic signals."));
            }
        }

        // If no viable path found due to severe closures
        if (results.isEmpty()) {
            // Try distance-only search as fallback
            PathResult distancePath = dijkstra(originJunctionId, destJunctionId, Collections.emptySet(), false);
            if (distancePath != null) {
                results.add(new RouteOption("Restricted Access Route",
                        distancePath.junctions, distancePath.roads,
                        distancePath.distanceKm, distancePath.travelTimeMinutes,
                        calculateTypicalTime(distancePath.roads), true,
                        "Warning: Route encounters severe congestion or active work zones."));
            }
        }

        return results;
    }

    private static class PathResult {
        List<Junction> junctions = new ArrayList<>();
        List<Road> roads = new ArrayList<>();
        double distanceKm;
        double travelTimeMinutes;
        boolean hadBlockedAvoidance = false;
    }

    private PathResult dijkstra(String startId, String targetId, Set<String> penalizedRoads, boolean congestionAware) {
        TrafficService ts = TrafficService.getInstance();
        Map<String, Double> distances = new HashMap<>();
        Map<String, String> prevJunction = new HashMap<>();
        Map<String, Road> prevRoad = new HashMap<>();
        PriorityQueue<NodeCost> pq = new PriorityQueue<>(Comparator.comparingDouble(nc -> nc.cost));

        for (String jId : ts.getJunctionMap().keySet()) {
            distances.put(jId, Double.POSITIVE_INFINITY);
        }

        distances.put(startId, 0.0);
        pq.add(new NodeCost(startId, 0.0));

        boolean encounteredBlockedRoad = false;

        while (!pq.isEmpty()) {
            NodeCost current = pq.poll();
            if (current.cost > distances.get(current.junctionId)) continue;
            if (current.junctionId.equals(targetId)) break;

            Junction j = ts.getJunction(current.junctionId);
            if (j == null) continue;

            for (Road road : ts.getRoads()) {
                if (road.getFromJunctionId().equals(current.junctionId)) {
                    if (road.isBlocked()) {
                        encounteredBlockedRoad = true;
                        continue; // Strictly skip blocked roads
                    }

                    double weight;
                    if (congestionAware) {
                        weight = road.getEstimatedTravelTimeMinutes();
                    } else {
                        weight = road.getLengthKm();
                    }

                    if (penalizedRoads.contains(road.getId())) {
                        weight *= 2.5; // Penalty to encourage diversity
                    }

                    double newCost = current.cost + weight;
                    String neighborId = road.getToJunctionId();

                    if (newCost < distances.getOrDefault(neighborId, Double.POSITIVE_INFINITY)) {
                        distances.put(neighborId, newCost);
                        prevJunction.put(neighborId, current.junctionId);
                        prevRoad.put(neighborId, road);
                        pq.add(new NodeCost(neighborId, newCost));
                    }
                }
            }
        }

        if (distances.get(targetId) == Double.POSITIVE_INFINITY) {
            return null;
        }

        // Reconstruct path
        PathResult res = new PathResult();
        res.hadBlockedAvoidance = encounteredBlockedRoad;
        String curr = targetId;
        LinkedList<Junction> jList = new LinkedList<>();
        LinkedList<Road> rList = new LinkedList<>();

        while (curr != null) {
            Junction j = ts.getJunction(curr);
            jList.addFirst(j);
            Road r = prevRoad.get(curr);
            if (r != null) {
                rList.addFirst(r);
                res.distanceKm += r.getLengthKm();
                res.travelTimeMinutes += r.getEstimatedTravelTimeMinutes();
            }
            curr = prevJunction.get(curr);
        }

        res.junctions = jList;
        res.roads = rList;
        return res;
    }

    private double calculateTypicalTime(List<Road> roads) {
        double time = 0.0;
        for (Road r : roads) {
            time += (r.getLengthKm() / Math.max(1.0, r.getBaseSpeedKmh())) * 60.0;
        }
        return time;
    }

    private boolean isSamePath(List<Road> a, List<Road> b) {
        if (a.size() != b.size()) return false;
        for (int i = 0; i < a.size(); i++) {
            if (!a.get(i).getId().equals(b.get(i).getId())) return false;
        }
        return true;
    }

    private static class NodeCost {
        String junctionId;
        double cost;

        NodeCost(String junctionId, double cost) {
            this.junctionId = junctionId;
            this.cost = cost;
        }
    }
}
