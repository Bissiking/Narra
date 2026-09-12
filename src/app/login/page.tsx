import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./login.module.css";

export const metadata = {
  title: "Connexion — Narra",
};

type LoginPageProps = {
  searchParams?: {
    error?: string;
    returnTo?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (session) redirect("/library");

  const requestedReturnTo = searchParams?.returnTo || "/library";
  const returnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : "/library";
  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="login-title">
        <div className={styles.inner}>
          <h1 id="login-title" className={styles.wordmark}>
            Narr<span>a</span>
          </h1>

          <Link className={styles.button} href={loginHref}>
            <span>Connexion avec Kyros</span>
            <svg
              className={styles.arrow}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m14 7 5 5-5 5" />
            </svg>
          </Link>

          {searchParams?.error === "kyros" && (
            <p className={styles.error} role="alert">
              La connexion Kyros a échoué. Vous pouvez réessayer.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
