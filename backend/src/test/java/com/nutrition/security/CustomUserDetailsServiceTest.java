package com.nutrition.security;

import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomUserDetailsService userDetailsService;

    @Test
    void loadsUserByIdAfterEmailHasChanged() {
        User user = new User();
        user.setId(42L);
        user.setEmail("updated-admin@example.com");
        user.setRole(Role.ADMIN);
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));

        UserDetails userDetails = userDetailsService.loadUserById(42L);

        assertThat(userDetails.getUsername()).isEqualTo("updated-admin@example.com");
        assertThat(userDetails.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_ADMIN");
    }

    @Test
    void rejectsUnknownUserId() {
        when(userRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserById(404L))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void fallsBackToSignedEmailWhenDatabaseIdChanged() {
        User user = new User();
        user.setId(106L);
        user.setEmail("admin@gmail.com");
        user.setRole(Role.ADMIN);
        when(userRepository.findById(42L)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("admin@gmail.com")).thenReturn(Optional.of(user));

        UserDetails userDetails = userDetailsService.loadUserByTokenIdentity(42L, "admin@gmail.com");

        assertThat(userDetails.getUsername()).isEqualTo("admin@gmail.com");
        assertThat(userDetails.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_ADMIN");
    }
}
