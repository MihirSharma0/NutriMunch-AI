package com.nutrition.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/**
 * JSON Web Token (JWT) Utilities.
 * Handles token generation, signature validation, claims extraction, and cryptographic signing.
 */
@Component
public class JwtUtils {

    @Value("${app.jwt.secret:defaultSecretKeyWithAtLeast256BitsForHS256Algorithm1234567890}")
    private String jwtSecret;

    @Value("${app.jwt.expirationMs:86400000}")
    private int jwtExpirationMs;

    /**
     * Derives HMAC SHA cryptographic signing key from the configured secret key.
     *
     * @return cryptographic Key instance
     */
    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    /**
     * Generates a signed JWT token containing subject, role, and ID claims from an Authentication principal.
     *
     * @param authentication current user authentication principal
     * @return compact URL-safe JWT string
     */
    public String generateJwtToken(Authentication authentication) {
        CustomUserDetails userPrincipal = (CustomUserDetails) authentication.getPrincipal();

        return Jwts.builder()
                .setSubject((userPrincipal.getUsername()))
                .claim("role", userPrincipal.getAuthorities().iterator().next().getAuthority())
                .claim("id", userPrincipal.getId())
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Generates a signed JWT token directly from user identity details (username, role, and ID).
     *
     * @param username user email/username
     * @param role user domain role string
     * @param id user database primary key ID
     * @return compact URL-safe JWT string
     */
    public String generateTokenFromUsername(String username, String role, Long id) {
        return Jwts.builder()
                .setSubject(username)
                .claim("role", role.startsWith("ROLE_") ? role : "ROLE_" + role)
                .claim("id", id)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Extracts username subject from a signed JWT string.
     *
     * @param token signed JWT string
     * @return username subject claim
     */
    public String getUserNameFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(token).getBody().getSubject();
    }

    /**
     * Validates cryptographic signature and expiration of a JWT string.
     *
     * @param authToken raw JWT token string
     * @return true if valid; false otherwise
     */
    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // log error
        }
        return false;
    }
}
