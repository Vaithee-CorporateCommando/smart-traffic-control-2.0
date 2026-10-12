package com.smarttraffic.ui;

import com.smarttraffic.model.Junction;
import com.smarttraffic.model.Road;
import com.smarttraffic.model.RouteOption;
import com.smarttraffic.service.TrafficService;
import javafx.animation.AnimationTimer;
import javafx.beans.property.ObjectProperty;
import javafx.beans.property.SimpleObjectProperty;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.util.*;
import java.util.function.Consumer;

public class TrafficCanvas extends Pane {
    private final Canvas canvas = new Canvas();
    private final ObjectProperty<Junction> selectedJunction = new SimpleObjectProperty<>();
    private final ObjectProperty<RouteOption> highlightedRoute = new SimpleObjectProperty<>();
    private Consumer<Junction> onJunctionSelected;

    // Viewport transform
    private double panX = 40;
    private double panY = 30;
    private double zoom = 1.0;
    private double lastMouseX;
    private double lastMouseY;

    // Traffic particle animation
    private static class Particle {
        Road road;
        double progress; // 0.0 to 1.0
        double speed;
    }
    private final List<Particle> particles = new ArrayList<>();
    private long lastAnimTime = 0;

    public TrafficCanvas() {
        getChildren().add(canvas);
        canvas.widthProperty().bind(widthProperty());
        canvas.heightProperty().bind(heightProperty());

        canvas.widthProperty().addListener(e -> draw());
        canvas.heightProperty().addListener(e -> draw());

        setupInteractions();
        initParticles();
        startAnimationLoop();

        // Register with TrafficService
        TrafficService.getInstance().addUpdateListener(this::draw);
    }

    private void initParticles() {
        Random rnd = new Random();
        TrafficService ts = TrafficService.getInstance();
        for (Road r : ts.getRoads()) {
            if (r.isBlocked()) continue;
            int count = Math.max(1, r.getLanes() / 2);
            for (int i = 0; i < count; i++) {
                Particle p = new Particle();
                p.road = r;
                p.progress = rnd.nextDouble();
                p.speed = 0.08 + (r.getCurrentSpeedKmh() / 150.0) * 0.15;
                particles.add(p);
            }
        }
    }

    private void setupInteractions() {
        canvas.setOnMousePressed(e -> {
            lastMouseX = e.getX();
            lastMouseY = e.getY();
        });

        canvas.setOnMouseDragged(e -> {
            double dx = e.getX() - lastMouseX;
            double dy = e.getY() - lastMouseY;
            panX += dx;
            panY += dy;
            lastMouseX = e.getX();
            lastMouseY = e.getY();
            draw();
        });

        canvas.setOnScroll(e -> {
            double factor = e.getDeltaY() > 0 ? 1.08 : 0.92;
            double mouseWorldX = (e.getX() - panX) / zoom;
            double mouseWorldY = (e.getY() - panY) / zoom;

            zoom = Math.max(0.5, Math.min(2.5, zoom * factor));
            panX = e.getX() - mouseWorldX * zoom;
            panY = e.getY() - mouseWorldY * zoom;
            draw();
        });

        canvas.setOnMouseClicked(e -> {
            // Find clicked junction
            double clickWorldX = (e.getX() - panX) / zoom;
            double clickWorldY = (e.getY() - panY) / zoom;

            Junction found = null;
            double minDistance = 22.0;

            for (Junction j : TrafficService.getInstance().getJunctions()) {
                double dist = Math.hypot(j.getX() - clickWorldX, j.getY() - clickWorldY);
                if (dist < minDistance) {
                    minDistance = dist;
                    found = j;
                }
            }

            selectedJunction.set(found);
            if (found != null && onJunctionSelected != null) {
                onJunctionSelected.accept(found);
            }
            draw();
        });
    }

    private void startAnimationLoop() {
        AnimationTimer timer = new AnimationTimer() {
            @Override
            public void handle(long now) {
                if (lastAnimTime == 0) {
                    lastAnimTime = now;
                    return;
                }
                double delta = (now - lastAnimTime) / 1e9;
                lastAnimTime = now;

                // Update particle positions
                for (Particle p : particles) {
                    if (p.road.isBlocked()) continue;
                    double currentSpeedFactor = Math.max(0.02, p.road.getCurrentSpeedKmh() / 70.0);
                    p.progress += delta * (p.speed * currentSpeedFactor);
                    if (p.progress > 1.0) {
                        p.progress -= 1.0;
                    }
                }
                draw();
            }
        };
        timer.start();
    }

    public void draw() {
        double w = canvas.getWidth();
        double h = canvas.getHeight();
        if (w <= 0 || h <= 0) return;

        GraphicsContext gc = canvas.getGraphicsContext2D();
        gc.clearRect(0, 0, w, h);

        // 1. Draw modern subtle grid map background
        gc.setFill(Color.web("#F8FAFC"));
        gc.fillRect(0, 0, w, h);

        gc.setStroke(Color.web("#E2E8F0", 0.6));
        gc.setLineWidth(1.0);
        double gridSize = 40.0 * zoom;
        double startX = panX % gridSize;
        double startY = panY % gridSize;
        for (double x = startX; x < w; x += gridSize) {
            gc.strokeLine(x, 0, x, h);
        }
        for (double y = startY; y < h; y += gridSize) {
            gc.strokeLine(0, y, w, y);
        }

        TrafficService ts = TrafficService.getInstance();
        Map<String, Junction> jMap = ts.getJunctionMap();

        // 2. Draw Highlighted Route Halo if active
        RouteOption currentRoute = highlightedRoute.get();
        if (currentRoute != null && !currentRoute.getRoads().isEmpty()) {
            gc.setLineWidth(14.0 * zoom);
            gc.setStroke(Color.web("#2563EB", 0.45));
            for (Road r : currentRoute.getRoads()) {
                Junction from = jMap.get(r.getFromJunctionId());
                Junction to = jMap.get(r.getToJunctionId());
                if (from != null && to != null) {
                    double x1 = panX + from.getX() * zoom;
                    double y1 = panY + from.getY() * zoom;
                    double x2 = panX + to.getX() * zoom;
                    double y2 = panY + to.getY() * zoom;
                    gc.strokeLine(x1, y1, x2, y2);
                }
            }
        }

        // 3. Draw Roads
        for (Road r : ts.getRoads()) {
            Junction from = jMap.get(r.getFromJunctionId());
            Junction to = jMap.get(r.getToJunctionId());
            if (from == null || to == null) continue;

            double x1 = panX + from.getX() * zoom;
            double y1 = panY + from.getY() * zoom;
            double x2 = panX + to.getX() * zoom;
            double y2 = panY + to.getY() * zoom;

            // Base road bed (dark border)
            double roadWidth = (5.0 + r.getLanes() * 1.5) * zoom;
            gc.setLineWidth(roadWidth + 3.0 * zoom);
            gc.setStroke(Color.web("#94A3B8", 0.5));
            gc.strokeLine(x1, y1, x2, y2);

            // Traffic congestion colored center line
            Color flowColor;
            if (r.isBlocked()) {
                flowColor = Color.web("#DC2626"); // Crimson
            } else {
                switch (r.getCongestionLevel()) {
                    case HIGH -> flowColor = Color.web("#EF4444");
                    case MEDIUM -> flowColor = Color.web("#F59E0B");
                    case LOW -> flowColor = Color.web("#10B981");
                    default -> flowColor = Color.web("#64748B");
                }
            }

            gc.setLineWidth(roadWidth);
            gc.setStroke(flowColor);
            gc.strokeLine(x1, y1, x2, y2);

            // If road is blocked, draw hatched warning overlay
            if (r.isBlocked()) {
                gc.setLineWidth(roadWidth * 0.4);
                gc.setStroke(Color.WHITE);
                gc.setLineDashes(6.0 * zoom, 6.0 * zoom);
                gc.strokeLine(x1, y1, x2, y2);
                gc.setLineDashes(null); // Reset dashes
            }
        }

        // 4. Draw moving traffic flow particles (cars/vehicles)
        for (Particle p : particles) {
            if (p.road.isBlocked()) continue;
            Junction from = jMap.get(p.road.getFromJunctionId());
            Junction to = jMap.get(p.road.getToJunctionId());
            if (from == null || to == null) continue;

            double x1 = panX + from.getX() * zoom;
            double y1 = panY + from.getY() * zoom;
            double x2 = panX + to.getX() * zoom;
            double y2 = panY + to.getY() * zoom;

            double px = x1 + (x2 - x1) * p.progress;
            double py = y1 + (y2 - y1) * p.progress;

            gc.setFill(Color.WHITE);
            double pRadius = 3.2 * zoom;
            gc.fillOval(px - pRadius, py - pRadius, pRadius * 2, pRadius * 2);
            gc.setStroke(Color.web("#1E293B"));
            gc.setLineWidth(1.0);
            gc.strokeOval(px - pRadius, py - pRadius, pRadius * 2, pRadius * 2);
        }

        // 5. Draw Junction Nodes
        for (Junction j : ts.getJunctions()) {
            double jx = panX + j.getX() * zoom;
            double jy = panY + j.getY() * zoom;
            double jRadius = 13.0 * zoom;

            boolean isSelected = j.equals(selectedJunction.get());

            // Outer selection halo
            if (isSelected) {
                gc.setFill(Color.web("#3B82F6", 0.3));
                gc.fillOval(jx - jRadius - 7 * zoom, jy - jRadius - 7 * zoom, (jRadius + 7 * zoom) * 2, (jRadius + 7 * zoom) * 2);
                gc.setStroke(Color.web("#2563EB"));
                gc.setLineWidth(2.5 * zoom);
                gc.strokeOval(jx - jRadius - 7 * zoom, jy - jRadius - 7 * zoom, (jRadius + 7 * zoom) * 2, (jRadius + 7 * zoom) * 2);
            }

            // Junction body
            gc.setFill(Color.web("#0F172A")); // Deep navy slate
            gc.fillOval(jx - jRadius, jy - jRadius, jRadius * 2, jRadius * 2);

            // Signal status indicator dot
            Color signalColor;
            if (j.isManualOverrideActive()) {
                signalColor = Color.web("#8B5CF6"); // Purple for manual override
            } else if (j.getCurrentSignalState() == Junction.SignalState.GREEN_NORTH_SOUTH ||
                       j.getCurrentSignalState() == Junction.SignalState.GREEN_EAST_WEST) {
                signalColor = Color.web("#10B981"); // Green
            } else {
                signalColor = Color.web("#EF4444"); // Red
            }

            gc.setFill(signalColor);
            double dotR = 6.0 * zoom;
            gc.fillOval(jx - dotR, jy - dotR, dotR * 2, dotR * 2);

            // Junction Name Label
            gc.setFont(Font.font("Segoe UI", FontWeight.BOLD, Math.max(10, 11 * zoom)));
            gc.setFill(Color.web("#0F172A"));
            gc.fillText(j.getId() + " - " + j.getName(), jx + jRadius + 6 * zoom, jy + 4 * zoom);

            // Queue length pill badge
            String queueText = "Queue: " + j.getVehicleQueueLength();
            gc.setFont(Font.font("Segoe UI", FontWeight.NORMAL, Math.max(9, 9.5 * zoom)));
            gc.setFill(Color.web("#64748B"));
            gc.fillText(queueText, jx + jRadius + 6 * zoom, jy + 18 * zoom);
        }

        // 6. Draw Map Legend & Demonstration Indicator
        drawLegend(gc, w, h);
    }

    private void drawLegend(GraphicsContext gc, double w, double h) {
        double legW = 180;
        double legH = 145;
        double legX = w - legW - 16;
        double legY = 16;

        gc.setFill(Color.web("#FFFFFF", 0.95));
        gc.fillRoundRect(legX, legY, legW, legH, 10, 10);
        gc.setStroke(Color.web("#CBD5E1"));
        gc.setLineWidth(1.0);
        gc.strokeRoundRect(legX, legY, legW, legH, 10, 10);

        gc.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11));
        gc.setFill(Color.web("#0F172A"));
        gc.fillText("TRAFFIC FLOW OVERLAY", legX + 12, legY + 20);

        // Low
        gc.setFill(Color.web("#10B981"));
        gc.fillOval(legX + 12, legY + 34, 10, 10);
        gc.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 10.5));
        gc.setFill(Color.web("#334155"));
        gc.fillText("Green — Low Congestion", legX + 30, legY + 43);

        // Moderate
        gc.setFill(Color.web("#F59E0B"));
        gc.fillOval(legX + 12, legY + 54, 10, 10);
        gc.fillText("Amber — Medium Congestion", legX + 30, legY + 63);

        // Heavy
        gc.setFill(Color.web("#EF4444"));
        gc.fillOval(legX + 12, legY + 74, 10, 10);
        gc.fillText("Red — High Congestion", legX + 30, legY + 83);

        // Blocked
        gc.setStroke(Color.web("#DC2626"));
        gc.setLineWidth(3.0);
        gc.strokeLine(legX + 12, legY + 99, legX + 22, legY + 99);
        gc.fillText("Dashed — Active Roadblock", legX + 30, legY + 103);

        // Mode notice
        gc.setFont(Font.font("Segoe UI", FontWeight.BOLD, 9.5));
        gc.setFill(Color.web("#0D9488"));
        gc.fillText("• SIMULATED SENSOR TELEMETRY", legX + 12, legY + 130);
    }

    public void resetView() {
        panX = 40;
        panY = 30;
        zoom = 1.0;
        draw();
    }

    public void setOnJunctionSelected(Consumer<Junction> onJunctionSelected) {
        this.onJunctionSelected = onJunctionSelected;
    }

    public ObjectProperty<Junction> selectedJunctionProperty() {
        return selectedJunction;
    }

    public ObjectProperty<RouteOption> highlightedRouteProperty() {
        return highlightedRoute;
    }
}
