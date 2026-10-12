package com.smarttraffic.ui.modules;

import com.smarttraffic.model.Junction;
import com.smarttraffic.model.User;
import com.smarttraffic.service.SignalService;
import com.smarttraffic.service.TrafficService;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

public class SignalControlView extends BorderPane {
    private final User currentUser;
    private final TrafficService trafficService = TrafficService.getInstance();
    private final SignalService signalService = SignalService.getInstance();

    private ComboBox<Junction> junctionSelectCombo;
    private Label statusModeLabel;
    private Label statusStateLabel;
    private Slider cycleSlider;
    private Label cycleValLabel;
    private Slider greenSlider;
    private Label greenValLabel;
    private TextField justificationReasonField;
    private Label validationMessage;

    public SignalControlView(User currentUser) {
        this.currentUser = currentUser;
        setPadding(new Insets(20));
        setStyle("-fx-background-color: transparent;");

        setTop(buildHeader());
        setCenter(buildControlBody());

        trafficService.addUpdateListener(this::refreshCurrentJunctionStatus);
    }

    private VBox buildHeader() {
        VBox box = new VBox(4);
        box.setPadding(new Insets(0, 0, 16, 0));

        Label heading = new Label("Intersection Signal Phasing & Manual Override Console");
        heading.setFont(Font.font("Segoe UI", FontWeight.BOLD, 18));
        heading.setTextFill(Color.web("#0A2540"));

        Label sub = new Label("Authorized controller interface for adjusting adaptive cycle splits and enforcing emergency manual overrides.");
        sub.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12.5));
        sub.setTextFill(Color.web("#64748B"));

        box.getChildren().addAll(heading, sub);
        return box;
    }

    private ScrollPane buildControlBody() {
        VBox content = new VBox(20);
        content.setMaxWidth(800);

        // 1. Junction Picker & Live Status Card
        VBox statusCard = new VBox(12);
        statusCard.getStyleClass().add("content-panel");

        HBox pickRow = new HBox(12);
        pickRow.setAlignment(Pos.CENTER_LEFT);
        Label selLbl = new Label("Target Intersection:");
        selLbl.setFont(Font.font("Segoe UI", FontWeight.BOLD, 13));
        selLbl.setTextFill(Color.web("#1E293B"));

        junctionSelectCombo = new ComboBox<>(trafficService.getJunctions());
        junctionSelectCombo.getSelectionModel().select(0);
        junctionSelectCombo.setOnAction(e -> refreshCurrentJunctionStatus());

        pickRow.getChildren().addAll(selLbl, junctionSelectCombo);

        HBox statusRow = new HBox(24);
        statusRow.setAlignment(Pos.CENTER_LEFT);
        statusRow.setStyle("-fx-background-color: #F8FAFC; -fx-padding: 12; -fx-border-color: #E2E8F0; -fx-border-radius: 6px; -fx-background-radius: 6px;");

        VBox mBox = new VBox(3);
        Label mTitle = new Label("Operational Mode:");
        mTitle.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        mTitle.setTextFill(Color.web("#64748B"));
        statusModeLabel = new Label("AUTOMATIC ADAPTIVE CYCLE");
        statusModeLabel.setFont(Font.font("Segoe UI", FontWeight.BOLD, 13));
        statusModeLabel.setTextFill(Color.web("#10B981"));
        mBox.getChildren().addAll(mTitle, statusModeLabel);

        VBox sBox = new VBox(3);
        Label sTitle = new Label("Current Phase State:");
        sTitle.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        sTitle.setTextFill(Color.web("#64748B"));
        statusStateLabel = new Label("GREEN_NORTH_SOUTH");
        statusStateLabel.setFont(Font.font("Segoe UI", FontWeight.BOLD, 13));
        statusStateLabel.setTextFill(Color.web("#2563EB"));
        sBox.getChildren().addAll(sTitle, statusStateLabel);

        statusRow.getChildren().addAll(mBox, sBox);

        statusCard.getChildren().addAll(pickRow, statusRow);

        // 2. Adaptive Timing Adjustments
        VBox timingCard = new VBox(14);
        timingCard.getStyleClass().add("content-panel");

        Label timingHead = new Label("Adaptive Cycle Timing Configuration");
        timingHead.setFont(Font.font("Segoe UI", FontWeight.BOLD, 14));
        timingHead.setTextFill(Color.web("#0A2540"));

        // Cycle Slider
        VBox cycleBox = new VBox(6);
        HBox cycleHeadRow = new HBox(8);
        Label cLbl = new Label("Total Cycle Duration (Seconds):");
        cLbl.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));
        Region sp1 = new Region();
        HBox.setHgrow(sp1, Priority.ALWAYS);
        cycleValLabel = new Label("60 s");
        cycleValLabel.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12));
        cycleHeadRow.getChildren().addAll(cLbl, sp1, cycleValLabel);

        cycleSlider = new Slider(30, 150, 60);
        cycleSlider.setShowTickMarks(true);
        cycleSlider.setShowTickLabels(true);
        cycleSlider.setMajorTickUnit(30);
        cycleSlider.valueProperty().addListener((obs, oldV, newV) -> {
            cycleValLabel.setText(String.format("%.0f s", newV.doubleValue()));
        });
        cycleBox.getChildren().addAll(cycleHeadRow, cycleSlider);

        // Green duration slider
        VBox greenBox = new VBox(6);
        HBox greenHeadRow = new HBox(8);
        Label gLbl = new Label("North-South Green Phase Split (Seconds):");
        gLbl.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));
        Region sp2 = new Region();
        HBox.setHgrow(sp2, Priority.ALWAYS);
        greenValLabel = new Label("30 s");
        greenValLabel.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12));
        greenHeadRow.getChildren().addAll(gLbl, sp2, greenValLabel);

        greenSlider = new Slider(15, 90, 30);
        greenSlider.setShowTickMarks(true);
        greenSlider.setShowTickLabels(true);
        greenSlider.setMajorTickUnit(15);
        greenSlider.valueProperty().addListener((obs, oldV, newV) -> {
            greenValLabel.setText(String.format("%.0f s", newV.doubleValue()));
        });
        greenBox.getChildren().addAll(greenHeadRow, greenSlider);

        Button applyTimingBtn = new Button("Update Controller Timings");
        applyTimingBtn.getStyleClass().add("btn-accent");
        applyTimingBtn.setOnAction(e -> applyTimingChanges());

        timingCard.getChildren().addAll(timingHead, cycleBox, greenBox, applyTimingBtn);

        // 3. Authorized Manual Override Interlock Panel
        VBox overrideCard = new VBox(14);
        overrideCard.getStyleClass().add("content-panel");
        overrideCard.setStyle("-fx-border-color: #FCA5A5; -fx-border-width: 1.5px; -fx-border-radius: 8px; -fx-background-radius: 8px; -fx-padding: 16;");

        HBox overHead = new HBox(8);
        overHead.setAlignment(Pos.CENTER_LEFT);
        Label oTitle = new Label("Authorized Manual Phase Override");
        oTitle.setFont(Font.font("Segoe UI", FontWeight.BOLD, 14));
        oTitle.setTextFill(Color.web("#991B1B"));

        Region sp3 = new Region();
        HBox.setHgrow(sp3, Priority.ALWAYS);

        Label warnBadge = new Label("AUDITED INTERLOCK");
        warnBadge.setStyle("-fx-background-color: #FEE2E2; -fx-text-fill: #DC2626; -fx-font-size: 10px; -fx-font-weight: bold; -fx-padding: 3 6 3 6; -fx-background-radius: 4px;");

        overHead.getChildren().addAll(oTitle, sp3, warnBadge);

        Label overNote = new Label("Manual overrides disengage adaptive cycle algorithms. All actions require a mandatory operational justification logged to the official audit archive.");
        overNote.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11.5));
        overNote.setTextFill(Color.web("#7F1D1D"));
        overNote.setWrapText(true);

        Label rsnLbl = new Label("Operational Justification (Mandatory):");
        rsnLbl.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12));
        justificationReasonField = new TextField();
        justificationReasonField.setPromptText("e.g. VIP motorcade clearance / Police dispatch directive / Sensor calibration");

        validationMessage = new Label();
        validationMessage.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11.5));
        validationMessage.setTextFill(Color.web("#EF4444"));
        validationMessage.setVisible(false);

        HBox actionButtons = new HBox(10);
        Button forceNsGreen = new Button("Force Green (North-South)");
        forceNsGreen.getStyleClass().add("btn-success");
        forceNsGreen.setOnAction(e -> executeOverride(Junction.SignalState.GREEN_NORTH_SOUTH));

        Button forceEwGreen = new Button("Force Green (East-West)");
        forceEwGreen.getStyleClass().add("btn-accent");
        forceEwGreen.setOnAction(e -> executeOverride(Junction.SignalState.GREEN_EAST_WEST));

        Button forceAllRed = new Button("Force All-Red (Stop All)");
        forceAllRed.getStyleClass().add("btn-danger");
        forceAllRed.setOnAction(e -> executeOverride(Junction.SignalState.ALL_RED));

        Button releaseAuto = new Button("Revert to Automatic Cycle");
        releaseAuto.getStyleClass().add("btn-secondary");
        releaseAuto.setOnAction(e -> releaseOverride());

        actionButtons.getChildren().addAll(forceNsGreen, forceEwGreen, forceAllRed, releaseAuto);

        overrideCard.getChildren().addAll(overHead, overNote, rsnLbl, justificationReasonField, validationMessage, actionButtons);

        content.getChildren().addAll(statusCard, timingCard, overrideCard);

        ScrollPane sp = new ScrollPane(content);
        sp.setFitToWidth(true);
        sp.setStyle("-fx-background-color: transparent; -fx-background: transparent;");
        return sp;
    }

    private void applyTimingChanges() {
        Junction j = junctionSelectCombo.getSelectionModel().getSelectedItem();
        if (j != null) {
            int cycle = (int) cycleSlider.getValue();
            int green = (int) greenSlider.getValue();
            signalService.updateSignalTimings(j.getId(), cycle, green, currentUser.getUsername());

            Alert alert = new Alert(Alert.AlertType.INFORMATION);
            alert.setTitle("Timings Synchronized");
            alert.setHeaderText(null);
            alert.setContentText("Signal controller for " + j.getName() + " updated: Cycle=" + cycle + "s, Green=" + green + "s");
            alert.showAndWait();
        }
    }

    private void executeOverride(Junction.SignalState state) {
        String reason = justificationReasonField.getText();
        if (reason == null || reason.trim().length() < 4) {
            validationMessage.setText("Validation Error: Please provide an operational justification reason (minimum 4 characters).");
            validationMessage.setVisible(true);
            return;
        }

        validationMessage.setVisible(false);
        Junction j = junctionSelectCombo.getSelectionModel().getSelectedItem();
        if (j != null) {
            boolean ok = signalService.applyManualOverride(j.getId(), state, reason, currentUser.getUsername());
            if (ok) {
                refreshCurrentJunctionStatus();
                Alert a = new Alert(Alert.AlertType.INFORMATION);
                a.setTitle("Override Active");
                a.setHeaderText(null);
                a.setContentText("Manual override applied to " + j.getName() + " [" + state.name() + "]. Action logged to audit trail.");
                a.showAndWait();
            }
        }
    }

    private void releaseOverride() {
        Junction j = junctionSelectCombo.getSelectionModel().getSelectedItem();
        if (j != null) {
            signalService.revertToAutomaticCycle(j.getId(), currentUser.getUsername());
            refreshCurrentJunctionStatus();
            validationMessage.setVisible(false);
            justificationReasonField.clear();

            Alert a = new Alert(Alert.AlertType.INFORMATION);
            a.setTitle("Automatic Cycle Restored");
            a.setHeaderText(null);
            a.setContentText("Adaptive signal cycle resumed for " + j.getName());
            a.showAndWait();
        }
    }

    private void refreshCurrentJunctionStatus() {
        Junction j = junctionSelectCombo.getSelectionModel().getSelectedItem();
        if (j == null) return;

        if (j.isManualOverrideActive()) {
            statusModeLabel.setText("MANUAL OVERRIDE: " + j.getManualOverrideReason());
            statusModeLabel.setTextFill(Color.web("#DC2626"));
        } else {
            statusModeLabel.setText("AUTOMATIC ADAPTIVE CYCLE");
            statusModeLabel.setTextFill(Color.web("#10B981"));
        }
        statusStateLabel.setText(j.getCurrentSignalState().name());
    }
}
