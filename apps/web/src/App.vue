<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="header">
    <strong>Platform Attorney</strong>
    <nav>
      <RouterLink to="/clients">Clientes</RouterLink>
      <RouterLink to="/recordings">Gravações</RouterLink>
    </nav>
  </header>
  <main class="container">
    <RouterView />
  </main>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
nav {
  display: flex;
  gap: 1rem;
}
nav a {
  color: var(--muted);
  text-decoration: none;
}
nav a.router-link-active {
  color: var(--primary);
  font-weight: 600;
}
.container {
  max-width: 1100px;
  margin: 1.5rem auto;
  padding: 0 1rem;
}
</style>
