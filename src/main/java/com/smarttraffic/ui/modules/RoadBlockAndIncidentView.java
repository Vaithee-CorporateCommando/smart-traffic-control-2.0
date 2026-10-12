package com.smarttraffic.ui.modules;

import com.smarttraffic.model.Incident;
import com.smarttraffic.model.Road;
import com.smarttraffic.model.RoadBlock;
import com.smarttraffic.model.User;
import com.smarttraffic.service.TrafficService;
import javafx.beans.property.SimpleStringProperty;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

public class RoadBlockAndIncidentView extends BorderPane {
    private final User currentUser;
    private final TrafficService trafficService = TrafficService.getInstance();

    private TableView<RoadBlock> roadBlockTable;
    private TableView<Incident> incidentTable;

    public RoadBlockAndIncidentView(User currentUser) {
        this.currentUser = currentUser;
        setPadding(new Insets(20));
        setStyle("-fx-background-color: transparent;");

        setTop(buildHeader());
        setCenter(buildTabs());
    }

    private VBox buildHeader() {
        VBox box = new VBox(4);
        box.setPadding(new Insets(0, 0, 16, 0));

        Label heading = new Label("Roadblock Management & Incident Verification");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 18));
        heading.setTextFill(Color.web("#0A2540"));

        Label sub = new Label("Review citizen and sensor reports, verify high-priority obstructions, and manage official carriageway closures.");
        sub.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12.5));
        sub.setTextFill(Color.web("#64748B"));

        box.getChildren().addAll(heading, sub);
        return box;
    }

    private TabPane buildTabs() {
        TabPane tabPane = new TabPane();

        Tab tabRoadBlocks = new Tab("Verified Road Closures", buildRoadBlockTab());
        tabRoadBlocks.setClosable(false);

        Tab tabIncidents = new Tab("Incident Verification Queue", buildIncidentQueueTab());
        tabIncidents.setClosable(false);

        tabPane.getTabs().addAll(tabRoadBlocks, tabIncidents);
        return tabPane;
    }

    private VBox buildRoadBlockTab() {
        VBox box = new VBox(12);
        box.setPadding(new Insets(16, 0, 0, 0));

        HBox toolbar = new HBox(10);
        toolbar.setAlignment(Pos.CENTER_LEFT);

        Button addBtn = new Button("+ Establish Road Closure");
        addBtn.getStyleClass().add("btn-accent");
        addBtn.setOnAction(e -> showCreateRoadBlockDialog());

        Button clearBtn = new Button("Clear Roadblock / Reopen Corridor");
        clearBtn.getStyleClass().add("btn-success");
        clearBtn.setOnAction(e -> {
            RoadBlock selected = roadBlockTable.getSelectionModel().getSelectedItem();
            if (selected != null && selected.getStatus() == RoadBlock.Status.ACTIVE) {
                trafficService.clearRoadBlock(selected);
                roadBlockTable.refresh();
                Alert a = new Alert(Alert.AlertType.INFORMATION);
                a.setTitle("Roadblock Cleared");
                a.setHeaderText(null);
                a.setContentText("Corridor reopened to regular traffic flow. Public routing engines updated.");
                a.showAndWait();
            }
        });

        toolbar.getChildren().addAll(addBtn, clearBtn);

        roadBlockTable = new TableView<>();
        roadBlockTable.setItems(trafficService.getRoadBlocks());
        roadBlockTable.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);

        TableColumn<RoadBlock, String> cId = new TableColumn<>("ID");
        cId.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getId()));
        cId.setMaxWidth(80);

        TableColumn<RoadBlock, String> cRoad = new TableColumn<>("Affected Road");
        cRoad.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getRoadName()));

        TableColumn<RoadBlock, String> cReason = new TableColumn<>("Closure Justification / Reason");
        cReason.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getReason()));

        TableColumn<RoadBlock, String> cAuth = new TableColumn<>("Enforcing Authority");
        cAuth.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getAuthorityInCharge()));

        TableColumn<RoadBlock, String> cTime = new TableColumn<>("Reported");
        cTime.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getFormattedTime()));
        cTime.setMaxWidth(100);

        TableColumn<RoadBlock, String> cEst = new TableColumn<>("Est. Clearance");
        cEst.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getExpectedClearance()));
        cEst.setMaxWidth(120);

        TableColumn<RoadBlock, String> cStatus = new TableColumn<>("Status");
        cStatus.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getStatus().name()));
        cStatus.setMaxWidth(110);

        roadBlockTable.getColumns().addAll(cId, cRoad, cReason, cAuth, cTime, cEst, cStatus);

        box.getChildren().addAll(toolbar, roadBlockTable);
        VBox.setVgrow(roadBlockTable, Priority.ALWAYS);
        return box;
    }

    private VBox buildIncidentQueueTab() {
        VBox box = new VBox(12);
        box.setPadding(new Insets(16, 0, 0, 0));

        HBox toolbar = new HBox(10);
        toolbar.setAlignment(Pos.CENTER_LEFT);

        Button verifyBtn = new Button("✔ Verify & Publish Public Alert");
        verifyBtn.getStyleClass().add("btn-accent");
        verifyBtn.setOnAction(e -> {
            Incident selected = incidentTable.getSelectionModel().getSelectedItem();
            if (selected != null) {
                trafficService.verifyIncident(selected, currentUser.getFullName());
                incidentTable.refresh();
                Alert a = new Alert(Alert.AlertType.INFORMATION);
                a.setTitle("Incident Verified");
                a.setHeaderText(null);
                a.setContentText("Incident broadcasted to Public Citizen Dashboards & mobile route alerts.");
                a.showAndWait();
            }
        });

        Button resolveBtn = new Button("Mark Resolved");
        resolveBtn.getStyleClass().add("btn-secondary");
        resolveBtn.setOnAction(e -> {
            Incident selected = incidentTable.getSelectionModel().getSelectedItem();
            if (selected != null) {
                trafficService.resolveIncident(selected, currentUser.getFullName());
                incidentTable.refresh();
            }
        });

        Button reportNewBtn = new Button("+ Log Citizen Incident");
        reportNewBtn.getStyleClass().add("btn-secondary");
        reportNewBtn.setOnAction(e -> showLogIncidentDialog());

        toolbar.getChildren().addAll(verifyBtn, resolveBtn, reportNewBtn);

        incidentTable = new TableView<>();
        incidentTable.setItems(trafficService.getIncidents());
        incidentTable.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);

        TableColumn<Incident, String> cId = new TableColumn<>("ID");
        cId.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getId()));
        cId.setMaxWidth(80);

        TableColumn<Incident, String> cTitle = new TableColumn<>("Incident Title");
        cTitle.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getTitle()));

        TableColumn<Incident, String> cType = new TableColumn<>("Type");
        cType.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getType().name()));
        cType.setMaxWidth(110);

        TableColumn<Incident, String> cSev = new TableColumn<>("Severity");
        cSev.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getSeverity().name()));
        cSev.setMaxWidth(90);

        TableColumn<Incident, String> cLoc = new TableColumn<>("Location");
        cLoc.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getLocationName()));

        TableColumn<Incident, String> cBy = new TableColumn<>("Reported By");
        cBy.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getReportedBy()));

        TableColumn<Incident, String> cStatus = new TableColumn<>("Status");
        cStatus.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getStatus().name()));
        cStatus.setMaxWidth(130);

        incidentTable.getColumns().addAll(cId, cTitle, cType, cSev, cLoc, cBy, cStatus);

        box.getChildren().addAll(toolbar, incidentTable);
        VBox.setVgrow(incidentTable, Priority.ALWAYS);
        return box;
    }

    private void showCreateRoadBlockDialog() {
        Dialog<Boolean> dialog = new Dialog<>();
        dialog.setTitle("Establish Road Closure");
        dialog.setHeaderText("Authorize Official Carriageway Closure");

        ButtonType confirmBtn = new ButtonType("Authorize Closure", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(confirmBtn, ButtonType.CANCEL);

        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(20, 150, 10, 10));

        ComboBox<Road> roadCombo = new ComboBox<>(trafficService.getRoads());
        roadCombo.getSelectionModel().select(0);

        TextField reasonField = new TextField("Emergency Pavement Resurfacing");
        TextField authField = new TextField("Civil Works Directorate");
        TextField estField = new TextField("22:00 Tonight");

        grid.add(new Label("Select Road:"), 0, 0);
        grid.add(roadCombo, 1, 0);
        grid.add(new Label("Reason:"), 0, 1);
        grid.add(reasonField, 1, 1);
        grid.add(new Label("Enforcing Authority:"), 0, 2);
        grid.add(authField, 1, 2);
        grid.add(new Label("Est. Reopening:"), 0, 3);
        grid.add(estField, 1, 3);

        dialog.getDialogPane().setContent(grid);

        dialog.setResultConverter(b -> {
            if (b == confirmBtn && roadCombo.getValue() != null) {
                trafficService.createRoadBlock(
                        roadCombo.getValue().getId(),
                        reasonField.getText(),
                        authField.getText(),
                        estField.getText()
                );
                roadBlockTable.refresh();
                return true;
            }
            return false;
        });

        dialog.showAndWait();
    }

    private void showLogIncidentDialog() {
        Dialog<Boolean> dialog = new Dialog<>();
        dialog.setTitle("Log Incident");
        dialog.setHeaderText("Record Citizen or Sensor Traffic Obstruction");

        ButtonType confirmBtn = new ButtonType("Submit Incident", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(confirmBtn, ButtonType.CANCEL);

        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(20, 150, 10, 10));

        TextField titleField = new TextField("Disabled Vehicle Blocking Lane 1");
        ComboBox<Incident.Type> typeCombo = new ComboBox<>();
        typeCombo.getItems().addAll(Incident.Type.values());
        typeCombo.getSelectionModel().select(Incident.Type.VEHICLE_BREAKDOWN);

        ComboBox<Incident.Severity> sevCombo = new ComboBox<>();
        sevCombo.getItems().addAll(Incident.Severity.values());
        sevCombo.getSelectionModel().select(Incident.Severity.MEDIUM);

        TextField locField = new TextField("Airport Connector Northbound (Mile 3)");
        TextField repField = new TextField("Highway Patrol Camera 03");
        TextArea descArea = new TextArea("Vehicle stalled due to engine overheating; roadside assistance dispatched.");
        descArea.setPrefRowCount(3);

        grid.add(new Label("Incident Title:"), 0, 0);
        grid.add(titleField, 1, 0);
        grid.add(new Label("Type:"), 0, 1);
        grid.add(typeCombo, 1, 1);
        grid.add(new Label("Severity:"), 0, 2);
        grid.add(sevCombo, 1, 2);
        grid.add(new Label("Location:"), 0, 3);
        grid.add(locField, 1, 3);
        grid.add(new Label("Reported By:"), 0, 4);
        grid.add(repField, 1, 4);
        grid.add(new Label("Description:"), 0, 5);
        grid.add(descArea, 1, 5);

        dialog.getDialogPane().setContent(grid);

        dialog.setResultConverter(b -> {
            if (b == confirmBtn) {
                String id = "INC-" + (100 + trafficService.getIncidents().size() + 1);
                Incident inc = new Incident(
                        id, titleField.getText(), typeCombo.getValue(), sevCombo.getValue(),
                        locField.getText(), "R6", repField.getText(), descArea.getText(),
                        Incident.Status.PENDING_REVIEW
                );
                trafficService.addIncidentReport(inc);
                incidentTable.refresh();
                return true;
            }
            return false;
        });

        dialog.showAndWait();
    }
}
