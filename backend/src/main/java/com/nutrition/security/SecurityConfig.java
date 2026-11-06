package com.nutrition.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpStatus;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Spring Security Architecture Configuration.
 * Configures stateless session management, CORS policies, endpoint authorizations,
 * BCrypt password hashing, and JWT filter registration.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    /**
     * Comma separated list of browser origins allowed to call this API, taken from the
     * existing {@code app.frontend.origin} property (env var {@code FRONTEND_ORIGIN}).
     * The default is the deployed Vercel frontend plus the usual local dev ports, so
     * behaviour is unchanged for the live site and for local development.
     */
    @Value("${app.frontend.origin:https://nutrimunch-ai.vercel.app,http://localhost:5173,http://localhost:5174}")
    private String frontendOrigin;

    /**
     * Configures HTTP security filter chain, endpoint access permissions, and session policy.
     *
     * @param http HttpSecurity configuration builder
     * @return built SecurityFilterChain
     * @throws Exception in case of security configuration errors
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/v1/health").permitAll()
                        .requestMatchers("/api/testimonials/**").permitAll()
                        // Nutritionist plans are private to signed-in accounts: role checks live in
                        // DietPlanController / NutritionistDietPlanService. Dead public matchers removed.
                        .requestMatchers("/api/diet-plans/all").hasRole("ADMIN")
                        .requestMatchers("/api/recipes/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Provides BCrypt password hashing bean for credentials storage and comparison.
     *
     * @return BCryptPasswordEncoder instance
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Exposes AuthenticationManager bean from authentication configuration.
     *
     * @param authenticationConfiguration Spring authentication configuration
     * @return AuthenticationManager instance
     * @throws Exception if configuration retrieval fails
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    /**
     * Configures permissive CORS source for local development and production client origins.
     *
     * @return CorsConfigurationSource instance
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(resolveAllowedOriginPatterns());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setExposedHeaders(Arrays.asList("Access-Control-Allow-Origin", "Access-Control-Allow-Credentials", "Authorization"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Builds the list of origin patterns permitted to call this API.
     *
     * <p>Previously every origin was accepted, which let any website drive the API from a
     * visitor's browser. The configured origins replace that wildcard. Local development is
     * always allowed on any port so a locally served frontend can reach the deployed backend
     * (and vice versa) without editing production configuration. Spring treats the port
     * wildcard {@code [*]} and host wildcard {@code *} as patterns, so these are matched
     * rather than compared literally.
     *
     * @return origin patterns accepted for cross-origin requests
     */
    private List<String> resolveAllowedOriginPatterns() {
        List<String> patterns = new ArrayList<>();
        if (frontendOrigin != null) {
            for (String origin : frontendOrigin.split(",")) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty()) {
                    patterns.add(trimmed);
                }
            }
        }
        patterns.add("http://localhost:[*]");
        patterns.add("http://127.0.0.1:[*]");
        log.info("CORS allowed origin patterns: {}", patterns);
        return patterns;
    }
}
