import { useCart } from "../hooks/useCart";
import styles from "./CartBadge.module.css";

export function CartBadge() {
  const { data: cart } = useCart();
  const count = cart?.itemCount ?? 0;

  return (
    <div className={styles.wrapper}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className={styles.icon}
        aria-hidden="true"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      {count > 0 && (
        <span className={styles.badge} aria-label={`${count} productos en el carrito`}>
          {count}
        </span>
      )}
    </div>
  );
}
