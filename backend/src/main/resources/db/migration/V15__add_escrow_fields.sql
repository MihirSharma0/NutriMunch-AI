-- Add Escrow Fields to Appointments and Transactions
ALTER TABLE appointments 
ADD COLUMN escrow_amount DECIMAL(12, 2) DEFAULT 0.00,
ADD COLUMN escrow_status VARCHAR(30) DEFAULT 'NONE',
ADD COLUMN escrow_transaction_ref VARCHAR(64) NULL;

ALTER TABLE wallet_transactions
ADD COLUMN appointment_id BIGINT NULL;
