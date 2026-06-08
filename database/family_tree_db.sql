-- =====================================================================
-- Family Tree Database Schema
-- Created for shared hosting environment with Laravel compatibility
-- =====================================================================

-- Create Database (if not exists)
CREATE DATABASE IF NOT EXISTS family_tree DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE family_tree;

-- =====================================================================
-- 1. USERS TABLE
-- =====================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP NULL DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Super Admin', 'Family Admin', 'Family Member', 'Viewer') DEFAULT 'Family Member',
    branch_access VARCHAR(50),
    remember_token VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================================
-- 2. FAMILY MEMBERS TABLE
-- =====================================================================
CREATE TABLE family_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT 'Link to user account if member has one',
    name VARCHAR(100) NOT NULL,
    chinese_name VARCHAR(100),
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================================
-- 3. RELATIONSHIPS TABLE
-- =====================================================================
CREATE TABLE relationships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member1_id INT NOT NULL,
    member2_id INT NOT NULL,
    relationship_type ENUM('Parent', 'Child', 'Spouse', 'Sibling', 'Grandparent', 'Grandchild', 'Uncle/Aunt', 'Niece/Nephew') NOT NULL,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (member1_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (member2_id) REFERENCES family_members(id) ON DELETE CASCADE
);

-- =====================================================================
-- 4. BRANCHES TABLE
-- =====================================================================
CREATE TABLE branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =====================================================================
-- 5. FAMILY_MEMBER_BRANCHES TABLE (Many-to-Many relationship)
-- =====================================================================
CREATE TABLE family_member_branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    branch_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- =====================================================================
-- 6. EVENTS TABLE
-- =====================================================================
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type ENUM('Birth', 'Death', 'Marriage', 'Anniversary', 'Other') NOT NULL,
    location VARCHAR(200),
    is_public BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =====================================================================
-- 7. EVENT_MEMBERS TABLE (Many-to-Many relationship for events)
-- =====================================================================
CREATE TABLE event_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    member_id INT NOT NULL,
    role ENUM('Participant', 'Host', 'Witness') DEFAULT 'Participant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
);

-- =====================================================================
-- 8. AUDIT LOGS TABLE
-- =====================================================================
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
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =====================================================================
-- 9. PHOTO GALLERIES TABLE
-- =====================================================================
CREATE TABLE photo_galleries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =====================================================================
-- 10. PHOTOS TABLE
-- =====================================================================
CREATE TABLE photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gallery_id INT NULL,
    member_id INT NULL,
    event_id INT NULL,
    photo_path VARCHAR(255) NOT NULL,
    caption TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT NOT NULL,
    
    -- Foreign key constraints
    FOREIGN KEY (gallery_id)
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);