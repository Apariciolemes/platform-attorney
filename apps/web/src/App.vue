<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="app-header">
    <div class="app-header-inner">
      <RouterLink to="/" class="wordmark">Platform Attorney</RouterLink>
      <nav aria-label="Principal">
        <RouterLink to="/clients">Clientes</RouterLink>
        <RouterLink to="/recordings">Gravações</RouterLink>
      </nav>
    </div>
  </header>
  <main class="app-main">
    <RouterView />
  </main>
</template>

<style scoped>
.app-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-line);
}

.app-header-inner {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.wordmark {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-ink);
  text-decoration: none;
  padding: var(--space-3) 0;
}

nav {
  display: flex;
  gap: var(--space-6);
}

nav a {
  padding: var(--space-4) 0 calc(var(--space-4) - 2px);
  border-bottom: 2px solid transparent;
  color: var(--color-muted);
  font-weight: 600;
  text-decoration: none;
  transition:
    color 150ms,
    border-color 150ms;
}

nav a:hover {
  color: var(--color-ink);
}

nav a.router-link-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.app-main {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: var(--space-8) var(--space-4) var(--space-12);
}

@media (max-width: 40rem) {
  .app-main {
    padding-top: var(--space-6);
  }
}
</style>
