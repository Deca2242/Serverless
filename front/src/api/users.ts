import { DEMO_USER_ID } from "../config";
import { api } from "./client";
import { UserDashboardSchema } from "../types/models";

export function getDashboard(userId = DEMO_USER_ID) {
  return api(`/users/${userId}/dashboard`, UserDashboardSchema);
}
