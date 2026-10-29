package com.nutrition.exception;

/**
 * Exception thrown when a user registration or OAuth callback requires explicit role selection.
 */
public class RoleRequiredException extends RuntimeException {

    /**
     * Constructs a RoleRequiredException with a descriptive error message.
     *
     * @param message reason explaining why role selection is required
     */
    public RoleRequiredException(String message) {
        super(message);
    }
}
