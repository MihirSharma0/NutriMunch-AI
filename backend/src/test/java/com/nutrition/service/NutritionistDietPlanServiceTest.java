package com.nutrition.service;

import com.nutrition.entity.NutritionistDietPlan;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.NutritionistDietPlanRepository;
import com.nutrition.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Verifies the ownership / visibility / notification rules for nutritionist-created
 * diet plans. Pure Mockito — no Spring context, no database, no Flyway migration.
 */
@ExtendWith(MockitoExtension.class)
class NutritionistDietPlanServiceTest {

    @Mock private NutritionistDietPlanRepository planRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    private final ObjectMapper mapper = new ObjectMapper();
    private NutritionistDietPlanService service;

    private static final Long CLIENT_A = 10L;
    private static final Long CLIENT_B = 11L;
    private static final Long NUTRITIONIST = 20L;
    private static final Long OTHER_NUTRITIONIST = 21L;

    @BeforeEach
    void setUp() {
        service = new NutritionistDietPlanService(
                planRepository, userRepository, notificationService, mapper);
    }

    private static User user(Long id, Role role, String email) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        u.setEmail(email);
        u.setFirstName("Test");
        u.setLastName(role.name());
        return u;
    }

    private static NutritionistDietPlan plan(String key, String scope, User author, User target) {
        NutritionistDietPlan p = new NutritionistDietPlan();
        p.setId(1L);
        p.setPlanKey(key);
        p.setScope(scope);
        p.setNutritionist(author);
        p.setTargetUser(target);
        p.setTitle("Protocol " + key);
        p.setDeleted(false);
        p.setPayloadJson("{\"id\":\"" + key + "\",\"title\":\"Protocol " + key
                + "\",\"scope\":\"" + scope + "\",\"calories\":2100}");
        return p;
    }

    private static Map<String, Object> payload(String scope) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("id", "plan_test");
        p.put("title", "Metabolic Protocol");
        p.put("scope", scope);
        p.put("targetMode", scope);
        p.put("calories", 2100);
        p.put("meals", List.of(Map.of("name", "Oats")));
        return p;
    }

    // ---- visibility -------------------------------------------------------

    @Test
    void clientVisibilityIsResolvedByTheDatabaseQuery() {
        when(planRepository.findVisibleForUser(CLIENT_A)).thenReturn(List.of(
                plan("g1", "GENERAL", user(NUTRITIONIST, Role.NUTRITIONIST, "n@x.com"), null)));

        List<Map<String, Object>> result = service.visiblePlans(CLIENT_A, Role.USER);

        assertEquals(1, result.size());
        assertEquals("GENERAL", result.get(0).get("scope"));
        verify(planRepository).findVisibleForUser(CLIENT_A);
        verify(planRepository, never()).findByDeletedFalseOrderByCreatedAtDesc();
    }

    @Test
    void nutritionistSeesOnlyTheirOwnPlans() {
        when(planRepository.findByDeletedFalseAndNutritionistIdOrderByCreatedAtDesc(NUTRITIONIST))
                .thenReturn(List.of(plan("g1", "GENERAL", user(NUTRITIONIST, Role.NUTRITIONIST, "n@x.com"), null)));

        List<Map<String, Object>> result = service.visiblePlans(NUTRITIONIST, Role.NUTRITIONIST);

        assertEquals(1, result.size());
        verify(planRepository).findByDeletedFalseAndNutritionistIdOrderByCreatedAtDesc(NUTRITIONIST);
        verify(planRepository, never()).findVisibleForUser(anyLong());
        verify(planRepository, never()).findByDeletedFalseOrderByCreatedAtDesc();
    }

    @Test
    void adminSeesAllPlans() {
        when(planRepository.findByDeletedFalseOrderByCreatedAtDesc()).thenReturn(List.of());
        service.visiblePlans(99L, Role.ADMIN);
        verify(planRepository).findByDeletedFalseOrderByCreatedAtDesc();
    }

    @Test
    void generalPlanPayloadNeverCarriesTargetClientDetails() {
        // simulate a stored payload that still contains client hints
        NutritionistDietPlan p = plan("g1", "GENERAL", user(NUTRITIONIST, Role.NUTRITIONIST, "n@x.com"), null);
        p.setPayloadJson("{\"id\":\"g1\",\"title\":\"P\",\"targetUserId\":\"11\",\"targetUserEmail\":\"b@x.com\",\"isExclusiveForUser\":true}");
        when(planRepository.findVisibleForUser(CLIENT_A)).thenReturn(List.of(p));

        Map<String, Object> out = service.visiblePlans(CLIENT_A, Role.USER).get(0);

        assertFalse(out.containsKey("targetUserId"));
        assertFalse(out.containsKey("targetUserEmail"));
        assertFalse(out.containsKey("isExclusiveForUser"));
    }

    @Test
    void nutritionistsCannotUseTheGeneralPlanEndpoint() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.latestGeneral(NUTRITIONIST, Role.NUTRITIONIST));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    // ---- deploy -----------------------------------------------------------

    @Test
    void generalDeployCreatesNoNotificationAndTrustsOnlyTheSessionAuthor() throws Exception {
        User author = user(NUTRITIONIST, Role.NUTRITIONIST, "n@x.com");
        when(userRepository.findById(NUTRITIONIST)).thenReturn(Optional.of(author));
        when(planRepository.findByPlanKey("plan_test")).thenReturn(Optional.empty());

        Map<String, Object> body = payload("GENERAL");
        body.put("nutritionistId", 999L);          // spoofed
        body.put("isExclusiveForUser", true);      // forgeable visibility hint
        body.put("targetUserId", String.valueOf(CLIENT_A));

        Map<String, Object> out = service.deploy(NUTRITIONIST, Role.NUTRITIONIST, body);

        ArgumentCaptor<NutritionistDietPlan> saved = ArgumentCaptor.forClass(NutritionistDietPlan.class);
        verify(planRepository).save(saved.capture());
        NutritionistDietPlan entity = saved.getValue();
        assertEquals(NUTRITIONIST, entity.getNutritionist().getId());
        assertEquals("GENERAL", entity.getScope());
        assertNull(entity.getTargetUser());
        assertFalse(entity.isDeleted());

        Map<String, Object> stored = mapper.readValue(entity.getPayloadJson(),
                new TypeReference<LinkedHashMap<String, Object>>() {});
        assertEquals(NUTRITIONIST, ((Number) stored.get("nutritionistId")).longValue());
        assertFalse(stored.containsKey("isExclusiveForUser"));
        assertFalse(stored.containsKey("targetUserId"));
        assertEquals("GENERAL", out.get("scope"));

        verify(notificationService, never()).notifyUser(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void exclusiveDeployNotifiesOnlyTheAssignedClient() {
        User author = user(NUTRITIONIST, Role.NUTRITIONIST, "n@x.com");
        User target = user(CLIENT_A, Role.USER, "a@x.com");
        when(userRepository.findById(NUTRITIONIST)).thenReturn(Optional.of(author));
        when(userRepository.findById(CLIENT_A)).thenReturn(Optional.of(target));
        when(planRepository.findByPlanKey("plan_test")).thenReturn(Optional.empty());

        Map<String, Object> body = payload("EXCLUSIVE");
        body.put("targetUserId", String.valueOf(CLIENT_A));
        body.put("targetUserEmail", "a@x.com");

        service.deploy(NUTRITIONIST, Role.NUTRITIONIST, body);

        ArgumentCaptor<NutritionistDietPlan> saved = ArgumentCaptor.forClass(NutritionistDietPlan.class);
        verify(planRepository).save(saved.capture());
        assertEquals(CLIENT_A, saved.getValue().getTargetUser().getId());

        ArgumentCaptor<User> recipient = ArgumentCaptor.forClass(User.class);
        ArgumentCaptor<String> type = ArgumentCaptor.forClass(String.class);
        verify(notificationService, times(1)).notifyUser(
                recipient.capture(), eq(NUTRITIONIST), anyString(), anyString(),
                type.capture(), anyString(), eq("/diet-plans"));
        assertEquals(CLIENT_A, recipient.getValue().getId());
        assertEquals("EXCLUSIVE_PLAN", type.getValue());
    }

    @Test
    void exclusiveDeployWithoutAValidClientIsRejected() {
        User author = user(NUTRITIONIST, Role.NUTRITIONIST, "n@x.com");
        when(userRepository.findById(NUTRITIONIST)).thenReturn(Optional.of(author));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.deploy(NUTRITIONIST, Role.NUTRITIONIST, payload("EXCLUSIVE")));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(planRepository, never()).save(any());
        verify(notificationService, never()).notifyUser(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void clientsCannotPublishPlans() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.deploy(CLIENT_A, Role.USER, payload("GENERAL")));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(planRepository, never()).save(any());
    }

    @Test
    void nutritionistCannotReplaceAnotherNutritionistsPlan() {
        when(userRepository.findById(OTHER_NUTRITIONIST))
                .thenReturn(Optional.of(user(OTHER_NUTRITIONIST, Role.NUTRITIONIST, "o@x.com")));
        NutritionistDietPlan existing = plan("plan_test", "GENERAL",
                user(NUTRITIONIST, Role.NUTRITIONIST, "n@x.com"), null);
        when(planRepository.findByPlanKey("plan_test")).thenReturn(Optional.of(existing));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.deploy(OTHER_NUTRITIONIST, Role.NUTRITIONIST, payload("GENERAL")));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(planRepository, never()).save(any());
    }

    // ---- deletion ---------------------------------------------------------

    @Test
    void onlyTheAuthorOrAnAdminCanDeleteAPublishedPlan() {
        NutritionistDietPlan owned = plan("plan_test", "GENERAL",
                user(NUTRITIONIST, Role.NUTRITIONIST, "n@x.com"), null);
        when(planRepository.findByPlanKeyAndDeletedFalse("plan_test")).thenReturn(Optional.of(owned));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.deletePublished("plan_test", OTHER_NUTRITIONIST, Role.NUTRITIONIST));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertFalse(owned.isDeleted());

        assertTrue(service.deletePublished("plan_test", NUTRITIONIST, Role.NUTRITIONIST));
        assertTrue(owned.isDeleted());
        verify(planRepository, times(1)).save(owned);
    }

    @Test
    void deletingAPublishedPlanNeverNotifiesAnyone() {
        NutritionistDietPlan owned = plan("plan_test", "EXCLUSIVE",
                user(NUTRITIONIST, Role.NUTRITIONIST, "n@x.com"),
                user(CLIENT_A, Role.USER, "a@x.com"));
        when(planRepository.findByPlanKeyAndDeletedFalse("plan_test")).thenReturn(Optional.of(owned));

        service.deletePublished("plan_test", NUTRITIONIST, Role.NUTRITIONIST);

        verify(notificationService, never()).notifyUser(any(), any(), any(), any(), any(), any(), any());
    }
}
