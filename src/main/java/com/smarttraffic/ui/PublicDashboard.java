package com.smarttraffic.ui;

import com.smarttraffic.model.*;
import com.smarttraffic.service.RouteService;
import com.smarttraffic.service.TrafficService;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.util.List;

public class PublicDashboard extends BorderPane {
    private final User currentUser;
    private final Runnable onLogout;

    private TrafficCanvas trafficCanvas;
    private StackPane contentArea;

    // Side panel containers
    private VBox sidePanelContainer;
    private VBox mapOverviewPane;
    private VBox routePlannerPane;
    private VBox trafficAlertsPane;
    private VBox userProfilePane;

    // Route Planner Controls
    private ComboBox<Junction> originCombo;
    private ComboBox<Junction> destCombo;
    private VBox routeResultsContainer;

    // Junction Inspector Controls
    private Label junctionInspectorName;
    private Label junctionInspectorDistrict;
    private Label junctionInspectorSignal;
    private Label junctionInspectorQueue;
    private Label junctionInspectorCongestion;
    private VBox junctionConnectedRoadsBox;

    public PublicDashboard(User currentUser, Runnable onLogout) {
        this.currentUser = currentUser;
        this.onLogout = onLogout;

        setStyle("-fx-background-color: #F8FAFC;");

        setTop(buildHeader());
        setCenter(buildCenterMapArea());
        setLeft(buildNavigationAndSidebar());

        // Connect canvas selection
        trafficCanvas.setOnJunctionSelected(this::showJunctionDetails);

        // Update when traffic ticks
        TrafficService.getInstance().addUpdateListener(this::refreshDynamicData);
    }

    private HBox buildHeader() {
        HBox header = new HBox(16);
        header.getStyleClass().add("app-header");
        header.setAlignment(Pos.CENTER_LEFT);

        // Brand icon + Title
        StackPane iconPane = new StackPane();
        iconPane.setStyle("-fx-background-color: #0A3963; -fx-background-radius: 8px;");
        iconPane.setPrefSize(34, 34);
        iconPane.getChildren().add(Icons.createIconNode(Icons.MAP, 18, "#FFFFFF"));

        VBox titleBox = new VBox(2);
        Label title = new Label("SMART TRAFFIC CONTROL");
        title.getStyleClass().add("app-title-text");
        Label subtitle = new Label("Citizen Urban Mobility & Route Guidance Portal");
        subtitle.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        subtitle.setTextFill(Color.web("#64748B"));
        titleBox.getChildren().addAll(title, subtitle);

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        // Status badge: explicitly indicates sample/simulated data as required
        Label statusBadge = new Label("• SIMULATION ACTIVE (Sample Telemetry)");
        statusBadge.getStyleClass().add("status-chip-simulated");

        // User profile chip
        HBox userChip = new HBox(8);
        userChip.setAlignment(Pos.CENTER);
        userChip.setStyle("-fx-background-color: #F1F5F9; -fx-padding: 5 12 5 12; -fx-background-radius: 20px;");
        StackPane uIcon = Icons.createIconNode(Icons.USER, 15, "#2563EB");
        Label uName = new Label(currentUser.getFullName() + " (" + currentUser.getRole() + ")");
        uName.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));
        uName.setTextFill(Color.web("#1E293B"));
        userChip.getChildren().addAll(uIcon, uName);

        // Logout Button
        Button logoutBtn = new Button();
        logoutBtn.getStyleClass().add("btn-secondary");
        HBox loContent = new HBox(6, Icons.createIconNode(Icons.LOGOUT, 14, "#475569"), new Label("Sign Out"));
        loContent.setAlignment(Pos.CENTER);
        logoutBtn.setGraphic(loContent);
        logoutBtn.setOnAction(e -> onLogout.run());

        header.getChildren().addAll(iconPane, titleBox, spacer, statusBadge, userChip, logoutBtn);
        return header;
    }

    private HBox buildNavigationAndSidebar() {
        HBox rootBox = new HBox();
        rootBox.getStyleClass().add("sidebar");
        rootBox.setPrefWidth(480);

        // 1. Vertical Navigation strip
        VBox navStrip = new VBox(8);
        navStrip.setPrefWidth(160);
        navStrip.setMinWidth(160);
        navStrip.setStyle("-fx-border-color: transparent #E2E8F0 transparent transparent; -fx-border-width: 0 1 0 0; -fx-padding: 0 8 0 0;");

        Label navSection = new Label("MENU");
        navSection.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11));
        navSection.setTextFill(Color.web("#94A3B8"));
        navSection.setPadding(new Insets(6, 12, 6, 12));

        Button mapTabBtn = createNavBtn("Traffic Map", Icons.MAP, true);
        Button routeTabBtn = createNavBtn("Plan a Route", Icons.ROUTE, false);
        Button alertsTabBtn = createNavBtn("Traffic Alerts", Icons.ALERT_TRIANGLE, false);
        Button profileTabBtn = createNavBtn("My Profile", Icons.USER, false);

        mapTabBtn.setOnAction(e -> switchTab(mapTabBtn, mapOverviewPane));
        routeTabBtn.setOnAction(e -> switchTab(routeTabBtn, routePlannerPane));
        alertsTabBtn.setOnAction(e -> switchTab(alertsTabBtn, trafficAlertsPane));
        profileTabBtn.setOnAction(e -> switchTab(profileTabBtn, userProfilePane));

        navStrip.getChildren().addAll(navSection, mapTabBtn, routeTabBtn, alertsTabBtn, profileTabBtn);

        // 2. Dynamic content pane
        sidePanelContainer = new VBox();
        sidePanelContainer.setPadding(new Insets(0, 0, 0, 12));
        HBox.setHgrow(sidePanelContainer, Priority.ALWAYS);

        mapOverviewPane = buildMapOverviewPane();
        routePlannerPane = buildRoutePlannerPane();
        trafficAlertsPane = buildTrafficAlertsPane();
        userProfilePane = buildUserProfilePane();

        sidePanelContainer.getChildren().add(mapOverviewPane);

        rootBox.getChildren().addAll(navStrip, sidePanelContainer);
        return rootBox;
    }

    private Button createNavBtn(String text, String svg, boolean active) {
        Button btn = new Button();
        btn.getStyleClass().add("nav-tab-btn");
        if (active) btn.getStyleClass().add("active");
        btn.setMaxWidth(Double.MAX_VALUE);

        HBox graphic = new HBox(8, Icons.createIconNode(svg, 16, active ? "#2563EB" : "#64748B"), new Label(text));
        graphic.setAlignment(Pos.CENTER_LEFT);
        btn.setGraphic(graphic);
        return btn;
    }

    private void switchTab(Button activeBtn, VBox targetPane) {
        VBox navStrip = (VBox) ((HBox) getLeft()).getChildren().get(0);
        for (var node : navStrip.getChildren()) {
            if (node instanceof Button b) {
                b.getStyleClass().remove("active");
            }
        }
        activeBtn.getStyleClass().add("active");

        sidePanelContainer.getChildren().clear();
        sidePanelContainer.getChildren().add(targetPane);
    }

    private VBox buildMapOverviewPane() {
        VBox box = new VBox(14);

        Label heading = new Label("City Traffic Network");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 15));
        heading.setTextFill(Color.web("#0F172A"));

        // Summary Metric Tiles
        GridPane grid = new GridPane();
        grid.setHgap(8);
        grid.setVgap(8);

        VBox cardSpeed = createMiniCard("Average Speed", "44 km/h", "#10B981");
        VBox cardCongestion = createMiniCard("Congestion Index", "34% (Normal)", "#3B82F6");
        VBox cardAlerts = createMiniCard("Active Incidents", "2 Road Issues", "#EF4444");
        VBox cardSignals = createMiniCard("Active Junctions", "9 Operational", "#6366F1");

        grid.add(cardSpeed, 0, 0);
        grid.add(cardCongestion, 1, 0);
        grid.add(cardAlerts, 0, 1);
        grid.add(cardSignals, 1, 1);

        // Junction Inspector Panel
        VBox inspectorBox = new VBox(10);
        inspectorBox.getStyleClass().add("content-panel");

        Label inspectorHeader = new Label("Junction Details Inspector");
        inspectorHeader.setFont(Font.font("Segoe UI", FontWeight.BOLD, 13));
        inspectorHeader.setTextFill(Color.web("#0A2540"));

        Label inspectorTip = new Label("Click any junction marker on the map to inspect live signal status and queue lengths.");
        inspectorTip.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        inspectorTip.setTextFill(Color.web("#64748B"));
        inspectorTip.setWrapText(true);

        junctionInspectorName = new Label("Central City Square (J1)");
        junctionInspectorName.setFont(Font.font("Segoe UI", FontWeight.BOLD, 14));
        junctionInspectorName.setTextFill(Color.web("#1E293B"));

        junctionInspectorDistrict = new Label("District: Downtown Core");
        junctionInspectorDistrict.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11.5));
        junctionInspectorDistrict.setTextFill(Color.web("#64748B"));

        junctionInspectorSignal = new Label("Signal: North-South Green (Adaptive)");
        junctionInspectorSignal.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));
        junctionInspectorSignal.setTextFill(Color.web("#10B981"));

        junctionInspectorQueue = new Label("Approaching Queue: 12 vehicles");
        junctionInspectorQueue.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12));
        junctionInspectorQueue.setTextFill(Color.web("#334155"));

        junctionInspectorCongestion = new Label("Congestion: Low / Free Flow");
        junctionInspectorCongestion.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12));
        junctionInspectorCongestion.setTextFill(Color.web("#059669"));

        junctionConnectedRoadsBox = new VBox(4);

        inspectorBox.getChildren().addAll(
                inspectorHeader, inspectorTip, new Separator(),
                junctionInspectorName, junctionInspectorDistrict,
                junctionInspectorSignal, junctionInspectorQueue, junctionInspectorCongestion,
                new Label("Connected Corridors:") {{
                    setFont(Font.font("Segoe UI", FontWeight.BOLD, 11.5));
                    setTextFill(Color.web("#475569"));
                }},
                junctionConnectedRoadsBox
        );

        box.getChildren().addAll(heading, grid, inspectorBox);
        return box;
    }

    private VBox createMiniCard(String title, String val, String accentHex) {
        VBox card = new VBox(3);
        card.setStyle("-fx-background-color: #FFFFFF; -fx-border-color: #E2E8F0; -fx-border-width: 1px; -fx-border-radius: 8px; -fx-background-radius: 8px; -fx-padding: 8 10 8 10;");
        Label t = new Label(title);
        t.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 10.5));
        t.setTextFill(Color.web("#64748B"));
        Label v = new Label(val);
        v.setFont(Font.font("Segoe UI", FontWeight.BOLD, 13));
        v.setTextFill(Color.web(accentHex));
        card.getChildren().addAll(t, v);
        return card;
    }

    private VBox buildRoutePlannerPane() {
        VBox box = new VBox(12);

        Label heading = new Label("Smart Route Planner");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 15));
        heading.setTextFill(Color.web("#0F172A"));

        Label subtitle = new Label("Find optimal commute corridors avoiding live congestion and verified road closures.");
        subtitle.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11.5));
        subtitle.setTextFill(Color.web("#64748B"));
        subtitle.setWrapText(true);

        // Inputs
        VBox originBox = new VBox(4);
        HBox originHeader = new HBox(6);
        Label origLbl = new Label("Starting Location");
        origLbl.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11.5));
        origLbl.setTextFill(Color.web("#1E293B"));
        Region sp = new Region();
        HBox.setHgrow(sp, Priority.ALWAYS);
        Button currLocBtn = new Button("Use Current Location");
        currLocBtn.getStyleClass().add("link-button");
        currLocBtn.setOnAction(e -> originCombo.getSelectionModel().select(0));
        originHeader.getChildren().addAll(origLbl, sp, currLocBtn);

        originCombo = new ComboBox<>(TrafficService.getInstance().getJunctions());
        originCombo.setMaxWidth(Double.MAX_VALUE);
        originCombo.getSelectionModel().select(1); // J2 North Metro

        originBox.getChildren().addAll(originHeader, originCombo);

        VBox destBox = new VBox(4);
        Label destLbl = new Label("Destination");
        destLbl.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11.5));
        destLbl.setTextFill(Color.web("#1E293B"));
        destCombo = new ComboBox<>(TrafficService.getInstance().getJunctions());
        destCombo.setMaxWidth(Double.MAX_VALUE);
        destCombo.getSelectionModel().select(3); // J4 Harbour Gateway

        destBox.getChildren().addAll(destLbl, destCombo);

        Button findRouteBtn = new Button("Find Best Route");
        findRouteBtn.getStyleClass().add("btn-accent");
        findRouteBtn.setMaxWidth(Double.MAX_VALUE);
        findRouteBtn.setOnAction(e -> calculateRoutes());

        // Container for route result cards
        routeResultsContainer = new VBox(10);
        routeResultsContainer.setStyle("-fx-padding: 6 0 0 0;");

        // Initial default calculation
        calculateRoutes();

        box.getChildren().addAll(heading, subtitle, originBox, destBox, findRouteBtn, routeResultsContainer);
        return box;
    }

    private void calculateRoutes() {
        routeResultsContainer.getChildren().clear();

        Junction origin = originCombo.getSelectionModel().getSelectedItem();
        Junction dest = destCombo.getSelectionModel().getSelectedItem();

        if (origin == null || dest == null) return;

        List<RouteOption> routes = RouteService.getInstance().findRoutes(origin.getId(), dest.getId());
        if (routes.isEmpty()) {
            Label noRoute = new Label("No viable route found between selected points due to road closures.");
            noRoute.setTextFill(Color.web("#EF4444"));
            routeResultsContainer.getChildren().add(noRoute);
            return;
        }

        // Highlight recommended route on map
        if (trafficCanvas != null) {
            trafficCanvas.highlightedRouteProperty().set(routes.get(0));
        }

        for (int i = 0; i < routes.size(); i++) {
            RouteOption opt = routes.get(i);
            VBox card = buildRouteCard(opt, i == 0);
            routeResultsContainer.getChildren().add(card);
        }
    }

    private VBox buildRouteCard(RouteOption opt, boolean isRecommended) {
        VBox card = new VBox(6);
        card.setStyle(isRecommended ?
                "-fx-background-color: #EFF6FF; -fx-border-color: #93C5FD; -fx-border-width: 1.5px; -fx-border-radius: 8px; -fx-background-radius: 8px; -fx-padding: 10 12 10 12;" :
                "-fx-background-color: #FFFFFF; -fx-border-color: #E2E8F0; -fx-border-width: 1px; -fx-border-radius: 8px; -fx-background-radius: 8px; -fx-padding: 10 12 10 12;");

        HBox topRow = new HBox(8);
        topRow.setAlignment(Pos.CENTER_LEFT);

        Label title = new Label(opt.getRouteName());
        title.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12.5));
        title.setTextFill(isRecommended ? Color.web("#1D4ED8") : Color.web("#1E293B"));

        Region sp = new Region();
        HBox.setHgrow(sp, Priority.ALWAYS);

        Label tag = new Label(isRecommended ? "RECOMMENDED" : "ALTERNATIVE");
        tag.setStyle(isRecommended ?
                "-fx-background-color: #DBEAFE; -fx-text-fill: #1E40AF; -fx-font-size: 9.5px; -fx-font-weight: bold; -fx-padding: 2 6 2 6; -fx-background-radius: 4px;" :
                "-fx-background-color: #F1F5F9; -fx-text-fill: #64748B; -fx-font-size: 9.5px; -fx-font-weight: bold; -fx-padding: 2 6 2 6; -fx-background-radius: 4px;");

        topRow.getChildren().addAll(title, sp, tag);

        HBox stats = new HBox(12);
        stats.setAlignment(Pos.CENTER_LEFT);

        Label time = new Label(String.format("%.1f mins", opt.getEstimatedDurationMinutes()));
        time.setFont(Font.font("Segoe UI", FontWeight.BOLD, 15));
        time.setTextFill(Color.web("#0F172A"));

        Label dist = new Label(String.format("%.1f km", opt.getTotalDistanceKm()));
        dist.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));
        dist.setTextFill(Color.web("#64748B"));

        Label delay = new Label(opt.getDelayMinutes() > 1.0 ?
                String.format("+%.0f min delay", opt.getDelayMinutes()) : "Fast flow");
        delay.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 11));
        delay.setTextFill(opt.getDelayMinutes() > 1.0 ? Color.web("#D97706") : Color.web("#10B981"));

        stats.getChildren().addAll(time, dist, delay);

        Label note = new Label(opt.getSummaryNote());
        note.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        note.setTextFill(Color.web("#475569"));
        note.setWrapText(true);

        Button showOnMapBtn = new Button("View Route on Map");
        showOnMapBtn.setStyle("-fx-background-color: transparent; -fx-text-fill: #2563EB; -fx-font-weight: bold; -fx-font-size: 11px; -fx-cursor: hand; -fx-padding: 2 0 2 0;");
        showOnMapBtn.setOnAction(e -> trafficCanvas.highlightedRouteProperty().set(opt));

        card.getChildren().addAll(topRow, stats, note, showOnMapBtn);
        return card;
    }

    private VBox buildTrafficAlertsPane() {
        VBox box = new VBox(12);

        Label heading = new Label("Traffic Alerts & Verified Roadblocks");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 14.5));
        heading.setTextFill(Color.web("#0F172A"));

        ScrollPane sp = new ScrollPane();
        sp.setFitToWidth(true);
        sp.setStyle("-fx-background-color: transparent; -fx-background: transparent;");

        VBox list = new VBox(10);
        list.setPadding(new Insets(2, 6, 10, 0));

        TrafficService ts = TrafficService.getInstance();
        for (Incident inc : ts.getIncidents()) {
            if (inc.getStatus() == Incident.Status.VERIFIED_PUBLISHED) {
                list.getChildren().add(buildIncidentAlertCard(inc));
            }
        }

        for (RoadBlock rb : ts.getRoadBlocks()) {
            if (rb.getStatus() == RoadBlock.Status.ACTIVE) {
                list.getChildren().add(buildRoadBlockAlertCard(rb));
            }
        }

        sp.setContent(list);
        VBox.setVgrow(sp, Priority.ALWAYS);

        box.getChildren().addAll(heading, sp);
        return box;
    }

    private VBox buildIncidentAlertCard(Incident inc) {
        VBox card = new VBox(4);
        card.setStyle("-fx-background-color: #FFFFFF; -fx-border-color: #E2E8F0; -fx-border-width: 1px; -fx-border-radius: 8px; -fx-background-radius: 8px; -fx-padding: 10;");

        HBox top = new HBox(6);
        top.setAlignment(Pos.CENTER_LEFT);
        Label title = new Label(inc.getTitle());
        title.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12));
        title.setTextFill(Color.web("#0F172A"));

        Region sp = new Region();
        HBox.setHgrow(sp, Priority.ALWAYS);

        Label badge = new Label(inc.getSeverity().name());
        badge.setStyle(inc.getSeverity() == Incident.Severity.HIGH || inc.getSeverity() == Incident.Severity.CRITICAL ?
                "-fx-background-color: #FEE2E2; -fx-text-fill: #DC2626; -fx-font-size: 9.5px; -fx-font-weight: bold; -fx-padding: 2 6 2 6; -fx-background-radius: 4px;" :
                "-fx-background-color: #FEF3C7; -fx-text-fill: #D97706; -fx-font-size: 9.5px; -fx-font-weight: bold; -fx-padding: 2 6 2 6; -fx-background-radius: 4px;");

        top.getChildren().addAll(title, sp, badge);

        Label loc = new Label("📍 " + inc.getLocationName());
        loc.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        loc.setTextFill(Color.web("#64748B"));

        Label desc = new Label(inc.getDescription());
        desc.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        desc.setTextFill(Color.web("#334155"));
        desc.setWrapText(true);

        Label verified = new Label("Verified by: " + inc.getVerifiedBy() + " • " + inc.getFormattedTime());
        verified.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 10));
        verified.setTextFill(Color.web("#10B981"));

        card.getChildren().addAll(top, loc, desc, verified);
        return card;
    }

    private VBox buildRoadBlockAlertCard(RoadBlock rb) {
        VBox card = new VBox(4);
        card.setStyle("-fx-background-color: #FEF2F2; -fx-border-color: #FCA5A5; -fx-border-width: 1px; -fx-border-radius: 8px; -fx-background-radius: 8px; -fx-padding: 10;");

        HBox top = new HBox(6);
        top.setAlignment(Pos.CENTER_LEFT);
        Label title = new Label("🚧 ROAD CLOSURE: " + rb.getRoadName());
        title.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12));
        title.setTextFill(Color.web("#991B1B"));

        Region sp = new Region();
        HBox.setHgrow(sp, Priority.ALWAYS);

        Label badge = new Label("BLOCKED");
        badge.setStyle("-fx-background-color: #DC2626; -fx-text-fill: #FFFFFF; -fx-font-size: 9.5px; -fx-font-weight: bold; -fx-padding: 2 6 2 6; -fx-background-radius: 4px;");

        top.getChildren().addAll(title, sp, badge);

        Label reason = new Label("Reason: " + rb.getReason());
        reason.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        reason.setTextFill(Color.web("#7F1D1D"));
        reason.setWrapText(true);

        Label auth = new Label("Enforced by: " + rb.getAuthorityInCharge() + " • Est. Clearance: " + rb.getExpectedClearance());
        auth.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 10));
        auth.setTextFill(Color.web("#991B1B"));

        card.getChildren().addAll(top, reason, auth);
        return card;
    }

    private VBox buildUserProfilePane() {
        VBox box = new VBox(14);

        Label heading = new Label("My Profile & Mobility Preferences");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 15));
        heading.setTextFill(Color.web("#0F172A"));

        VBox userCard = new VBox(6);
        userCard.getStyleClass().add("content-panel");
        Label uName = new Label(currentUser.getFullName());
        uName.setFont(Font.font("Segoe UI", FontWeight.BOLD, 14));
        Label uEmail = new Label("Email: " + currentUser.getEmail());
        Label uRole = new Label("Account Tier: " + currentUser.getDepartment());
        userCard.getChildren().addAll(uName, uEmail, uRole);

        Label prefHeader = new Label("Navigation Preferences");
        prefHeader.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12.5));
        prefHeader.setTextFill(Color.web("#334155"));

        CheckBox chkAvoidTolls = new CheckBox("Prioritize signal-synchronized green corridors");
        chkAvoidTolls.setSelected(true);
        CheckBox chkFastest = new CheckBox("Real-time traffic avoidance auto-rerouting");
        chkFastest.setSelected(true);
        CheckBox chkPublic = new CheckBox("Display multi-modal transit transfer options");
        chkPublic.setSelected(false);

        Label vehHeader = new Label("Default Commute Vehicle");
        vehHeader.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12.5));
        vehHeader.setTextFill(Color.web("#334155"));

        ComboBox<String> vehCombo = new ComboBox<>();
        vehCombo.getItems().addAll("Private Passenger Car", "Two-Wheeler Motorcycle", "Electric Vehicle (EV)", "Heavy Commercial Vehicle");
        vehCombo.getSelectionModel().select(0);
        vehCombo.setMaxWidth(Double.MAX_VALUE);

        Button saveBtn = new Button("Save Preferences");
        saveBtn.getStyleClass().add("btn-accent");
        saveBtn.setOnAction(e -> {
            Alert alert = new Alert(Alert.AlertType.INFORMATION);
            alert.setTitle("Preferences Saved");
            alert.setHeaderText(null);
            alert.setContentText("Your commute preferences have been saved to local configuration.");
            alert.showAndWait();
        });

        box.getChildren().addAll(heading, userCard, prefHeader, chkAvoidTolls, chkFastest, chkPublic, vehHeader, vehCombo, saveBtn);
        return box;
    }

    private StackPane buildCenterMapArea() {
        StackPane center = new StackPane();

        trafficCanvas = new TrafficCanvas();
        center.getChildren().add(trafficCanvas);

        // Floating map toolbar (Reset View, Zoom)
        HBox mapTools = new HBox(8);
        mapTools.setAlignment(Pos.TOP_LEFT);
        mapTools.setPadding(new Insets(16));
        mapTools.setPickOnBounds(false);

        Button resetBtn = new Button("Center & Fit Map");
        resetBtn.getStyleClass().add("btn-secondary");
        resetBtn.setOnAction(e -> trafficCanvas.resetView());

        mapTools.getChildren().add(resetBtn);

        center.getChildren().add(mapTools);
        StackPane.setAlignment(mapTools, Pos.TOP_LEFT);

        return center;
    }

    private void showJunctionDetails(Junction j) {
        if (j == null) return;
        junctionInspectorName.setText(j.getId() + " - " + j.getName());
        junctionInspectorDistrict.setText("District: " + j.getDistrict());
        junctionInspectorSignal.setText("Signal State: " + j.getCurrentSignalState().name());
        junctionInspectorQueue.setText("Approaching Queue: " + j.getVehicleQueueLength() + " vehicles");
        junctionInspectorCongestion.setText("Congestion Rating: " + j.getCongestionLevel().name());

        junctionConnectedRoadsBox.getChildren().clear();
        TrafficService ts = TrafficService.getInstance();
        for (String rId : j.getConnectedRoadIds()) {
            Road r = ts.getRoad(rId);
            if (r != null) {
                Label rLbl = new Label("• " + r.getName() + " (" + (int)r.getCurrentSpeedKmh() + " km/h)");
                rLbl.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
                rLbl.setTextFill(Color.web("#334155"));
                junctionConnectedRoadsBox.getChildren().add(rLbl);
            }
        }
    }

    private void refreshDynamicData() {
        Junction currentSelected = trafficCanvas.selectedJunctionProperty().get();
        if (currentSelected != null) {
            showJunctionDetails(currentSelected);
        }
    }
}
