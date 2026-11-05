package com.nutrition.exception;

/**
 * Exception thrown when a user registration or OAuth callback requires explicit role selection.
 */
public class RoleRequiredException extends RuntimeException {
    private final String firstName;
    private final String lastName;

    /**
     * Constructs a RoleRequiredException with a descriptive error message.
     *
     * @param message reason explaining why role selection is required
     */
    public RoleRequiredException(String message, String firstName, String lastName) {
        super(message);
        this.firstName = firstName;
        this.lastName = lastName;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }
}
