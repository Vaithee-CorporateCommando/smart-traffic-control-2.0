package com.smarttraffic;

import com.smarttraffic.auth.AuthService;
import com.smarttraffic.model.User;
import com.smarttraffic.ui.AdminDashboard;
import com.smarttraffic.ui.LoginView;
import com.smarttraffic.ui.PublicDashboard;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;

import java.io.InputStream;

public class MainApp extends Application {
    private Stage primaryStage;
    private StackPane rootContainer;
    private Scene mainScene;

    @Override
    public void start(Stage primaryStage) {
        this.primaryStage = primaryStage;

        rootContainer = new StackPane();
        mainScene = new Scene(rootContainer, 1240, 800);

        // Load stylesheet
        String cssPath = getClass().getResource("/css/style.css") != null ?
                getClass().getResource("/css/style.css").toExternalForm() : null;
        if (cssPath != null) {
            mainScene.getStylesheets().add(cssPath);
        }

        // Set Application window icon if available
        InputStream iconStream = getClass().getResourceAsStream("/images/login_left_panel.png");
        if (iconStream != null) {
            primaryStage.getIcons().add(new Image(iconStream));
        }

        primaryStage.setTitle("Smart Urban Traffic Control — Urban Congestion Management System");
        primaryStage.setMinWidth(1024);
        primaryStage.setMinHeight(680);
        primaryStage.setScene(mainScene);

        // Show initial login screen
        showLoginScreen();

        primaryStage.show();
    }

    public void showLoginScreen() {
        AuthService.getInstance().logout();
        LoginView loginView = new LoginView(this::handleLoginSuccess);
        rootContainer.getChildren().clear();
        rootContainer.getChildren().add(loginView);
    }

    private void handleLoginSuccess(User user) {
        rootContainer.getChildren().clear();
        if (user.isAdmin()) {
            AdminDashboard adminDash = new AdminDashboard(user, this::showLoginScreen);
            rootContainer.getChildren().add(adminDash);
        } else {
            PublicDashboard publicDash = new PublicDashboard(user, this::showLoginScreen);
            rootContainer.getChildren().add(publicDash);
        }
    }

    public static void main(String[] args) {
        launch(args);
    }
}
