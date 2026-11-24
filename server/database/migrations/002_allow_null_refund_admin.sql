-- Allow student-initiated refunds: admin_id is NULL when a student requests
-- the refund instead of an admin issuing it.

ALTER TABLE `refunds`
  MODIFY COLUMN `admin_id` INT NULL COMMENT 'NULL when a student requests the refund';
