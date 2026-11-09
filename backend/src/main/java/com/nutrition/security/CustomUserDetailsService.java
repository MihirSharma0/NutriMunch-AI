package com.nutrition.security;

import com.nutrition.entity.User;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Spring Security UserDetailsService Implementation.
 * Loads user records by email from the UserRepository for authentication filters.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Locates the user based on email username string.
     *
     * @param username the user email identifying the user whose data is required
     * @return a fully populated UserDetails object
     * @throws UsernameNotFoundException if the user could not be found
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));
        return new CustomUserDetails(user);
    }

    /**
     * Loads a user by the immutable database ID stored in a signed JWT.
     *
     * @param id database user ID
     * @return authenticated user details
     * @throws UsernameNotFoundException if the ID no longer exists
     */
    public UserDetails loadUserById(Long id) throws UsernameNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with ID: " + id));
        return new CustomUserDetails(user);
    }

    /**
     * Resolves a JWT identity by its stable ID, falling back to its signed email
     * subject when a database reset or account recreation changed that ID.
     *
     * @param id database user ID claim, if present
     * @param username signed JWT subject
     * @return authenticated user details
     * @throws UsernameNotFoundException if neither identity resolves
     */
    public UserDetails loadUserByTokenIdentity(Long id, String username) throws UsernameNotFoundException {
        if (id != null) {
            User user = userRepository.findById(id).orElse(null);
            if (user != null) {
                return new CustomUserDetails(user);
            }
        }
        return loadUserByUsername(username);
    }
}
