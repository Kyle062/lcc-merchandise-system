-- Store a student's profile picture as a base64 data URL.
-- Keeping it on the user row avoids adding a separate static upload folder.

ALTER TABLE `users`
  ADD COLUMN `profile_picture` LONGTEXT NULL AFTER `course`;
