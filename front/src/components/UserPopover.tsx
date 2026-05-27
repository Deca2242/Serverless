import { useState, useRef, useEffect } from "react";
import { useDashboard } from "../hooks/useDashboard";
import styles from "./UserPopover.module.css";

function usernameFromEmail(email?: string): string {
  if (!email) return "usuario";
  return email.split("@")[0] ?? "usuario";
}

export function UserPopover() {
  const { data } = useDashboard();
  const [open, setOpen] = useState(false);
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

  const username = usernameFromEmail(data?.profile.email);
  const defaultAddress = data?.addresses[0];
  const fullAddress = defaultAddress
    ? [defaultAddress.street, defaultAddress.city].filter(Boolean).join(", ")
    : null;

  return (
    <div className={styles.root} ref={ref}>
      <button
        className={styles.avatar}
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        aria-expanded={open}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={styles.avatarIcon}
          aria-hidden="true"
        >
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Información de usuario">
          <p className={styles.greeting}>
            Bienvenido, <strong>{username}</strong>
          </p>
          {fullAddress && (
            <div className={styles.address}>
              <p className={styles.addressLabel}>Dirección de envío por defecto:</p>
              <p className={styles.addressText}>{fullAddress}</p>
            </div>
          )}
          <button
            className={styles.logout}
            type="button"
            disabled
            title="Sin autenticación en esta demo"
          >
            <span aria-hidden="true">↩</span> Cerrar sesión (demo)
          </button>
        </div>
      )}
    </div>
  );
}
