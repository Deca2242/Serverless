const UNSPLASH = "https://images.unsplash.com";

export const PRODUCT_IMAGES: Record<string, string> = {
  "telefono-x100": `${UNSPLASH}/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop`,
  "portatil-workpro-15": `${UNSPLASH}/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop`,
  "auriculares-z5": `${UNSPLASH}/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop`,
  "smartwatch-fittrack": `${UNSPLASH}/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop`,
  "mochila-viaje": `${UNSPLASH}/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop`,
  "camiseta-algodon-hombre": `${UNSPLASH}/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop`,
};

function isPlaceholder(url: string): boolean {
  return url.includes("placehold.co");
}

export function resolveProductImage(slug: string, imageUrl?: string): string {
  if (imageUrl && !isPlaceholder(imageUrl)) return imageUrl;
  return PRODUCT_IMAGES[slug] ?? imageUrl ?? "";
}
