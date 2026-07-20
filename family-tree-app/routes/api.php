<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\{
    AuthController,
    UserController,
    FamilyMemberController,
    RelationshipController,
    FamilyController,
    BranchController,

    EventController,
    EventMemberController,
    AuditLogController,
    PhotoGalleryController,
    PhotoController,

    StatsController,
    NotificationController,
    InvitationController,
    TreeController,
    AbilitiesController
};

// -------------------------------------------------------
// Public routes (no auth required)
// -------------------------------------------------------
// Registration disabled — users are created by admins only
// Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login',    [AuthController::class, 'login']);

// Public invitation lookup
Route::get('/invitations/{token}', [InvitationController::class, 'show']);

// Public family tree (no auth required)
Route::get('/families/{familySlug}/tree', [TreeController::class, 'familyTree']);

// -------------------------------------------------------
// Authenticated routes
// -------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout',  [AuthController::class, 'logout']);
    Route::get('/auth/profile',  [AuthController::class, 'profile']);
    Route::put('/auth/profile',  [AuthController::class, 'updateProfile']);

    // ── Family Tree (read: all authenticated users) ──────────────
    Route::get('/tree/{memberId}',             [TreeController::class, 'show']);
    Route::get('/tree/{memberId}/ancestors',   [TreeController::class, 'ancestors']);
    Route::get('/tree/{memberId}/descendants', [TreeController::class, 'descendants']);

    // ── Family Members (read: all; write: ability-gated) ────────
    Route::get('/members',          [FamilyMemberController::class, 'index']);
    Route::get('/members/{id}',     [FamilyMemberController::class, 'show']);
    Route::get('/members/{id}/relationships', [FamilyMemberController::class, 'relationships']);

    Route::middleware('ability:add_member')->post('/members', [FamilyMemberController::class, 'store']);
    Route::middleware('ability:edit_member')->put('/members/{id}', [FamilyMemberController::class, 'update']);
    Route::middleware('ability:delete_member')->delete('/members/{id}', [FamilyMemberController::class, 'destroy']);
    Route::middleware('ability:manage_relationships')->post('/members/{id}/relationships', [FamilyMemberController::class, 'attachRelationship']);
    Route::middleware('ability:manage_relationships')->delete('/members/{id}/relationships/{relationshipId}', [FamilyMemberController::class, 'detachRelationship']);

    // ── Relationships (read: all; write: ability-gated) ───────
    Route::get('/relationships',      [RelationshipController::class, 'index']);
    Route::get('/relationships/{id}', [RelationshipController::class, 'show']);

    Route::middleware('ability:manage_relationships')->post('/relationships', [RelationshipController::class, 'store']);
    Route::middleware('ability:manage_relationships')->put('/relationships/{id}', [RelationshipController::class, 'update']);
    Route::middleware('ability:manage_relationships')->delete('/relationships/{id}', [RelationshipController::class, 'destroy']);

    // ── Users (Super Admin only) ──────────────────────────────────
    Route::middleware('role:Super Admin')->group(function () {
        Route::apiResource('users', UserController::class);
    });

    // ── Statistics ────────────────────────────────────────────────
    Route::get('/stats',             [StatsController::class, 'index']);
    Route::get('/stats/generations', [StatsController::class, 'generations']);
    Route::get('/stats/branches',    [StatsController::class, 'branches']);

    // ── Notifications ─────────────────────────────────────────────
    Route::get('/notifications',       [NotificationController::class, 'index']);
    Route::post('/notifications/read', [NotificationController::class, 'markAsRead']);

    // ── Invitations (admin only) ──────────────────────────────────
    Route::middleware('role:Super Admin,Family Admin')->group(function () {
        Route::post('/invitations', [InvitationController::class, 'store']);
    });
    Route::put('/invitations/{token}/accept', [InvitationController::class, 'accept']);

    // ── Families ──────────────────────────────────────────────────
    Route::get('/families', [FamilyController::class, 'index']);
    Route::post('/families', [FamilyController::class, 'store']);
    Route::get('/families/{id}', [FamilyController::class, 'show']);
    Route::get('/families/{id}/branch-tree', [FamilyController::class, 'branchTree']);
    Route::put('/families/{id}', [FamilyController::class, 'update'])->middleware('ability:edit_family');
    Route::delete('/families/{id}', [FamilyController::class, 'destroy'])->middleware('ability:delete_family');

    // ── Branches (within a family) ──────────────────────────────────
    Route::get('/branches', [BranchController::class, 'index']);
    Route::post('/branches', [BranchController::class, 'store'])->middleware('ability:manage_branches');
    Route::get('/branches/{id}', [BranchController::class, 'show']);
    Route::put('/branches/{id}', [BranchController::class, 'update'])->middleware('ability:edit_branch');
    Route::delete('/branches/{id}', [BranchController::class, 'destroy'])->middleware('ability:delete_branch');

    // ── Abilities Matrix (Super Admin only) ───────────────────────
    Route::middleware('role:Super Admin')->group(function () {
        Route::get('/abilities', [AbilitiesController::class, 'index']);
        Route::put('/abilities', [AbilitiesController::class, 'update']);
    });
    Route::middleware('role:Super Admin')->get('/abilities/{familyId}', [AbilitiesController::class, 'forFamily']);

    // ── Events (stub — locked to Super Admin until implemented) ───
    Route::middleware('role:Super Admin')->apiResource('events', EventController::class);

    // ── Photo Galleries & Photos (stub — locked to Super Admin until implemented) ───
    Route::middleware('role:Super Admin')->apiResource('galleries', PhotoGalleryController::class);
    Route::middleware('role:Super Admin')->apiResource('photos',    PhotoController::class);
    Route::middleware('role:Super Admin')->get('/photos/{memberId}', [PhotoController::class, 'byMember']);

    // ── Audit Logs (admins only) ──────────────────────────────────
    Route::middleware('role:Super Admin,Family Admin')->group(function () {
        Route::apiResource('logs', AuditLogController::class);
    });
});
