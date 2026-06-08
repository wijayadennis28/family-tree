"""
API Endpoints Structure for Family Tree Website

1. Authentication Routes:
   - POST /api/auth/register
   - POST /api/auth/login
   - POST /api/auth/logout
   - GET /api/auth/profile

2. Family Member Routes:
   - GET /api/members
   - GET /api/members/:id
   - POST /api/members
   - PUT /api/members/:id
   - DELETE /api/members/:id
   - GET /api/members/:id/relationships
   - POST /api/members/:id/relationships
   - DELETE /api/members/:id/relationships

3. Relationship Routes:
   - GET /api/relationships
   - POST /api/relationships
   - PUT /api/relationships/:id
   - DELETE /api/relationships/:id

4. Tree Visualization Routes:
   - GET /api/tree/:memberId
   - GET /api/tree/ancestors/:memberId
   - GET /api/tree/descendants/:memberId

5. Search & Filter Routes:
   - GET /api/search
   - GET /api/filter

6. Audit Log Routes:
   - GET /api/logs
   - GET /api/logs/:id

7. Event Routes:
   - GET /api/events
   - GET /api/events/:id
   - POST /api/events
   - PUT /api/events/:id
   - DELETE /api/events/:id

8. Invitation Routes:
   - POST /api/invitations
   - GET /api/invitations/:token
   - PUT /api/invitations/:token/accept

9. Statistics Routes:
   - GET /api/stats
   - GET /api/stats/generations
   - GET /api/stats/branches

10. Photo Gallery Routes:
    - GET /api/photos/:memberId
    - POST /api/photos
    - DELETE /api/photos/:id

11. Notification Routes:
    - GET /api/notifications
    - POST /api/notifications/read
"""

# Example implementation of core API structure in Node.js/Express format
API_STRUCTURE = {
    "auth": {
        "register": "POST /api/auth/register",
        "login": "POST /api/auth/login",
        "logout": "POST /api/auth/logout",
        "profile": "GET /api/auth/profile"
    },
    "members": {
        "list": "GET /api/members",
        "get": "GET /api/members/:id",
        "create": "POST /api/members",
        "update": "PUT /api/members/:id",
        "delete": "DELETE /api/members/:id",
        "relationships": "GET /api/members/:id/relationships"
    },
    "relationships": {
        "list": "GET /api/relationships",
        "create": "POST /api/relationships",
        "update": "PUT /api/relationships/:id",
        "delete": "DELETE /api/relationships/:id"
    },
    "tree": {
        "view": "GET /api/tree/:memberId",
        "ancestors": "GET /api/tree/ancestors/:memberId",
        "descendants": "GET /api/tree/descendants/:memberId"
    },
    "search": {
        "general": "GET /api/search",
        "filter": "GET /api/filter"
    },
    "logs": {
        "list": "GET /api/logs",
        "get": "GET /api/logs/:id"
    },
    "events": {
        "list": "GET /api/events",
        "get": "GET /api/events/:id",
        "create": "POST /api/events",
        "update": "PUT /api/events/:id",
        "delete": "DELETE /api/events/:id"
    },
    "invitations": {
        "create": "POST /api/invitations",
        "get": "GET /api/invitations/:token",
        "accept": "PUT /api/invitations/:token/accept"
    },
    "stats": {
        "overview": "GET /api/stats",
        "generations": "GET /api/stats/generations",
        "branches": "GET /api/stats/branches"
    }
}