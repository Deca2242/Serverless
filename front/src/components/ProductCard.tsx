import { useState } from "react";
import { useAddToCart } from "../hooks/useCart";
import { resolveProductImage, PRODUCT_IMAGES } from "../assets/productImages";
import type { ProductListItem } from "../types/models";
import styles from "./ProductCard.module.css";

interface ProductCardProps {
  product: ProductListItem;
}

function formatPrice(price: number): { value: string; currency: string } {
  return {
    value: `$ ${price.toLocaleString("es-CO")}`,
    currency: "COP",
  };
}

function getStockMeta(stock: number) {
  if (stock <= 0) {
    return {
      label: "Agotado",
      badgeClass: styles.stockBadgeOut,
      dotClass: styles.stockDotOut,
      text: "Sin existencias",
    };
  }
  if (stock < 10) {
    return {
      label: `¡Últimas ${stock}!`,
      badgeClass: styles.stockBadgeLow,
      dotClass: styles.stockDotLow,
      text: `Quedan ${stock}`,
    };
  }
  return {
    label: "Disponible",
    badgeClass: "",
    dotClass: "",
    text: `Stock: ${stock}`,
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const addToCart = useAddToCart();
  const [added, setAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState(() =>
    resolveProductImage(product.slug, product.imageUrl),
  );

  const handleAdd = () => {
    if (product.stock <= 0) return;
    setErrorMsg(null);
    addToCart.mutate(
      { productSlug: product.slug, qty: 1 },
      {
        onSuccess: () => {
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        },
        onError: (err) => {
          setErrorMsg(err instanceof Error ? err.message : "No se pudo añadir al carrito");
        },
      },
    );
  };

  const handleImgError = () => {
    const fallback = PRODUCT_IMAGES[product.slug];
    if (fallback && imgSrc !== fallback) setImgSrc(fallback);
  };

  const price = formatPrice(product.price);
  const stockMeta = getStockMeta(product.stock);

  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        <span className={`${styles.stockBadge} ${stockMeta.badgeClass}`}>
          {stockMeta.label}
        </span>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            className={styles.image}
            loading="lazy"
            onError={handleImgError}
          />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true">
            🛍️
          </div>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>
          {price.value}
          <span className={styles.priceCurrency}>{price.currency}</span>
        </p>
        <p className={styles.stock}>
          <span className={`${styles.stockDot} ${stockMeta.dotClass}`} />
          {stockMeta.text}
        </p>
      </div>

      <button
        type="button"
        className={`${styles.btn} ${added ? styles.btnAdded : ""}`}
        onClick={handleAdd}
        disabled={product.stock <= 0 || addToCart.isPending}
        aria-label={`Añadir ${product.name} al carrito`}
      >
        {added ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Añadido
          </>
        ) : product.stock <= 0 ? (
          "Sin stock"
        ) : addToCart.isPending ? (
          "Añadiendo..."
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
            Añadir al Carrito
          </>
        )}
      </button>
      {errorMsg && <p className="error-msg">{errorMsg}</p>}
    </article>
  );
}
