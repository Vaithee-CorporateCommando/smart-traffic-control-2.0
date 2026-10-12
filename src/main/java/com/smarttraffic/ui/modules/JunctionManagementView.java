package com.smarttraffic.ui.modules;

import com.smarttraffic.model.Junction;
import com.smarttraffic.model.Road;
import com.smarttraffic.service.TrafficService;
import javafx.beans.property.SimpleStringProperty;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

public class JunctionManagementView extends BorderPane {
    private final TrafficService trafficService = TrafficService.getInstance();
    private TableView<Junction> table;
    private VBox detailPanel;

    // Detail Panel fields
    private Label detailTitle;
    private Label detailDistrict;
    private Label detailSignalState;
    private Label detailQueue;
    private Label detailCycle;
    private Label detailOverride;
    private VBox roadsListBox;

    public JunctionManagementView() {
        setPadding(new Insets(20));
        setStyle("-fx-background-color: transparent;");

        setTop(buildHeader());
        setRight(buildDetailPanel());
        setCenter(buildTable());

        trafficService.addUpdateListener(() -> {
            table.refresh();
            Junction selected = table.getSelectionModel().getSelectedItem();
            if (selected != null) {
                updateDetailPanel(selected);
            }
        });
    }

    private VBox buildHeader() {
        VBox box = new VBox(4);
        box.setPadding(new Insets(0, 0, 16, 0));

        Label heading = new Label("Junction Network & Signal Management");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 18));
        heading.setTextFill(Color.web("#0A2540"));

        Label sub = new Label("Monitor intersection phase cycles, real-time vehicle queues, and connected corridor capacities.");
        sub.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12.5));
        sub.setTextFill(Color.web("#64748B"));

        box.getChildren().addAll(heading, sub);
        return box;
    }

    private VBox buildTable() {
        VBox box = new VBox(10);
        HBox.setHgrow(box, Priority.ALWAYS);

        table = new TableView<>();
        table.setItems(trafficService.getJunctions());
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);

        TableColumn<Junction, String> colId = new TableColumn<>("ID");
        colId.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getId()));
        colId.setMaxWidth(60);

        TableColumn<Junction, String> colName = new TableColumn<>("Junction Name");
        colName.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getName()));

        TableColumn<Junction, String> colDistrict = new TableColumn<>("District");
        colDistrict.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getDistrict()));

        TableColumn<Junction, String> colSignal = new TableColumn<>("Current Signal");
        colSignal.setCellValueFactory(d -> new SimpleStringProperty(
                d.getValue().isManualOverrideActive() ? "MANUAL OVERRIDE" : d.getValue().getCurrentSignalState().name()
        ));

        TableColumn<Junction, String> colQueue = new TableColumn<>("Queue");
        colQueue.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getVehicleQueueLength() + " veh"));
        colQueue.setMaxWidth(90);

        TableColumn<Junction, String> colCongestion = new TableColumn<>("Congestion");
        colCongestion.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getCongestionLevel().name()));
        colCongestion.setMaxWidth(100);

        table.getColumns().addAll(colId, colName, colDistrict, colSignal, colQueue, colCongestion);

        table.getSelectionModel().selectedItemProperty().addListener((obs, oldV, newV) -> {
            if (newV != null) {
                updateDetailPanel(newV);
            }
        });

        table.getSelectionModel().selectFirst();

        box.getChildren().add(table);
        VBox.setVgrow(table, Priority.ALWAYS);
        return box;
    }

    private VBox buildDetailPanel() {
        detailPanel = new VBox(14);
        detailPanel.setPrefWidth(320);
        detailPanel.setPadding(new Insets(0, 0, 0, 16));

        VBox card = new VBox(12);
        card.getStyleClass().add("content-panel");

        Label cardHead = new Label("Intersection Inspector");
        cardHead.setFont(Font.font("Segoe UI", FontWeight.BOLD, 14));
        cardHead.setTextFill(Color.web("#0A2540"));

        detailTitle = new Label("J1 - Central City Square");
        detailTitle.setFont(Font.font("Segoe UI", FontWeight.BOLD, 15));
        detailTitle.setTextFill(Color.web("#1E293B"));

        detailDistrict = new Label("District: Downtown Core");
        detailDistrict.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12));
        detailDistrict.setTextFill(Color.web("#64748B"));

        Separator sep = new Separator();

        detailSignalState = new Label("Signal State: GREEN_NORTH_SOUTH");
        detailSignalState.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));

        detailQueue = new Label("Queue: 14 vehicles");
        detailQueue.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12));

        detailCycle = new Label("Adaptive Cycle: 60 seconds (Split: 30s/30s)");
        detailCycle.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12));

        detailOverride = new Label("Mode: Automatic Cycle Active");
        detailOverride.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12));

        roadsListBox = new VBox(6);

        Label rHead = new Label("Connected Corridors:");
        rHead.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12));
        rHead.setTextFill(Color.web("#334155"));

        card.getChildren().addAll(
                cardHead, detailTitle, detailDistrict, sep,
                detailSignalState, detailQueue, detailCycle, detailOverride,
                rHead, roadsListBox
        );

        detailPanel.getChildren().add(card);
        return detailPanel;
    }

    private void updateDetailPanel(Junction j) {
        if (detailTitle == null || j == null) return;
        detailTitle.setText(j.getId() + " - " + j.getName());
        detailDistrict.setText("District: " + j.getDistrict());
        detailSignalState.setText("Signal State: " + j.getCurrentSignalState().name());
        detailQueue.setText("Queue Length: " + j.getVehicleQueueLength() + " vehicles");
        detailCycle.setText("Adaptive Cycle: " + j.getCycleDurationSeconds() + "s (Green: " + j.getGreenDurationSeconds() + "s)");

        if (j.isManualOverrideActive()) {
            detailOverride.setText("OVERRIDE: " + j.getManualOverrideReason());
            detailOverride.setTextFill(Color.web("#DC2626"));
        } else {
            detailOverride.setText("Mode: Automatic Adaptive Controller");
            detailOverride.setTextFill(Color.web("#10B981"));
        }

        roadsListBox.getChildren().clear();
        for (String rId : j.getConnectedRoadIds()) {
            Road r = trafficService.getRoad(rId);
            if (r != null) {
                Label rl = new Label("• " + r.getName() + " [" + (int)r.getCurrentSpeedKmh() + " km/h]");
                rl.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
                rl.setTextFill(r.isBlocked() ? Color.web("#DC2626") : Color.web("#475569"));
                roadsListBox.getChildren().add(rl);
            }
        }
    }
}
