import { useState, useCallback } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ProductGrid } from "./components/ProductGrid";
import { Footer } from "./components/Footer";
import { useDebouncedValue } from "./hooks/useDebouncedValue";

export function App() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const handleSearchChange = useCallback((q: string) => {
    setSearch(q);
    if (q) setSelectedCategory(undefined);
  }, []);

  const handleCategorySelect = useCallback((slug: string | undefined) => {
    setSelectedCategory(slug);
    setSearch("");
  }, []);

  const goHome = useCallback(() => {
    setSelectedCategory(undefined);
    setSearch("");
  }, []);

  return (
    <div className="app-shell">
      <Header
        searchQuery={search}
        onSearchChange={handleSearchChange}
        onGoHome={goHome}
      />
      <Sidebar selected={selectedCategory} onSelect={handleCategorySelect} />
      <main className="app-main">
        <ProductGrid categorySlug={selectedCategory} search={debouncedSearch} />
      </main>
      <Footer />
    </div>
  );
}
