import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'

export default defineUserConfig({
  lang: 'en-US',

  head: [
    ['link', { rel: 'icon', href: 'https://tunm-resource.oss-cn-hongkong.aliyuncs.com/blogs_box/favicon32.jpg' }]
  ],

  title: 'InspireFace',
  description: 'A cross-platform high-performance deep learning facial analysis SDK framework.',

  theme: defaultTheme({
    logo: 'https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/126000993.png',

    navbar: ['/', '/get-started'],

    sidebar: [
      {
        text: 'Introduction',
        link: '/introduction',
      },
      {
        text: 'Get Started',
        link: '/get-started',
      },
      {
        text: 'Using with',
        children: [
          {
            text: 'C/C++',
            link: '/using-with/c-cpp',
          },
          {
            text: 'C++',
            link: '/using-with/cpp',
          },
          {
            text: 'Python',
            link: '/using-with/python',
          },
          {
            text: 'Android',
            link: '/using-with/android',
          },
          {
            text: 'iOS',
            link: '/using-with/ios',
          },
          {
            text: 'CUDA',
            link: '/using-with/cuda',
          },
          {
            text: 'Rockchip NPU',
            link: '/using-with/rknpu',
          },
        ],
      },
      {
        text: 'Guides',
        children: [
          {
            text: 'Architecture',
            link: '/guides/arch',
          },
          
        ],
      },
    ],
  }),

  bundler: viteBundler(),
})
