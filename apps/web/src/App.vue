<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { to: '/clients', label: 'Clientes' },
  { to: '/recordings', label: 'Gravações' },
  { to: '/costs', label: 'Custos' },
]

/** Destaca a seção também nas subpáginas (ex.: /recordings/:id). */
const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

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
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="[navLink, isActive(item.to) && navLinkActive]"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          active-class=""
          exact-active-class=""
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
  <main class="mx-auto max-w-content px-4 pt-6 pb-12 sm:pt-8">
    <RouterView />
  </main>
</template>
