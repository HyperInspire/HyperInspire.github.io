import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'

export default defineUserConfig({
  lang: 'en-US',

  title: 'InspireFace',
  description: 'A cross-platform high-performance deep learning facial analysis SDK framework.',

  theme: defaultTheme({
    logo: 'https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/126000993.png',

    navbar: ['/', '/get-started'],
  }),

  bundler: viteBundler(),
})
