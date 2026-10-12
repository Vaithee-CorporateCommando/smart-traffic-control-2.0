package com.smarttraffic.ui.modules;

import com.smarttraffic.model.EmergencyDispatch;
import com.smarttraffic.model.User;
import com.smarttraffic.service.SignalService;
import com.smarttraffic.service.TrafficService;
import javafx.beans.property.SimpleStringProperty;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.util.List;

public class EmergencyPriorityView extends BorderPane {
    private final User currentUser;
    private final TrafficService trafficService = TrafficService.getInstance();
    private final SignalService signalService = SignalService.getInstance();

    private TableView<EmergencyDispatch> table;
    private VBox detailCard;
    private Label detailCode;
    private Label detailType;
    private Label detailIncident;
    private Label detailCorridor;
    private Label detailStatus;
    private Label detailSavings;
    private Button btnActivatePreemption;
    private Button btnDeactivatePreemption;

    public EmergencyPriorityView(User currentUser) {
        this.currentUser = currentUser;
        setPadding(new Insets(20));
        setStyle("-fx-background-color: transparent;");

        setTop(buildHeader());
        setRight(buildDetailPanel());
        setCenter(buildTable());

        trafficService.addUpdateListener(() -> {
            table.refresh();
            EmergencyDispatch selected = table.getSelectionModel().getSelectedItem();
            if (selected != null) {
                updateDetail(selected);
            }
        });
    }

    private VBox buildHeader() {
        VBox box = new VBox(4);
        box.setPadding(new Insets(0, 0, 16, 0));

        Label heading = new Label("Emergency Corridor & Green-Wave Preemption");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 18));
        heading.setTextFill(Color.web("#0A2540"));

        Label sub = new Label("Automated and manual priority signal synchronization for emergency response ambulances, fire engines, and police escorts.");
        sub.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12.5));
        sub.setTextFill(Color.web("#64748B"));

        box.getChildren().addAll(heading, sub);
        return box;
    }

    private VBox buildTable() {
        VBox box = new VBox(10);
        HBox.setHgrow(box, Priority.ALWAYS);

        HBox toolRow = new HBox(10);
        toolRow.setAlignment(Pos.CENTER_LEFT);

        Button newDispatchBtn = new Button("+ Register New Emergency Transit");
        newDispatchBtn.getStyleClass().add("btn-accent");
        newDispatchBtn.setOnAction(e -> showNewDispatchDialog());

        toolRow.getChildren().add(newDispatchBtn);

        table = new TableView<>();
        table.setItems(trafficService.getEmergencyDispatches());
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);

        TableColumn<EmergencyDispatch, String> colCode = new TableColumn<>("Vehicle Code");
        colCode.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getVehicleCode()));
        colCode.setMaxWidth(110);

        TableColumn<EmergencyDispatch, String> colType = new TableColumn<>("Type");
        colType.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getVehicleType().name()));
        colType.setMaxWidth(130);

        TableColumn<EmergencyDispatch, String> colRef = new TableColumn<>("Mission / Incident");
        colRef.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getIncidentReference()));

        TableColumn<EmergencyDispatch, String> colRoute = new TableColumn<>("Corridor");
        colRoute.setCellValueFactory(d -> new SimpleStringProperty(
                d.getValue().getOriginName() + " ➔ " + d.getValue().getDestinationName()
        ));

        TableColumn<EmergencyDispatch, String> colStatus = new TableColumn<>("Priority Status");
        colStatus.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getStatus().name()));
        colStatus.setMaxWidth(140);

        table.getColumns().addAll(colCode, colType, colRef, colRoute, colStatus);

        table.getSelectionModel().selectedItemProperty().addListener((obs, o, n) -> {
            if (n != null) updateDetail(n);
        });
        table.getSelectionModel().selectFirst();

        box.getChildren().addAll(toolRow, table);
        VBox.setVgrow(table, Priority.ALWAYS);
        return box;
    }

    private VBox buildDetailPanel() {
        VBox panel = new VBox(14);
        panel.setPrefWidth(330);
        panel.setPadding(new Insets(0, 0, 0, 16));

        detailCard = new VBox(12);
        detailCard.getStyleClass().add("content-panel");

        Label head = new Label("Preemption Controller");
        head.setFont(Font.font("Segoe UI", FontWeight.BOLD, 14));
        head.setTextFill(Color.web("#0A2540"));

        detailCode = new Label("AMB-108");
        detailCode.setFont(Font.font("Segoe UI", FontWeight.BOLD, 16));
        detailCode.setTextFill(Color.web("#1E293B"));

        detailType = new Label("Type: AMBULANCE");
        detailType.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12));

        detailIncident = new Label("Mission: Cardiac Emergency");
        detailIncident.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12));
        detailIncident.setWrapText(true);

        detailCorridor = new Label("Corridor Junctions: J2 ➔ J1");
        detailCorridor.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12));

        detailStatus = new Label("Status: CORRIDOR_ACTIVE");
        detailStatus.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12));
        detailStatus.setTextFill(Color.web("#10B981"));

        detailSavings = new Label("Estimated Transit Saved: ~6 minutes");
        detailSavings.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12));
        detailSavings.setTextFill(Color.web("#2563EB"));

        btnActivatePreemption = new Button("Enforce Green Wave Preemption");
        btnActivatePreemption.getStyleClass().add("btn-success");
        btnActivatePreemption.setMaxWidth(Double.MAX_VALUE);
        btnActivatePreemption.setOnAction(e -> {
            EmergencyDispatch d = table.getSelectionModel().getSelectedItem();
            if (d != null) {
                signalService.activateGreenWavePreemption(d, currentUser.getUsername());
                table.refresh();
                updateDetail(d);
            }
        });

        btnDeactivatePreemption = new Button("Mark Arrived / Release Corridor");
        btnDeactivatePreemption.getStyleClass().add("btn-secondary");
        btnDeactivatePreemption.setMaxWidth(Double.MAX_VALUE);
        btnDeactivatePreemption.setOnAction(e -> {
            EmergencyDispatch d = table.getSelectionModel().getSelectedItem();
            if (d != null) {
                signalService.deactivateGreenWavePreemption(d, currentUser.getUsername());
                table.refresh();
                updateDetail(d);
            }
        });

        detailCard.getChildren().addAll(
                head, detailCode, detailType, detailIncident, detailCorridor,
                detailStatus, detailSavings, new Separator(),
                btnActivatePreemption, btnDeactivatePreemption
        );

        panel.getChildren().add(detailCard);
        return panel;
    }

    private void updateDetail(EmergencyDispatch d) {
        if (detailCode == null || d == null) return;
        detailCode.setText(d.getVehicleCode());
        detailType.setText("Type: " + d.getVehicleType().name());
        detailIncident.setText("Mission: " + d.getIncidentReference());
        detailCorridor.setText("Corridor Nodes: " + String.join(" ➔ ", d.getCorridorJunctionIds()));
        detailStatus.setText("Status: " + d.getStatus().name());
        detailSavings.setText("Estimated Transit Saved: ~" + d.getEstimatedMinutesSaved() + " minutes");

        if (d.getStatus() == EmergencyDispatch.PriorityStatus.CORRIDOR_ACTIVE) {
            detailStatus.setTextFill(Color.web("#10B981"));
            btnActivatePreemption.setDisable(true);
            btnDeactivatePreemption.setDisable(false);
        } else {
            detailStatus.setTextFill(Color.web("#64748B"));
            btnActivatePreemption.setDisable(false);
            btnDeactivatePreemption.setDisable(true);
        }
    }

    private void showNewDispatchDialog() {
        Dialog<EmergencyDispatch> dialog = new Dialog<>();
        dialog.setTitle("New Emergency Vehicle Dispatch");
        dialog.setHeaderText("Register Emergency Vehicle & Plan Green Corridor");

        ButtonType registerBtn = new ButtonType("Authorize Dispatch", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(registerBtn, ButtonType.CANCEL);

        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(20, 150, 10, 10));

        TextField codeField = new TextField("FIRE-07");
        ComboBox<EmergencyDispatch.VehicleType> typeCombo = new ComboBox<>();
        typeCombo.getItems().addAll(EmergencyDispatch.VehicleType.values());
        typeCombo.getSelectionModel().select(EmergencyDispatch.VehicleType.FIRE_ENGINE);

        TextField missionField = new TextField("Commercial Complex Fire - East Zone");
        TextField originField = new TextField("Headquarters Fire Station (J1)");
        TextField destField = new TextField("Tech Innovation Park (J3)");

        grid.add(new Label("Vehicle Code:"), 0, 0);
        grid.add(codeField, 1, 0);
        grid.add(new Label("Vehicle Type:"), 0, 1);
        grid.add(typeCombo, 1, 1);
        grid.add(new Label("Mission Reference:"), 0, 2);
        grid.add(missionField, 1, 2);
        grid.add(new Label("Origin:"), 0, 3);
        grid.add(originField, 1, 3);
        grid.add(new Label("Destination:"), 0, 4);
        grid.add(destField, 1, 4);

        dialog.getDialogPane().setContent(grid);

        dialog.setResultConverter(b -> {
            if (b == registerBtn) {
                String id = "EMG-" + (400 + trafficService.getEmergencyDispatches().size() + 1);
                EmergencyDispatch disp = new EmergencyDispatch(
                        id, codeField.getText(), typeCombo.getValue(),
                        missionField.getText(), originField.getText(), destField.getText(),
                        List.of("J1", "J3")
                );
                trafficService.getEmergencyDispatches().add(0, disp);
                signalService.activateGreenWavePreemption(disp, currentUser.getUsername());
                return disp;
            }
            return null;
        });

        dialog.showAndWait();
    }
}
