CREATE TABLE conversations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    appointment_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    nutritionist_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_conversations_appointment UNIQUE (appointment_id),
    CONSTRAINT fk_conversations_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT fk_conversations_patient FOREIGN KEY (patient_id) REFERENCES users(id),
    CONSTRAINT fk_conversations_nutritionist FOREIGN KEY (nutritionist_id) REFERENCES users(id)
);

CREATE TABLE chat_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content VARCHAR(4000) NOT NULL,
    client_message_id VARCHAR(128) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    read_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_chat_message_idempotency UNIQUE (conversation_id, sender_id, client_message_id),
    CONSTRAINT fk_chat_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
    INDEX ix_chat_messages_cursor (conversation_id, id)
);
