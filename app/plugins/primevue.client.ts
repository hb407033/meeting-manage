import { defineNuxtPlugin } from '#app'
import Aura from '@primevue/themes/aura'
import PrimeVue from 'primevue/config'

// 导入常用的PrimeVue组件
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputIcon from 'primevue/inputicon'
import InputNumber from 'primevue/inputnumber'
import IconField from 'primevue/iconfield'
import Dropdown from 'primevue/dropdown'
import Select from 'primevue/select'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import Message from 'primevue/message'
import Paginator from 'primevue/paginator'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Toolbar from 'primevue/toolbar'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'

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

  // 注册PrimeVue服务
  nuxtApp.vueApp.use(ToastService)
  nuxtApp.vueApp.use(ConfirmationService)
  nuxtApp.vueApp.directive('tooltip', Tooltip)

  // 提供 Toast 实例
  nuxtApp.provide('$toast', {
    add: (options: any) => {
      // 使用简单的 console.log 作为fallback，后续可以完善
      console.log('Toast:', options)
    }
  })

  // 注册常用的PrimeVue组件
  nuxtApp.vueApp.component('Button', Button)
  nuxtApp.vueApp.component('InputText', InputText)
  nuxtApp.vueApp.component('InputIcon', InputIcon)
  nuxtApp.vueApp.component('InputNumber', InputNumber)
  nuxtApp.vueApp.component('IconField', IconField)
  nuxtApp.vueApp.component('Dropdown', Dropdown)
  nuxtApp.vueApp.component('Select', Select)
  nuxtApp.vueApp.component('Card', Card)
  nuxtApp.vueApp.component('ProgressSpinner', ProgressSpinner)
  nuxtApp.vueApp.component('Message', Message)
  nuxtApp.vueApp.component('Paginator', Paginator)
  nuxtApp.vueApp.component('Dialog', Dialog)
  nuxtApp.vueApp.component('DataTable', DataTable)
  nuxtApp.vueApp.component('Column', Column)
  nuxtApp.vueApp.component('Toolbar', Toolbar)
  nuxtApp.vueApp.component('Tag', Tag)
  nuxtApp.vueApp.component('Toast', Toast)
})
