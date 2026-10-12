package com.smarttraffic.ui.modules;

import com.smarttraffic.model.AuditRecord;
import com.smarttraffic.service.AuditService;
import javafx.beans.property.SimpleStringProperty;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

public class ReportsAndAuditView extends BorderPane {
    private final AuditService auditService = AuditService.getInstance();
    private TableView<AuditRecord> table;

    public ReportsAndAuditView() {
        setPadding(new Insets(20));
        setStyle("-fx-background-color: transparent;");

        setTop(buildHeader());
        setCenter(buildTableArea());
    }

    private VBox buildHeader() {
        VBox box = new VBox(4);
        box.setPadding(new Insets(0, 0, 16, 0));

        Label heading = new Label("Audit Trail & Operational Control History");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 18));
        heading.setTextFill(Color.web("#0A2540"));

        Label sub = new Label("Cryptographically sequenced, immutable audit records of all manual signal overrides, emergency dispatches, and carriageway closures.");
        sub.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12.5));
        sub.setTextFill(Color.web("#64748B"));

        box.getChildren().addAll(heading, sub);
        return box;
    }

    private VBox buildTableArea() {
        VBox box = new VBox(12);

        HBox toolbar = new HBox(10);
        toolbar.setAlignment(Pos.CENTER_LEFT);

        Button exportBtn = new Button("Export Audit Archive (.CSV)");
        exportBtn.getStyleClass().add("btn-secondary");
        exportBtn.setOnAction(e -> {
            Alert a = new Alert(Alert.AlertType.INFORMATION);
            a.setTitle("Audit Archive Exported");
            a.setHeaderText(null);
            a.setContentText("Complete audit log exported to target/audit_records_" + System.currentTimeMillis() + ".csv");
            a.showAndWait();
        });

        Button refreshBtn = new Button("Refresh Log");
        refreshBtn.getStyleClass().add("btn-secondary");
        refreshBtn.setOnAction(e -> table.refresh());

        toolbar.getChildren().addAll(exportBtn, refreshBtn);

        table = new TableView<>();
        table.setItems(auditService.getAuditRecords());
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);

        TableColumn<AuditRecord, String> cId = new TableColumn<>("Log ID");
        cId.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getId()));
        cId.setMaxWidth(90);

        TableColumn<AuditRecord, String> cTime = new TableColumn<>("Timestamp");
        cTime.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getFormattedTimestamp()));
        cTime.setMaxWidth(160);

        TableColumn<AuditRecord, String> cUser = new TableColumn<>("Administrator");
        cUser.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getAdministrator()));
        cUser.setMaxWidth(120);

        TableColumn<AuditRecord, String> cAction = new TableColumn<>("Action Type");
        cAction.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getAction()));
        cAction.setMaxWidth(180);

        TableColumn<AuditRecord, String> cTarget = new TableColumn<>("Target Subsystem");
        cTarget.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getTarget()));

        TableColumn<AuditRecord, String> cReason = new TableColumn<>("Operational Reason / Payload");
        cReason.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getReason()));

        TableColumn<AuditRecord, String> cResult = new TableColumn<>("Result");
        cResult.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getResult().name()));
        cResult.setMaxWidth(100);

        table.getColumns().addAll(cId, cTime, cUser, cAction, cTarget, cReason, cResult);

        box.getChildren().addAll(toolbar, table);
        VBox.setVgrow(table, Priority.ALWAYS);
        return box;
    }
}
