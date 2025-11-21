<!-- 
AI客户端设计文档

该文档详细描述了AI图片编辑客户端的设计规范、架构原则和实现细节。
文档涵盖了从总体设计到具体实施的各个方面，为开发团队提供统一的开发标准和指导。

主要内容包括：
- 总体架构设计原则
- 目录结构和命名规范
- 各模块职责划分
- 数据结构定义
- 安全机制设计
- 配额和幂等控制
- 性能优化策略
- 与现有代码的映射关系
- 分阶段实施计划

该文档是客户端开发的重要参考，确保团队成员对系统设计有一致的理解。
-->

## 总体设计

- 明确分层：路由 → 中间件 → 控制器 → 服务 → 适配器/工具；做到"入口清晰、职责单一、数据结构统一"。
- 三大系统：显示（前端视图）、交互（前端网络与签名、安全态）、后台处理（服务器路由、任务编排、存储）。
- 关键约束：用户独立目录 `./360house-master/uploads/<userId>/`；AI 请求使用公网 URL；Node 回传图片需鉴权；提交即扣费，失败返还且不超额；防重放与暴力攻击。

## 目录结构

命名原则

- 简短、直观、共识度高，沿用 file.js 风格： rename → ren 、 delete → del 、 list → ls 、 exists → exists 。
- 统一动词开头，保留少量缩写： get/set/add/del/ls/ren/run/put/post 。
- 模块名同样简化，避免 "service/client" 后缀；通义适配直接用 ds 前缀。
模块与命名建议

- DashScope 适配
  - 模块： ds.js
  - 方法：
    - invoke(model, op, input, cfg) ：统一模型调用
    - task(id) ：查任务
    - poll(id, max, interval, cb) ：轮询
- 图像处理编排
  - 模块： imgAI.js （现 aiEditServer/imageAI.js:64 ）
  - 方法：
    - task(params, cb) ：提交任务
    - status(id, cb) ：查状态
    - process(input, edit, cb) ：批量处理
    - onStart(cb) 、 onEnd(cb) ：生命周期
    - save(file, cb) 、 load(file, cb) ：结果持久化
- 鉴权与安全
  - 模块： auth.js
  - 方法：
    - reg(user) 、 login(user) ：注册、登录
    - sign(req) ：前端签名
    - verify(req) ：后端验签
    - nonceAdd(user, nonce) 、 nonceHas(user, nonce) ：防重放
- 额度与幂等
  - 模块： quota.js
  - 方法：
    - deduct(user) ：提交即扣
    - refund(user) ：失败返还
    - cap(user) ：封顶不超额
    - idemHas(key) 、 idemSet(key) ：幂等键
- 任务与结果
  - 模块： task.js
  - 方法：
    - add(t) 、 get(id) 、 ls(filter) ：新增/查询/列表
    - set(id, patch) ：更新
- SSE 事件
  - 模块： events.js
  - 方法：
    - sub(res) ：订阅
    - emit(type, data) ：广播
- 路由与中间件
  - 模块： routes/*.js 、 mw/*.js
  - 中间件：
    - mw/sign.js ：验签
    - mw/own.js ：归属校验
    - mw/rl.js ：限流
    - mw/json.js ：JSON体
    - mw/cors.js ：跨域
    - mw/err.js ：错误统一
- 文件与工具
  - 模块： file.js （保留）
  - 方法： read/write/del/ls/ren/exists/copy/mkdir/readJSON/writeJSON
路由简化命名

- POST /auth/reg 、 POST /auth/login 、 GET /me
- POST /upload 、 GET /uploads/:file 、 GET /files?userId= 、 DEL /files/:file
- POST /img/task 、 GET /img/task/:id 、 GET /img/results
- GET /events
- 管理： GET /admin/users 、 POST /admin/users/:id/quota 、 GET /admin/usage
前端 API 命名（window.Net）

- post(path, data, cb) 、 get(path, params, cb) 、 del(path, cb)
- upload(files, cb) 、 list(cb) 、 delete(name, cb) 、 deleteMultiple(list, cb)
- 签名注入在内部完成： send(method, path, data, headers, cb) 保持简洁
现有代码映射

- 上传/静态：
  - aiEditServer/server.js:201 路由分解为 routes/files.js ，方法 upload/ls/del/static
  - 静态回传保留二进制与缓存头（参考 aiEditServer/server.js:542-586 ）
- 图像编排：
  - aiEditServer/imageAI.js:205-244 改为调用 ds.invoke ，方法名 task/status/poll/process 保持简短
- 错误统一：
  - 复用 aiEditServer/net.js:374-403 结构，输出 { success: false, code, msg }
命名示例对照

- 服务器删除文件： _delete → del （ aiEditServer/server.js:376 ）
- 批量删除： _deleteBatch → delBatch
- 文件列表： _list → ls
- 上传： _upload → upload
- 静态回传： _static → static
风格说明

- 遵循"只有几行代码的不封装"，例如：
  - 简单校验函数使用内联短函数： isImg(name) 、 safePath(p) 、 ext(name)
- 保持顶层文档注释块，快速理解与调用；函数体尽量一屏可读。
- 异步回调优先，避免不必要的 Promise 复杂度；并发控制使用小工具函数，如 poll(id, max, interval, cb) 。
```

## 职责划分

- 路由：仅做"请求分发"；不做业务。示例：`aiEditServer/server.js:200-213` 展示了现有注册路由点，重构后将迁移至 routes/*。
- 中间件：统一安全与通用处理；签名验签（防重放）、归属校验（用户目录）、速率限制、错误输出结构。
- 控制器：参数与权限校验 → 调用服务；返回统一数据结构。
- 服务：实现业务逻辑与状态管理（配额扣减/返还、任务轮询、结果持久化、SSE 推送）。
- 适配器：屏蔽外部 API 差异；将 `model/operation` 转换为 DashScope 请求结构（替换 `aiEditServer/imageAI.js:205-244` 中固定 `description_edit` 的逻辑）。
- 工具：文件系统与时间、日志、幂等键；继续保持"小函数不封装"原则。

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