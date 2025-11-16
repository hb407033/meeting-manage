import { defineNuxtPlugin } from '#app'
import Aura from '@primevue/themes/aura'
import PrimeVue from 'primevue/config'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        prefix: 'p',
        darkModeSelector: '.dark',
        cssLayer: false,
      },
    },
    ripple: true,
  })

  // 可选：导入常用的PrimeVue组件
  // import Button from 'primevue/button'
  // nuxtApp.vueApp.component('Button', Button)
})
