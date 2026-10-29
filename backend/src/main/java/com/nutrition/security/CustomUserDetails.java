package com.nutrition.security;

import com.nutrition.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

/**
 * Spring Security UserDetails Implementation.
 * Wraps the domain User entity to provide authentication credentials and role-based authorities.
 */
public class CustomUserDetails implements UserDetails {
    private final User user;

    /**
     * Constructs a CustomUserDetails wrapper around a User entity.
     *
     * @param user the domain User entity
     */
    public CustomUserDetails(User user) {
        this.user = user;
    }

    /**
     * Returns granted authorities based on the user's assigned role.
     *
     * @return collection of granted authorities
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    /**
     * Retrieves the stored password hash.
     *
     * @return bcrypt-hashed password string
     */
    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    /**
     * Retrieves the username identifier (email address).
     *
     * @return user email
     */
    @Override
    public String getUsername() {
        return user.getEmail();
    }

    /**
     * Indicates whether the user's account has expired.
     *
     * @return true (account does not expire)
     */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /**
     * Indicates whether the user is locked or unlocked.
     *
     * @return true (account is unlocked)
     */
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    /**
     * Indicates whether the user's credentials (password) have expired.
     *
     * @return true (credentials do not expire)
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    /**
     * Indicates whether the user account is enabled (based on email verification).
     *
     * @return true if verified
     */
    @Override
    public boolean isEnabled() {
        return user.isVerified();
    }

    /**
     * Retrieves the database primary key ID of the authenticated user.
     *
     * @return user ID
     */
    public Long getId() {
        return user.getId();
    }

    /**
     * Exposes the underlying domain User entity.
     *
     * @return domain User entity
     */
    public User getUser() {
        return user;
    }

    /**
     * Retrieves the assigned domain role for the authenticated user.
     *
     * @return user domain role
     */
    public com.nutrition.entity.Role getRole() {
        return user.getRole();
    }
}
