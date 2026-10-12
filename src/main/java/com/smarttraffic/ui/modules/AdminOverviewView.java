package com.smarttraffic.ui.modules;

import com.smarttraffic.model.Incident;
import com.smarttraffic.model.Junction;
import com.smarttraffic.model.RoadBlock;
import com.smarttraffic.service.TrafficService;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

public class AdminOverviewView extends ScrollPane {
    private final TrafficService trafficService = TrafficService.getInstance();

    private Label lblCongestionVal;
    private Label lblJunctionsVal;
    private Label lblIncidentsVal;
    private Label lblEmergencyVal;
    private Label lblCctvVal;
    private ProgressBar congestionBar;
    private VBox activeAlertsSummaryBox;

    public AdminOverviewView() {
        setFitToWidth(true);
        setStyle("-fx-background-color: transparent; -fx-background: transparent;");

        VBox content = new VBox(20);
        content.setPadding(new Insets(24));

        // 1. Top Welcome & Subtitle
        VBox titleBox = new VBox(4);
        Label heading = new Label("Traffic Operations Center — System Overview");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 20));
        heading.setTextFill(Color.web("#0A2540"));

        Label sub = new Label("Real-time citywide traffic metrics, controller telemetry, and automated incident monitoring.");
        sub.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 13));
        sub.setTextFill(Color.web("#64748B"));
        titleBox.getChildren().addAll(heading, sub);

        // 2. High-Level KPI Grid (5 Cards)
        HBox kpiRow = new HBox(14);
        kpiRow.setAlignment(Pos.CENTER_LEFT);

        VBox cardCongestion = createKpiCard("Citywide Congestion", "35%", "Normal flow in most sectors", "#3B82F6");
        lblCongestionVal = (Label) cardCongestion.getChildren().get(1);

        VBox cardJunctions = createKpiCard("Active Junctions", "9 / 9", "100% telemetry online", "#10B981");
        lblJunctionsVal = (Label) cardJunctions.getChildren().get(1);

        VBox cardIncidents = createKpiCard("Active Incidents", "3 Reported", "2 verified, 1 pending", "#EF4444");
        lblIncidentsVal = (Label) cardIncidents.getChildren().get(1);

        VBox cardEmergency = createKpiCard("Emergency Preemptions", "1 Active", "AMB-108 Priority Green", "#8B5CF6");
        lblEmergencyVal = (Label) cardEmergency.getChildren().get(1);

        VBox cardCctv = createKpiCard("CCTV Stream Health", "8 / 9 Online", "1 feed in maintenance", "#0D9488");
        lblCctvVal = (Label) cardCctv.getChildren().get(1);

        HBox.setHgrow(cardCongestion, Priority.ALWAYS);
        HBox.setHgrow(cardJunctions, Priority.ALWAYS);
        HBox.setHgrow(cardIncidents, Priority.ALWAYS);
        HBox.setHgrow(cardEmergency, Priority.ALWAYS);
        HBox.setHgrow(cardCctv, Priority.ALWAYS);

        kpiRow.getChildren().addAll(cardCongestion, cardJunctions, cardIncidents, cardEmergency, cardCctv);

        // 3. Middle Section: Congestion Gauge + System Availability
        HBox middleRow = new HBox(16);

        VBox congestionPanel = buildCongestionPanel();
        VBox availabilityPanel = buildAvailabilityPanel();
        HBox.setHgrow(congestionPanel, Priority.ALWAYS);
        HBox.setHgrow(availabilityPanel, Priority.ALWAYS);
        middleRow.getChildren().addAll(congestionPanel, availabilityPanel);

        // 4. Bottom Section: Active Road Closures & High Priority Incidents
        VBox alertsPanel = buildAlertsSummaryPanel();

        content.getChildren().addAll(titleBox, kpiRow, middleRow, alertsPanel);
        setContent(content);

        trafficService.addUpdateListener(this::refreshData);
    }

    private VBox createKpiCard(String title, String val, String sub, String accentHex) {
        VBox card = new VBox(6);
        card.getStyleClass().add("metric-card");

        Label t = new Label(title);
        t.getStyleClass().add("metric-title");

        Label v = new Label(val);
        v.getStyleClass().add("metric-value");
        v.setTextFill(Color.web(accentHex));

        Label s = new Label(sub);
        s.getStyleClass().add("metric-sub");

        card.getChildren().addAll(t, v, s);
        return card;
    }

    private VBox buildCongestionPanel() {
        VBox box = new VBox(12);
        box.getStyleClass().add("content-panel");

        Label heading = new Label("Citywide Network Congestion Index");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 14));
        heading.setTextFill(Color.web("#0F172A"));

        congestionBar = new ProgressBar(0.35);
        congestionBar.setMaxWidth(Double.MAX_VALUE);
        congestionBar.setPrefHeight(12);

        HBox legend = new HBox(20);
        legend.setAlignment(Pos.CENTER_LEFT);
        legend.getChildren().addAll(
                new Label("🟢 0-40% Free Flow") {{ setFont(Font.font(11.5)); setTextFill(Color.web("#059669")); }},
                new Label("🟡 41-70% Moderate Queue") {{ setFont(Font.font(11.5)); setTextFill(Color.web("#D97706")); }},
                new Label("🔴 71-100% Severe Delay") {{ setFont(Font.font(11.5)); setTextFill(Color.web("#DC2626")); }}
        );

        Label note = new Label("Congestion index is synthesized from inductive loop sensors, camera flow detectors, and reported queue lengths across all 9 connected junctions.");
        note.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        note.setTextFill(Color.web("#64748B"));
        note.setWrapText(true);

        box.getChildren().addAll(heading, congestionBar, legend, note);
        return box;
    }

    private VBox buildAvailabilityPanel() {
        VBox box = new VBox(10);
        box.getStyleClass().add("content-panel");

        Label heading = new Label("Infrastructure Subsystem Availability");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 14));
        heading.setTextFill(Color.web("#0F172A"));

        box.getChildren().addAll(
                heading,
                createStatusRow("Roadside Controllers (NEMA TS2)", "Online (9 / 9 Synchronized)", "#10B981"),
                createStatusRow("CCTV Optical Surveillance", "Degraded (8 / 9 Online - CAM-05 Maint)", "#F59E0B"),
                createStatusRow("Green Wave Emergency Transponders", "Active & Listening (100%)", "#10B981"),
                createStatusRow("Public VMS Digital Signs", "Operational (4 Active Displays)", "#10B981")
        );
        return box;
    }

    private HBox createStatusRow(String name, String status, String colorHex) {
        HBox row = new HBox(8);
        row.setAlignment(Pos.CENTER_LEFT);
        Label n = new Label(name);
        n.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));
        n.setTextFill(Color.web("#334155"));

        Region sp = new Region();
        HBox.setHgrow(sp, Priority.ALWAYS);

        Label s = new Label(status);
        s.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11.5));
        s.setTextFill(Color.web(colorHex));

        row.getChildren().addAll(n, sp, s);
        return row;
    }

    private VBox buildAlertsSummaryPanel() {
        VBox box = new VBox(10);
        box.getStyleClass().add("content-panel");

        Label heading = new Label("Active High-Priority Incidents & Roadblocks");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 14));
        heading.setTextFill(Color.web("#0F172A"));

        activeAlertsSummaryBox = new VBox(8);
        renderAlertsList();

        box.getChildren().addAll(heading, activeAlertsSummaryBox);
        return box;
    }

    private void renderAlertsList() {
        activeAlertsSummaryBox.getChildren().clear();

        for (RoadBlock rb : trafficService.getRoadBlocks()) {
            if (rb.getStatus() == RoadBlock.Status.ACTIVE) {
                HBox row = new HBox(12);
                row.setAlignment(Pos.CENTER_LEFT);
                row.setStyle("-fx-background-color: #FEF2F2; -fx-padding: 8 12 8 12; -fx-background-radius: 6px;");

                Label badge = new Label("ROADBLOCK");
                badge.setStyle("-fx-background-color: #DC2626; -fx-text-fill: white; -fx-font-size: 10px; -fx-font-weight: bold; -fx-padding: 2 6 2 6; -fx-background-radius: 4px;");

                Label title = new Label(rb.getRoadName() + " — " + rb.getReason() + " (Est: " + rb.getExpectedClearance() + ")");
                title.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));
                title.setTextFill(Color.web("#991B1B"));

                row.getChildren().addAll(badge, title);
                activeAlertsSummaryBox.getChildren().add(row);
            }
        }

        for (Incident inc : trafficService.getIncidents()) {
            if (inc.getStatus() == Incident.Status.VERIFIED_PUBLISHED) {
                HBox row = new HBox(12);
                row.setAlignment(Pos.CENTER_LEFT);
                row.setStyle("-fx-background-color: #FFFBEB; -fx-padding: 8 12 8 12; -fx-background-radius: 6px;");

                Label badge = new Label(inc.getType().name());
                badge.setStyle("-fx-background-color: #D97706; -fx-text-fill: white; -fx-font-size: 10px; -fx-font-weight: bold; -fx-padding: 2 6 2 6; -fx-background-radius: 4px;");

                Label title = new Label(inc.getTitle() + " at " + inc.getLocationName() + " (" + inc.getFormattedTime() + ")");
                title.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));
                title.setTextFill(Color.web("#92400E"));

                row.getChildren().addAll(badge, title);
                activeAlertsSummaryBox.getChildren().add(row);
            }
        }
    }

    private void refreshData() {
        double idx = trafficService.getCitywideCongestionIndex();
        lblCongestionVal.setText(String.format("%.0f%%", idx));
        congestionBar.setProgress(idx / 100.0);

        int activeInc = 0;
        for (Incident inc : trafficService.getIncidents()) {
            if (inc.getStatus() != Incident.Status.RESOLVED) activeInc++;
        }
        lblIncidentsVal.setText(activeInc + " Reported");

        renderAlertsList();
    }
}
