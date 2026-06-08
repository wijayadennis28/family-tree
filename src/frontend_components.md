"""
Frontend Component Structure for Family Tree Website

1. Main Application Components:
   - App.js (Main routing component)
   - Header.js (Navigation bar)
   - Sidebar.js (Menu navigation)
   - Dashboard.js (Overview page)

2. Authentication Components:
   - Login.js (Login form)
   - Register.js (Registration form)
   - Profile.js (User profile view/edit)

3. Family Member Components:
   - MemberList.js (List of family members)
   - MemberCard.js (Individual member card)
   - MemberDetail.js (Detailed member view)
   - MemberForm.js (Create/Edit member form)

4. Relationship Components:
   - RelationshipManager.js (Relationship management UI)
   - RelationshipGraph.js (Visual relationship graph)

5. Tree Visualization Components:
   - FamilyTree.js (Main tree visualization)
   - TreeNode.js (Individual tree node)
   - TreeControls.js (Zoom/pan controls)

6. Search & Filter Components:
   - SearchBar.js (Search input)
   - FilterPanel.js (Filter options)
   - SearchResult.js (Search results display)

7. Event Components:
   - EventList.js (List of events)
   - EventCard.js (Individual event card)
   - EventForm.js (Create/edit event form)

8. Gallery Components:
   - PhotoGallery.js (Photo gallery view)
   - PhotoUpload.js (Photo upload interface)
   - AlbumView.js (Album display)

9. Admin Components:
   - UserManagement.js (Manage users)
   - AuditLogViewer.js (View audit logs)
   - RoleManager.js (Manage roles)
   - InvitationForm.js (Send invitations)

10. Notification Components:
    - NotificationPanel.js (Notification center)
    - NotificationItem.js (Individual notification item)

11. Statistics Dashboard:
    - StatsOverview.js (Main statistics view)
    - GenerationChart.js (Generation visualization)
    - BranchDistribution.js (Branch distribution chart)
"""

# Component hierarchy structure
COMPONENT_HIERARCHY = {
    "App": ["Header", "Sidebar", "MainContent"],
    "MainContent": ["Dashboard", "Members", "Tree", "Events", "Gallery", "Admin"],
    "Members": ["MemberList", "MemberDetail", "MemberForm"],
    "Tree": ["FamilyTree", "TreeNode", "TreeControls"],
    "Events": ["EventList", "EventCard", "EventForm"],
    "Admin": ["UserManagement", "AuditLogViewer", "RoleManager", "InvitationForm"],
    "Dashboard": ["StatsOverview", "RecentActivity", "QuickActions"]
}