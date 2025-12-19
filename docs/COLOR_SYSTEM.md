# 颜色系统映射文档

## 当前配色方案：蓝色系 (Blue)

当前项目使用 **蓝色 (#3B82F6)** 作为主强调色。

---

## 颜色映射表

### 主强调色
| 用途 | 当前值 (Blue) | 备选值 (Cyan) | 备选值 (Purple) |
|------|---------------|---------------|-----------------|
| 主色 primary | `#3b82f6` | `#06b6d4` | `#8b5cf6` |
| 浅色 primaryLight | `#60a5fa` | `#22d3ee` | `#a78bfa` |
| 深色 primaryDark | `#2563eb` | `#0891b2` | `#7c3aed` |

### rgba 透明色
| 用途 | 当前值 (Blue) | 备选值 (Cyan) |
|------|---------------|---------------|
| 发光 glow | `rgba(59, 130, 246, 0.4)` | `rgba(6, 182, 212, 0.4)` |
| 背景透明 | `rgba(59, 130, 246, 0.15)` | `rgba(6, 182, 212, 0.15)` |
| 边框透明 | `rgba(59, 130, 246, 0.3)` | `rgba(6, 182, 212, 0.3)` |

### Tailwind 类名
| 用途 | 当前值 | 备选值 |
|------|--------|--------|
| 背景色 | `bg-blue-500` | `bg-cyan-500` |
| 文字色 | `text-blue-400` | `text-cyan-400` |
| 边框色 | `border-blue-500` | `border-cyan-500` |
| 渐变起点 | `from-blue-400` | `from-cyan-400` |
| 渐变终点 | `to-blue-500` | `to-cyan-500` |
| 阴影色 | `shadow-blue-500/25` | `shadow-cyan-500/25` |

---

## 一键切换色值方法

### 方法一：全局搜索替换

在 VSCode 中使用正则替换（Ctrl+Shift+H），勾选正则模式：

#### 从 Blue → Cyan 切换：

```
查找：#3b82f6
替换：#06b6d4

查找：#60a5fa  
替换：#22d3ee

查找：#2563eb
替换：#0891b2

查找：rgba\(59,\s*130,\s*246
替换：rgba(6, 182, 212

查找：blue-500
替换：cyan-500

查找：blue-400
替换：cyan-400

查找：blue-300
替换：cyan-300

查找：blue-600
替换：cyan-600
```

#### 从 Cyan → Blue 切换（逆向）：

```
查找：#06b6d4
替换：#3b82f6

查找：#22d3ee
替换：#3b82f6

查找：#67e8f9
替换：#60a5fa

查找：#0891b2
替换：#2563eb

查找：rgba\(6,\s*182,\s*212
替换：rgba(59, 130, 246

查找：cyan-500
替换：blue-500

查找：cyan-400
替换：blue-400

查找：cyan-300
替换：blue-300

查找：cyan-600
替换：blue-600
```

---

### 方法二：修改主题配置文件

核心文件：`contexts/ThemeContext.tsx`

修改以下配置即可全局生效：

```typescript
// 深色主题配置 (约第69行)
const darkTheme: Theme = {
  colors: {
    primary: '#3b82f6',      // ← 改这里
    primaryLight: '#60a5fa', // ← 改这里
    primaryDark: '#2563eb',  // ← 改这里
    accent: '#3b82f6',       // ← 改这里
    accentLight: '#3b82f6',  // ← 改这里
    // ...
    gradientStart: '#3b82f6',  // ← 改这里
    gradientMiddle: '#60a5fa', // ← 改这里
    glow: 'rgba(59, 130, 246, 0.4)', // ← 改这里
  },
};

// 浅色主题配置 (约第97行)
const lightTheme: Theme = {
  colors: {
    primary: '#3b82f6',      // ← 改这里
    // ...同上
  },
};
```

---

### 方法三：CSS 变量切换

修改 `index.css` 中的 CSS 变量：

```css
:root {
  --color-accent: #3b82f6;      /* ← 改这里 */
  --color-accent-light: #60a5fa; /* ← 改这里 */
}
```

---

## 涉及的文件清单

### 核心配置文件
- `contexts/ThemeContext.tsx` - 主题色值定义
- `index.css` - CSS 变量和样式覆盖

### 组件文件（包含硬编码色值）
- `App.tsx` - 主应用
- `components/CreativeLibrary.tsx` - 创意库
- `components/GenerateButton.tsx` - 生成按钮
- `components/ImageUploader.tsx` - 图片上传
- `components/WelcomeScreen.tsx` - 欢迎页
- `components/Canvas/index.tsx` - 画布
- `components/Canvas/nodes/*.tsx` - 各类节点

### 需要同步检查的 Tailwind 类
搜索以下类名确保一致性：
- `blue-300`, `blue-400`, `blue-500`, `blue-600`
- `shadow-blue-*`
- `from-blue-*`, `to-blue-*`
- `ring-blue-*`
- `border-blue-*`

---

## 主题色值对照表

### 深色模式 (Dark)
| 元素 | 色值 |
|------|------|
| 主背景 bgPrimary | `#0a0a0f` |
| 次背景 bgSecondary | `#12121a` |
| 卡片背景 bgTertiary | `#1a1a24` |
| 面板背景 bgPanel | `rgba(10, 10, 15, 0.6)` |
| 主文字 textPrimary | `#ffffff` |
| 次文字 textSecondary | `#a1a1aa` |
| 辅助文字 textMuted | `#71717a` |
| 边框 border | `rgba(255, 255, 255, 0.08)` |

### 浅色模式 (Light)
| 元素 | 色值 |
|------|------|
| 主背景 bgPrimary | `#f8fafc` |
| 次背景 bgSecondary | `#f1f5f9` |
| 卡片背景 bgTertiary | `#e2e8f0` |
| 面板背景 bgPanel | `rgba(255, 255, 255, 0.95)` |
| 主文字 textPrimary | `#0f172a` |
| 次文字 textSecondary | `#475569` |
| 辅助文字 textMuted | `#94a3b8` |
| 边框 border | `rgba(0, 0, 0, 0.08)` |

---

## 注意事项

1. **替换顺序**：先替换十六进制值，再替换 Tailwind 类名
2. **大小写**：十六进制值不区分大小写，但建议统一使用小写
3. **测试**：替换后务必在深色和浅色模式下都测试
4. **构建验证**：运行 `npm run build` 确保无编译错误

---

*最后更新：2024-12*
