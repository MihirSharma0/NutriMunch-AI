CREATE TABLE IF NOT EXISTS wallets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_reference VARCHAR(64) NOT NULL UNIQUE,
    source_wallet_id BIGINT NULL,
    target_wallet_id BIGINT NULL,
    initiator_id BIGINT NULL,
    recipient_id BIGINT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    transaction_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    razorpay_order_id VARCHAR(100) NULL,
    razorpay_payment_id VARCHAR(100) NULL,
    razorpay_signature VARCHAR(255) NULL,
    notes TEXT NULL,
    sender_balance_before DECIMAL(12, 2) NULL,
    sender_balance_after DECIMAL(12, 2) NULL,
    receiver_balance_before DECIMAL(12, 2) NULL,
    receiver_balance_after DECIMAL(12, 2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tx_source_wallet FOREIGN KEY (source_wallet_id) REFERENCES wallets(id) ON DELETE SET NULL,
    CONSTRAINT fk_tx_target_wallet FOREIGN KEY (target_wallet_id) REFERENCES wallets(id) ON DELETE SET NULL,
    CONSTRAINT fk_tx_initiator FOREIGN KEY (initiator_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tx_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Initialize wallet for all existing users if not exists
INSERT IGNORE INTO wallets (user_id, balance, currency)
SELECT id, 0.00, 'INR' FROM users;
