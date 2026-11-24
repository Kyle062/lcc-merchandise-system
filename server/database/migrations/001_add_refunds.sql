-- Add refund support to the LCC Merchandise database.
-- Run once against the `lcc_merchandise` database.

ALTER TABLE `orders`
  MODIFY COLUMN `status`
  ENUM(
    'Pending',
    'Processing',
    'In Tailoring',
    'Ready for Pickup',
    'Completed',
    'Cancelled',
    'Refunded'
  )
  DEFAULT 'Pending';

ALTER TABLE `order_groups`
  MODIFY COLUMN `status`
  ENUM(
    'Pending',
    'Processing',
    'In Tailoring',
    'Ready for Pickup',
    'Completed',
    'Cancelled',
    'Refunded'
  )
  DEFAULT 'Pending';

CREATE TABLE IF NOT EXISTS `refunds` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `group_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `admin_id` INT NULL COMMENT 'NULL when a student requests the refund',
  `amount` DECIMAL(10,2) NOT NULL,
  `reason` TEXT NOT NULL,
  `refunded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_refunds_group_id` (`group_id`),
  KEY `idx_refunds_user_id` (`user_id`),
  KEY `idx_refunds_admin_id` (`admin_id`),
  CONSTRAINT `fk_refunds_group_id`
    FOREIGN KEY (`group_id`) REFERENCES `order_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_refunds_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_refunds_admin_id`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
