# Penguin Pebbling 设计规范

## 一、技术栈规范

| 分类 | 技术选型 | 版本 |
|------|---------|------|
| **框架** | React | 19.2.1 |
| **构建工具** | Vite | 6.2.0 |
| **语言** | TypeScript | 5.8.2 |
| **样式方案** | Tailwind CSS | CDN (运行时配置) |
| **图标库** | lucide-react | 0.560.0 |
| **Markdown渲染** | react-markdown | 10.1.0 |
| **AI集成** | @google/genai | 1.33.0 |

---

## 二、项目结构规范

```
penguin-pebbling/
├── components/          # 所有UI组件，按功能命名
│   ├── *View.tsx       # 页面级视图组件
│   ├── *Modal.tsx      # 模态框组件
│   └── *.tsx           # 可复用UI组件
├── services/           # 外部服务集成 (API调用)
├── App.tsx             # 主应用入口，管理全局状态和路由
├── types.ts            # 全局TypeScript类型定义
├── constants.ts        # 常量数据 (博客、作品集等)
└── index.tsx           # React DOM挂载入口
```

---

## 三、组件设计规范

### 3.1 组件命名约定

| 类型 | 命名模式 | 示例 |
|------|---------|------|
| 页面视图 | `*View.tsx` | `ProductsView.tsx`, `AboutView.tsx` |
| 可复用组件 | `PascalCase.tsx` | `BlogCard.tsx`, `Header.tsx` |
| 模态框 | `*Modal.tsx` | `AISearchModal.tsx` |
| 服务层 | `*Service.ts` | `geminiService.ts` |

### 3.2 组件结构模板

```tsx
import React from 'react';
import { IconName } from 'lucide-react';
import { SomeType } from '../types';

interface ComponentNameProps {
  propName: PropType;
  onClick?: (item: ItemType) => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({ propName, onClick }) => {
  // Hooks声明
  // 事件处理函数
  // 渲染
  return (
    <div className="animate-in fade-in duration-500">
      {/* 内容 */}
    </div>
  );
};
```

### 3.3 Props接口规范

- **必须**在组件文件内定义 `interface *Props`
- 回调函数命名采用 `on*` 前缀: `onClick`, `onNavigate`, `onClose`
- 可选属性使用 `?` 标记

---

## 四、视觉设计规范

### 4.1 配色系统 (深色主题)

| Token名称 | 色值 | 用途 |
|----------|------|------|
| `background` | `#0a0a0a` | 页面底色 |
| `surface` | `#171717` | 卡片/面板背景 |
| `primary` | `#ffffff` | 主要文字 |
| `secondary` | `#a3a3a3` | 次要文字 |
| `accent` | `#3b82f6` | 强调色/链接 |
| `neutral-400` | - | 描述文字 |
| `neutral-500/600` | - | 辅助文字/禁用态 |

### 4.2 边框与分割线

```css
border-white/5    /* 默认边框 */
border-white/10   /* hover状态边框 */
border-white/20   /* 强调边框 */
```

### 4.3 圆角规范

| 尺寸 | Class | 适用场景 |
|------|-------|---------|
| 小 | `rounded-lg` | 按钮、标签 |
| 中 | `rounded-xl` / `rounded-2xl` | 卡片 |
| 大 | `rounded-3xl` | 大卡片、英雄区块 |
| 圆形 | `rounded-full` | 头像、药丸按钮 |

### 4.4 阴影效果

```css
shadow-2xl shadow-black/50           /* 卡片阴影 */
shadow-[0_0_15px_rgba(255,255,255,0.3)]  /* 发光效果 */
shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)]  /* 紫色辉光 */
```

---

## 五、动画与交互规范

### 5.1 入场动画 (必须使用)

```css
animate-in fade-in duration-500                    /* 淡入 */
animate-in fade-in slide-in-from-bottom-4 duration-500   /* 淡入+上滑 */
animate-in fade-in slide-in-from-bottom-8 duration-700   /* 淡入+大幅上滑 */
```

### 5.2 过渡时长

| 场景 | 时长 | 示例 |
|------|------|------|
| 颜色/透明度变化 | `transition-colors` | hover状态 |
| 变形动画 | `transition-transform duration-300` | 缩放/位移 |
| 复杂动画 | `transition-all duration-500` | 多属性变化 |
| 图片缩放 | `transition-transform duration-700` | hover放大 |

### 5.3 3D卡片交互 (参考 BlogCard.tsx)

- 使用 `perspective: 1000px` 创建3D空间
- 鼠标位置计算旋转角度 `rotateX / rotateY`
- 配合 `will-change-transform` 优化性能

---

## 六、布局规范

### 6.1 容器最大宽度

```css
max-w-[1400px]   /* 主内容区 */
max-w-[1600px]   /* 宽展示区 (画廊) */
max-w-3xl        /* 文章正文 */
max-w-4xl        /* 文章头部 */
max-w-5xl        /* 英雄图片 */
max-w-6xl        /* 中等页面 */
```

### 6.2 响应式网格

```css
/* 博客卡片网格 */
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

/* 瀑布流布局 */
columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6

/* 12列布局 */
lg:col-span-4 / lg:col-span-8
```

### 6.3 间距系统

```css
px-4 sm:px-6 lg:px-8   /* 水平内边距 */
py-12 / py-20 / py-32  /* 垂直区块间距 */
gap-6 / gap-8          /* 网格间距 */
mb-8 / mb-12 / mb-16   /* 区块下边距 */
```

---

## 七、按钮与交互元素规范

### 7.1 主要按钮

```tsx
<button className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-colors">
  Primary Action
</button>
```

### 7.2 次要/幽灵按钮

```tsx
<button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full border border-white/5 transition-colors">
  Secondary
</button>
```

### 7.3 图标按钮

```tsx
<button className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
  <IconName className="w-5 h-5" />
</button>
```

### 7.4 标签/徽章

```tsx
/* 分类标签 */
<span className="px-3 py-1.5 text-xs font-semibold backdrop-blur-xl bg-black/60 text-white rounded-full border border-white/10">
  Category
</span>

/* 紫色强调标签 */
<span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
  Label
</span>
```

---

## 八、图片与媒体规范

- 使用 `loading="lazy"` 懒加载图片
- 图片容器使用 `overflow-hidden` 配合 `object-cover`
- 提供占位符背景: `bg-neutral-800 animate-pulse`
- 宽高比使用 `aspect-[4/3]`, `aspect-[21/9]` 等

---

## 九、代码风格规范

### 9.1 TypeScript规范

- **必须**使用显式类型注解 (`React.FC<Props>`)
- **必须**为所有props定义interface
- 使用 `ViewState` 等联合类型定义有限状态集

### 9.2 React规范

- 使用函数式组件 + Hooks
- 使用 `useMemo` 缓存派生数据
- 使用 `useRef` 管理DOM引用
- 副作用放在 `useEffect` 中并正确清理

### 9.3 样式规范

- 优先使用Tailwind CSS原子类
- 复杂动态样式使用行内 `style` 对象
- 响应式断点: `sm:` `md:` `lg:` `xl:`
- Group hover 使用 `group` + `group-hover:*` 模式

### 9.4 注释规范

```tsx
{/* Section Name */}           // JSX区块注释
// Single line explanation    // 逻辑说明
```

---

## 十、可访问性规范

- 按钮/链接必须可通过键盘聚焦
- 图片必须包含 `alt` 属性
- 表单元素使用 `disabled` 状态管理
- 模态框打开时禁用背景滚动 (`document.body.style.overflow`)
