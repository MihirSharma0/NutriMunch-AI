ALTER TABLE notifications ADD COLUMN sender_id BIGINT NULL;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL;
