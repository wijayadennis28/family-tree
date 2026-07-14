/**
 * Base URL for Laravel's public storage disk.
 * The backend stores photos as relative paths (e.g. "member-photos/abc.jpg")
 * which are served via the /storage symlink created by `php artisan storage:link`.
 *
 * Prefer the explicit REACT_APP_STORAGE_URL env variable. If not set, fall back
 * to replacing `/api` with `/storage` on the API base URL for backwards
 * compatibility.
 */
export const STORAGE_URL = (
  process.env.REACT_APP_STORAGE_URL ||
  (process.env.REACT_APP_API_BASE_URL || '').replace('/api', '/storage')
);
