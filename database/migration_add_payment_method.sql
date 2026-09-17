USE nusa_karsa;

ALTER TABLE payments
    ADD COLUMN payment_method ENUM('QRIS', 'BRI', 'BCA', 'SEABANK', 'PAYPAL') NOT NULL AFTER amount;
