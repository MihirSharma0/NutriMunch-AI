package com.nutrition;

import com.nutrition.controller.DietPlanController;
import com.nutrition.dto.DietPlanDto;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.security.CustomUserDetailsService;
import com.nutrition.security.JwtUtils;
import com.nutrition.security.SecurityConfig;
import com.nutrition.service.DietPlanService;
import com.nutrition.service.NutritionistDietPlanService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** HTTP-level checks for the diet-plan visibility / access-control rules. */
@WebMvcTest(DietPlanController.class)
@Import(SecurityConfig.class)
class DietPlanAccessControlTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private JwtUtils jwtUtils;
    @MockitoBean private CustomUserDetailsService userDetailsService;
    @MockitoBean private DietPlanService dietPlanService;
    @MockitoBean private NutritionistDietPlanService nutritionistDietPlanService;

    private static CustomUserDetails principal(Long id, Role role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        u.setEmail(role.name().toLowerCase() + "@example.com");
        u.setFirstName("Test");
        u.setLastName("Account");
        u.setVerified(true);
        return new CustomUserDetails(u);
    }

    @Test
    void generalPlanEndpointIsNoLongerPublic() throws Exception {
        mockMvc.perform(get("/api/diet-plans/general").with(anonymous()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void nutritionistsCannotBrowseGeneralPlans() throws Exception {
        mockMvc.perform(get("/api/diet-plans/general").with(user(principal(20L, Role.NUTRITIONIST))))
                .andExpect(status().isForbidden());
        verify(nutritionistDietPlanService, never()).latestGeneral(anyLong(), any());
    }

    @Test
    void clientCanBrowseGeneralPlans() throws Exception {
        when(nutritionistDietPlanService.latestGeneral(10L, Role.USER))
                .thenReturn(Map.of("id", "g1", "scope", "GENERAL"));

        mockMvc.perform(get("/api/diet-plans/general").with(user(principal(10L, Role.USER))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("GENERAL"));
    }

    @Test
    void publishedListIsResolvedFromTheSessionPrincipal() throws Exception {
        when(nutritionistDietPlanService.visiblePlans(10L, Role.USER))
                .thenReturn(List.of(Map.of("id", "g1", "scope", "GENERAL")));

        mockMvc.perform(get("/api/diet-plans/published").with(user(principal(10L, Role.USER))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("g1"));

        verify(nutritionistDietPlanService).visiblePlans(10L, Role.USER);
    }

    @Test
    void onlyAdminsCanListAllPersonalPlans() throws Exception {
        mockMvc.perform(get("/api/diet-plans/all").with(user(principal(10L, Role.USER))))
                .andExpect(status().isForbidden());

        when(dietPlanService.getAllDietPlans()).thenReturn(List.of(new DietPlanDto()));
        mockMvc.perform(get("/api/diet-plans/all").with(user(principal(99L, Role.ADMIN))))
                .andExpect(status().isOk());
    }

    @Test
    void deployDelegatesAuthorAndRoleToTheServerPolicy() throws Exception {
        when(nutritionistDietPlanService.deploy(eq(10L), eq(Role.USER), anyMap()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Only nutritionists can publish diet plans"));

        mockMvc.perform(post("/api/diet-plans/deploy")
                        .with(user(principal(10L, Role.USER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"plan_x\",\"title\":\"X\",\"scope\":\"GENERAL\"}"))
                .andExpect(status().isForbidden());

        verify(nutritionistDietPlanService).deploy(eq(10L), eq(Role.USER), anyMap());
    }

    @Test
    void deleteIsRestrictedToTheAuthorByTheServerPolicy() throws Exception {
        when(nutritionistDietPlanService.deletePublished(eq("plan_x"), eq(21L), eq(Role.NUTRITIONIST)))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Only the nutritionist who created this plan can delete it"));

        mockMvc.perform(delete("/api/diet-plans/plan_x")
                        .with(user(principal(21L, Role.NUTRITIONIST))))
                .andExpect(status().isForbidden());

        verify(nutritionistDietPlanService).deletePublished("plan_x", 21L, Role.NUTRITIONIST);
    }
}
