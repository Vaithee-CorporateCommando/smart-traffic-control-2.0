package com.smarttraffic.model;

public class User {
    public enum Role {
        PUBLIC,
        ADMINISTRATOR
    }

    private final String username;
    private final String fullName;
    private final String email;
    private final Role role;
    private final String department;

    public User(String username, String fullName, String email, Role role, String department) {
        this.username = username;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
        this.department = department;
    }

    public String getUsername() { return username; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public Role getRole() { return role; }
    public String getDepartment() { return department; }
    public boolean isAdmin() { return role == Role.ADMINISTRATOR; }
}
