<!-- 
AI服务端设计文档

该文档详细描述了AI图片编辑服务端的设计规范、架构原则和实现细节。
文档涵盖了从总体设计到具体实施的各个方面，为开发团队提供统一的开发标准和指导。

主要内容包括：
- 总体架构设计原则
- 目录结构和命名规范
- 各模块职责划分
- 数据结构定义
- 多模型支持设计
- 安全机制设计
- 配额和幂等控制
- 路由和API设计
- 前端API接口规范
- 模型配置管理

该文档是服务端开发的重要参考，确保团队成员对系统设计有一致的理解。
特别强调了多模型支持的设计，使系统能够灵活支持通义千问的所有图像处理模型。
-->

## 总体设计

- 明确分层：路由 → 中间件 → 控制器 → 服务 → 适配器/工具；做到"入口清晰、职责单一、数据结构统一"。
- 三大系统：显示（前端视图）、交互（前端网络与签名、安全态）、后台处理（服务器路由、任务编排、存储）。
- 关键约束：用户独立目录 `./360house-master/uploads/<userId>/`；AI 请求使用公网 URL；Node 回传图片需鉴权；提交即扣费，失败返还且不超额；防重放与暴力攻击。
- **多模型支持**：支持通义千问所有图像处理模型，客户端可自由选择模型和操作类型。

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
    - **getModels()** ：获取可用模型列表
    - **getOperations(model)** ：获取模型支持的操作
- 图像处理编排
  - 模块： imgAI.js （现 aiEditServer/imageAI.js:64 ）
  - 方法：
    - task(params, cb) ：提交任务（支持多模型）
    - status(id, cb) ：查状态
    - process(input, edit, model, cb) ：批量处理（增加模型参数）
    - onStart(cb) 、 onEnd(cb) ：生命周期
    - save(file, cb) 、 load(file, cb) ：结果持久化
- 模型配置管理
  - 模块： **models.js** （新增）
  - 方法：
    - **list()** ：获取所有可用模型配置
    - **get(model)** ：获取特定模型配置
    - **validate(model, op)** ：验证模型和操作是否匹配
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
    - deduct(user, **cost**) ：提交即扣（支持不同模型成本）
    - refund(user, **cost**) ：失败返还
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
- **GET /img/models** ：获取可用模型列表
- **GET /img/models/:model/operations** ：获取模型支持的操作
- GET /events
- 管理： GET /admin/users 、 POST /admin/users/:id/quota 、 GET /admin/usage

前端 API 命名（window.Net）

- post(path, data, cb) 、 get(path, params, cb) 、 del(path, cb)
- upload(files, cb) 、 list(cb) 、 delete(name, cb) 、 deleteMultiple(list, cb)
- **getModels(cb)** ：获取模型列表
- **getOperations(model, cb)** ：获取模型操作
- 签名注入在内部完成： send(method, path, data, headers, cb) 保持简洁

## 数据结构

- User：`{ id, username, role, publicKey, quotaTotal, quotaUsed, quotaRemaining, reserved, active }`
- Task：`{ id, userId, model, operation, sourceFile, sourceUrl, status, outputUrl, idempotencyKey, createdAt, updatedAt, error }`
- **ModelConfig**：`{ id, name, description, supportedOperations: [], cost, maxConcurrent, paramsSchema }`
- 结果统一：列表与详情均返回上述结构，UI 按 `status/outputUrl` 展示。

## 模型配置示例

```javascript
// models.json
{
  "qwen-vl-plus": {
    "name": "通义千问VL Plus",
    "description": "通用视觉语言模型，支持多种图像理解和编辑任务",
    "supportedOperations": [
      "description_edit",
      "object_replace",
      "background_change",
      "style_transfer"
    ],
    "cost": 1,
    "maxConcurrent": 5,
    "paramsSchema": {
      "prompt": {"type": "string", "required": true},
      "strength": {"type": "number", "min": 0, "max": 1, "default": 0.8}
    }
  },
  "wanx-v1": {
    "name": "万相文生图",
    "description": "专业文生图模型，支持多种风格生成",
    "supportedOperations": [
      "text_to_image",
      "image_variation"
    ],
    "cost": 2,
    "maxConcurrent": 3
  }
}