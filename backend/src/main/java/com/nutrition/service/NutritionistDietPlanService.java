package com.nutrition.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nutrition.entity.NutritionistDietPlan;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.NutritionistDietPlanRepository;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Ownership, visibility and notification rules for nutritionist-created diet plans.
 *
 * One policy function ({@link #visiblePlans}) feeds the client library, the
 * nutritionist's own dashboard and the admin audit view, so the same plan can
 * never be visible to one role and hidden from another by accident.
 */
@Service
@RequiredArgsConstructor
public class NutritionistDietPlanService {

    public static final String SCOPE_GENERAL = "GENERAL";
    public static final String SCOPE_EXCLUSIVE = "EXCLUSIVE";

    private final NutritionistDietPlanRepository planRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    /**
     * Plans this signed-in account may see:
     * USER -> all GENERAL + EXCLUSIVE addressed to them;
     * NUTRITIONIST -> only plans they authored (both categories);
     * ADMIN -> all (audit).
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> visiblePlans(Long principalId, Role role) {
        if (principalId == null || role == null) return List.of();
        List<NutritionistDietPlan> plans;
        if (role == Role.USER) {
            plans = planRepository.findVisibleForUser(principalId);
        } else if (role == Role.NUTRITIONIST) {
            plans = planRepository.findByDeletedFalseAndNutritionistIdOrderByCreatedAtDesc(principalId);
        } else {
            plans = planRepository.findByDeletedFalseOrderByCreatedAtDesc();
        }
        return plans.stream().map(this::toPayload).collect(Collectors.toList());
    }

    /** First GENERAL plan for the client browsing page. Nutritionists are not allowed here. */
    @Transactional(readOnly = true)
    public Map<String, Object> latestGeneral(Long principalId, Role role) {
        if (principalId == null || role == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        if (role != Role.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only client accounts can browse general diet plans");
        }
        return planRepository.findActiveGeneral().stream()
                .findFirst().map(this::toPayload).orElse(null);
    }

    /**
     * Publish or replace a plan. The author always comes from the authenticated
     * session. GENERAL plans create no notification; a newly created EXCLUSIVE
     * plan creates exactly one notification, for its assigned client only.
     */
    @Transactional
    public Map<String, Object> deploy(Long principalId, Role role, Map<String, Object> payload) {
        if (principalId == null || role == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        if (role != Role.NUTRITIONIST && role != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only nutritionists can publish diet plans");
        }
        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan payload is required");
        }

        User author = userRepository.findById(principalId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        String scope = upper(firstNonBlank(payload.get("scope"), payload.get("targetMode")));
        if (!SCOPE_GENERAL.equals(scope) && !SCOPE_EXCLUSIVE.equals(scope)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Plan scope must be GENERAL or EXCLUSIVE");
        }

        String title = firstNonBlank(payload.get("title"), payload.get("planTitle"));
        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan title is required");
        }
        title = title.trim();
        if (title.length() > 255) title = title.substring(0, 255);

        User target = null;
        if (SCOPE_EXCLUSIVE.equals(scope)) {
            Long targetId = parseId(payload.get("targetUserId"));
            if (targetId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "A client must be selected for a client-specific plan");
            }
            target = userRepository.findById(targetId).orElse(null);
            if (target == null || target.getRole() != Role.USER) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "The selected client account does not exist");
            }
        }

        String planKey = firstNonBlank(payload.get("id"));
        if (planKey == null || planKey.isBlank()) {
            planKey = "plan_" + UUID.randomUUID();
        }
        planKey = planKey.trim();
        if (planKey.length() > 120) planKey = planKey.substring(0, 120);

        NutritionistDietPlan existing = planRepository.findByPlanKey(planKey).orElse(null);
        boolean created = existing == null;
        NutritionistDietPlan plan = existing != null ? existing : new NutritionistDietPlan();

        if (existing != null) {
            // Re-deploying someone else's plan is forbidden; admins may still edit for audit.
            if (role != Role.ADMIN
                    && !Objects.equals(existing.getNutritionist().getId(), principalId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "This plan belongs to another nutritionist");
            }
        } else {
            plan.setPlanKey(planKey);
            plan.setNutritionist(author);
        }

        plan.setScope(scope);
        plan.setTitle(title);
        plan.setTargetUser(target);
        plan.setDeleted(false);
        plan.setPayloadJson(writeJson(sanitized(payload, planKey, title, scope, author, target)));
        planRepository.save(plan);

        if (created && SCOPE_EXCLUSIVE.equals(scope) && target != null) {
            notificationService.notifyUser(
                    target,
                    principalId,
                    "Exclusive Diet Plan Formulated",
                    "Nutritionist " + displayName(author) + " formulated an exclusive diet plan: \""
                            + title + "\". Review and link to your daily requirements.",
                    "EXCLUSIVE_PLAN",
                    "restaurant_menu",
                    "/diet-plans");
        }

        return toPayload(plan);
    }

    /**
     * Soft-delete a published plan. Only its author (or an admin) may do so.
     * Nothing here touches /profiles/me targets, progress logs or imported plans.
     *
     * @return true when a published plan was found and removed
     */
    @Transactional
    public boolean deletePublished(String id, Long principalId, Role role) {
        if (id == null || id.isBlank() || principalId == null || role == null) return false;
        String clean = id.trim();

        NutritionistDietPlan plan = planRepository.findByPlanKeyAndDeletedFalse(clean).orElse(null);
        if (plan == null) {
            Long numeric = parseId(clean);
            if (numeric != null) {
                plan = planRepository.findById(numeric).filter(p -> !p.isDeleted()).orElse(null);
            }
        }
        if (plan == null) return false;

        if (role != Role.ADMIN
                && !Objects.equals(plan.getNutritionist().getId(), principalId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the nutritionist who created this plan can delete it");
        }

        plan.setDeleted(true);
        planRepository.save(plan);
        return true;
    }

    /** Rebuild the exact plan shape the existing UI consumes, with server-owned fields forced. */
    private Map<String, Object> toPayload(NutritionistDietPlan plan) {
        Map<String, Object> map;
        try {
            map = objectMapper.readValue(plan.getPayloadJson(),
                    new TypeReference<LinkedHashMap<String, Object>>() {});
        } catch (Exception e) {
            map = new LinkedHashMap<>();
        }
        map.put("id", plan.getPlanKey());
        map.put("title", plan.getTitle());
        map.put("planTitle", plan.getTitle());
        map.put("scope", plan.getScope());
        map.put("targetMode", plan.getScope());
        map.put("nutritionistId", plan.getNutritionist().getId());
        map.remove("isExclusiveForUser");
        if (SCOPE_GENERAL.equals(plan.getScope())) {
            map.remove("targetUserId");
            map.remove("targetUserEmail");
            map.remove("targetUserName");
        } else if (plan.getTargetUser() != null) {
            map.put("targetUserId", String.valueOf(plan.getTargetUser().getId()));
        }
        return map;
    }

    /** Strip untrusted identity/visibility hints and stamp the authenticated author. */
    private Map<String, Object> sanitized(Map<String, Object> payload, String planKey,
                                          String title, String scope, User author, User target) {
        Map<String, Object> clean = new LinkedHashMap<>(payload);
        clean.remove("isExclusiveForUser");
        clean.remove("senderId");
        clean.put("id", planKey);
        clean.put("title", title);
        clean.put("planTitle", title);
        clean.put("scope", scope);
        clean.put("targetMode", scope);
        clean.put("nutritionistId", author.getId());
        clean.put("nutritionistName", displayName(author));
        clean.put("nutritionistEmail", author.getEmail());
        clean.put("author", displayName(author));
        clean.put("authorEmail", author.getEmail());
        if (SCOPE_GENERAL.equals(scope)) {
            clean.remove("targetUserId");
            clean.remove("targetUserEmail");
            clean.remove("targetUserName");
        } else if (target != null) {
            clean.put("targetUserId", String.valueOf(target.getId()));
        }
        return clean;
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan content is not valid JSON");
        }
    }

    private static String displayName(User user) {
        String name = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
        return name.isEmpty() ? user.getEmail() : name;
    }

    private static String firstNonBlank(Object... values) {
        for (Object value : values) {
            if (value == null) continue;
            String text = String.valueOf(value).trim();
            if (!text.isEmpty() && !"null".equalsIgnoreCase(text)) return text;
        }
        return null;
    }

    private static String upper(String value) {
        return value == null ? null : value.toUpperCase(Locale.ROOT);
    }

    private static Long parseId(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
