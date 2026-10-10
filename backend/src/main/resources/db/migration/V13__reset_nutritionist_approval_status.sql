-- Reset any auto-approved nutritionist profiles back to PENDING admin verification
UPDATE nutritionist_profiles SET approval_status = 'PENDING' WHERE approval_status = 'APPROVED' OR approval_status IS NULL;
