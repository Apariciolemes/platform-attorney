import '@fontsource-variable/source-sans-3'
import '@fontsource-variable/source-serif-4'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './style.css'

createApp(App).use(router).mount('#app')
