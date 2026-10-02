import { fileURLToPath } from 'node:url'
import { stableHeadingIds } from './plugins/stable-heading-ids.js'
import { docsRelease, docsReleasePlugin } from './plugins/docs-release.js'
import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'

const sidebar = [
  { text: 'Introduction', link: '/introduction' },
  { text: 'Get started', link: '/get-started' },
  { text: 'Features', link: '/feature' },
  {
    text: 'Guides',
    children: [
      { text: 'Architecture and lifetime', link: '/guides/arch' },
      { text: 'Model packs', link: '/guides/models-and-builds' },
      { text: 'Image inputs and coordinates', link: '/guides/image-inputs' },
      { text: 'Sessions and tracking', link: '/guides/tracking' },
      { text: 'Face analysis', link: '/guides/optional-analysis' },
      { text: 'Recognition and FeatureHub', link: '/guides/recognition' },
      { text: 'Facial landmarks', link: '/guides/dense-landmark' },
      { text: 'Liveness detection', link: '/guides/liveness-detection' },
      { text: 'Face capture', link: '/guides/face-capture' },
      { text: 'More API recipes', link: '/guides/api-recipes' },
    ],
  },
  {
    text: 'Language and platform',
    children: [
      { text: 'C API', link: '/using-with/c-cpp' },
      { text: 'C++', link: '/using-with/cpp' },
      { text: 'Python', link: '/using-with/python' },
      { text: 'Java', link: '/using-with/java' },
      { text: 'Windows', link: '/using-with/windows' },
      { text: 'Android', link: '/using-with/android' },
      { text: 'Apple', link: '/using-with/apple' },
      { text: 'iOS', link: '/using-with/ios' },
      { text: 'macOS', link: '/using-with/macos' },
      { text: 'HarmonyOS', link: '/using-with/harmonyos' },
    ],
  },
  {
    text: 'Get and build the SDK',
    children: [
      { text: 'Overview and downloads', link: '/build/' },
      { text: 'Source and common options', link: '/build/source' },
      { text: 'Linux', link: '/build/linux' },
      { text: 'Windows', link: '/build/windows' },
      { text: 'macOS', link: '/build/macos' },
      { text: 'Android', link: '/build/android' },
      { text: 'iOS', link: '/build/ios' },
      { text: 'HarmonyOS', link: '/build/harmonyos' },
      { text: 'NVIDIA TensorRT', link: '/build/nvidia' },
      { text: 'Rockchip NPU', link: '/build/rockchip' },
      { text: 'Python packaging', link: '/build/python' },
      { text: 'Java packaging', link: '/build/java' },
    ],
  },
  {
    text: 'Hardware deployment',
    children: [
      { text: 'x86 CPU', link: '/using-with/x86' },
      { text: 'ARM', link: '/using-with/arm' },
      { text: 'NVIDIA TensorRT', link: '/using-with/cuda' },
      { text: 'Rockchip NPU', link: '/using-with/rknpu' },
      { text: 'Python on Rockchip', link: '/guides/python-rockchip-device' },
    ],
  },
  { text: 'InspireCV', link: '/guides/inspirecv' },
  { text: 'Complete examples', link: '/guides/examples' },
  { text: 'API coverage', link: '/guides/api-coverage' },
  { text: 'Performance', link: '/guides/benchmark-remark(updating)' },
  { text: 'Image processing benchmarks', link: '/guides/image-processing-benchmarks' },
  { text: 'Troubleshooting', link: '/guides/troubleshooting' },
]

const chineseLabels = {
  'Introduction': '介绍', 'Get started': '快速开始', 'Features': '功能概览',
  'Guides': '使用指南', 'Architecture and lifetime': '架构与生命周期',
  'Model packs': '模型资源包', 'Image inputs and coordinates': '图像输入与坐标',
  'Sessions and tracking': '会话与跟踪', 'Recognition and FeatureHub': '识别与特征库',
  'Facial landmarks': '人脸关键点', 'Liveness detection': '活体检测',
  'Face capture': '人脸抓拍', 'Language and platform': '语言与平台',
  'Face analysis': '人脸分析', 'API coverage': 'API 功能索引',
  'More API recipes': '补充 API 示例',
  'C API': 'C API', 'C++': 'C++', 'Python': 'Python', 'Android': 'Android',
  'iOS': 'iOS', 'HarmonyOS': 'HarmonyOS', 'Hardware deployment': '硬件部署',
  'Apple': 'Apple',
  'NVIDIA TensorRT': 'NVIDIA TensorRT', 'Rockchip NPU': 'Rockchip NPU',
  'Python on Rockchip': 'Rockchip 上的 Python', 'InspireCV': 'InspireCV',
  'Complete examples': '完整示例', 'Performance': '性能测量', 'Troubleshooting': '常见问题',
  'Image processing benchmarks': '图像处理性能',
  'Get and build the SDK': '获取和编译', 'Overview and downloads': '概述与下载',
  'Source and common options': '源码准备与通用选项', 'Python packaging': 'Python 打包',
  'Java packaging': 'Java 打包',
}

function localizeSidebar(items) {
  return items.map(({ text, link, children }) => ({
    text: chineseLabels[text] ?? text,
    ...(link ? { link: `/zh${link}` } : {}),
    ...(children ? { children: localizeSidebar(children) } : {}),
  }))
}

export default defineUserConfig({
  lang: 'en-US',
  locales: {
    '/': { lang: 'en-US' },
    '/zh/': {
      lang: 'zh-CN',
      description: 'InspireFace 开发文档：人脸检测、跟踪、识别与图像处理的接入指南和可运行示例。',
    },
  },
  plugins: [
    { name: 'docs-stable-heading-ids', extendsMarkdown: stableHeadingIds },
    docsReleasePlugin,
  ],
  templateBuild: fileURLToPath(new URL('./templates/build.html', import.meta.url)),
  title: 'InspireFace',
  description: 'Developer guides and working examples for face detection, tracking, recognition and image processing.',
  head: [
    ['meta', { name: 'docs-version', content: docsRelease.version }],
    ['link', { rel: 'icon', href: 'https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/blogs_box/favicon32.jpg' }],
  ],
  theme: defaultTheme({
    colorMode: 'light',
    themePlugins: {
      tab: { tabs: true, codeTabs: true },
      copyCode: { showInMobile: true },
    },
    logo: 'https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/126000993.png',
    repo: 'https://github.com/deepinsight/insightface/tree/master/cpp-package/inspireface',
    docsRepo: 'HyperInspire/HyperInspire.github.io',
    docsBranch: 'main',
    docsDir: 'docs',
    navbar: [
      { text: 'Home', link: '/' },
      { text: 'Get started', link: '/get-started' },
      { text: 'Get and build the SDK', link: '/build/' },
      { text: 'Examples', link: '/guides/examples' },
    ],
    sidebar,
    locales: {
      '/': {
        selectLanguageName: 'English',
        selectLanguageText: 'Languages',
        selectLanguageAriaLabel: 'Select language',
      },
      '/zh/': {
        home: '/zh/',
        selectLanguageName: '简体中文',
        selectLanguageText: '语言',
        selectLanguageAriaLabel: '切换语言',
        navbarLabel: '站点导航',
        pageNavbarLabel: '文章导航',
        navbar: [
          { text: '首页', link: '/zh/' },
          { text: '快速开始', link: '/zh/get-started' },
          { text: '获取和编译', link: '/zh/build/' },
          { text: '完整示例', link: '/zh/guides/examples' },
        ],
        sidebar: localizeSidebar(sidebar),
        editLinkText: '编辑此页',
        lastUpdatedText: '最近更新',
        contributorsText: '贡献者',
        prev: '上一页',
        next: '下一页',
        tip: '提示',
        warning: '注意',
        danger: '警告',
        important: '重要',
        note: '说明',
        notFound: ['这个页面不存在，可能已经移动。'],
        backToHome: '返回首页',
        openInNewWindow: '在新窗口中打开',
        toggleColorMode: '切换明暗主题',
        toggleSidebar: '打开或关闭导航',
      },
    },

  }),
  bundler: viteBundler(),
})
