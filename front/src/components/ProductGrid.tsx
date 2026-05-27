import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import { ProductCard } from "./ProductCard";
import styles from "./ProductGrid.module.css";

interface ProductGridProps {
  categorySlug?: string;
  search?: string;
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={`${styles.skeletonImage} skeleton`} />
      <div className={styles.skeletonBody}>
        <div className={`${styles.skeletonLine} ${styles.skeletonLineLong} skeleton`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineShort} skeleton`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLinePrice} skeleton`} />
      </div>
      <div className={`${styles.skeletonBtn} skeleton`} />
    </div>
  );
}

export function ProductGrid({ categorySlug, search }: ProductGridProps) {
  const { data: products = [], isLoading, isError, error } = useProducts(
    categorySlug,
    search,
  );
  const { data: categories = [] } = useCategories();

  const activeCategory = categories.find((c) => c.slug === categorySlug);

  const heroEyebrow = search
    ? "Búsqueda"
    : activeCategory
      ? "Categoría"
      : "Catálogo";

  const heroTitle = search
    ? `"${search}"`
    : activeCategory
      ? activeCategory.name
      : "Nuestros Productos";

  const heroSubtitle = search
    ? "Resultados que coinciden con tu búsqueda"
    : activeCategory
      ? `Productos seleccionados de ${activeCategory.name}`
      : "Descubre lo mejor de EcoCart, seleccionado para ti";

  if (isError) {
    return (
      <section className={styles.section}>
        <div className="error-msg">
          Error al cargar productos: {(error as Error).message}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>{heroEyebrow}</p>
          <h2 className={styles.heroTitle}>{heroTitle}</h2>
          <p className={styles.heroSubtitle}>{heroSubtitle}</p>
        </div>
        {!isLoading && products.length > 0 && (
          <span className={styles.heroCount}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            {products.length} {products.length === 1 ? "producto" : "productos"}
          </span>
        )}
      </header>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">🔍</div>
          <p className={styles.emptyTitle}>No se encontraron productos</p>
          <p className={styles.emptyText}>
            Prueba con otra búsqueda o categoría diferente.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
