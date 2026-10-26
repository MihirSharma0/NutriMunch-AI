ALTER TABLE conversations
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD INDEX ix_conversations_patient (patient_id),
    ADD INDEX ix_conversations_nutritionist (nutritionist_id),
    ADD INDEX ix_conversations_updated (updated_at);
