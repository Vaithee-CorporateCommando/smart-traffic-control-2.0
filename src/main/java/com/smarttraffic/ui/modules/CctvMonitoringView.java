package com.smarttraffic.ui.modules;

import com.smarttraffic.model.CctvFeed;
import com.smarttraffic.model.Junction;
import com.smarttraffic.service.TrafficService;
import com.smarttraffic.ui.Icons;
import javafx.animation.AnimationTimer;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class CctvMonitoringView extends BorderPane {
    private final TrafficService trafficService = TrafficService.getInstance();
    private final FlowPane gridPane = new FlowPane();
    private final List<CameraTile> tiles = new ArrayList<>();
    private ComboBox<String> junctionFilterCombo;
    private AnimationTimer streamTimer;

    public CctvMonitoringView() {
        setPadding(new Insets(20));
        setStyle("-fx-background-color: transparent;");

        setTop(buildHeader());
        setCenter(buildGrid());

        startSimulatedStreams();
    }

    private VBox buildHeader() {
        VBox box = new VBox(10);
        box.setPadding(new Insets(0, 0, 16, 0));

        HBox topRow = new HBox(16);
        topRow.setAlignment(Pos.CENTER_LEFT);

        VBox titleBox = new VBox(3);
        Label heading = new Label("Optical CCTV Surveillance Matrix");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 18));
        heading.setTextFill(Color.web("#0A2540"));

        Label sub = new Label("Live optical streams across intersections. Telemetry and video feeds restricted to authorized operations personnel.");
        sub.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12.5));
        sub.setTextFill(Color.web("#64748B"));
        titleBox.getChildren().addAll(heading, sub);

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        // Security Authorization Badge
        HBox authBadge = new HBox(6);
        authBadge.setAlignment(Pos.CENTER);
        authBadge.setStyle("-fx-background-color: #ECFDF5; -fx-border-color: #A7F3D0; -fx-border-radius: 6px; -fx-background-radius: 6px; -fx-padding: 6 12 6 12;");
        StackPane shield = Icons.createIconNode(Icons.SHIELD_CHECK, 14, "#059669");
        Label authLbl = new Label("AUTHORIZATION: LEVEL 3 (ACTIVE FEEDS)");
        authLbl.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11));
        authLbl.setTextFill(Color.web("#065F46"));
        authBadge.getChildren().addAll(shield, authLbl);

        topRow.getChildren().addAll(titleBox, spacer, authBadge);

        // Filter Row
        HBox filterRow = new HBox(12);
        filterRow.setAlignment(Pos.CENTER_LEFT);

        Label fLabel = new Label("Filter by Junction:");
        fLabel.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));
        fLabel.setTextFill(Color.web("#334155"));

        junctionFilterCombo = new ComboBox<>();
        junctionFilterCombo.getItems().add("All Intersections (9 Feeds)");
        for (Junction j : trafficService.getJunctions()) {
            junctionFilterCombo.getItems().add(j.getId() + " - " + j.getName());
        }
        junctionFilterCombo.getSelectionModel().select(0);
        junctionFilterCombo.setOnAction(e -> applyFilter());

        Button refreshBtn = new Button("Refresh Streams");
        refreshBtn.getStyleClass().add("btn-secondary");
        refreshBtn.setOnAction(e -> {
            for (CameraTile t : tiles) t.randomizeCars();
        });

        filterRow.getChildren().addAll(fLabel, junctionFilterCombo, refreshBtn);

        box.getChildren().addAll(topRow, filterRow);
        return box;
    }

    private ScrollPane buildGrid() {
        gridPane.setHgap(14);
        gridPane.setVgap(14);
        gridPane.setAlignment(Pos.TOP_LEFT);

        for (CctvFeed feed : trafficService.getCctvFeeds()) {
            CameraTile tile = new CameraTile(feed);
            tiles.add(tile);
            gridPane.getChildren().add(tile);
        }

        ScrollPane sp = new ScrollPane(gridPane);
        sp.setFitToWidth(true);
        sp.setStyle("-fx-background-color: transparent; -fx-background: transparent;");
        return sp;
    }

    private void applyFilter() {
        int selectedIndex = junctionFilterCombo.getSelectionModel().getSelectedIndex();
        gridPane.getChildren().clear();

        if (selectedIndex == 0) {
            gridPane.getChildren().addAll(tiles);
        } else {
            String selectedText = junctionFilterCombo.getSelectionModel().getSelectedItem();
            String jId = selectedText.split(" - ")[0];
            for (CameraTile tile : tiles) {
                if (tile.feed.getJunctionId().equals(jId)) {
                    gridPane.getChildren().add(tile);
                }
            }
        }
    }

    private void startSimulatedStreams() {
        streamTimer = new AnimationTimer() {
            private long lastDraw = 0;
            @Override
            public void handle(long now) {
                if (now - lastDraw > 80_000_000L) { // ~12 fps update for surveillance look
                    lastDraw = now;
                    for (CameraTile t : tiles) {
                        t.renderFrame();
                    }
                }
            }
        };
        streamTimer.start();
    }

    public static class CameraTile extends VBox {
        private final CctvFeed feed;
        private final Canvas canvas = new Canvas(360, 200);
        private final Random random = new Random();
        private final List<SimCar> cars = new ArrayList<>();
        private double ptzOffsetX = 0;
        private double ptzOffsetY = 0;
        private double ptzZoom = 1.0;

        private static class SimCar {
            double x, y;
            double speed;
            Color color;
            boolean headlight;
        }

        public CameraTile(CctvFeed feed) {
            this.feed = feed;
            setSpacing(6);
            getStyleClass().add("content-panel");
            setPrefWidth(372);

            randomizeCars();

            // Header of tile
            HBox top = new HBox(8);
            top.setAlignment(Pos.CENTER_LEFT);

            Label title = new Label(feed.getName());
            title.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12));
            title.setTextFill(Color.web("#0F172A"));

            Region sp = new Region();
            HBox.setHgrow(sp, Priority.ALWAYS);

            Label statusBadge = new Label(feed.isOnline() ? "ONLINE" : "MAINTENANCE");
            statusBadge.setStyle(feed.isOnline() ?
                    "-fx-background-color: #ECFDF5; -fx-text-fill: #059669; -fx-font-size: 10px; -fx-font-weight: bold; -fx-padding: 2 6 2 6; -fx-background-radius: 4px;" :
                    "-fx-background-color: #FEE2E2; -fx-text-fill: #DC2626; -fx-font-size: 10px; -fx-font-weight: bold; -fx-padding: 2 6 2 6; -fx-background-radius: 4px;");

            top.getChildren().addAll(title, sp, statusBadge);

            // Canvas stack with border
            StackPane cWrapper = new StackPane(canvas);
            cWrapper.setStyle("-fx-background-color: #000000; -fx-background-radius: 6px; -fx-border-color: #334155; -fx-border-radius: 6px;");

            // Controls footer
            HBox footer = new HBox(8);
            footer.setAlignment(Pos.CENTER_LEFT);

            Label meta = new Label(feed.getJunctionName() + " (" + feed.getDirection() + ")");
            meta.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 10.5));
            meta.setTextFill(Color.web("#64748B"));

            Region sp2 = new Region();
            HBox.setHgrow(sp2, Priority.ALWAYS);

            Button zoomInBtn = new Button("+");
            zoomInBtn.setStyle("-fx-font-size: 10px; -fx-padding: 2 6 2 6; -fx-cursor: hand;");
            zoomInBtn.setOnAction(e -> ptzZoom = Math.min(2.0, ptzZoom + 0.2));

            Button zoomOutBtn = new Button("-");
            zoomOutBtn.setStyle("-fx-font-size: 10px; -fx-padding: 2 6 2 6; -fx-cursor: hand;");
            zoomOutBtn.setOnAction(e -> ptzZoom = Math.max(1.0, ptzZoom - 0.2));

            Button snapshotBtn = new Button("Capture");
            snapshotBtn.setStyle("-fx-font-size: 10px; -fx-padding: 2 6 2 6; -fx-cursor: hand;");
            snapshotBtn.setOnAction(e -> {
                Alert a = new Alert(Alert.AlertType.INFORMATION);
                a.setTitle("Snapshot Captured");
                a.setHeaderText(null);
                a.setContentText("High-resolution forensic frame saved to local audit archive for " + feed.getName());
                a.showAndWait();
            });

            footer.getChildren().addAll(meta, sp2, zoomInBtn, zoomOutBtn, snapshotBtn);

            getChildren().addAll(top, cWrapper, footer);
        }

        public void randomizeCars() {
            cars.clear();
            Color[] colors = {Color.web("#E2E8F0"), Color.web("#94A3B8"), Color.web("#38BDF8"), Color.web("#F87171"), Color.web("#FBBF24")};
            for (int i = 0; i < 4; i++) {
                SimCar c = new SimCar();
                c.x = 20 + i * 80;
                c.y = 80 + (i % 2) * 45;
                c.speed = 1.2 + random.nextDouble() * 2.5;
                c.color = colors[random.nextInt(colors.length)];
                c.headlight = true;
                cars.add(c);
            }
        }

        public void renderFrame() {
            GraphicsContext gc = canvas.getGraphicsContext2D();
            double w = canvas.getWidth();
            double h = canvas.getHeight();

            if (!feed.isOnline()) {
                // TV static noise for offline camera
                gc.setFill(Color.BLACK);
                gc.fillRect(0, 0, w, h);
                for (int y = 0; y < h; y += 4) {
                    for (int x = 0; x < w; x += 4) {
                        if (random.nextBoolean()) {
                            double gray = random.nextDouble() * 0.4;
                            gc.setFill(Color.color(gray, gray, gray));
                            gc.fillRect(x, y, 4, 4);
                        }
                    }
                }
                gc.setFill(Color.web("#EF4444"));
                gc.setFont(Font.font("Segoe UI", FontWeight.BOLD, 13));
                gc.fillText("STREAM OFFLINE — SCHEDULED MAINTENANCE", 30, h / 2 - 8);
                gc.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 10.5));
                gc.setFill(Color.WHITE);
                gc.fillText("IP: " + feed.getIpAddress() + " | Awaiting Signal Controller Re-Sync", 30, h / 2 + 12);
                return;
            }

            // Simulated real camera perspective
            gc.save();
            gc.translate(w / 2, h / 2);
            gc.scale(ptzZoom, ptzZoom);
            gc.translate(-w / 2 + ptzOffsetX, -h / 2 + ptzOffsetY);

            // Background asphalt road
            gc.setFill(Color.web("#1E293B"));
            gc.fillRect(0, 0, w, h);

            // Sidewalk & curbs
            gc.setFill(Color.web("#334155"));
            gc.fillRect(0, 0, w, 35);
            gc.fillRect(0, h - 35, w, 35);

            // Lane dividing dashed lines
            gc.setStroke(Color.web("#94A3B8", 0.7));
            gc.setLineWidth(2.0);
            gc.setLineDashes(12, 10);
            gc.strokeLine(0, 85, w, 85);
            gc.strokeLine(0, 135, w, 135);
            gc.setLineDashes(null);

            // Stop line & crosswalk zebra markings
            gc.setFill(Color.web("#CBD5E1", 0.6));
            for (int zx = 260; zx < 290; zx += 8) {
                gc.fillRect(zx, 35, 5, 130);
            }

            // Draw passing vehicles
            for (SimCar c : cars) {
                c.x += c.speed;
                if (c.x > w + 40) {
                    c.x = -50;
                    c.y = 50 + random.nextInt(90);
                }

                // Vehicle body
                gc.setFill(c.color);
                gc.fillRoundRect(c.x, c.y, 36, 18, 4, 4);
                gc.setFill(Color.web("#0F172A"));
                gc.fillRect(c.x + 8, c.y + 2, 12, 14); // windshield

                // Headlights beam
                gc.setFill(Color.web("#FEF08A", 0.25));
                gc.fillPolygon(
                        new double[]{c.x + 36, c.x + 80, c.x + 80},
                        new double[]{c.y + 9, c.y - 10, c.y + 28},
                        3
                );
            }

            gc.restore();

            // Lens & HUD Overlays
            gc.setFill(Color.web("#000000", 0.5));
            gc.fillRect(0, 0, w, 24);
            gc.fillRect(0, h - 22, w, 22);

            // Top-left: Camera ID + Rec Dot
            gc.setFill(Color.web("#EF4444"));
            gc.fillOval(8, 8, 8, 8);
            gc.setFont(Font.font("Segoe UI", FontWeight.BOLD, 10));
            gc.setFill(Color.WHITE);
            gc.fillText("REC  " + feed.getId() + " [" + feed.getResolution() + "]", 22, 16);

            // Top-right: Timestamp + FPS
            String timeStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.S"));
            gc.setFont(Font.font("Consolas", FontWeight.NORMAL, 10));
            gc.fillText(timeStr + "  " + (int)feed.getCurrentFps() + " FPS", w - 195, 16);

            // Bottom HUD
            gc.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 9.5));
            gc.setFill(Color.web("#94A3B8"));
            gc.fillText("IP: " + feed.getIpAddress() + " | PTZ: " + (feed.isPtzCapable() ? "ENABLED" : "FIXED"), 8, h - 7);
        }
    }
}
