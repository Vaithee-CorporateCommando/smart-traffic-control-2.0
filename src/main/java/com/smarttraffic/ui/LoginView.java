package com.smarttraffic.ui;

import com.smarttraffic.auth.AuthService;
import com.smarttraffic.model.User;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.shape.SVGPath;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.io.InputStream;
import java.util.Optional;
import java.util.function.Consumer;

public class LoginView extends HBox {
    private final Consumer<User> onLoginSuccess;

    private TextField usernameField;
    private PasswordField passwordField;
    private TextField plainPasswordField;
    private boolean passwordVisible = false;
    private Label errorLabel;
    private CheckBox rememberMeCheck;

    public LoginView(Consumer<User> onLoginSuccess) {
        this.onLoginSuccess = onLoginSuccess;
        getStyleClass().add("login-root");
        setFillHeight(true);

        // Left split (50%) and Right split (50%)
        Pane leftPane = buildLeftVisualPanel();
        Pane rightPane = buildRightFormPanel();

        HBox.setHgrow(leftPane, Priority.ALWAYS);
        HBox.setHgrow(rightPane, Priority.ALWAYS);
        leftPane.prefWidthProperty().bind(widthProperty().multiply(0.48));
        rightPane.prefWidthProperty().bind(widthProperty().multiply(0.52));

        getChildren().addAll(leftPane, rightPane);
    }

    private Pane buildLeftVisualPanel() {
        StackPane container = new StackPane();
        container.getStyleClass().add("login-left-pane");

        // Try to load the authentic Google Stitch panel image
        InputStream is = getClass().getResourceAsStream("/images/login_left_panel.png");
        if (is != null) {
            Image img = new Image(is);
            ImageView iv = new ImageView(img);
            iv.setPreserveRatio(false);
            iv.fitWidthProperty().bind(container.widthProperty());
            iv.fitHeightProperty().bind(container.heightProperty());
            container.getChildren().add(iv);
        } else {
            // High fidelity vector fallback in case image file is missing
            VBox fallbackContent = buildLeftPanelVectorFallback();
            container.getChildren().add(fallbackContent);
        }

        return container;
    }

    private VBox buildLeftPanelVectorFallback() {
        VBox box = new VBox(24);
        box.setPadding(new Insets(50, 40, 40, 50));
        box.setAlignment(Pos.CENTER_LEFT);

        // Traffic Light Badge
        HBox badge = new HBox(8);
        badge.setAlignment(Pos.CENTER_LEFT);
        badge.setPadding(new Insets(6, 12, 6, 12));
        badge.setStyle("-fx-background-color: rgba(255,255,255,0.15); -fx-background-radius: 8px;");

        VBox lights = new VBox(3);
        lights.setAlignment(Pos.CENTER);
        Circle red = new Circle(4, Color.web("#EF4444"));
        Circle yellow = new Circle(4, Color.web("#F59E0B"));
        Circle green = new Circle(4, Color.web("#10B981"));
        lights.getChildren().addAll(red, yellow, green);

        Label badgeText = new Label("STC System");
        badgeText.setFont(Font.font("Segoe UI", FontWeight.BOLD, 12));
        badgeText.setTextFill(Color.WHITE);
        badge.getChildren().addAll(lights, badgeText);

        Label title1 = new Label("SMART TRAFFIC CONTROL");
        title1.setFont(Font.font("Segoe UI", FontWeight.BOLD, 26));
        title1.setTextFill(Color.WHITE);

        Label title2 = new Label("FOR URBAN CONGESTION");
        title2.setFont(Font.font("Segoe UI", FontWeight.BOLD, 17));
        title2.setTextFill(Color.web("#93C5FD"));

        Label tagline = new Label("Smarter roads. Safer journeys.\nA more connected tomorrow.");
        tagline.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 14));
        tagline.setTextFill(Color.web("#E2E8F0"));

        Region spacer = new Region();
        VBox.setVgrow(spacer, Priority.ALWAYS);

        // 3 Feature Badges at Bottom
        HBox featureRow = new HBox(16);
        featureRow.setAlignment(Pos.CENTER_LEFT);
        featureRow.getChildren().addAll(
                createFeatureBadge(Icons.PIN, "Real-time Traffic Monitoring"),
                createFeatureBadge(Icons.SHIELD_CHECK, "Efficient Traffic Management"),
                createFeatureBadge(Icons.LEAF, "Sustainable Urban Mobility")
        );

        box.getChildren().addAll(badge, title1, title2, tagline, spacer, featureRow);
        return box;
    }

    private VBox createFeatureBadge(String iconSvg, String labelText) {
        VBox box = new VBox(6);
        box.setAlignment(Pos.CENTER);
        StackPane iconCircle = new StackPane();
        iconCircle.setStyle("-fx-background-color: rgba(255,255,255,0.12); -fx-background-radius: 20px;");
        iconCircle.setPrefSize(38, 38);
        iconCircle.getChildren().add(Icons.createIconNode(iconSvg, 18, "#FFFFFF"));

        Label lbl = new Label(labelText);
        lbl.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 10.5));
        lbl.setTextFill(Color.web("#E2E8F0"));
        lbl.setWrapText(true);
        lbl.setMaxWidth(90);
        lbl.setAlignment(Pos.CENTER);

        box.getChildren().addAll(iconCircle, lbl);
        return box;
    }

    private Pane buildRightFormPanel() {
        BorderPane rightRoot = new BorderPane();
        rightRoot.getStyleClass().add("login-form-container");

        // Top Bar: Language Dropdown
        HBox topBar = new HBox(6);
        topBar.setAlignment(Pos.CENTER_RIGHT);
        topBar.setPadding(new Insets(10, 20, 10, 20));

        HBox langBox = new HBox(6);
        langBox.setAlignment(Pos.CENTER);
        langBox.setStyle("-fx-cursor: hand; -fx-padding: 4 8 4 8;");
        StackPane globeIcon = Icons.createIconNode(Icons.GLOBE, 15, "#475569");
        Label langLabel = new Label("English  ▾");
        langLabel.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12.5));
        langLabel.setTextFill(Color.web("#475569"));
        langBox.getChildren().addAll(globeIcon, langLabel);
        topBar.getChildren().add(langBox);

        rightRoot.setTop(topBar);

        // Center Form
        VBox form = new VBox(15);
        form.setAlignment(Pos.CENTER_LEFT);
        form.setMaxWidth(420);
        form.setPadding(new Insets(0, 20, 20, 20));

        Label heading = new Label("Welcome Back");
        heading.getStyleClass().add("login-header-title");

        Label subtitle = new Label("Sign in to your Smart Traffic Control account to continue.");
        subtitle.getStyleClass().add("login-header-subtitle");
        subtitle.setWrapText(true);

        errorLabel = new Label();
        errorLabel.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 12));
        errorLabel.setTextFill(Color.web("#EF4444"));
        errorLabel.setManaged(false);
        errorLabel.setVisible(false);

        // 1. Email / Username Field
        Label emailLabel = new Label("Email / Username");
        emailLabel.getStyleClass().add("field-label");

        HBox emailBox = new HBox(10);
        emailBox.setAlignment(Pos.CENTER_LEFT);
        emailBox.getStyleClass().add("input-box-container");
        StackPane userIcon = Icons.createIconNode(Icons.USER, 16, "#94A3B8");
        usernameField = new TextField();
        usernameField.setPromptText("Enter your email or username");
        usernameField.getStyleClass().add("custom-text-field");
        HBox.setHgrow(usernameField, Priority.ALWAYS);
        emailBox.getChildren().addAll(userIcon, usernameField);

        // 2. Password Field with Eye Toggle
        Label passLabel = new Label("Password");
        passLabel.getStyleClass().add("field-label");

        HBox passBox = new HBox(10);
        passBox.setAlignment(Pos.CENTER_LEFT);
        passBox.getStyleClass().add("input-box-container");
        StackPane lockIcon = Icons.createIconNode(Icons.LOCK, 16, "#94A3B8");

        passwordField = new PasswordField();
        passwordField.setPromptText("Enter your password");
        passwordField.getStyleClass().add("custom-text-field");
        HBox.setHgrow(passwordField, Priority.ALWAYS);

        plainPasswordField = new TextField();
        plainPasswordField.setPromptText("Enter your password");
        plainPasswordField.getStyleClass().add("custom-text-field");
        plainPasswordField.setManaged(false);
        plainPasswordField.setVisible(false);
        HBox.setHgrow(plainPasswordField, Priority.ALWAYS);

        // Keep text synchronized between passwordField and plainPasswordField
        passwordField.textProperty().addListener((obs, o, n) -> {
            if (!passwordVisible) plainPasswordField.setText(n);
        });
        plainPasswordField.textProperty().addListener((obs, o, n) -> {
            if (passwordVisible) passwordField.setText(n);
        });

        Button toggleEyeBtn = new Button();
        toggleEyeBtn.setStyle("-fx-background-color: transparent; -fx-padding: 0; -fx-cursor: hand;");
        StackPane eyeIcon = Icons.createIconNode(Icons.EYE, 16, "#94A3B8");
        toggleEyeBtn.setGraphic(eyeIcon);

        toggleEyeBtn.setOnAction(e -> {
            passwordVisible = !passwordVisible;
            if (passwordVisible) {
                plainPasswordField.setText(passwordField.getText());
                passwordField.setManaged(false);
                passwordField.setVisible(false);
                plainPasswordField.setManaged(true);
                plainPasswordField.setVisible(true);
                toggleEyeBtn.setGraphic(Icons.createIconNode(Icons.EYE_OFF, 16, "#2563EB"));
            } else {
                passwordField.setText(plainPasswordField.getText());
                plainPasswordField.setManaged(false);
                plainPasswordField.setVisible(false);
                passwordField.setManaged(true);
                passwordField.setVisible(true);
                toggleEyeBtn.setGraphic(Icons.createIconNode(Icons.EYE, 16, "#94A3B8"));
            }
        });

        passBox.getChildren().addAll(lockIcon, passwordField, plainPasswordField, toggleEyeBtn);

        // 3. Remember Me & Forgot Password Row
        HBox rowRemember = new HBox();
        rowRemember.setAlignment(Pos.CENTER_LEFT);
        rememberMeCheck = new CheckBox("Remember me");
        rememberMeCheck.setStyle("-fx-text-fill: #475569; -fx-font-size: 12.5px; -fx-cursor: hand;");

        Region spacerMid = new Region();
        HBox.setHgrow(spacerMid, Priority.ALWAYS);

        Button forgotBtn = new Button("Forgot password?");
        forgotBtn.getStyleClass().add("link-button");
        forgotBtn.setOnAction(e -> {
            Alert alert = new Alert(Alert.AlertType.INFORMATION);
            alert.setTitle("Password Recovery");
            alert.setHeaderText("Smart Traffic Control Portal");
            alert.setContentText("For security credentials recovery, please contact your Traffic Operations Directorate or use registered citizen recovery SMS.");
            alert.showAndWait();
        });

        rowRemember.getChildren().addAll(rememberMeCheck, spacerMid, forgotBtn);

        // 4. Sign In Button
        Button signInBtn = new Button("Sign In");
        signInBtn.getStyleClass().add("btn-primary-navy");
        signInBtn.setMaxWidth(Double.MAX_VALUE);
        StackPane signInIcon = Icons.createIconNode(Icons.SIGN_IN, 16, "#FFFFFF");
        HBox signInBtnGraphic = new HBox(8, signInIcon, new Label("Sign In") {{
            setTextFill(Color.WHITE);
            setFont(Font.font("Segoe UI", FontWeight.BOLD, 14));
        }});
        signInBtnGraphic.setAlignment(Pos.CENTER);
        signInBtn.setGraphic(signInBtnGraphic);
        signInBtn.setText("");

        signInBtn.setOnAction(e -> performLogin());
        passwordField.setOnAction(e -> performLogin());
        plainPasswordField.setOnAction(e -> performLogin());
        usernameField.setOnAction(e -> performLogin());

        // 5. "OR" Divider
        HBox dividerBox = new HBox(12);
        dividerBox.setAlignment(Pos.CENTER);
        Region line1 = new Region();
        line1.getStyleClass().add("divider-line");
        HBox.setHgrow(line1, Priority.ALWAYS);
        Label orLabel = new Label("OR");
        orLabel.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 11));
        orLabel.setTextFill(Color.web("#94A3B8"));
        Region line2 = new Region();
        line2.getStyleClass().add("divider-line");
        HBox.setHgrow(line2, Priority.ALWAYS);
        dividerBox.getChildren().addAll(line1, orLabel, line2);

        // 6. Sign In With Google Button
        Button googleBtn = buildGoogleButton();
        googleBtn.setMaxWidth(Double.MAX_VALUE);
        googleBtn.setOnAction(e -> {
            usernameField.setText("aditya@commuter.org");
            passwordField.setText("user123");
            performLogin();
        });

        // 7. Register Public User Row
        HBox registerRow = new HBox(6);
        registerRow.setAlignment(Pos.CENTER);
        Label noAccountLbl = new Label("Don't have an account?");
        noAccountLbl.setTextFill(Color.web("#64748B"));
        noAccountLbl.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 12.5));

        Button registerBtn = new Button("Register as Public User");
        registerBtn.getStyleClass().add("link-button");
        StackPane userPlusIcon = Icons.createIconNode(Icons.USER_PLUS, 15, "#2563EB");
        HBox regGraphic = new HBox(5, userPlusIcon, new Label("Register as Public User") {{
            setTextFill(Color.web("#2563EB"));
            setFont(Font.font("Segoe UI", FontWeight.BOLD, 12.5));
        }});
        regGraphic.setAlignment(Pos.CENTER);
        registerBtn.setGraphic(regGraphic);
        registerBtn.setText("");
        registerBtn.setOnAction(e -> showRegisterDialog());

        registerRow.getChildren().addAll(noAccountLbl, registerBtn);

        // 8. Demo Quick Fill Chips (For immediate evaluation and effortless testing)
        HBox demoRow = new HBox(8);
        demoRow.setAlignment(Pos.CENTER);
        demoRow.setStyle("-fx-padding: 8 0 0 0;");
        Label demoHint = new Label("Quick Demo Fill:");
        demoHint.setFont(Font.font("Segoe UI", FontWeight.NORMAL, 11));
        demoHint.setTextFill(Color.web("#94A3B8"));

        Button demoAdminBtn = new Button("Admin");
        demoAdminBtn.setStyle("-fx-background-color: #EFF6FF; -fx-text-fill: #1D4ED8; -fx-font-size: 11px; -fx-font-weight: bold; -fx-background-radius: 6px; -fx-cursor: hand; -fx-padding: 4 8 4 8;");
        demoAdminBtn.setOnAction(e -> {
            usernameField.setText("admin");
            passwordField.setText("admin123");
            errorLabel.setVisible(false);
            errorLabel.setManaged(false);
        });

        Button demoUserBtn = new Button("Public Commuter");
        demoUserBtn.setStyle("-fx-background-color: #F1F5F9; -fx-text-fill: #475569; -fx-font-size: 11px; -fx-font-weight: bold; -fx-background-radius: 6px; -fx-cursor: hand; -fx-padding: 4 8 4 8;");
        demoUserBtn.setOnAction(e -> {
            usernameField.setText("user");
            passwordField.setText("user123");
            errorLabel.setVisible(false);
            errorLabel.setManaged(false);
        });

        demoRow.getChildren().addAll(demoHint, demoAdminBtn, demoUserBtn);

        form.getChildren().addAll(
                heading, subtitle, errorLabel,
                emailLabel, emailBox,
                passLabel, passBox,
                rowRemember,
                signInBtn,
                dividerBox,
                googleBtn,
                registerRow,
                demoRow
        );

        StackPane centerWrapper = new StackPane(form);
        centerWrapper.setAlignment(Pos.CENTER);
        rightRoot.setCenter(centerWrapper);

        return rightRoot;
    }

    private Button buildGoogleButton() {
        Button btn = new Button();
        btn.getStyleClass().add("btn-google");

        // Google 'G' icon rendered with vibrant 4-color SVG paths
        SVGPath bluePath = new SVGPath();
        bluePath.setContent("M 22.56 12.25 c 0 -0.78 -0.07 -1.53 -0.2 -2.25 H 12 v 4.26 h 5.92 c -0.26 1.37 -1.04 2.53 -2.21 3.31 v 2.77 h 3.57 c 2.08 -1.92 3.28 -4.74 3.28 -8.09 z");
        bluePath.setFill(Color.web("#4285F4"));

        SVGPath greenPath = new SVGPath();
        greenPath.setContent("M 12 23 c 2.97 0 5.46 -0.98 7.28 -2.66 l -3.57 -2.77 c -0.98 0.66 -2.23 1.06 -3.71 1.06 c -2.86 0 -5.29 -1.93 -6.16 -4.53 H 2.18 v 2.84 C 3.99 20.53 7.7 23 12 23 z");
        greenPath.setFill(Color.web("#34A853"));

        SVGPath yellowPath = new SVGPath();
        yellowPath.setContent("M 5.84 14.09 c -0.22 -0.66 -0.35 -1.36 -0.35 -2.09 s 0.22 -1.43 0.35 -2.09 V 7.06 H 2.18 C 1.43 8.55 1 10.22 1 12 s 0.43 3.45 1.18 4.94 l 2.85 -2.22 c 0.28 -0.63 0.81 -1.25 0.81 -0.63 z");
        yellowPath.setFill(Color.web("#FBBC05"));

        SVGPath redPath = new SVGPath();
        redPath.setContent("M 12 5.38 c 1.62 0 3.06 0.56 4.21 1.64 l 3.15 -3.15 C 17.45 2.09 14.97 1 12 1 C 7.7 1 3.99 3.47 2.18 7.06 l 3.66 2.84 c 0.87 -2.6 3.3 -4.52 6.16 -4.52 z");
        redPath.setFill(Color.web("#EA4335"));

        Pane gPane = new Pane(bluePath, greenPath, yellowPath, redPath);
        gPane.setPrefSize(18, 18);
        gPane.setMaxSize(18, 18);
        gPane.setScaleX(0.75);
        gPane.setScaleY(0.75);

        Label lbl = new Label("Sign in with Google");
        lbl.setFont(Font.font("Segoe UI", FontWeight.SEMI_BOLD, 13));
        lbl.setTextFill(Color.web("#1E293B"));

        HBox content = new HBox(10, gPane, lbl);
        content.setAlignment(Pos.CENTER);
        btn.setGraphic(content);
        btn.setText("");
        return btn;
    }

    private void performLogin() {
        String username = usernameField.getText();
        String password = passwordVisible ? plainPasswordField.getText() : passwordField.getText();

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            showError("Please enter both email/username and password.");
            return;
        }

        Optional<User> userOpt = AuthService.getInstance().authenticate(username, password);
        if (userOpt.isPresent()) {
            errorLabel.setVisible(false);
            errorLabel.setManaged(false);
            onLoginSuccess.accept(userOpt.get());
        } else {
            showError("Invalid credentials. Try 'admin' / 'admin123' or 'user' / 'user123'.");
        }
    }

    private void showError(String msg) {
        errorLabel.setText(msg);
        errorLabel.setManaged(true);
        errorLabel.setVisible(true);
    }

    private void showRegisterDialog() {
        Dialog<Boolean> dialog = new Dialog<>();
        dialog.setTitle("Public User Registration");
        dialog.setHeaderText("Create a Smart Traffic Control Public Account");

        ButtonType registerButtonType = new ButtonType("Register", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(registerButtonType, ButtonType.CANCEL);

        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(20, 150, 10, 10));

        TextField regUser = new TextField();
        regUser.setPromptText("Username (e.g. jsmith)");
        TextField regName = new TextField();
        regName.setPromptText("Full Name");
        TextField regEmail = new TextField();
        regEmail.setPromptText("Email Address");
        PasswordField regPass = new PasswordField();
        regPass.setPromptText("Password");

        grid.add(new Label("Full Name:"), 0, 0);
        grid.add(regName, 1, 0);
        grid.add(new Label("Username:"), 0, 1);
        grid.add(regUser, 1, 1);
        grid.add(new Label("Email:"), 0, 2);
        grid.add(regEmail, 1, 2);
        grid.add(new Label("Password:"), 0, 3);
        grid.add(regPass, 1, 3);

        dialog.getDialogPane().setContent(grid);

        dialog.setResultConverter(dialogButton -> {
            if (dialogButton == registerButtonType) {
                boolean ok = AuthService.getInstance().registerPublicUser(
                        regUser.getText(), regEmail.getText(), regName.getText(), regPass.getText());
                if (ok) {
                    usernameField.setText(regUser.getText());
                    passwordField.setText(regPass.getText());
                    return true;
                }
            }
            return false;
        });

        dialog.showAndWait();
    }
}
