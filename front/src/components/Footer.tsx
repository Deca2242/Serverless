import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={`app-footer ${styles.footer}`}>
      <div className={styles.links}>
        {["Mis Pedidos", "Soporte", "Política de Privacidad"].map((label) => (
          <a key={label} href="#" className={styles.link}>
            {label}
          </a>
        ))}
      </div>
      <span className={styles.copy}>© 2024 EcoCart Inc.</span>
    </footer>
  );
}
