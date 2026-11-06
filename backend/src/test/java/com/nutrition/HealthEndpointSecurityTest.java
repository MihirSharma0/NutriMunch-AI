package com.nutrition;

import com.nutrition.controller.HealthController;
import com.nutrition.security.CustomUserDetailsService;
import com.nutrition.security.JwtUtils;
import com.nutrition.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HealthController.class)
@Import(SecurityConfig.class)
class HealthEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private CustomUserDetailsService userDetailsService;

    @Test
    void healthEndpointIsAccessibleWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/health").with(anonymous()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void otherApiEndpointsStillRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/private").with(anonymous()))
                .andExpect(status().isUnauthorized());
    }
}
