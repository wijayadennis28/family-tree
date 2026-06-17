-- =====================================================================
-- Family Tree Database Schema (optimized for Laravel)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS family_tree DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE family_tree;

-- -------------------------------------------------
-- 1. USERS
-- -------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP NULL DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Super Admin','Family Admin','Family Member','Viewer') DEFAULT 'Family Member',
    remember_token VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------
-- 2. BRANCHES
-- -------------------------------------------------
CREATE TABLE branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- -------------------------------------------------
-- 3. FAMILY MEMBERS
-- -------------------------------------------------
CREATE TABLE family_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT 'Link to user account if member has one',
    name VARCHAR(100) NOT NULL,
    chinese_name VARCHAR(100),
    gender ENUM('Male','Female','Other') NOT NULL,
    dob DATE,
    dod DATE,
    photo VARCHAR(255),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    biography TEXT,
    place_of_birth VARCHAR(100),
    place_of_death VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------
-- 4. RELATIONSHIPS
-- -------------------------------------------------
CREATE TABLE relationships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member1_id INT NOT NULL,
    member2_id INT NOT NULL,
    relationship_type ENUM('Parent','Child','Spouse','Sibling','Grandparent','Grandchild','Uncle/Aunt','Niece/Nephew') NOT NULL,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member1_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (member2_id) REFERENCES family_members(id) ON DELETE CASCADE,
    UNIQUE KEY uq_relationship (member1_id, member2_id, relationship_type)
);

-- -------------------------------------------------
-- 5. FAMILY_MEMBER_BRANCHES (many‑to‑many)
-- -------------------------------------------------
CREATE TABLE family_member_branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    branch_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    UNIQUE KEY uq_member_branch (member_id, branch_id)
);

-- -------------------------------------------------
-- 6. EVENTS
-- -------------------------------------------------
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type ENUM('Birth','Death','Marriage','Anniversary','Other') NOT NULL,
    location VARCHAR(200),
    is_public BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- -------------------------------------------------
-- 7. EVENT_MEMBERS (many‑to‑many)
-- -------------------------------------------------
CREATE TABLE event_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    member_id INT NOT NULL,
    role ENUM('Participant','Host','Witness') DEFAULT 'Participant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
);

-- -------------------------------------------------
-- 8. AUDIT LOGS
-- -------------------------------------------------
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -------------------------------------------------
-- 9. PHOTO GALLERIES
-- -------------------------------------------------
CREATE TABLE photo_galleries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- -------------------------------------------------
-- 10. PHOTOS
-- -------------------------------------------------
CREATE TABLE photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gallery_id INT NULL,
    member_id INT NULL,
    event_id INT NULL,
    photo_path VARCHAR(255) NOT NULL,
    caption TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (gallery_id) REFERENCES photo_galleries(id) ON DELETE SET NULL,
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================================
-- INDEX OPTIMIZATIONS (run after all tables exist)
-- =====================================================================

-- Users
ALTER TABLE users ADD INDEX idx_role (role);
ALTER TABLE users ADD INDEX idx_is_active (is_active);

-- Family Members
ALTER TABLE family_members ADD INDEX idx_user_id (user_id);
ALTER TABLE family_members ADD INDEX idx_name (name);
ALTER TABLE family_members ADD INDEX idx_chinese_name (chinese_name);
ALTER TABLE family_members ADD INDEX idx_dob (dob);
ALTER TABLE family_members ADD INDEX idx_dod (dod);
ALTER TABLE family_members ADD INDEX idx_is_active (is_active);
ALTER TABLE family_members ADD INDEX idx_name_active (name, is_active);

-- Relationships
ALTER TABLE relationships ADD INDEX idx_member1_id (member1_id);
ALTER TABLE relationships ADD INDEX idx_member2_id (member2_id);
ALTER TABLE relationships ADD INDEX idx_relationship_type (relationship_type);

-- Branches
ALTER TABLE branches ADD INDEX idx_created_by (created_by);

-- Family_Member_Branches
ALTER TABLE family_member_branches ADD INDEX idx_member_id (member_id);
ALTER TABLE family_member_branches ADD INDEX idx_branch_id (branch_id);

-- Events
ALTER TABLE events ADD INDEX idx_created_by (created_by);
ALTER TABLE events ADD INDEX idx_event_date (event_date);
ALTER TABLE events ADD INDEX idx_is_public (is_public);
ALTER TABLE events ADD INDEX idx_event_type (event_type);

-- Event_Members
ALTER TABLE event_members ADD INDEX idx_event_id (event_id);
ALTER TABLE event_members ADD INDEX idx_member_id (member_id);

-- Audit Logs
ALTER TABLE audit_logs ADD INDEX idx_user_id (user_id);
ALTER TABLE audit_logs ADD INDEX idx_table_name (table_name);
ALTER TABLE audit_logs ADD INDEX idx_record_id (record_id);
ALTER TABLE audit_logs ADD INDEX idx_table_record (table_name, record_id);

-- Photo Galleries
ALTER TABLE photo_galleries ADD INDEX idx_created_by (created_by);
ALTER TABLE photo_galleries ADD INDEX idx_is_public (is_public);

-- Photos
ALTER TABLE photos ADD INDEX idx_gallery_id (gallery_id);
ALTER TABLE photos ADD INDEX idx_member_id (member_id);
ALTER TABLE photos ADD INDEX idx_event_id (event_id);
ALTER TABLE photos ADD INDEX idx_uploaded_by (uploaded_by);

-- User_Branch_Access (ensure it exists before indexing)
CREATE TABLE IF NOT EXISTS user_branch_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    branch_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_branch (user_id, branch_id)
);

ALTER TABLE user_branch_access ADD INDEX idx_user_id (user_id);
ALTER TABLE user_branch_access ADD INDEX idx_branch_id (branch_id);

-- =====================================================================
-- ADDITIONAL TABLES (required by features not covered above)
-- =====================================================================

-- -------------------------------------------------
-- 12. INVITATIONS  (§4.6 Invitation System)
-- -------------------------------------------------
CREATE TABLE invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    role ENUM('Super Admin','Family Admin','Family Member','Viewer') DEFAULT 'Family Member',
    branch_id INT NULL COMMENT 'Optional: restrict invite to a specific branch',
    member_id INT NULL COMMENT 'Optional: pre-link invite to existing family member',
    invited_by INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE SET NULL,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE invitations ADD INDEX idx_token (token);
ALTER TABLE invitations ADD INDEX idx_email (email);
ALTER TABLE invitations ADD INDEX idx_invited_by (invited_by);

-- -------------------------------------------------
-- 13. NOTIFICATIONS  (§4.10 Notifications System)
-- -------------------------------------------------
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL COMMENT 'e.g. new_member, profile_update, birthday_reminder',
    title VARCHAR(200) NOT NULL,
    message TEXT,
    data JSON NULL COMMENT 'Extra structured payload (e.g. related member id)',
    read_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE notifications ADD INDEX idx_user_id (user_id);
ALTER TABLE notifications ADD INDEX idx_read_at (read_at);
ALTER TABLE notifications ADD INDEX idx_type (type);

-- -------------------------------------------------
-- 14. PENDING CHANGES  (§4.7 Change Approval Workflow)
-- -------------------------------------------------
CREATE TABLE pending_changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submitted_by INT NOT NULL,
    table_name VARCHAR(50) NOT NULL COMMENT 'Which table the change targets',
    record_id INT NOT NULL COMMENT 'PK of the record being changed',
    field_changes JSON NOT NULL COMMENT 'JSON object of {field: {old, new}} pairs',
    status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    reviewer_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE pending_changes ADD INDEX idx_submitted_by (submitted_by);
ALTER TABLE pending_changes ADD INDEX idx_status (status);
ALTER TABLE pending_changes ADD INDEX idx_table_record (table_name, record_id);

-- -------------------------------------------------
-- 15. SETTINGS  (§7 Site-wide configuration)
-- -------------------------------------------------
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default site settings
INSERT INTO settings (`key`, value) VALUES
    ('site_name', 'Family Tree'),
    ('contact_email', NULL),
    ('allow_registrations', 'true'),
    ('require_approval_for_edits', 'true'),
    ('default_tree_depth', '3');