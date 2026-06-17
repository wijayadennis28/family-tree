<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\{
    AuthController,
    UserController,
    FamilyMemberController,
    RelationshipController,
    BranchController,
    FamilyMemberBranchController,
    EventController,
    EventMemberController,
    AuditLogController,
    PhotoGalleryController,
    PhotoController,
    UserBranchAccessController,
    StatsController,
    NotificationController,
    InvitationController,
    TreeController
};

// -------------------------------------------------------
// Public routes (no auth required)
// -------------------------------------------------------
// Registration disabled — users are created by admins only
// Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login',    [AuthController::class, 'login']);

// Public invitation lookup
Route::get('/invitations/{token}', [InvitationController::class, 'show']);

// -------------------------------------------------------
// Authenticated routes
// -------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout',  [AuthController::class, 'logout']);
    Route::get('/auth/profile',  [AuthController::class, 'profile']);

    // ── Family Tree (read: all authenticated users) ──────────────
    Route::get('/tree/{memberId}',             [TreeController::class, 'show']);
    Route::get('/tree/{memberId}/ancestors',   [TreeController::class, 'ancestors']);
    Route::get('/tree/{memberId}/descendants', [TreeController::class, 'descendants']);

    // ── Family Members (read: all; write: admins only) ───────────
    Route::get('/members',          [FamilyMemberController::class, 'index']);
    Route::get('/members/{id}',     [FamilyMemberController::class, 'show']);
    Route::get('/members/{id}/relationships', [FamilyMemberController::class, 'relationships']);

    Route::middleware('role:Super Admin,Family Admin')->group(function () {
        Route::post('/members',                                          [FamilyMemberController::class, 'store']);
        Route::put('/members/{id}',                                      [FamilyMemberController::class, 'update']);
        Route::delete('/members/{id}',                                   [FamilyMemberController::class, 'destroy']);
        Route::post('/members/{id}/relationships',                       [FamilyMemberController::class, 'attachRelationship']);
        Route::delete('/members/{id}/relationships/{relationshipId}',    [FamilyMemberController::class, 'detachRelationship']);
    });

    // ── Relationships (read: all; write: admins only) ─────────────
    Route::get('/relationships',      [RelationshipController::class, 'index']);
    Route::get('/relationships/{id}', [RelationshipController::class, 'show']);

    Route::middleware('role:Super Admin,Family Admin')->group(function () {
        Route::post('/relationships',       [RelationshipController::class, 'store']);
        Route::put('/relationships/{id}',   [RelationshipController::class, 'update']);
        Route::delete('/relationships/{id}',[RelationshipController::class, 'destroy']);
    });

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

    // ── Branches ──────────────────────────────────────────────────
    Route::get('/branches', [BranchController::class, 'index']);
    Route::middleware('role:Super Admin,Family Admin')->group(function () {
        Route::post('/branches',       [BranchController::class, 'store']);
        Route::put('/branches/{id}',   [BranchController::class, 'update']);
        Route::delete('/branches/{id}',[BranchController::class, 'destroy']);
    });

    // ── Events ────────────────────────────────────────────────────
    Route::apiResource('events', EventController::class);

    // ── Photo Galleries & Photos ──────────────────────────────────
    Route::apiResource('galleries', PhotoGalleryController::class);
    Route::apiResource('photos',    PhotoController::class);
    Route::get('/photos/{memberId}', [PhotoController::class, 'byMember']);

    // ── Audit Logs (admins only) ──────────────────────────────────
    Route::middleware('role:Super Admin,Family Admin')->group(function () {
        Route::apiResource('logs', AuditLogController::class);
    });
});


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Sanctum authentication routes (you may already have these via Laravel Breeze/Jetstream)
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/auth/profile', [AuthController::class, 'profile'])->middleware('auth:sanctum');

// Users
Route::apiResource('users', UserController::class)->middleware('auth:sanctum');

// Family Members
Route::apiResource('members', FamilyMemberController::class)->middleware('auth:sanctum');
Route::get('members/{id}/relationships', [FamilyMemberController::class, 'relationships'])
        ->middleware('auth:sanctum');
Route::post('members/{id}/relationships', [FamilyMemberController::class, 'attachRelationship'])
        ->middleware('auth:sanctum');
Route::delete('members/{id}/relationships/{relationshipId}', [FamilyMemberController::class, 'detachRelationship'])
        ->middleware('auth:sanctum');

// Relationships (stand‑alone)
Route::apiResource('relationships', RelationshipController::class)->middleware('auth:sanctum');

// Branches
Route::apiResource('branches', BranchController::class)->middleware('auth:sanctum');

// Family Member Branches (pivot)
Route::apiResource('member-branches', FamilyMemberBranchController::class)->middleware('auth:sanctum');

// Events
Route::apiResource('events', EventController::class)->middleware('auth:sanctum');

// Event Members (pivot)
Route::apiResource('event-members', EventMemberController::class)->middleware('auth:sanctum');

// Audit Logs
Route::apiResource('logs', AuditLogController::class)->middleware('auth:sanctum');

// Photo Galleries
Route::apiResource('galleries', PhotoGalleryController::class)->middleware('auth:sanctum');

// Photos
Route::apiResource('photos', PhotoController::class)->middleware('auth:sanctum');
Route::get('photos/{memberId}', [PhotoController::class, 'byMember'])->middleware('auth:sanctum');

// User Branch Access (pivot)
Route::apiResource('user-branches', UserBranchAccessController::class)->middleware('auth:sanctum');


// Statistics
Route::get('/stats', [StatsController::class, 'index'])->middleware('auth:sanctum');
Route::get('/stats/generations', [StatsController::class, 'generations'])->middleware('auth:sanctum');
Route::get('/stats/branches', [StatsController::class, 'branches'])->middleware('auth:sanctum');

// Notifications
Route::get('/notifications', [NotificationController::class, 'index'])->middleware('auth:sanctum');
Route::post('/notifications/read', [NotificationController::class, 'markAsRead'])->middleware('auth:sanctum');

// Invitations
Route::post('/invitations', [InvitationController::class, 'store'])->middleware('auth:sanctum');
Route::get('/invitations/{token}', [InvitationController::class, 'show']);
Route::put('/invitations/{token}/accept', [InvitationController::class, 'accept'])->middleware('auth:sanctum');
