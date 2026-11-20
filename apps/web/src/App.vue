<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const navLink =
  'border-b-2 border-transparent pt-4 pb-3.5 font-semibold text-muted no-underline transition-colors duration-150 hover:text-ink'
const navLinkActive = 'border-primary! text-primary! hover:text-primary'
</script>

<template>
  <header class="border-b border-line bg-surface">
    <div
      class="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-4"
    >
      <RouterLink
        to="/"
        class="py-3 font-serif text-lg font-semibold text-ink no-underline"
        active-class=""
        exact-active-class=""
      >
        Platform Attorney
      </RouterLink>
      <nav aria-label="Principal" class="flex gap-6">
        <RouterLink to="/clients" :class="navLink" :active-class="navLinkActive">
          Clientes
        </RouterLink>
        <RouterLink to="/recordings" :class="navLink" :active-class="navLinkActive">
          Gravações
        </RouterLink>
        <RouterLink to="/costs" :class="navLink" :active-class="navLinkActive">
          Custos
        </RouterLink>
      </nav>
    </div>
  </header>
  <main class="mx-auto max-w-content px-4 pt-6 pb-12 sm:pt-8">
    <RouterView />
  </main>
</template>
