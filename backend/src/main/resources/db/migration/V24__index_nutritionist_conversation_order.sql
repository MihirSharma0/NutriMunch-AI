CREATE INDEX ix_conversations_nutritionist_updated_id
    ON conversations (nutritionist_id, updated_at, id);
