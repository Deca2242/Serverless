import { useQuery } from "@tanstack/react-query";
import {
  listProducts,
  listProductsByCategory,
  searchProducts,
} from "../api/catalog";

export function useProducts(categorySlug?: string, search?: string) {
  return useQuery({
    queryKey: ["products", categorySlug ?? "all", search ?? ""],
    queryFn: () => {
      if (search && search.trim().length > 0) {
        return searchProducts(search);
      }
      if (categorySlug) {
        return listProductsByCategory(categorySlug);
      }
      return listProducts();
    },
    staleTime: search ? 30_000 : 60_000,
  });
}
