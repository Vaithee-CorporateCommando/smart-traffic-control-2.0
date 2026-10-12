package com.smarttraffic.auth;

import com.smarttraffic.model.User;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class AuthService {
    private static AuthService instance;

    private final Map<String, UserRecord> userStore = new HashMap<>();
    private User currentUser;

    private static class UserRecord {
        final User user;
        final String password;

        UserRecord(User user, String password) {
            this.user = user;
            this.password = password;
        }
    }

    private AuthService() {
        // Initialize default administrator accounts
        seedUser(new User("admin", "System Administrator", "admin@traffic.gov",
                User.Role.ADMINISTRATOR, "City Traffic Control Directorate"), "admin123");
        seedUser(new User("officer", "Officer Priya Nair", "officer@traffic.gov",
                User.Role.ADMINISTRATOR, "Central Signal Operations Division"), "officer123");

        // Initialize default public commuter accounts
        seedUser(new User("user", "Aditya Sharma", "aditya@commuter.org",
                User.Role.PUBLIC, "Daily Commuter"), "user123");
        seedUser(new User("citizen", "Ananya Sen", "ananya@citizen.org",
                User.Role.PUBLIC, "Urban Transit User"), "citizen123");
    }

    public static synchronized AuthService getInstance() {
        if (instance == null) {
            instance = new AuthService();
        }
        return instance;
    }

    private void seedUser(User user, String password) {
        userStore.put(user.getUsername().toLowerCase(), new UserRecord(user, password));
        userStore.put(user.getEmail().toLowerCase(), new UserRecord(user, password));
    }

    public Optional<User> authenticate(String usernameOrEmail, String password) {
        if (usernameOrEmail == null || password == null) {
            return Optional.empty();
        }
        String key = usernameOrEmail.trim().toLowerCase();
        UserRecord record = userStore.get(key);
        if (record != null && record.password.equals(password)) {
            this.currentUser = record.user;
            return Optional.of(record.user);
        }
        return Optional.empty();
    }

    public boolean registerPublicUser(String username, String email, String fullName, String password) {
        if (username == null || username.isBlank() || email == null || email.isBlank() || password == null || password.isBlank()) {
            return false;
        }
        String uKey = username.trim().toLowerCase();
        String eKey = email.trim().toLowerCase();
        if (userStore.containsKey(uKey) || userStore.containsKey(eKey)) {
            return false;
        }
        User newUser = new User(username.trim(), fullName.trim(), email.trim(), User.Role.PUBLIC, "Registered Citizen");
        seedUser(newUser, password);
        return true;
    }

    public User getCurrentUser() {
        return currentUser;
    }

    public void setCurrentUser(User user) {
        this.currentUser = user;
    }

    public void logout() {
        this.currentUser = null;
    }

    public boolean isAuthenticated() {
        return currentUser != null;
    }
}
