USE nusa_karsa;

ALTER TABLE payments
    ADD COLUMN payment_token VARCHAR(24) NULL AFTER payment_method;

UPDATE payments
SET payment_token = CONCAT('NK-', DATE_FORMAT(payment_date, '%Y%m%d'), '-', UPPER(SUBSTRING(MD5(CONCAT(id, payment_date)), 1, 8)))
WHERE payment_token IS NULL;

ALTER TABLE payments
    MODIFY payment_token VARCHAR(24) NOT NULL,
    ADD UNIQUE KEY uq_payments_token (payment_token);