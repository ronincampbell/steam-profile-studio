import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Steam Profile Studio</h1>
      <p className={styles.tagline}>
        Paste a Steam profile and preview it with Points Shop items or your own
        artwork. Coming soon.
      </p>
    </main>
  );
}
