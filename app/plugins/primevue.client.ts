import { defineNuxtPlugin } from '#app'
import Aura from '@primevue/themes/aura'
import PrimeVue from 'primevue/config'

// 专业商务蓝主题配置
const businessBlueTheme = {
  ...Aura,
  components: {
    ...Aura.components,
    button: {
      ...Aura.components?.button,
      root: {
        ...Aura.components?.button?.root,
        background: '{primary.color}',
        borderColor: '{primary.color}',
        color: '{primary.contrast.color}',
        hoverBackground: '{primary.hover.color}',
        hoverBorderColor: '{primary.hover.color}',
        activeBackground: '{primary.active.color}',
        activeBorderColor: '{primary.active.color}'
      },
      outlined: {
        ...Aura.components?.button?.outlined,
        borderColor: '{primary.color}',
        color: '{primary.color}',
        hoverBackground: '{primary.color}',
        hoverBorderColor: '{primary.color}',
        hoverColor: '{primary.contrast.color}',
        activeBackground: '{primary.color}',
        activeBorderColor: '{primary.color}',
        activeColor: '{primary.contrast.color}'
      },
      text: {
        ...Aura.components?.button?.text,
        color: '{primary.color}',
        hoverBackground: '{primary.50}',
        hoverColor: '{primary.color}',
        activeBackground: '{primary.100}',
        activeColor: '{primary.color}'
      },
      iconOnly: {
        ...Aura.components?.button?.iconOnly,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        color: '{primary.color}',
        hoverBackground: '{primary.50}',
        hoverBorderColor: '{primary.50}',
        hoverColor: '{primary.color}',
        activeBackground: '{primary.100}',
        activeBorderColor: '{primary.100}',
        activeColor: '{primary.color}'
      },
      rounded: {
        ...Aura.components?.button?.rounded,
        borderRadius: '50%'
      }
    },
    dialog: {
      ...Aura.components?.dialog,
      header: {
        ...Aura.components?.dialog?.header,
        fontSize: '1.125rem', // text-2xl equivalent
        fontWeight: '600'
      }
    }
  },
  colorScheme: {
    ...Aura.colorScheme,
    primary: {
      ...Aura.colorScheme?.primary,
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#1e40af', // 专业商务蓝主色
      700: '#1d4ed8',
      800: '#1e3a8a',
      900: '#1e293b',
      950: '#172554',
      contrast: {
        ...Aura.colorScheme?.primary?.contrast,
        color: '#ffffff'
      }
    },
    info: {
      ...Aura.colorScheme?.info,
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
      contrast: {
        ...Aura.colorScheme?.info?.contrast,
        color: '#ffffff'
      }
    },
    success: {
      ...Aura.colorScheme?.success,
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
      contrast: {
        ...Aura.colorScheme?.success?.contrast,
        color: '#ffffff'
      }
    },
    warning: {
      ...Aura.colorScheme?.warning,
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
      contrast: {
        ...Aura.colorScheme?.warning?.contrast,
        color: '#ffffff'
      }
    },
    danger: {
      ...Aura.colorScheme?.danger,
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
      contrast: {
        ...Aura.colorScheme?.danger?.contrast,
        color: '#ffffff'
      }
    }
  }
}

// 导入常用的PrimeVue组件
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputIcon from 'primevue/inputicon'
import InputNumber from 'primevue/inputnumber'
import IconField from 'primevue/iconfield'
import Dropdown from 'primevue/dropdown'
import Select from 'primevue/select'
import Card from 'primevue/card'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
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
      preset: businessBlueTheme, // 使用定制的专业商务蓝主题
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

  // 提供 Toast 实例 - 使用真正的PrimeVue Toast服务
  nuxtApp.provide('$toast', nuxtApp.vueApp.config.globalProperties.$toast)

  // 注册常用的PrimeVue组件
  nuxtApp.vueApp.component('Button', Button)
  nuxtApp.vueApp.component('InputText', InputText)
  nuxtApp.vueApp.component('InputIcon', InputIcon)
  nuxtApp.vueApp.component('InputNumber', InputNumber)
  nuxtApp.vueApp.component('IconField', IconField)
  nuxtApp.vueApp.component('Dropdown', Dropdown)
  nuxtApp.vueApp.component('Select', Select)
  nuxtApp.vueApp.component('Card', Card)
  nuxtApp.vueApp.component('Textarea', Textarea)
  nuxtApp.vueApp.component('Checkbox', Checkbox)
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
