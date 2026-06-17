# Family Tree Website - Comprehensive Requirements & Plan

---

## 1. Overview
This document aggregates all requirements, use cases, technical details, and implementation plans for the Family Tree website as extracted from the provided markdown files.

---

## 2. Recommended Tech Stack (from requirements.md)

**Backend Framework:** Laravel (PHP) – ideal for shared hosting, built‑in auth, routing, MVC, easy SFTP deploy.  
**Frontend Framework:** React.js – component‑based, built locally, deployed as static files.  
**Animation Library:** GSAP (GreenSock) – smooth tree visualizations.  
**Database:** MySQL – shared‑hosting compatible, well‑supported by Laravel.  

**Project Structure (shared hosting):**

```
project-root/
├── app/                    # Laravel application files
├── bootstrap/
├── config/
├── database/
├── public/                 # Web root (index.php here)
│   ├── css/
│   ├── js/
│   ├── images/
│   └── index.php
├── resources/              # Views, assets
│   ├── views/
│   ├── js/
│   └── sass/
├── routes/                 # URL routing
├── storage/                # Logs, cache (writable)
├── vendor/                 # Composer dependencies
├── .env                    # Environment config
├── composer.json           # PHP dependencies
└── package.json            # Node.js dependencies
```

**Development Workflow**
1. Local dev with Laravel Valet/XAMPP + React + GSAP.
2. Build React (`npm run build`) → copy to `public/`.
3. Deploy via SFTP, set permissions (755/dirs, 644/files), configure `.env`.

**Laravel‑Specific Implementation Plan**
- Auth: Laravel Breeze/Jetstream + role‑based access.
- Models: User, FamilyMember, Relationship, AuditLog, Event.
- API routes (protected with `auth:sanctum`):
  ```php
  Route::middleware('auth:sanctum')->group(function () {
      Route::apiResource('members', 'FamilyMemberController');
      Route::apiResource('relationships', 'RelationshipController');
      Route::get('/tree/{memberId}', 'TreeController@getView');
      Route::get('/search', 'SearchController@search');
  });
  ```
- Frontend: React consumes Laravel API; GSAP for animations; responsive CSS.

**Why This Works for Shared Hosting**
- Laravel runs on standard PHP, no special privileges.
- React built locally → static files.
- GSAP pure JS, lightweight.
- Deployment: SFTP only, standard PHP host requirements.

**Recommended Local Tools**
- Laravel Valet (macOS) or XAMPP/WAMP (Windows)
- Node.js + npm
- VS Code
- Postman
- Git

---

## 3. User Roles & Permissions (from Use Cases file)

| Role | Capabilities |
|------|--------------|
| **Super Admin** | Full access; manage users/roles; delete/restore records; view audit logs/history; approve changes; system config. |
| **Family Admin** | Manage branches/org; approve member edits; add/edit profiles; manage invitations; control branch access. |
| **Family Member** | View full tree; edit own profile; suggest edits to others; add relatives; view personal notifications. |
| **Viewer** | Read‑only access; cannot modify; limited to public info. |

---

## 4. Core Features & User Use Cases

### 4.1 Family Member Management
- Create new relatives (full personal info).
- Edit existing profiles (details, photos, contacts).
- Upload/profile photos.
- Archive (soft‑delete) deceased/inactive members.
- View member details.
- *Example:* Sarah adds her grandmother with DOB/DOD, photo, saves.

### 4.2 Relationship Management
- Add/remove parent‑child, spouse, sibling links.
- Edit relationship dates/status.
- Bidirectional creation.
- *Example:* John adds his wife via “Add Relative” → Spouse.

### 4.3 Family Tree Visualization
- Interactive tree (click to see connections).
- Zoom/pan, expand/collapse branches.
- Full‑screen mode.
- Views: Ancestor, descendant, full tree, branch.
- *Example:* Michael zooms into immediate family then expands to grandparents.

### 4.4 Search & Filters
- Search by name (including Chinese name).
- Filter by branch, generation, living/deceased status, gender.
- *Example:* Emma finds living female relatives in “Chen” branch.

### 4.5 User Accounts & Authentication
- Register, login/logout.
- Link user account to family‑member profile.
- Manage profile/password.
- Receive notifications (new members, updates, etc.).
- *Example:* David creates account, links to profile, gets notified of cousin’s new photo.

### 4.6 Invitation System
- Send email invitations (role/branch).
- Receive invitation with token.
- Create account & link to existing profile.
- *Example:* Aunt Linda invites distant cousin via email.

### 4.7 Change Approval Workflow
- Submit changes → pending approval.
- Admins view pending, approve/reject.
- View change history (who changed what/when).
- *Example:* Lisa edits father’s occupation → admin approves.

### 4.8 Family Events
- Create events (birth, death, marriage, anniversary, other).
- View event calendar.
- Add details, photos, related members.
- Set reminders/notifications.
- *Example:* Family creates “Annual Reunion” event with past photos.

### 4.9 Photo Gallery
- Upload photos (profile, childhood, event, etc.).
- Categorize into albums (type, member, event).
- Download photos.
- Browse albums per member/event.
- *Example:* Vacation photos added to “Family Vacation 2024” album.

### 4.10 Notifications System
- Activity alerts (new members, profile updates, relationship changes, events).
- Reminder notifications (birthdays, anniversaries, upcoming events).
- *Example:* Family notified when Tom’s spouse added.

### 4.11 Statistics Dashboard
- Totals (members, living/deceased).
- Number of generations.
- Oldest living member.
- Largest branch.
- *Example:* Admin sees 120 members (85 living, 35 deceased); Smith branch largest.

### 4.12 Advanced Features
- **Audit Trail:** Timestamped logs, who/what changed, ability to restore previous versions.
- **Branch Management:** Create surname/regional branches; assign users; per‑branch access; separate stats.
- **Data Export/Import:** CSV/Excel export; import GEDCOM/etc.; full DB backup/restore.
- **Customizable Views:** Visual themes; choose profile fields; personalized dashboard; notification preferences.

---

## 5. Technical Implementation Details

### 5.1 Frontend (React + GSAP)
- Interactive tree via D3.js or similar.
- Smooth expand/collapse animations with GSAP.
- Responsive design (mobile/desktop).
- Real‑time updates on changes.

### 5.2 Backend (Laravel)
- RESTful API for frontend communication.
- DB relationships: members ↔ relationships ↔ events.
- Auth + role‑based access control.
- File upload handling (profile photos, documents).
- Caching for performance.

### 5.3 Database Structure (from sql + main.md)
- **users:** id, name, email (unique), email_verified_at, password, role (ENUM), branch_access (VARCHAR – later normalized), remember_token, is_active, timestamps.
- **family_members:** id, user_id (FK), name, chinese_name, gender (ENUM), dob, dod, photo, address, phone, email, biography, place_of_birth, place_of_death, is_active, timestamps.
- **relationships:** id, member1_id, member2_id (FK), relationship_type (ENUM), start_date, end_date, notes, timestamps. Cascading deletes.
- **branches:** id, name, description, created_by (FK), is_active, timestamps.
- **family_member_branches:** id, member_id, branch_id, is_primary, timestamps. Many‑to‑many.
- **events:** id, title, description, event_date, event_type (ENUM), location, is_public, created_by (FK), timestamps.
- **event_members:** id, event_id, member_id (FK), role (ENUM), timestamps. Many‑to‑many.
- **audit_logs:** id, user_id (FK), action, table_name, record_id, old_values, new_values, ip_address, user_agent, timestamps.
- **photo_galleries:** id, name, description, created_by (FK), is_public, timestamps.
- **photos:** id, gallery_id (FK), member_id (FK), event_id (FK), photo_path, caption, upload_date, uploaded_by (FK), timestamps. (FKs with SET NULL where appropriate).
- **user_branch_access** (added for referential integrity): id, user_id (FK), branch_id (FK), is_primary, timestamps, unique(user_id,branch_id).

### 5.4 API Endpoints (from api_structure.md)
- **Auth:** POST /api/auth/register, login, logout; GET /api/auth/profile.
- **Members:** CRUD on /api/members; GET /api/members/:id/relationships; POST/DELETE on relationships sub‑resource.
- **Relationships:** CRUD on /api/relationships.
- **Tree:** GET /api/tree/:memberId, ancestors/:memberId, descendants/:memberId.
- **Search/Filter:** GET /api/search, /api/filter.
- **AuditLogs:** GET /api/logs, /api/logs/:id.
- **Events:** CRUD on /api/events.
- **Invitations:** POST /api/invitations; GET /api/invitations/:token; PUT /api/invitations/:token/accept.
- **Statistics:** GET /api/stats, /api/stats/generations, /api/stats/branches.
- **Photos:** GET /api/photos/:memberId; POST /api/photos; DELETE /api/photos/:id.
- **Notifications:** GET /api/notifications; POST /api/notifications/read.

### 5.5 Frontend Component Hierarchy (from frontend_components.md)
- **App** → Header, Sidebar, MainContent.
- **MainContent** → Dashboard, Members, Tree, Events, Gallery, Admin.
- **Members** → MemberList, MemberDetail, MemberForm.
- **Tree** → FamilyTree, TreeNode, TreeControls.
- **Events** → EventList, EventCard, EventForm.
- **Admin** → UserManagement, AuditLogViewer, RoleManager, InvitationForm.
- **Dashboard** → StatsOverview, RecentActivity, QuickActions.
- Plus auth components (Login, Register, Profile), search/filter (SearchBar, FilterPanel, SearchResult), gallery (PhotoGallery, PhotoUpload, AlbumView), notification (NotificationPanel, NotificationItem), stats (StatsOverview, GenerationChart, BranchDistribution).

### 5.6 Security Considerations
- Role‑based access control (RBAC).
- Privacy settings per field (GDPR compliance).
- Audit logging for all changes.
- Secure password storage (bcrypt/argon2).
- CSRF protection.
- Input validation & sanitization.
- Ability to mark information as private.
- Secure session management.

### 5.7 Performance Features
- Database query caching (frequent data).
- API response caching.
- Browser‑side caching for interactive assets.
- Efficient queries with indexes (see Index Optimizations below).
- Lazy loading of tree branches.
- Image optimization for profile photos.
- Minified JS/CSS.

### 5.8 Index Optimizations (added to schema)
- **users:** idx_role, idx_is_active.
- **family_members:** idx_user_id, idx_name, idx_chinese_name, idx_dob, idx_dod, idx_is_active, idx_name_active.
- **relationships:** idx_member1_id, idx_member2_id, idx_relationship_type.
- **branches:** idx_created_by.
- **family_member_branches:** idx_member_id, idx_branch_id.
- **events:** idx_created_by, idx_event_date, idx_is_public, idx_event_type.
- **event_members:** idx_event_id, idx_member_id.
- **audit_logs:** idx_user_id, idx_table_name, idx_record_id, idx_table_record.
- **photo_galleries:** idx_created_by, idx_is_public.
- **photos:** idx_gallery_id, idx_member_id, idx_event_id, idx_uploaded_by.
- **user_branch_access:** idx_user_id, idx_branch_id.

---

## 6. Development Plan (Phased)

| Phase | Duration | Goals |
|-------|----------|-------|
| **1 – Foundation** | Weeks 1‑2 | DB schema & MySQL connection; JWT auth; registration/login; basic Express/Laravel server. |
| **2 – Core Data** | Weeks 3‑4 | Member CRUD; relationship management; privacy settings & field‑level access; photo upload. |
| **3 – Tree Visualization** | Weeks 5‑6 | Interactive tree (zoom/pan/expand/collapse); multiple view modes (ancestor, descendant, full, branch); responsive design. |
| **4 – Advanced Features** | Weeks 7‑8 | Audit log + change approval workflow; search/filtering; notifications; event management. |
| **5 – Admin & Statistics** | Weeks 9‑10 | Role‑based access control; user management & invitation system; statistics dashboard; photo gallery. |
| **6 – Testing & Optimization** | Weeks 11‑12 | Comprehensive testing; performance tuning; security enhancements; final docs & deployment prep. |

Each phase delivers usable functionality early (auth → members → tree → refinements).

---

## 7. Potential Improvements / Additional Considerations
While the current specification is thorough, the following enhancements could further strengthen the system:
- **Multilingual Support:**Add language fields or translation tables for UI and content (e.g., English, Chinese).
- **Privacy Granularity:**Beyond boolean private/public, allow per‑field visibility (e.g., hide phone from certain roles).
- **Two‑Factor Authentication:**For heightened security of admin accounts.
- **Password Reset / Email Verification Flow:**Implement secure token‑based reset and email verification.
- **Settings Table:**Store site‑wide configuration (site name, contact email, enable/disable features).
- **Soft‑Delete Timestamp (`deleted_at`)**:Replace `is_active` with a timestamp for precise audit of when records were removed.
- **File Storage Abstraction:**Support cloud storage (AWS S3, etc.) for photos while retaining local fallback.
- **WebSocket / Real‑Time Updates:**Use Laravel Echo + Pusher for live UI updates without polling.
- **API Versioning:**Prefix API routes (`/api/v1/...`) to allow future evolution.
- **Rate Limiting & Throttling:**Protect endpoints from abuse.
- **Comprehensive Logging:**Beyond audit logs, include application‑level logs (errors, warnings) for debugging.

These items are optional and can be prioritized based on stakeholder feedback.

---

## 8. Conclusion
This consolidated document captures the full set of requirements, use cases, technical specifications, API structure, frontend component layout, security & performance considerations, and a phased implementation roadmap for the Family Tree website. It serves as a single source of reference for developers, designers, and stakeholders moving forward.
