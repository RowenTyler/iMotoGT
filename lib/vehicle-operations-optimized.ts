/**
 * lib/vehicle-operations-optimized.ts
 *
 * This file previously contained its own cache-aware vehicle fetching
 * with full image payloads included in list queries — which was the
 * primary cause of the 6MB+ page size issue.
 *
 * It now re-exports everything from vehicle-operations-with-storage.ts
 * and vehicle-operations.ts so any file that imported from here
 * continues to work without changes.
 *
 * The key fix: all list queries now use VEHICLE_LIST_QUERY which
 * excludes the images and description columns entirely.
 * Images are only fetched via getVehicleByIdFull on the detail page.
 */

// ─── Storage-aware operations (replaces old cached versions) ─────────────────
export {
  getVehiclesLean as getVehicles,
  getUserVehiclesLean as getUserVehicles,
  getVehicleByIdFull as getVehicleById,
  createVehicleWithStorage as createVehicle,
  updateVehicleWithStorage as updateVehicle,
  deleteVehicleWithStorage as deleteVehicle,
} from "./vehicle-operations-with-storage"

// ─── Cache invalidation ───────────────────────────────────────────────────────
export { invalidateCaches } from "./vehicle-service"

// ─── Non-image operations (unchanged) ────────────────────────────────────────
export {
  searchVehicles,
  filterVehicles,
  saveVehicle,
  unsaveVehicle,
  getSavedVehicles,
  isVehicleSaved,
} from "./vehicle-operations"