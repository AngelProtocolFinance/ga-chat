<script lang="ts">
let password = $state("");
let error = $state("");
let loading = $state(false);

// focus input on mount without a11y warning
function autofocus(node: HTMLElement) {
  node.focus();
}

async function handle_submit(e: Event) {
  e.preventDefault();
  loading = true;
  error = "";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = "/";
    } else {
      error = "Invalid password";
    }
  } catch {
    error = "Something went wrong";
  } finally {
    loading = false;
  }
}
</script>

<div class="login-page">
  <div class="login-card">
    <div class="brand">
      <svg class="brand-icon" width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="18" width="5" height="8" rx="1.5" fill="var(--accent)"/>
        <rect x="13.5" y="12" width="5" height="14" rx="1.5" fill="var(--accent-hover)"/>
        <rect x="21" y="6" width="5" height="20" rx="1.5" fill="#7dd3fc"/>
      </svg>
      <h1>GA4 Chat</h1>
    </div>
    <p class="subtitle">Analytics for Better Giving</p>

    <form onsubmit={handle_submit}>
      <input
        type="password"
        bind:value={password}
        placeholder="Enter password"
        disabled={loading}
        use:autofocus
      />
      <button type="submit" disabled={loading || !password}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
      {#if error}
        <p class="error">{error}</p>
      {/if}
    </form>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(ellipse 80% 60% at 50% 120%, var(--accent-glow-strong), transparent),
      radial-gradient(ellipse 60% 50% at 80% 0%, rgba(14, 165, 233, 0.06), transparent),
      var(--bg-deepest);
    width: 100%;
  }

  .login-card {
    background: var(--bg-deep);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    padding: 2.5rem;
    width: 100%;
    max-width: 380px;
    box-shadow:
      0 0 0 1px var(--border-subtle),
      0 8px 40px rgba(0, 0, 0, 0.4),
      0 0 80px var(--accent-glow);
    animation: card-in var(--duration-slow) var(--ease-out);
  }

  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
  }

  .brand-icon {
    flex-shrink: 0;
  }

  h1 {
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .subtitle {
    color: var(--text-muted);
    font-size: var(--text-base);
    margin: 0 0 1.5rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  input {
    background: var(--bg-deepest);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    padding: 0.625rem 0.875rem;
    font-family: var(--font-body);
    font-size: var(--text-base);
    outline: none;
    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
  }

  input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  button {
    background: var(--accent);
    color: var(--bg-deepest);
    border: none;
    border-radius: var(--radius-md);
    padding: 0.625rem;
    font-family: var(--font-body);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--duration-fast), transform var(--duration-fast);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  button:active:not(:disabled) {
    transform: scale(0.98);
  }

  .error {
    color: var(--error);
    font-size: var(--text-sm);
    margin: 0;
    text-align: center;
  }
</style>
