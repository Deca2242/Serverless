import { useCallback } from "react";
import { CartDrawer } from "./CartDrawer";
import { UserPopover } from "./UserPopover";
import styles from "./Header.module.css";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onGoHome: () => void;
}

const NAV_ITEMS = [
  { label: "Inicio", demo: false },
  { label: "Categorías", demo: true },
  { label: "Ofertas", demo: true },
  { label: "Marcas", demo: true },
] as const;

export function Header({ searchQuery, onSearchChange, onGoHome }: HeaderProps) {
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearchChange(searchQuery);
    },
    [searchQuery, onSearchChange],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange],
  );

  const handleNavClick = useCallback(
    (e: React.MouseEvent, item: (typeof NAV_ITEMS)[number]) => {
      e.preventDefault();
      if (item.demo) return;
      if (item.label === "Inicio") onGoHome();
    },
    [onGoHome],
  );

  return (
    <header className={`app-header ${styles.header}`}>
      <div className={styles.headerInner}>
        <button
          type="button"
          className={styles.logo}
          onClick={onGoHome}
          aria-label="Ir a la página principal"
        >
          <span className={styles.logoIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3 8 0 11-12 11-12 .53 5.3-1.61 10.43-6 13.16C15.59 22.55 19.16 20.5 21 17c1-1.85 1-3.5 1-7 0-3.5-3-4-5-2z" />
            </svg>
          </span>
          <span className={styles.logoText}>
            <span className={styles.logoEco}>Eco</span>
            <span className={styles.logoCart}>Cart</span>
          </span>
        </button>

        <form className={styles.searchForm} onSubmit={handleSearch} role="search">
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={handleChange}
            aria-label="Buscar productos"
          />
          <button className={styles.searchBtn} type="submit" aria-label="Buscar">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              width={16}
              height={16}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </form>

        <nav className={styles.navInline} aria-label="Navegación principal">
          <ul className={styles.navList}>
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <a
                  href="#"
                  className={`${styles.navLink} ${item.demo ? styles.navLinkDemo : ""}`}
                  onClick={(e) => handleNavClick(e, item)}
                  aria-disabled={item.demo}
                  title={item.demo ? "Próximamente (demo)" : undefined}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <CartDrawer />
          <UserPopover />
        </div>
      </div>
    </header>
  );
}
