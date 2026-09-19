export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; return_to?: string }>;
}) {
  const params = await searchParams;
  const returnTo =
    params.return_to?.startsWith("/") && !params.return_to.startsWith("//")
      ? params.return_to
      : "/";

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "24px",
      background: "#f5f5f5",
      fontFamily: "Arial, sans-serif",
    }}>
      <form
        action="/api/auth/login"
        method="post"
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "white",
          padding: "28px",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(0,0,0,.08)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Miguelitos POS</h1>
        <p>Sign in to continue.</p>

        {params.error ? (
          <p style={{ color: "#b42318" }}>
            Invalid email or password.
          </p>
        ) : null}

        <input type="hidden" name="return_to" value={returnTo} />

        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              margin: "8px 0 18px",
              padding: "12px",
            }}
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              margin: "8px 0 20px",
              padding: "12px",
            }}
          />
        </label>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
