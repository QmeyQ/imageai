## 总体设计

- 明确分层：路由 → 中间件 → 控制器 → 服务 → 适配器/工具；做到“入口清晰、职责单一、数据结构统一”。
- 三大系统：显示（前端视图）、交互（前端网络与签名、安全态）、后台处理（服务器路由、任务编排、存储）。
- 关键约束：用户独立目录 `./360house-master/uploads/<userId>/`；AI 请求使用公网 URL；Node 回传图片需鉴权；提交即扣费，失败返还且不超额；防重放与暴力攻击。

## 目录结构

```
aiEditServer/
  server.js                # 仅启动/装配，避免承载具体业务
  routes/
    auth.js                # 注册/登录/获取个人信息
    files.js               # 上传/列表/删除/静态回传（鉴权）
    images.js              # 任务创建/查询/结果列表
    admin.js               # 用户管理/配额/统计
    events.js              # SSE 推送任务与系统事件
  controllers/
    authController.js
    filesController.js
    imagesController.js
    adminController.js
  services/
    imageAIService.js      # 封装 imageAI 流程与轮询
    dashscopeAdapter.js    # 统一通义模型/操作适配（可置于 adapters/）
    quotaService.js        # 配额与在途(reserved)管理、扣费/返还
    userService.js         # 用户、公钥存取
    taskService.js         # 任务创建/查询/持久化
    resultService.js       # 统一结果结构读取/过滤
    sseService.js          # 事件中心与订阅管理
    nonceService.js        # 防重放 Nonce/LRU 管理
  middlewares/
    signatureAuth.js       # 验签(ES256)：X-UserId/X-Timestamp/X-Nonce/X-BodyDigest/X-Signature
    ownership.js           # 资源归属检查：仅允许 <userId> 目录
    rateLimit.js           # 简易速率限制与退避
    jsonBody.js            # JSON 解析（保留现有增强版）
    cors.js                # 跨域（保留）
    errorHandler.js        # 统一错误响应结构
  utils/
    file.js                # 已有：文件工具（保留）
    net.js                 # 已有：轻量 HTTP 服务器（保留）
    time.js                # 时间工具（保留）
    idempotency.js         # 幂等键工具（可选）
    logger.js              # 简易日志（可选）
  data/
    users.json             # 用户/公钥/配额数据
    tasks.json             # 任务数据（统一结构）
    usage.log              # 扣费/返还/异常审计日志
    nonces.json            # 最近 Nonce（可选持久化；主要内存 LRU）
  config/
    index.js               # 环境变量/域名/端口/外部 URL 基础配置
client/
  net.js                   # 已有：统一请求层（扩展签名头注入）
  ui.js                    # 已有：视图工具（扩展结果状态、配额显示）
  auth/
    keypair.js             # WebCrypto 生成/存储私钥（IndexedDB）
    signer.js              # 构造签名材料与头部
  views/
    gallery.js             # 服务器图片卡片/批量操作
    results.js             # 任务结果视图/SSE 状态更新
    admin.js               # 管理员视图/配额管理
  state.js                 # 简易全局状态（用户/配额/在途）
  index.html               # 入口页面（保持现有结构）
```

## 职责划分

- 路由：仅做“请求分发”；不做业务。示例：`aiEditServer/server.js:200-213` 展示了现有注册路由点，重构后将迁移至 routes/*。
- 中间件：统一安全与通用处理；签名验签（防重放）、归属校验（用户目录）、速率限制、错误输出结构。
- 控制器：参数与权限校验 → 调用服务；返回统一数据结构。
- 服务：实现业务逻辑与状态管理（配额扣减/返还、任务轮询、结果持久化、SSE 推送）。
- 适配器：屏蔽外部 API 差异；将 `model/operation` 转换为 DashScope 请求结构（替换 `aiEditServer/imageAI.js:205-244` 中固定 `description_edit` 的逻辑）。
- 工具：文件系统与时间、日志、幂等键；继续保持“小函数不封装”原则。

## 数据结构

- User：`{ id, username, role, publicKey, quotaTotal, quotaUsed, quotaRemaining, reserved, active }`
- Task：`{ id, userId, model, operation, sourceFile, sourceUrl, status, outputUrl, idempotencyKey, createdAt, updatedAt, error }`
- 结果统一：列表与详情均返回上述结构，UI 按 `status/outputUrl` 展示。

## 安全与防暴力/重放

- 非对称 ES256 验签：`X-UserId/X-Timestamp/X-Nonce/X-BodyDigest/X-Signature`；验签失败与过期拒绝。
- Nonce 一次性：`nonceService` 维护 LRU + TTL（10–15 分钟）；命中即拒绝。
- 时间窗口：±300 秒；过期拒绝。
- 速率限制：按用户+路由；超限退避与告警。
- 归属校验：路径限制在 `./360house-master/uploads/<userId>/`；管理员可跨目录；普通用户仅自身。
- 图片回传：保留 Node 回传（`aiEditServer/server.js:515-589`），在读取前执行归属与鉴权。

## 配额与幂等

- 提交即扣：任务创建成功 → `reserved += 1`, `quotaRemaining -= 1`。
- 成功：`SUCCEEDED` → `reserved -= 1`, `quotaUsed += 1`。
- 失败返还：`FAILED` → `reserved -= 1`, `quotaRemaining += 1`，封顶到 `quotaTotal - quotaUsed`；超额视为异常并拒绝。
- 幂等键：`idempotencyKey` 防重复扣费；任务在途状态与并发保护结合。

## 性能策略

- SSE：`routes/events.js` + `sseService.js` 推送任务状态；前端订阅 `window.Net.subscribeEvents()`，替代轮询。
- 静态直链：AI 请求统一使用 Nginx 公网 URL（无需 Node 代理）。
- 强缓存与 Range：Node 回传图片设置 `Cache-Control`、`ETag/Last-Modified`；支持 Range，降低带宽。
- 文件 IO：保留 Buffer/流式读取（参考 `aiEditServer/server.js:542-586`）。

## 与现有代码的映射

- `aiEditServer/imageAI.js:205-244`：改为调用 `dashscopeAdapter` 构造 payload；保留 `onStart/onEnd/_poll`。
- `aiEditServer/server.js:228-371`：上传流程增加 `userId` 子目录存储与鉴权；响应返回公网 URL。
- `aiEditServer/server.js:274-329`：`_processSingleImage` 改为使用 `externalUrl + userId + '/' + filename`。
- `aiEditServer/net.js:374-403`：统一错误响应结构；静态回传头保留并增强缓存。
- 前端：`d:\aiEdit\net.js:22` 扩展签名注入；`d:\aiEdit\ui.js:5` 根据统一结果结构更新状态与展示。

## 分阶段实施

1. 安全层：`signatureAuth` + `nonceService` + `ownership` 中间件；为现有路由挂载。
2. 存储与路由：用户子目录写入与鉴权回传；上传/列表/删除分离到 `routes/files.js` + 控制器。
3. 任务与适配：`dashscopeAdapter` + `imageAIService`；统一结果结构与 `taskService` 持久化；提交即扣/失败返还。
4. SSE：`events.js` + `sseService`；前端订阅与视图刷新。
5. 前端安全：WebCrypto 密钥生成与持久化；`window.Net` 注入签名；配额与在途可视化。
6. 管理后台：用户管理、配额调整、使用统计；日志与审计完善。

该结构在保持现有简洁风格与异步效率的同时，清晰划分职责、统一数据与安全策略，便于扩展与维护。请确认后，我将按上述阶段逐步实施与验证。