import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO_USER_ID } from "../config";
import { addItem, getCart, removeItem } from "../api/cart";

const CART_KEY = ["cart", DEMO_USER_ID];

export function useCart() {
  return useQuery({
    queryKey: CART_KEY,
    queryFn: () => getCart(DEMO_USER_ID),
    staleTime: 0,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productSlug,
      qty,
    }: {
      productSlug: string;
      qty: number;
    }) => addItem(productSlug, qty, DEMO_USER_ID),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CART_KEY });
    },
  });
}

export function useRemoveFromCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productSlug: string) => removeItem(productSlug, DEMO_USER_ID),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CART_KEY });
    },
  });
}
