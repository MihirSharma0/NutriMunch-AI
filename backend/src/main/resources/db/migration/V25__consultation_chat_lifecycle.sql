-- Consultation chat lifecycle
--
-- A conversation is now a projection of an accepted consultation: every row must
-- reference the appointment it was created from, and every row carries the window
-- in which messaging is allowed.
--
-- 1. Remove the conversations that had no consultation behind them (they were
--    created by the old "any nutritionist can chat with any user" path and could
--    never be authorised against an appointment).
-- 2. Backfill the lifecycle window for the remaining, legitimate conversations.
-- 3. Make appointment_id mandatory so the invariant is enforced by the database.

DELETE FROM conversations WHERE appointment_id IS NULL;

ALTER TABLE conversations
    ADD COLUMN activated_at  DATETIME(6) NULL,
    ADD COLUMN expires_at    DATETIME(6) NULL,
    ADD COLUMN closed_at     DATETIME(6) NULL,
    ADD COLUMN closed_reason VARCHAR(30) NULL,
    ADD COLUMN reopened_at   DATETIME(6) NULL,
    ADD COLUMN reopen_count  INT NOT NULL DEFAULT 0;

-- The five day window starts at whichever is later: the moment the nutritionist
-- accepted, or the scheduled consultation time.
UPDATE conversations c
    JOIN appointments a ON a.id = c.appointment_id
SET c.activated_at = c.created_at
WHERE c.activated_at IS NULL;

UPDATE conversations c
    JOIN appointments a ON a.id = c.appointment_id
SET c.expires_at = DATE_ADD(GREATEST(c.activated_at, a.appointment_time), INTERVAL 5 DAY)
WHERE c.expires_at IS NULL;

UPDATE conversations
SET status        = 'EXPIRED',
    closed_at     = expires_at,
    closed_reason = 'EXPIRED'
WHERE expires_at <= NOW()
  AND status = 'ACTIVE';

ALTER TABLE conversations
    MODIFY appointment_id BIGINT NOT NULL,
    ADD INDEX ix_conversations_expiry (status, expires_at);

-- Notifications must know which conversation they belong to so they can be routed
-- to exactly one participant and aggregated per conversation.
ALTER TABLE notifications
    ADD COLUMN conversation_id BIGINT NULL,
    ADD CONSTRAINT fk_notifications_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    ADD INDEX ix_notifications_conversation (conversation_id, read_status);

-- Unread lookups
CREATE INDEX ix_chat_messages_unread ON chat_messages (conversation_id, sender_id, read_at);
