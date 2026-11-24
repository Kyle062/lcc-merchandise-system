-- Add admin review state to refunds so student requests can be pending
-- until an admin accepts or rejects them. Existing rows stay approved.

ALTER TABLE `refunds`
  ADD COLUMN `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved' AFTER `reason`,
  ADD COLUMN `reviewed_by` INT NULL AFTER `status`,
  ADD COLUMN `reviewed_at` DATETIME NULL AFTER `reviewed_by`,
  ADD COLUMN `rejection_reason` VARCHAR(255) NULL AFTER `reviewed_at`,
  ADD KEY `idx_refunds_status` (`status`);
