import { useQuery } from "@tanstack/react-query";
import { listCategories } from "../api/catalog";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    staleTime: 60_000,
  });
}
