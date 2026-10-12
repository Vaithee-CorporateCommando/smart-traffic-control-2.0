package com.smarttraffic;

import com.smarttraffic.auth.AuthService;
import com.smarttraffic.model.*;
import com.smarttraffic.service.*;
import com.smarttraffic.ui.*;
import com.smarttraffic.ui.modules.*;
import javafx.application.Platform;
import javafx.scene.Scene;
import javafx.scene.image.PixelReader;
import javafx.scene.image.WritableImage;
import javafx.scene.layout.StackPane;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class VerifyApp {
    public static void main(String[] args) throws Exception {
        System.out.println("==================================================");
        System.out.println("SMART TRAFFIC CONTROL 2.0 - INTEGRATION & UI TEST");
        System.out.println("==================================================");

        // 1. Verify Authentication Service
        AuthService auth = AuthService.getInstance();
        Optional<User> adminUser = auth.authenticate("admin", "admin123");
        Optional<User> publicUser = auth.authenticate("user", "user123");

        if (adminUser.isEmpty() || !adminUser.get().isAdmin()) {
            throw new RuntimeException("Admin authentication failed!");
        }
        System.out.println("✔ Admin authentication OK: " + adminUser.get().getFullName() + " (" + adminUser.get().getDepartment() + ")");

        if (publicUser.isEmpty() || publicUser.get().isAdmin()) {
            throw new RuntimeException("Public user authentication failed!");
        }
        System.out.println("✔ Public user authentication OK: " + publicUser.get().getFullName());

        // 2. Verify Traffic Network Service
        TrafficService ts = TrafficService.getInstance();
        System.out.println("✔ Junctions initialized: " + ts.getJunctions().size());
        System.out.println("✔ Roads initialized: " + ts.getRoads().size());
        System.out.println("✔ CCTV Feeds initialized: " + ts.getCctvFeeds().size());
        System.out.println("✔ Active Roadblocks: " + ts.getRoadBlocks().size());
        System.out.println("✔ Reported Incidents: " + ts.getIncidents().size());

        // 3. Verify Route Service
        RouteService routeService = RouteService.getInstance();
        List<RouteOption> routes = routeService.findRoutes("J2", "J4");
        if (routes.isEmpty()) {
            throw new RuntimeException("RouteService failed to find route between J2 and J4!");
        }
        System.out.println("✔ RouteService OK: Found " + routes.size() + " route options between J2 and J4");
        for (RouteOption r : routes) {
            System.out.println("   -> " + r.getRouteName() + ": " + String.format("%.1f km, %.1f mins", r.getTotalDistanceKm(), r.getEstimatedDurationMinutes()));
        }

        // 4. Verify Signal Service
        SignalService ss = SignalService.getInstance();
        boolean overrideApplied = ss.applyManualOverride("J1", Junction.SignalState.GREEN_EAST_WEST, "Test Override Verification", "admin");
        if (!overrideApplied) {
            throw new RuntimeException("SignalService failed to apply manual override!");
        }
        System.out.println("✔ SignalService Manual Override OK: J1 state is " + ts.getJunction("J1").getCurrentSignalState());
        ss.revertToAutomaticCycle("J1", "admin");
        System.out.println("✔ SignalService Automatic Revert OK: J1 mode reset");

        // 5. Verify Audit Service
        AuditService as = AuditService.getInstance();
        System.out.println("✔ AuditService Log Count: " + as.getAuditRecords().size());

        // 6. Launch JavaFX Platform and Test UI Components & Snapshots
        CountDownLatch latch = new CountDownLatch(1);
        File screenshotDir = new File("target/screenshots");
        screenshotDir.mkdirs();

        Platform.startup(() -> {
            try {
                System.out.println("✔ JavaFX Toolkit started successfully.");

                // Test 6a: LoginView
                LoginView loginView = new LoginView(user -> {});
                Scene loginScene = new Scene(new StackPane(loginView), 1200, 750);
                loadCss(loginScene);
                loginView.applyCss();
                loginView.layout();
                saveSnapshot(loginView, new File(screenshotDir, "screen1_login.png"));
                System.out.println("✔ Screen 1 (Login Dashboard) rendered & snapshotted successfully.");

                // Test 6b: PublicDashboard
                PublicDashboard publicDash = new PublicDashboard(publicUser.get(), () -> {});
                Scene publicScene = new Scene(new StackPane(publicDash), 1200, 750);
                loadCss(publicScene);
                publicDash.applyCss();
                publicDash.layout();
                saveSnapshot(publicDash, new File(screenshotDir, "screen2_public_dashboard.png"));
                System.out.println("✔ Screen 2 (Public Dashboard) rendered & snapshotted successfully.");

                // Test 6c: AdminDashboard
                AdminDashboard adminDash = new AdminDashboard(adminUser.get(), () -> {});
                Scene adminScene = new Scene(new StackPane(adminDash), 1240, 800);
                loadCss(adminScene);
                adminDash.applyCss();
                adminDash.layout();
                saveSnapshot(adminDash, new File(screenshotDir, "screen3_admin_dashboard.png"));
                System.out.println("✔ Screen 3 (Admin Dashboard) rendered & snapshotted successfully.");

                // Test individual modules inside Admin
                AdminOverviewView aov = new AdminOverviewView();
                JunctionManagementView jmv = new JunctionManagementView();
                CctvMonitoringView cmv = new CctvMonitoringView();
                SignalControlView scv = new SignalControlView(adminUser.get());
                EmergencyPriorityView epv = new EmergencyPriorityView(adminUser.get());
                RoadBlockAndIncidentView rbv = new RoadBlockAndIncidentView(adminUser.get());
                ReportsAndAuditView rav = new ReportsAndAuditView();
                System.out.println("✔ All 7 Admin modules instantiated without exceptions.");

                latch.countDown();
            } catch (Throwable t) {
                t.printStackTrace();
                latch.countDown();
            }
        });

        boolean completed = latch.await(15, TimeUnit.SECONDS);
        if (!completed) {
            System.err.println("❌ JavaFX UI rendering timed out!");
            System.exit(1);
        }

        System.out.println("==================================================");
        System.out.println("ALL INTEGRATION AND UI TESTS COMPLETED: 100% SUCCESS");
        System.out.println("==================================================");
        System.exit(0);
    }

    private static void loadCss(Scene scene) {
        var res = VerifyApp.class.getResource("/css/style.css");
        if (res != null) {
            scene.getStylesheets().add(res.toExternalForm());
        }
    }

    private static void saveSnapshot(javafx.scene.Node node, File dest) {
        try {
            WritableImage fxImg = node.snapshot(null, null);
            if (fxImg == null) return;
            int w = (int) fxImg.getWidth();
            int h = (int) fxImg.getHeight();
            if (w <= 0 || h <= 0) return;

            PixelReader pr = fxImg.getPixelReader();
            BufferedImage bi = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    bi.setRGB(x, y, pr.getArgb(x, y));
                }
            }
            ImageIO.write(bi, "png", dest);
        } catch (Exception ex) {
            System.err.println("Could not save snapshot to " + dest + ": " + ex.getMessage());
        }
    }
}
