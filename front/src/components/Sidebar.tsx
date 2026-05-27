import { useMemo } from "react";
import { useCategories } from "../hooks/useCategories";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  selected: string | undefined;
  onSelect: (slug: string | undefined) => void;
}

const CATEGORY_ORDER = ["electronica", "ropa", "hogar", "deportes"];

function ChevronRight() {
  return (
    <svg
      className={styles.itemChevron}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function Sidebar({ selected, onSelect }: SidebarProps) {
  const { data: categories = [], isLoading } = useCategories();

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          CATEGORY_ORDER.indexOf(a.slug) - CATEGORY_ORDER.indexOf(b.slug),
      ),
    [categories],
  );

  return (
    <aside className={`app-sidebar ${styles.sidebar}`}>
      <div className={styles.card}>
        <div className={styles.header}>
          <svg
            className={styles.headerIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <h2 className={styles.title}>Categorías</h2>
        </div>

        {isLoading ? (
          <div className="spinner" />
        ) : (
          <ul className={styles.list} role="list">
            <li>
              <button
                className={`${styles.item} ${styles.itemAll} ${
                  !selected ? styles.active : ""
                }`}
                onClick={() => onSelect(undefined)}
              >
                <span>Todos los productos</span>
                <ChevronRight />
              </button>
            </li>
            <li className={styles.divider} aria-hidden="true" />
            {sortedCategories.map((cat) => (
              <li key={cat.slug}>
                <button
                  className={`${styles.item} ${
                    selected === cat.slug ? styles.active : ""
                  }`}
                  onClick={() =>
                    onSelect(selected === cat.slug ? undefined : cat.slug)
                  }
                >
                  <span>{cat.name}</span>
                  <ChevronRight />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
