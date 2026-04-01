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
    <h1>GA4 Chat</h1>
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
    background: #0a0a0a;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .login-card {
    background: #141414;
    border: 1px solid #262626;
    border-radius: 12px;
    padding: 2.5rem;
    width: 100%;
    max-width: 380px;
  }

  h1 {
    color: #fafafa;
    font-size: 1.5rem;
    margin: 0 0 0.25rem;
  }

  .subtitle {
    color: #737373;
    font-size: 0.875rem;
    margin: 0 0 1.5rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  input {
    background: #0a0a0a;
    border: 1px solid #262626;
    border-radius: 8px;
    color: #fafafa;
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 0.15s;
  }

  input:focus {
    border-color: #525252;
  }

  button {
    background: #fafafa;
    color: #0a0a0a;
    border: none;
    border-radius: 8px;
    padding: 0.625rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .error {
    color: #ef4444;
    font-size: 0.8125rem;
    margin: 0;
    text-align: center;
  }
</style>
