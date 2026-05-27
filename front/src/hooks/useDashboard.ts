import { useQuery } from "@tanstack/react-query";
import { DEMO_USER_ID } from "../config";
import { getDashboard } from "../api/users";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard", DEMO_USER_ID],
    queryFn: () => getDashboard(DEMO_USER_ID),
    staleTime: 60_000,
  });
}
