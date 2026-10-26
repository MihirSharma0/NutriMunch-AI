package com.nutrition.security;

import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.*;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    @Override public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null) header = accessor.getFirstNativeHeader("authorization");
            if (header == null || !header.startsWith("Bearer ")) throw new IllegalArgumentException("Authentication required");
            String token = header.substring(7);
            if (!jwtUtils.validateJwtToken(token)) throw new IllegalArgumentException("Invalid authentication");
            Optional<com.nutrition.entity.User> user = userRepository.findByEmail(jwtUtils.getUserNameFromJwtToken(token));
            if (user.isEmpty()) throw new IllegalArgumentException("Invalid authentication");
            accessor.setUser(new UsernamePasswordAuthenticationToken(new CustomUserDetails(user.get()), null,
                    new CustomUserDetails(user.get()).getAuthorities()));
        }
        return message;
    }
}
