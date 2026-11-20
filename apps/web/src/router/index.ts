import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/clients' },
    {
      path: '/clients',
      name: 'clients',
      component: () => import('@/views/ClientsView.vue'),
    },
    {
      path: '/recordings',
      name: 'recordings',
      component: () => import('@/views/RecordingsView.vue'),
    },
    {
      path: '/costs',
      name: 'costs',
      component: () => import('@/views/CostsView.vue'),
    },
  ],
})
