# Pebbling UI 设计规范

> 版本: 1.0 | 更新时间: 2024-12
> 设计风格参考: Moonvy + Refly

---

## 目录

1. [设计原则](#1-设计原则)
2. [主题系统](#2-主题系统)
3. [色彩规范](#3-色彩规范)
4. [排版规范](#4-排版规范)
5. [间距系统](#5-间距系统)
6. [组件规范](#6-组件规范)
7. [交互规范](#7-交互规范)
8. [动效规范](#8-动效规范)
9. [图标规范](#9-图标规范)
10. [代码实现](#10-代码实现)

---

## 1. 设计原则

### 1.1 核心理念

| 原则 | 说明 |
|------|------|
| **精致** | 避免粗大元素，追求视觉精致感 |
| **通透** | 使用毛玻璃效果，增加层次感 |
| **一致** | 全局统一的视觉语言和交互方式 |
| **响应** | 支持多主题，适应用户偏好 |

### 1.2 设计目标

- 信息密度高但不拥挤
- 按钮和控件小巧精致
- 面板延伸至屏幕底部，避免中途截断
- 左右侧边栏功能清晰分离

---

## 2. 主题系统

### 2.1 可用主题

| 主题名 | 标识 | 图标 | 场景 |
|--------|------|------|------|
| Dark | `dark` | 🌙 | 默认主题，深色护眼 |
| Light | `light` | ☀️ | 日间使用 |
| Christmas | `christmas` | 🎄 | 节日氛围 |
| Cyberpunk | `cyberpunk` | 🌃 | 科技感 |
| Ocean | `ocean` | 🌊 | 清新自然 |

### 2.2 主题切换

```tsx
import { useTheme } from '../contexts/ThemeContext';

const { themeName, setTheme } = useTheme();
const isLight = themeName === 'light';

// 切换主题
setTheme('dark');
```

### 2.3 主题感知样式

```tsx
// 内联样式写法（推荐）
style={{
  background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.5)',
  color: isLight ? '#0f172a' : 'white',
  borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
}}
```

---

## 3. 色彩规范

### 3.1 深色主题 (Dark)

#### 主色调
| 变量 | 色值 | 用途 |
|------|------|------|
| `primary` | `#6366f1` | 主按钮、重点元素 |
| `primaryLight` | `#a5b4fc` | 悬浮态、次要强调 |
| `primaryDark` | `#4f46e5` | 按下态 |

#### 强调色
| 变量 | 色值 | 用途 |
|------|------|------|
| `accent` | `#06b6d4` | 辅助强调 |
| `accentLight` | `#22d3ee` | 辅助悬浮 |

#### 背景色
| 变量 | 色值 | 用途 |
|------|------|------|
| `bgPrimary` | `#0a0a0f` | 页面背景 |
| `bgSecondary` | `#12121a` | 卡片背景 |
| `bgTertiary` | `#1a1a24` | 输入框背景 |
| `bgPanel` | `rgba(18, 18, 26, 0.95)` | 面板背景 |

#### 文字色
| 变量 | 色值 | 用途 |
|------|------|------|
| `textPrimary` | `#ffffff` | 主文字 |
| `textSecondary` | `#a1a1aa` | 次要文字 |
| `textMuted` | `#71717a` | 弱化文字、占位符 |

#### 边框色
| 变量 | 色值 | 用途 |
|------|------|------|
| `border` | `rgba(255, 255, 255, 0.08)` | 主边框 |
| `borderLight` | `rgba(255, 255, 255, 0.04)` | 弱化边框 |

#### 渐变色
| 变量 | 色值 |
|------|------|
| `gradientStart` | `#6366f1` |
| `gradientMiddle` | `#8b5cf6` |
| `gradientEnd` | `#ec4899` |

### 3.2 浅色主题 (Light)

#### 背景色
| 变量 | 色值 | 用途 |
|------|------|------|
| `bgPrimary` | `#f8fafc` | 页面背景 |
| `bgSecondary` | `#f1f5f9` | 卡片背景 |
| `bgTertiary` | `#e2e8f0` | 输入框背景 |
| `bgPanel` | `rgba(255, 255, 255, 0.95)` | 面板背景 |

#### 文字色
| 变量 | 色值 | 用途 |
|------|------|------|
| `textPrimary` | `#0f172a` | 主文字 |
| `textSecondary` | `#475569` | 次要文字 |
| `textMuted` | `#94a3b8` | 弱化文字 |

#### 边框色
| 变量 | 色值 | 用途 |
|------|------|------|
| `border` | `rgba(0, 0, 0, 0.08)` | 主边框 |
| `borderLight` | `rgba(0, 0, 0, 0.04)` | 弱化边框 |

### 3.3 语义色

| 用途 | 深色主题 | 浅色主题 |
|------|----------|----------|
| 成功 | `#22c55e` | `#16a34a` |
| 警告 | `#fcd34d` | `#d97706` |
| 错误 | `#ef4444` | `#dc2626` |
| 信息 | `#38bdf8` | `#0284c7` |

---

## 4. 排版规范

### 4.1 字体家族

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
```

### 4.2 字号规范

| 级别 | 大小 | 用途 |
|------|------|------|
| 超小 | `10px` | 辅助标签、Badge |
| 小 | `11px` | 次要说明文字 |
| 正常 | `12px` | 按钮、输入框、正文 |
| 中等 | `13px` | 表单标签 |
| 大 | `14px` | 面板标题 |
| 标题 | `16-18px` | 区域标题 |
| 大标题 | `20-24px` | 页面标题 |

### 4.3 字重

| 级别 | 值 | 用途 |
|------|------|------|
| 正常 | `400` | 正文 |
| 中等 | `500` | 按钮、标签 |
| 粗体 | `600` | 标题 |
| 加粗 | `700` | 大标题 |

### 4.4 行高

| 场景 | 行高 |
|------|------|
| 单行文本 | `1` |
| 按钮文字 | `1.2` |
| 正文段落 | `1.5` |
| 多行描述 | `1.6` |

---

## 5. 间距系统

### 5.1 基础间距

采用 4px 基数系统：

| 变量 | 值 | 用途 |
|------|------|------|
| `spacing-1` | `4px` | 紧凑间距 |
| `spacing-2` | `8px` | 元素内边距 |
| `spacing-3` | `12px` | 卡片内边距 |
| `spacing-4` | `16px` | 区块间距 |
| `spacing-5` | `20px` | 大区块间距 |
| `spacing-6` | `24px` | 页面边距 |

### 5.2 组件间距

| 组件 | 内边距 | Gap |
|------|--------|-----|
| 小按钮 | `5px 10px` | `4px` |
| 普通按钮 | `7px 14px` | `5px` |
| 输入框 | `9px 12px` | - |
| 小输入框 | `6px 10px` | - |
| 卡片 | `12px 14px` | - |
| 面板区块 | `12px 14px` | - |

---

## 6. 组件规范

### 6.1 圆角规范

| 组件 | 圆角 |
|------|------|
| 小徽章 | `5px` |
| 小按钮/小输入框 | `6px` |
| 按钮/输入框/Tab | `7-8px` |
| 卡片 | `10-12px` |
| 面板/弹窗 | `12-16px` |
| 滚动条 | `100px` |

### 6.2 按钮组件

#### 主按钮 (liquid-btn)
```css
.liquid-btn {
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
}
```

#### 幽灵按钮 (liquid-btn-ghost)
```css
.liquid-btn-ghost {
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--glass-border);
}
```

#### 小按钮 (liquid-btn-sm)
```css
.liquid-btn-sm {
  padding: 5px 10px;
  font-size: 11px;
  border-radius: 6px;
}
```

#### 图标按钮 (liquid-btn-icon)
```css
.liquid-btn-icon {
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 6px;
}
```

### 6.3 输入框组件

#### 标准输入框 (liquid-input)
```css
.liquid-input {
  padding: 9px 12px;
  font-size: 13px;
  border-radius: 8px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}

.liquid-input:focus {
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
```

### 6.4 卡片组件

#### 液态卡片 (liquid-card)
```css
.liquid-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}
```

### 6.5 徽章组件

#### 液态徽章 (liquid-badge)
```css
.liquid-badge {
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 500;
  border-radius: 5px;
  backdrop-filter: blur(8px);
}

.liquid-badge.primary {
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.liquid-badge.success {
  color: #86efac;
  background: rgba(34, 197, 94, 0.15);
}

.liquid-badge.warning {
  color: #fcd34d;
  background: rgba(245, 158, 11, 0.15);
}
```

### 6.6 标签页组件

#### 液态标签 (liquid-tabs)
```css
.liquid-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
}

.liquid-tab {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 7px;
}

.liquid-tab.active {
  color: white;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9));
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}
```

---

## 7. 交互规范

### 7.1 悬浮效果

| 组件 | 效果 |
|------|------|
| 按钮 | `transform: translateY(-1px)` + 发光阴影 |
| 卡片 | 边框变亮 + 阴影增强 |
| 链接 | 颜色变亮 |
| 图标按钮 | `scale(1.05)` |

### 7.2 按下效果

| 组件 | 效果 |
|------|------|
| 按钮 | `transform: translateY(0) scale(0.98)` |
| 卡片 | `scale(0.99)` |

### 7.3 焦点状态

```css
.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

/* 输入框焦点 */
.liquid-input:focus {
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
```

### 7.4 禁用状态

```css
.disabled-state {
  opacity: 0.4;
  pointer-events: none;
  filter: grayscale(0.3);
}

.liquid-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

---

## 8. 动效规范

### 8.1 缓动函数

| 名称 | 值 | 用途 |
|------|------|------|
| `ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | 通用动画 |
| `ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | 弹出动画 |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹性动画 |

### 8.2 过渡时长

| 场景 | 时长 |
|------|------|
| 微交互 | `0.15s` |
| 普通过渡 | `0.2s` |
| 复杂动画 | `0.3s` |

### 8.3 预设动画

```css
/* 淡入上移 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 左滑入 */
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 缩放入场 */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

/* 柔和脉冲 */
@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 闪烁加载 */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### 8.4 工具类

| 类名 | 效果 |
|------|------|
| `.animate-fade-in` | 淡入上移 |
| `.animate-slide-in` | 左滑入 |
| `.animate-scale-in` | 缩放入场 |
| `.animate-pulse-soft` | 柔和脉冲 |
| `.hover-lift` | 悬浮上移 |
| `.hover-glow` | 悬浮发光 |

---

## 9. 图标规范

### 9.1 图标尺寸

| 场景 | 尺寸 |
|------|------|
| 微型 | `12px` |
| 小型 | `14px` |
| 标准 | `16px` |
| 中型 | `20px` |
| 大型 | `24px` |

### 9.2 图标颜色

- 继承父元素颜色 (`currentColor`)
- 与文字颜色保持一致

### 9.3 使用规范

```tsx
// 图标组件模式
<EditIcon className="w-4 h-4" />

// 按钮内图标
<button className="liquid-btn">
  <PlusIcon className="w-4 h-4" />
  <span>新增</span>
</button>
```

---

## 10. 代码实现

### 10.1 主题感知组件模板

```tsx
import { useTheme } from '../contexts/ThemeContext';

export const MyComponent: React.FC = () => {
  const { themeName } = useTheme();
  const isLight = themeName === 'light';

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(18,18,26,0.95)',
        borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
        color: isLight ? '#0f172a' : 'white'
      }}
    >
      <h2 style={{ color: isLight ? '#0f172a' : 'white' }}>标题</h2>
      <p style={{ color: isLight ? '#64748b' : '#a1a1aa' }}>描述文字</p>
    </div>
  );
};
```

### 10.2 CSS 变量使用

```css
/* 使用主题变量 */
.my-component {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

/* 使用毛玻璃变量 */
.glass-component {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(20px);
}

/* 使用阴影变量 */
.elevated {
  box-shadow: var(--shadow-md);
}
```

### 10.3 滚动条样式

```tsx
<div className="custom-scrollbar overflow-y-auto">
  {/* 内容 */}
</div>
```

### 10.4 布局规范

```tsx
// 面板应延伸到底部
<div className="flex flex-col h-full">
  <header className="flex-shrink-0">...</header>
  <main className="flex-grow overflow-y-auto">...</main>
</div>
```

---

## 附录

### A. 色值快查表

#### 深色主题常用色
```
主色: #6366f1
背景: #0a0a0f / #12121a / #1a1a24
文字: #ffffff / #a1a1aa / #71717a
边框: rgba(255,255,255,0.08)
```

#### 浅色主题常用色
```
主色: #6366f1
背景: #f8fafc / #f1f5f9 / #e2e8f0
文字: #0f172a / #475569 / #94a3b8
边框: rgba(0,0,0,0.08)
```

### B. 组件类名速查

| 组件 | 类名 |
|------|------|
| 卡片 | `.liquid-card` |
| 按钮 | `.liquid-btn` |
| 幽灵按钮 | `.liquid-btn-ghost` |
| 小按钮 | `.liquid-btn-sm` |
| 图标按钮 | `.liquid-btn-icon` |
| 输入框 | `.liquid-input` |
| 小输入框 | `.liquid-input-sm` |
| 标签组 | `.liquid-tabs` |
| 单标签 | `.liquid-tab` |
| 徽章 | `.liquid-badge` |
| 面板 | `.liquid-panel` |
| 面板区块 | `.liquid-panel-section` |
| 小标题 | `.liquid-title` |
| 渐变文字 | `.gradient-text` |
| 滚动条 | `.custom-scrollbar` |

---

*文档维护: Pebbling UI Team*
