import { ok, fail } from "@/lib/api/response";
import { register } from "@/lib/api/router";
import {
  getOccupancyReport,
  getFinancialReport,
  getMaintenanceReport,
  getGatePassReport,
} from "@/features/reports/queries";

async function occupancyHandler() {
  try {
    return ok(await getOccupancyReport());
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function financialHandler() {
  try {
    return ok(await getFinancialReport());
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function maintenanceHandler() {
  try {
    return ok(await getMaintenanceReport());
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function gatePassHandler() {
  try {
    return ok(await getGatePassReport());
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

export function registerReportRoutes(): void {
  register("GET", "reports/occupancy", occupancyHandler);
  register("GET", "reports/financial", financialHandler);
  register("GET", "reports/maintenance", maintenanceHandler);
  register("GET", "reports/gate-passes", gatePassHandler);
}
