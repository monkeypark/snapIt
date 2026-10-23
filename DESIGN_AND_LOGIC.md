# 《Snap It!》游戏设计与底层逻辑思维全景文档
**Document Version:** 1.0.0  
**Project:** Snap It! (Arcade Reflex & Speed Challenge)  
**Tech Stack:** Phaser 3.87 · TypeScript · Vite · Capacitor (Haptics & Preferences) · Web Audio API · Tailwind CSS

---

## 目录 (Table of Contents)
1. [项目概述与定位 (Executive Overview & Identity)](#1-项目概述与定位)
2. [核心设计理念与视听美学 (Design Philosophy & Aesthetics)](#2-核心设计理念与视听美学)
3. [系统架构与场景状态机 (System Architecture & Scene Pipeline)](#3-系统架构与场景状态机)
4. [核心游戏机制与数学逻辑 (Core Mechanics & Mathematical Logic)](#4-核心游戏机制与数学逻辑)
5. [底层子服务设计与实现逻辑 (Subservices & Technical Logic)](#5-底层子服务设计与实现逻辑)
6. [界面交互与用户体验细节 (UX & Micro-interactions)](#6-界面交互与用户体验细节)
7. [技术难点与性能优化考量 (Performance & Engineering Highlights)](#7-技术难点与性能优化考量)
8. [未来扩展规划 (Future Roadmap)](#8-未来扩展规划)

---

## 1. 项目概述与定位

### 1.1 游戏简介
《Snap It!》是一款定位于**现代极简主义、高压心流（High-Pressure Flow State）的街机级极速反应游戏**。游戏旨在考验并训练玩家在微秒级别的视觉辨识、短期记忆、决策判定及触控反应能力。

### 1.2 核心价值与目标体验
- **0 学习成本，秒开秒玩**：无论新手还是硬核玩家，单手触控即可理解规则并立刻进入紧张刺激的心流状态。
- **毫秒级触控与视听全通道反馈**：视网膜级动画、无延迟的程序化合成音效、硬件级触觉振动三位一体，带来极致爽快的打击感。
- **梯度递增的极限挑战**：从轻松的经典阶段赛，到瞬态消失的记忆闪烁，再到挑战人类神经反射极限的疯狂与受虐模式。

---

## 2. 核心设计理念与视听美学

### 2.1 视觉风格：Cyber-Minimalist 遇上 Kawaii Core
项目避免了传统反应类小游戏的粗糙感与杂乱感，采用工业现代感与可爱软萌核心碰撞的高级质感：
- **基底色彩体系 (60%)**：深邃夜空黑背景（`#020617`），搭配点阵网格（Dot Matrix TileSprite），构建纯净沉浸的数字竞技场。
- **结构与容器色彩 (30%)**：半透明毛玻璃效果卡片（`rgba(255, 255, 255, 0.03)`），搭配纤细发光边框（1px）与圆角（12px~20px），保证界面克制、高级。
- **焦点强调色彩 (10%)**：高饱和霓虹色（电光紫 `#6366f1`、樱花粉 `#ec4899`、活力橙 `#f59e0b`、翡翠绿 `#10b981`、猩红警示 `#f43f5e`），作为核心目标、连击反馈与操作按钮的视觉抓手。

### 2.2 纯程序化矢量图形（Zero External Assets）
为保证极致的加载速度（首屏毫秒级冷启动）与跨分辨率绝对清晰度：
- **12 款 Kawaii 矢量图标**：完全由 `PreloadScene` 使用 Phaser Graphics 运行时绘制烘焙而成（五角星、六边形、闪电、钻石、十字、光环、三角、方块、螺旋、爱心、月亮、沙漏）。
- **图标细节与灵魂**：每个图标均包含内发光、高光曲率（Highlight）、萌趣表情（眨眼、微笑、粉腮）及独有特征，兼具视觉辨识度与亲和力。

### 2.3 动态视差与环境响应
- **鼠标/手势视差 (Pointer Parallax)**：主菜单根据指针坐标动态偏移动态点阵层与背景环境光晕（Ambient Glow），使扁平 2D 场景产生微妙的景深立体感。
- **心跳呼吸暗角 (Heartbeat Vignette)**：高难度模式下，屏幕四周会随背景节拍跳动红色脉冲光晕，营造生理级肾上腺素飙升氛围。

---

## 3. 系统架构与场景状态机

### 3.1 总体架构分层
```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface / Screen                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Phaser 3 Scene Manager                      │
│   ┌──────────────┐     ┌──────────────┐    ┌────────────┐   │
│   │ PreloadScene │ ──> │  MenuScene   │ ─> │ PlayScene  │   │
│   └──────────────┘     └──────┬───────┘    └─────┬──────┘   │
│                               │                  │          │
│                               ▼                  ▼          │
│                        ┌──────────────┐    ┌────────────┐   │
│                        │TrainingScene │    │ StatsScene │   │
│                        └──────────────┘    └────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   Global Services Layer                     │
│ ┌───────────────────┐ ┌───────────────────┐ ┌─────────────┐ │
│ │   SoundManager    │ │   NativeBridge    │ │MissionManage│ │
│ │ (Web Audio Synth) │ │ (Haptics/Storage) │ │ (Daily Task)│ │
│ └───────────────────┘ └───────────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 场景状态流转逻辑
1. **`PreloadScene`（启动预加载层）**：
   - 动态初始化 Canvas 矢量纹理并注入 Phaser TextureManager；
   - 监听字体加载状态，确保 Inter 与 Barlow Condensed 渲染绝对锐利；
   - 预热完成后，通过 `camera.fadeOut` 平滑过渡至 `MenuScene`。
2. **`MenuScene`（主枢纽层）**：
   - 展示主标题、版本印记、设置开关（SFX/BGM）；
   - **分层抽屉逻辑**：模式选择列表（Classic, Memory, Attack, Crazy, Masochist）；
   - 普通模式点击后右侧滑入难度选择面板（Easy, Medium, Hard），支持随时返回；
   - 疯狂模式检测新手训练完成状态，未完成则自动路由至新手引导；
   - 底部挂接「每日任务弹窗 (Missions)」、「生涯数据档案 (Stats)」及「复习训练 (Training)」。
3. **`TrainingScene`（交互式新手引导）**：
   - 4 步浸入式教学：基础点击机制 ➔ 失败惩罚机制 ➔ 难度体系解析 ➔ 战斗就绪确认；
   - 任何阶段均提供一键返回主菜单，杜绝强制冗长教学引起的玩家流失。
4. **`PlayScene`（高频对战核心层）**：
   - 负责游戏主循环：目标生成、网格渲染、倒计时管理、碰撞打击、连击判定；
   - 失败或通关后呼出居中结果模态框，提供精准命中率分析、重开、历史战绩与回退主页入口。
5. **`StatsScene`（表现档案可视化）**：
   - 基于本地记录渲染近 10 局的「准确率趋势折线图」与「单局综合表现得分图」；
   - 具备空数据引导态及点位悬浮微交互提示（Tooltip）。

---

## 4. 核心游戏机制与数学逻辑

### 4.1 五大游戏模式

| 模式名称 | 核心机制 | 胜利/结束判定 | 专属特色 |
| :--- | :--- | :--- | :--- |
| **CLASSIC 10** | 连续找出 10 个目标图标 | 完成 10 轮获胜；点错立刻失败 | 纯速度竞速模式，计秒越短越佳 |
| **MEMORY FLASH** | 目标出现后闪烁消失，纯凭记忆寻回 | 完成 10 轮获胜；点错立刻失败 | 记忆窗口随难度大幅缩水（800ms ➔ 250ms） |
| **TIME ATTACK** | 固定倒计时，在时限内刷出最高分 | 倒计时归零结束；点错扣除时间（1s~3s） | 每连击 5 次奖励额外 1.5s 续航，越快活得越久 |
| **CRAZY MODE** | 无尽高压，目标极短时间消失且卡片自转 | 倒计时归零或点错立刻失败 | 心跳级 160BPM 动态提速，自转速度随 Combo 激增 |
| **MASOCHIST MODE** | 极限受虐反应，时间窗口缩至生理极限 | 容错为 0，倒计时极短 | 起步 2.5s，每击缩减 250ms，网格极速暴增至 4x3 |

### 4.2 动态难度自适应算法 (DDA)

#### (1) 网格矩阵动态扩张公式
候选区网格行列数 $(Rows \times Cols)$ 根据当前轮次或连击数阶梯式扩张：
- **普通/经典模式**：
  - Easy: 初始 $2 \times 2$ (4 张卡)，第 6 轮后增至 $3 \times 2$ (6 张卡)；
  - Medium: 初始 $2 \times 2$，第 4 轮后 $3 \times 2$，第 8 轮后 $3 \times 3$ (9 张卡)；
  - Hard: 初始 $3 \times 2$ (6 张卡)，第 5 轮后扩充至 $3 \times 3$ (9 张卡)。
- **Crazy / Masochist 模式 (基于 Combo)**：
  $$\text{Grid}(Combo) = \begin{cases} 
  2 \times 2, & Combo < 4 \\
  3 \times 2, & 4 \le Combo < 8 \\
  3 \times 3, & 8 \le Combo < 15 \\
  4 \times 3, & Combo \ge 15 \quad (\text{12 张密集卡片})
  \end{cases}$$

#### (2) 目标展示窗口衰减公式 (Memory / Crazy / Masochist)
记忆隐藏倒计时 $T_{hide}$ 计算逻辑：
- **Crazy 模式**：
  $$T_{hide} = \max(0.40s,\; 3.0s - Combo \times 0.16s)$$
- **Masochist 模式**：
  $$T_{hide} = \max(0.30s,\; 2.5s - Combo \times 0.25s)$$
达到极限时，玩家仅有 **300ms** 完成「看目标 ➔ 目标消失 ➔ 在 12 张旋转卡片中扫视 ➔ 精准点击」，挑战神经反射极限。

#### (3) 卡片动态旋转干扰算法
在硬核及疯狂模式下，所有选项卡片施加连续自转，旋转周期 $T_{rot}$ 随连击数动态递减（越转越快）：
$$T_{rot} = \max(200ms,\; T_{base} - Combo \times \Delta t)$$
动态自转破坏了玩家单纯依赖几何朝向判断的直觉，迫使其调动深层图形特征提取认知。

### 4.3 连击评分与压力层叠系统
1. **Combo 阶梯与色彩反馈**：
   - $Combo < 5$: 白光轻微弹动；
   - $Combo \ge 5$: 翡翠绿高能状态；
   - $Combo \ge 10$: 亮金色暴击状态；
   - $Combo \ge 15$: 猩红超载状态（Red Supercharged）。
2. **打击感合成反馈链**：
   - 每次正确点击触发：全屏高亮 Flash（80~150ms）+ 镜头缩放震颤（Zoom 1.02x）+ 20 粒发光粒子炸裂 + 向上浮动的飘字与倍率提示（PERFECT! 5x COMBO）。

---

## 5. 底层子服务设计与实现逻辑

### 5.1 `SoundManager`：纯程序化 Web Audio 合成器
为了杜绝音频文件请求延迟、音画不同步及大体积素材问题，项目内置了一套完整的**实时数学合成器**：
- **正弦波递增阶梯 (Correct Chime)**：
  $$f(Round) = 880\text{Hz} + (Round \times 110\text{Hz})$$
  采用指数衰减包络（Exponential Ramp），音调随通关轮次逐渐上升，给予正向心理期待。
- **锯齿波失误蜂鸣 (Mistake Buzzer)**：
  $110\text{Hz}$ 线性跌落至 $55\text{Hz}$ 的 Sawtooth 粗糙音色，产生鲜明的挫败感提示。
- **胜利大和弦 (Victory Fanfare)**：
  由 C5, E5, G5, C6 构成的四音阶方形波琶音。
- **全新纪录华丽凯歌 (New Record Fanfare & Shimmer)**：
  当玩家打破历史最高纪录时触发的特殊音效。由 C5, E5, G5, B5, C6, E6 构成的极速高阶大调琶音，叠加上空灵闪烁的超高频泛音脉冲（2200Hz~4000Hz Sparkle Shimmer），仪式感与心理满足感拉满。
- **自适应动态心跳 BGM (Procedural Rhythm Engine)**：
  利用 `AudioContext.currentTime` 与递归计时器构建 8 分音符步进鼓机：
  - 标准模式（120 BPM）：低音底鼓（120Hz Tom）+ 随机交错小军鼓 + 柔和高频闭镲（Tick）；
  - 疯狂模式（160+ BPM）：**模拟心脏跳动的双连击（LUB-DUB 100Hz/80Hz）** + 6000Hz 极具神经紧迫感的金属滴答声，其播放速度还会随着 Combo 的递增实时倍速！

### 5.2 `NativeBridge`：软硬件融合与持久化层
- **多级触觉振动 (Capacitor Haptics)**：
  - 普通按钮/普通命中：Light Impact（10ms）；
  - 5 倍连击暴击：Medium Impact（30ms）；
  - 胜利判定：Success Notification；
  - 刷新历史纪录：Heavy Impact 爆破级震感；
  - 失误中断：Error Notification（200ms 强震）。
  - 内置优雅降级方案：若在纯浏览器环境运行，自动调用 HTML5 `navigator.vibrate`。
- **分级双模高分与纪录破发引擎 (Difficulty-Aware Record Break Engine)**：
  - **难度独立纪录隔离**：分别独立持久化 Easy、Medium、Hard 各难度与各模式的最高纪录（`highscore_${mode}_${difficulty}` 与全局 `highscore_${mode}`），解决过往在 Easy 通关后 Hard 无法触发破纪录的判定冲突；
  - **双重存储防崩容灾**：全面集成 Capacitor Preferences 与 HTML5 `window.localStorage` 双保险安全回退机制；
  - **全链路破纪录庆祝体系 (Grand New Record Celebration)**：
    - **双环辉光结算徽章**：破发瞬间，卡片生成「🏆 NEW RECORD! 🏆」双层流光外环呼吸徽章，并同步对比展现历史旧前高（Previous Best）；
    - **金辉粒子双连爆破**：触发大调激昂破纪录音效（`playNewRecord()`）与双波次金色星芒粒子喷涌；
    - **主界面与选关高亮透传**：主菜单模式卡片与难度选关卡片实时透传金色「★ RECORD: xx」与各难度最佳成绩，极大增强突破正反馈。
  - 独立保存最近 50 次对战的完整元数据（时间戳、模式、得分、命中率），用于数据回溯。

### 5.3 `MissionManager`：每日任务与专属视觉勋章陈列系统 (Daily Missions & Visual Badges)
- **自然日确定性哈希任务生成 (Deterministic Daily Quest Generator)**：
  - 基于自然日字符串（如 `2026-10-19`）运行位运算多项式哈希，计算全局每日种子 `seed = getDaySeed(dateStr)`；
  - 保证当日所有进入游戏的挑战者获得一致且新鲜的每日任务轮换：
    - **核心点击协议 (Tap Protocol)**：动态生成每日精准触控指标（如 50、60、75、80 次累计有效点击）；
    - **心流连击考验 (Combo Flow)**：要求在任意模式下达成 10x ~ 18x 连击极限；
    - **模式大师专项 (Mode Quests)**：随机轮换「Time Attack 30+ 分冲刺」、「Classic 10 阶段 sub-16s 疾速通关」、「单局 90%+ 极致命中率」等专项。
- **视觉勋章与陈列柜体系 (Visual Badge Cabinet & Tiers)**：
  - 每个每日任务绑定专属的视觉勋章（如「⚡ Neon Reflex Badge」、「★ Hyper Streak Medal」、「✦ Chrono Blitz Insignia」）；
  - 勋章划分多阶色彩与地位标签（Bronze, Silver, Gold, Diamond），内置独创的 Kawaii 矢量图腾与流光外环；
  - 玩家可在主菜单直接开启「★ BADGE CABINET」陈列柜，查阅已解锁勋章的达成历史、稀有度与背景故事，并提供点击检视（Inspection Card）交互。
- **全通道奖励祝捷机制 (Celebration Fanfare & Claim Flow)**：
  - **主菜单常驻微型卡片**：直接展示当前每日核心任务、实时百分比进度条与完成状态。若有待领勋章，显示呼吸式金色脉冲按钮；
  - **局内即时浮窗 (In-Game Toast)**：玩家在战斗中命中最后一击完成任务时，屏幕上方立刻滑出「★ MISSION COMPLETED ★」霓虹弹窗，伴随三音升阶清亮和弦与成功触觉震感；
  - **全屏勋章颁奖礼 (Badge Unlock Modal)**：点击领取时，触发大调和弦泛音琶音（`playBadgeClaim()`）与重冲击震动，展现大型旋转流光勋章与粒子爆裂，给予充实的成就感。

### 5.4 自研 Canvas 轻量级图表引擎 (`StatsScene`)
不引入高负荷第三方图表库，在 Phaser 内部以 Graphics 原生绘制高性能折线图：
- 支持动态纵坐标标定（Auto-Scale Min/Max Range）；
- 背景微透明参考线（Grid Lines）；
- 平滑渐变充填面积带（Area Fill）；
- 交互式交互点触控扩大（Hover Scale 1.5x）与 Tooltip 动态气泡。

### 5.5 全平台极速战绩卡合成与原生分享引擎 (`ScoreCard` & `ShareScoreService`)
- **1080 × 1350 视网膜级赛博朋克战报卡片渲染 (`ScoreCard.ts`)**：
  - 基于 HTML5 2D Canvas 离屏渲染，严格采用 4:5 国际社交媒体（Instagram / Twitter / WhatsApp / 微信）黄金比例；
  - **赛博美学全景视觉构建**：深空暗夜渐变底色（`#020617` ~ `#0b0c2a`）、多点霓虹辐射光晕、HUD 网格矩阵与四角科技切角边框（Corner Brackets）；
  - **真实数据动态挂载**：绝对严谨提取对局真实得分（计时制毫秒时间 / 计分制总积分）、模式名称与难度；
  - **多维战力数据卡**：实时排布「ACCURACY（命中率）」、「TOTAL HITS（总有效击中）」、「MAX COMBO / AVG TIME PER HIT（最大连击 / 平均单次命中时延）」；
  - **破纪录金辉流光特别版**：若打破历史纪录，自动呈现双层金辉「🏆 NEW ALL-TIME RECORD! 🏆」专属徽章与金光耀斑；
  - **社交战书模块**：醒目嵌入「⚡ CAN YOU BEAT MY SCORE? ⚡」战意激扬挑战邀请语与 Snap It! 品牌水印（Play. Snap. Repeat.）。
- **Capacitor 原生与 Web 渐进式多轨分享管道 (`ShareScoreService.ts`)**：
  - **移动原生端（Android / iOS）**：
    - 图像经 Blob 转 Base64 编码，调用 `@capacitor/filesystem` 安全写入系统沙盒缓存目录（`Directory.Cache`）；
    - 调起原生系统级分享面板（`@capacitor/share`），附带个性化战绩战书邀请与 PNG 高清附件；
    - 分享后及下次生成时自动清空临时战报文件，杜绝系统存储占用膨胀；
  - **Web 浏览器端**：
    - 优先探测 `navigator.canShare({ files })`，支持现代移动浏览器直接拉起系统面板；
    - **无缝容灾降级**：在不支持文件分享的桌面或老旧浏览器中，自动触发图片高速直下并同步将挑战口号写入系统剪贴板（`navigator.clipboard.writeText`），弹出炫彩浮窗引导；
  - **防抖防连击与优雅取消**：内置 `isSharingInProgress` 状态锁，分享期间按钮切换为「GENERATING...」并锁定点击；无论用户取消、关闭分享还是网络异常，均在 `finally` 阶段无损复原按钮与操作流，绝不阻断重新开始对局或返回主菜单。

---

## 6. 界面交互与用户体验细节 (UX & Micro-interactions)

1. **零阻滞返回链路 (Comprehensive Back Navigation)**：
   - 难度选择页面提供「← BACK TO MODES」平滑抽屉退回；
   - 局内左上角常驻半透明「✕」中止按钮，随时终止高压对局并结算；
   - 新手教学与数据归档页面统一提供全居中「← BACK TO MENU」导航。
2. **场景平滑淡入淡出 (Smooth Cross-fade Transitions)**：
   - 所有场景跳转均封装为统一的 300ms~500ms `cameras.main.fadeOut` 与 `fadeIn` 流程，杜绝黑屏突变或视觉断层。
3. **触控防误触与冷却机制 (Input Debouncing)**：
   - 每次生成新一轮卡片时，注入 100ms 物理触控冷却期，避免玩家快速连击上一局的同一位置造成误点。
4. **视网膜级高清文本 (Pixel-Perfect Text Rendering)**：
   - 针对现代高分屏设备全面配置 `setResolution(window.devicePixelRatio || 2)`，确保字体边缘绝不模糊失真。

---

## 7. 技术难点与性能优化考量

| 场景难点 | 解决方案与逻辑考量 |
| :--- | :--- |
| **垃圾回收与微卡顿 (GC Pauses)** | 避免在 `update()` 中高频创建对象。粒子系统、背景光晕采用预实例化对象池；音效节点随用随停，通过 Web Audio 调度包络自动回收。 |
| **多分辨率屏幕自适应** | 采用 Phaser `Scale.RESIZE` 模式，所有 UI 与网格计算基于相对视口比例（`cameras.main.width/height`），适配竖屏手机、平板及折叠屏设备。 |
| **音画同步精度** | 背景音乐不依赖外部 mp3 解码与缓冲，直接使用硬件时钟精确到微秒级的 Web Audio `AudioContext` 进行步进触发。 |
| **状态分离与防重入** | 核心对战引入 `isGameOver` 与 `inputCooldown` 双重锁，避免多次触发失败判定导致状态错乱。 |

---

## 8. 未来扩展规划 (Future Roadmap)

- [ ] **在线实时 1v1 竞速对决**：基于 WebRTC / WebSocket 实现双人同屏消除对抗，向对手发送视觉干扰迷雾。
- [ ] **全域段位排行榜**：整合云端数据库，形成毫秒级反应力的全球天梯体系。
- [ ] **皮肤与特效商城**：开放每日任务解锁的粒子拖尾（Neon Trail）、卡牌主题（Cyberpunk, Retro Pixel, Monokai）。
- [ ] **辅助功能 (Accessibility)**：色弱模式优化、按键声音震动无障碍独立微调。

---
*本文档系统阐述了《Snap It!》从艺术美学、系统架构到微秒级逻辑运算的全貌，可作为后续版本迭代与跨平台编译（iOS / Android 原生 App）的核心开发指南。*
