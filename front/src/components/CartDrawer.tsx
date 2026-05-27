import { useState, useRef, useEffect } from "react";
import { useCart, useRemoveFromCart } from "../hooks/useCart";
import { resolveProductImage } from "../assets/productImages";
import { CartBadge } from "./CartBadge";
import styles from "./CartDrawer.module.css";

function formatPrice(price: number): string {
  return `$ ${price.toLocaleString("es-CO")} COP`;
}

function CartIcon() {
  return (
    <svg
      className={styles.titleIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}

export function CartDrawer() {
  const { data: cart, isLoading } = useCart();
  const removeFromCart = useRemoveFromCart();
  const [open, setOpen] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const items = cart?.items ?? [];
  const isEmpty = !isLoading && items.length === 0;
  const itemCount = cart?.itemCount ?? 0;

  return (
    <div className={styles.root} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-label="Ver carrito"
        aria-expanded={open}
      >
        <CartBadge />
        <span className={styles.label}>Carrito</span>
      </button>

      {open && (
        <div
          className={styles.drawer}
          role="dialog"
          aria-label="Carrito de compras"
        >
          <header className={styles.header}>
            <h3 className={styles.title}>
              <CartIcon />
              Tu Carrito
            </h3>
            {!isEmpty && (
              <span className={styles.headerCount}>
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            )}
          </header>

          {isLoading ? (
            <div className={styles.spinnerWrap}>
              <div className="spinner" />
            </div>
          ) : isEmpty ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
                </svg>
              </div>
              <p className={styles.emptyTitle}>Tu carrito está vacío</p>
              <p className={styles.emptyText}>
                Añade productos del catálogo para verlos aquí.
              </p>
            </div>
          ) : (
            <>
              <ul className={styles.list}>
                {items.map((item) => (
                  <li key={item.productSlug} className={styles.item}>
                    <img
                      src={resolveProductImage(item.productSlug)}
                      alt={item.productName}
                      className={styles.thumb}
                    />
                    <div className={styles.itemInfo}>
                      <p className={styles.itemName}>{item.productName}</p>
                      <p className={styles.itemMeta}>
                        {item.qty} × ${item.unitPrice.toLocaleString("es-CO")}
                      </p>
                      <div className={styles.itemFooter}>
                        <span className={styles.itemSubtotal}>
                          {formatPrice(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          disabled={removeFromCart.isPending}
                          onClick={() => {
                            setRemoveError(null);
                            removeFromCart.mutate(item.productSlug, {
                              onError: (err) => {
                                setRemoveError(
                                  err instanceof Error
                                    ? err.message
                                    : "No se pudo eliminar el producto",
                                );
                              },
                            });
                          }}
                          aria-label={`Eliminar ${item.productName}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {removeError && <p className="error-msg">{removeError}</p>}
              <div className={styles.footer}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>
                    {formatPrice(cart?.total ?? 0)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
