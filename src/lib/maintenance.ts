// ==============================================================================
// EUPHORIA PLATFORM MAINTENANCE & LOCKDOWN CONFIGURATION
// ==============================================================================
// When active, all incoming participant, coordinator, and administrator traffic
// is intercepted at the edge before any database queries execute.
// All API endpoints return HTTP 503 Service Unavailable.
// All page routes display the dedicated /maintenance screen.
// ==============================================================================

export const MAINTENANCE_LOCKED = false;

export function isMaintenanceMode(): boolean {
  // If explicitly disabled via environment variable
  if (process.env.MAINTENANCE_MODE === "false") return false;
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "false") return false;

  // If explicitly enabled via environment variable
  if (process.env.MAINTENANCE_MODE === "true") return true;
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") return true;

  // Default lockdown setting during active database migration
  return MAINTENANCE_LOCKED;
}
