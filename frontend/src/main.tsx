/**
 * 前端应用挂载入口。
 * 这里加载全局样式，并把 App 渲染到浏览器页面根节点。
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/design-system.css'
import './styles/responsive-tokens.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
