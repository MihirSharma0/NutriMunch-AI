-- Nutritionist-created diet plans.
-- Additive only: the existing `diet_plans` table (personal / AI plans owned by a user)
-- is deliberately left untouched.
--
-- Author and target are enforced from the authenticated session on the server, and
-- `plan_key` keeps the stable, client-generated plan id used by the existing UI.
CREATE TABLE nutritionist_diet_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_key VARCHAR(120) NOT NULL,
    nutritionist_id BIGINT NOT NULL,
    scope VARCHAR(16) NOT NULL,
    target_user_id BIGINT NULL,
    title VARCHAR(255) NOT NULL,
    payload_json LONGTEXT NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ndp_plan_key UNIQUE (plan_key),
    INDEX idx_ndp_scope_deleted (scope, deleted),
    INDEX idx_ndp_nutritionist (nutritionist_id, deleted),
    INDEX idx_ndp_target (target_user_id, deleted),
    CONSTRAINT fk_ndp_nutritionist FOREIGN KEY (nutritionist_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ndp_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);
