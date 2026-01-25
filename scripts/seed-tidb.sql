-- TiDB Cloud Compatible Schema for GML Tools
-- Run this SQL in your TiDB Cloud console to create the necessary tables

-- First, select the database (matches your connection string)
USE `test`;

-- Create auth_users table for authentication
CREATE TABLE IF NOT EXISTS `auth_users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `role` VARCHAR(20) DEFAULT 'user',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
);

-- Create users table (sessions)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `session_id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `color` VARCHAR(20) DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`)
);

-- Create user_ips table
CREATE TABLE IF NOT EXISTS `user_ips` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `label` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
);

-- Insert admin user (password: admin123 - bcrypt hashed)
-- You can use this to log in, or create your own users
INSERT INTO `auth_users` (`id`, `username`, `password`, `role`) VALUES
(1, 'admin', '$2y$10$pqsZLjPOXTwgTyZ83AxgIuy7fBGjKHLkek36HyT0a23bCW1do265y', 'admin'),
(2, 'khalid', '$2y$10$1HygDM.nU0z6rqpg6flkb.KX0pXY15zzwXSyRJ5O26/jqnfiY4SAG', 'user'),
(3, 'hatim', '$2y$10$mYTO8kW8nmNidQvVuWJa1.ywiUNr6qJWLZknUusTmybmFPHWLG466', 'user'),
(4, 'charif', '$2y$10$.8CcrBM3u6qlK3/PEqLhvuyNFTslF/oBM4m4JEgYEAG66nG6xju9q', 'user'),
(5, 'oumaima', '$2y$10$5060lbTrbFwmoPbkkJP04e56dWwPXnzqJgeicTsExRJ0QcME3n62e', 'user'),
(6, 'akram', '$2y$10$XmUzRwFZIXsg6Cbsvw9HVOkcXy33sBDTLzp4mm44AxwLKsfrUnL5y', 'user'),
(7, 'test', '$2y$10$IzdtG/pAW29LTcYeH63B8eROtDhgPIX6otMefb/rgs3tqK0VH2qy.', 'user');

-- Insert sample session data
INSERT INTO `users` (`id`, `session_id`, `name`, `color`, `created_by`) VALUES
(1, 'Akram', 'GML', '#10b981', 1),
(2, 'Akram', 'GMS', '#f43f5e', 1);

-- Insert sample IP data
INSERT INTO `user_ips` (`user_id`, `ip_address`, `label`) VALUES
(1, '15.204.234.112', 'sl2156'),
(1, '15.204.236.255', 'sl2151'),
(1, '217.182.73.127', 'sl2150'),
(1, '15.204.86.119', 'sl2149'),
(1, '46.62.141.168', 'sl2137'),
(2, '74.208.88.42', 'ss273'),
(2, '88.99.38.250', 'ss305'),
(2, '51.75.53.88', 'ss370');

-- Note: The original passwords in auth_users were hashed using PHP's password_hash() 
-- with bcrypt (prefix $2y$). The bcryptjs library in Node.js is compatible with these hashes.
