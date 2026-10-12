package com.smarttraffic.ui;

import com.smarttraffic.model.User;
import com.smarttraffic.ui.modules.*;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.util.ArrayList;
import java.util.List;

public class AdminDashboard extends BorderPane {
    private final User currentUser;
    private final Runnable onLogout;

    private StackPane contentArea;
    private final List<Button> navButtons = new ArrayList<>();

    // Cached module views
    private AdminOverviewView overviewView;
    private StackPane mapView;
    private JunctionManagementView junctionView;
    private CctvMonitoringView cctvView;
    private SignalControlView signalView;
    private EmergencyPriorityView emergencyView;
    private RoadBlockAndIncidentView roadBlockView;
    private ReportsAndAuditView reportsView;

    public AdminDashboard(User currentUser, Runnable onLogout) {
        this.currentUser = currentUser;
        this.onLogout = onLogout;

        setStyle("-fx-background-color: #F8FAFC;");

        setTop(buildHeader());
        setLeft(buildSidebar());

        contentArea = new StackPane();
        contentArea.setPadding(new Insets(10));
        setCenter(contentArea);

        initViews();
        showView(overviewView, navButtons.get(0));
    }

    private void initViews() {
        overviewView = new AdminOverviewView();
        mapView = buildMapModule();
        junctionView = new JunctionManagementView();
        cctvView = new CctvMonitoringView();
        signalView = new SignalControlView(currentUser);
        emergencyView = new EmergencyPriorityView(currentUser);
        roadBlockView = new RoadBlockAndIncidentView(currentUser);
        reportsView = new ReportsAndAuditView();
    }

    private HBox buildHeader() {
        HBox header = new HBox(16);
        header.getStyleClass().add("app-header");
        header.setAlignment(Pos.CENTER_LEFT);

        // Brand icon + Title
        StackPane iconPane = new StackPane();
        iconPane.setStyle("-fx-background-color: #0A2540; -fx-background-radius: 8px;");
        iconPane.setPrefSize(34, 34);
        iconPane.getChildren().add(Icons.createIconNode(Icons.DASHBOARD, 18, "#FFFFFF"));

        VBox titleBox = new VBox(2);
        Label title = new Label("SMART TRAFFIC CONTROL");
        title.getStyleClass().add("app-title-text");
        Label subtitle = new Label("Central Operations & Authority Command Center");
        subtitle.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        subtitle.setTextFill(Color.web("#64748B"));
        titleBox.getChildren().addAll(title, subtitle);

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        // Security level badge
        Label badge = new Label("AUTHORITY LEVEL: ADMIN ACCESS");
        badge.setStyle("-fx-background-color: #EFF6FF; -fx-text-fill: #1D4ED8; -fx-border-color: #BFDBFE; -fx-border-radius: 12px; -fx-background-radius: 12px; -fx-padding: 4 10 4 10; -fx-font-size: 11px; -fx-font-weight: bold;");

        // User info chip
        HBox userChip = new HBox(8);
        userChip.setAlignment(Pos.CENTER);
        userChip.setStyle("-fx-background-color: #F1F5F9; -fx-padding: 5 12 5 12; -fx-background-radius: 20px;");
        StackPane uIcon = Icons.createIconNode(Icons.SHIELD_CHECK, 15, "#10B981");
        Label uName = new Label(currentUser.getFullName() + " (" + currentUser.getDepartment() + ")");
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

        header.getChildren().addAll(iconPane, titleBox, spacer, badge, userChip, logoutBtn);
        return header;
    }

    private VBox buildSidebar() {
        VBox sidebar = new VBox(6);
        sidebar.getStyleClass().add("sidebar");
        sidebar.setPrefWidth(240);

        Label navSection = new Label("MENU");
        navSection.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11));
        navSection.setTextFill(Color.web("#94A3B8"));
        navSection.setPadding(new Insets(6, 12, 6, 12));

        Button btnOverview = createNavBtn("Overview", Icons.DASHBOARD);
        btnOverview.setOnAction(e -> showView(overviewView, btnOverview));

        Button btnMap = createNavBtn("Tactical Traffic Map", Icons.MAP);
        btnMap.setOnAction(e -> showView(mapView, btnMap));

        Button btnJunctions = createNavBtn("Junction Management", Icons.SIGNAL);
        btnJunctions.setOnAction(e -> showView(junctionView, btnJunctions));

        Button btnCctv = createNavBtn("Live CCTV Matrix", Icons.CCTV);
        btnCctv.setOnAction(e -> showView(cctvView, btnCctv));

        Button btnSignal = createNavBtn("Signal Control & Override", Icons.SIGNAL);
        btnSignal.setOnAction(e -> showView(signalView, btnSignal));

        Button btnEmergency = createNavBtn("Emergency Priority", Icons.SIREN);
        btnEmergency.setOnAction(e -> showView(emergencyView, btnEmergency));

        Button btnRoadBlocks = createNavBtn("Road Blocks & Incidents", Icons.ROADBLOCK);
        btnRoadBlocks.setOnAction(e -> showView(roadBlockView, btnRoadBlocks));

        Button btnReports = createNavBtn("Reports & Audit Log", Icons.REPORT);
        btnReports.setOnAction(e -> showView(reportsView, btnReports));

        navButtons.addAll(List.of(
                btnOverview, btnMap, btnJunctions, btnCctv,
                btnSignal, btnEmergency, btnRoadBlocks, btnReports
        ));

        sidebar.getChildren().add(navSection);
        sidebar.getChildren().addAll(navButtons);

        return sidebar;
    }

    private Button createNavBtn(String text, String svg) {
        Button btn = new Button();
        btn.getStyleClass().add("nav-tab-btn");
        btn.setMaxWidth(Double.MAX_VALUE);

        HBox graphic = new HBox(10, Icons.createIconNode(svg, 16, "#475569"), new Label(text));
        graphic.setAlignment(Pos.CENTER_LEFT);
        btn.setGraphic(graphic);
        return btn;
    }

    private void showView(Node view, Button activeBtn) {
        for (Button b : navButtons) {
            b.getStyleClass().remove("active");
            if (b.getGraphic() instanceof HBox hb && !hb.getChildren().isEmpty()) {
                if (hb.getChildren().get(0) instanceof StackPane sp && !sp.getChildren().isEmpty()) {
                    if (sp.getChildren().get(0) instanceof javafx.scene.shape.SVGPath path) {
                        path.setFill(Color.web("#475569"));
                    }
                }
            }
        }
        activeBtn.getStyleClass().add("active");
        if (activeBtn.getGraphic() instanceof HBox hb && !hb.getChildren().isEmpty()) {
            if (hb.getChildren().get(0) instanceof StackPane sp && !sp.getChildren().isEmpty()) {
                if (sp.getChildren().get(0) instanceof javafx.scene.shape.SVGPath path) {
                    path.setFill(Color.web("#2563EB"));
                }
            }
        }

        contentArea.getChildren().clear();
        contentArea.getChildren().add(view);
    }

    private StackPane buildMapModule() {
        StackPane mapContainer = new StackPane();
        TrafficCanvas canvas = new TrafficCanvas();
        mapContainer.getChildren().add(canvas);

        HBox tools = new HBox(8);
        tools.setAlignment(Pos.TOP_LEFT);
        tools.setPadding(new Insets(16));
        tools.setPickOnBounds(false);

        Button resetBtn = new Button("Center Tactical View");
        resetBtn.getStyleClass().add("btn-secondary");
        resetBtn.setOnAction(e -> canvas.resetView());

        tools.getChildren().add(resetBtn);
        mapContainer.getChildren().add(tools);
        StackPane.setAlignment(tools, Pos.TOP_LEFT);

        return mapContainer;
    }
}
