# 万象2.5模型使用指南

## 模型简介

**万象2.5 (wan2.5-i2i-preview)** 是阿里云百炼提供的图生图模型，支持单图编辑和多参考图生图功能。

### 主要特性

- ✅ **单图编辑**：根据提示词对单张图片进行编辑
- ✅ **多参考图生图**：使用最多3张参考图生成新图像
- ✅ **PNG格式输出**：输出高质量PNG格式图像
- ✅ **自定义分辨率**：支持自定义输出图像的宽度和高度
- ✅ **反向提示词**：通过negative_prompt限制不希望出现的内容
- ✅ **AI水印**：可选添加"AI生成"水印标识
- ✅ **可复现性**：支持固定随机种子以提高结果可复现性

### 输出规格

- **图片格式**：PNG
- **默认分辨率**：1280*1280（总像素默认值）
- **自定义分辨率**：支持通过`parameters.size`参数设定
  - 总像素范围：[768*768, 1280*1280]
  - 宽高比范围：[1:4, 4:1]
- **宽高比规则**：
  - 单图编辑：与输入图像的宽高比保持一致
  - 多图参考：与最后一张输入图像的宽高比保持一致

## 快速开始

### 服务端使用

```javascript
const ImageAI = require('./imageAI.js');

// 创建实例
const imageAI = new ImageAI('your-api-key', 'wan2.5-i2i-preview');

// 提交任务
imageAI.task({
    model: 'wan2.5-i2i-preview',
    prompt: '将花卉连衣裙换成一件复古风格的蕾丝长裙',
    images: [
        'https://example.com/image.jpg'
    ],
    parameters: {
        n: 1
    }
}, (error, result) => {
    if (!error) {
        console.log('任务ID:', result.taskId);
    }
});
```

### 客户端使用

```javascript
// 创建服务实例
const imageAI = new ImageAIService(window.Net);

// 提交任务
imageAI.task({
    model: 'wan2.5-i2i-preview',
    prompt: '将图片转换为油画风格',
    imageUrl: 'https://example.com/image.jpg',
    parameters: {
        n: 1
    }
}, (error, result) => {
    if (!error) {
        console.log('任务提交成功！', result);
    }
});
```

## 参数说明

### 输入参数（Input）

| 参数名 | 类型 | 必选 | 说明 |
|--------|------|------|------|
| `prompt` | string | ✅ | 正向提示词，描述期望的图像元素和视觉特点。支持中英文，长度不超过2000个字符 |
| `images` | array | ✅ | 图像URL数组，最多3张图片。支持HTTP/HTTPS URL或Base64编码 |
| `negative_prompt` | string | ❌ | 反向提示词，描述不希望出现的内容。长度不超过500个字符 |

### 图像要求

- **格式**：JPEG、JPG、PNG（不支持透明通道）、BMP、WEBP
- **分辨率**：宽高范围均为[384, 5000]像素
- **文件大小**：不超过10MB
- **URL格式**：
  - HTTP/HTTPS公网可访问URL
  - Base64编码：`data:{MIME_type};base64,{base64_data}`

### 处理参数（Parameters）

| 参数名 | 类型 | 必选 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `size` | string | ❌ | 1280*1280 | 输出图像分辨率，格式为"宽*高" |
| `n` | integer | ❌ | 4 | 生成图片数量，取值范围1-4 |
| `watermark` | boolean | ❌ | false | 是否添加"AI生成"水印 |
| `seed` | integer | ❌ | 随机 | 随机数种子，范围[0, 2147483647] |

### 推荐分辨率

| 分辨率 | 宽高比 | 适用场景 |
|--------|--------|----------|
| 1280*1280 | 1:1 | 正方形图片、头像、缩略图 |
| 1280*720 | 16:9 | 横版图片、横幅、桌面壁纸 |
| 720*1280 | 9:16 | 竖版图片、手机壁纸、海报 |

## 使用场景

### 1. 服装替换

```javascript
imageAI.task({
    model: 'wan2.5-i2i-preview',
    prompt: '将花卉连衣裙换成一件复古风格的蕾丝长裙，领口和袖口有精致的刺绣细节',
    images: ['https://example.com/dress.jpg'],
    parameters: { n: 1 }
});
```

### 2. 风格转换

```javascript
imageAI.task({
    model: 'wan2.5-i2i-preview',
    prompt: '将照片转换为水彩画风格，色彩柔和',
    images: ['https://example.com/photo.jpg'],
    negative_prompt: '低分辨率、最差质量、低质量',
    parameters: { n: 1 }
});
```

### 3. 多图参考创作

```javascript
imageAI.task({
    model: 'wan2.5-i2i-preview',
    prompt: '结合这些图片的风格特点，创作一幅新的艺术作品',
    images: [
        'https://example.com/ref1.jpg',
        'https://example.com/ref2.jpg',
        'https://example.com/ref3.jpg'
    ],
    parameters: { n: 2 }
});
```

### 4. 图像增强

```javascript
imageAI.task({
    model: 'wan2.5-i2i-preview',
    prompt: '增强图片的色彩饱和度和对比度，使画面更加鲜艳清晰',
    images: ['https://example.com/image.jpg'],
    parameters: {
        n: 1,
        watermark: true
    }
});
```

## 异步处理流程

万象2.5使用异步处理模式，完整流程如下：

### 1. 提交任务

```javascript
imageAI.task(params, (error, result) => {
    if (!error) {
        const taskId = result.taskId;
        console.log('任务ID:', taskId);
    }
});
```

**响应示例**：
```json
{
    "taskId": "0385dc79-5ff8-4d82-bcb6-xxxxxx",
    "status": "submitted",
    "data": {
        "output": {
            "task_status": "PENDING",
            "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx"
        },
        "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx"
    }
}
```

### 2. 任务状态

任务状态会经历以下流转：

```
PENDING (排队中) → RUNNING (处理中) → SUCCEEDED (成功) / FAILED (失败)
```

### 3. 查询结果

```javascript
imageAI.status(taskId, (error, status, result) => {
    if (!error && status === 'SUCCEEDED') {
        const imageUrl = result.output?.results?.[0]?.url;
        console.log('生成的图片:', imageUrl);
    }
});
```

**成功响应示例**：
```json
{
    "output": {
        "task_id": "7f4836cd-1c47-41b3-b3a4-xxxxxx",
        "task_status": "SUCCEEDED",
        "results": [
            {
                "orig_prompt": "将花卉连衣裙换成一件复古风格的蕾丝长裙",
                "url": "https://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/xxx.png"
            }
        ]
    }
}
```

### 4. 自动轮询

ImageAI会自动轮询任务状态，你可以通过回调函数监听完成事件：

```javascript
imageAI.onEnd((taskId, status, result) => {
    if (status === 'SUCCEEDED') {
        const imageUrl = result.output?.results?.[0]?.url;
        console.log('处理完成！图片URL:', imageUrl);
    }
});
```

## 重要提示

### ⚠️ 图片URL有效期

- 生成的图片URL **仅保留24小时**
- 超时后会被自动清除
- **请务必及时下载并保存到永久存储**（如阿里云OSS）

### ⚠️ 费用说明

- `n`参数直接影响费用：n越大费用越高
- 建议测试阶段设置`n=1`
- 使用前请确认[模型价格](https://help.aliyun.com/zh/model-studio/getting-started/models)

### ⚠️ 轮询建议

- 图像生成约需数分钟
- 建议设置10秒的查询间隔
- QPS限制：查询接口默认QPS为20

### ⚠️ 提示词技巧

- **正向提示词**：详细描述期望的视觉效果和元素
- **反向提示词**：明确不希望出现的内容
- 中英文均可，但要保持描述清晰具体
- 参考[文生图Prompt指南](https://help.aliyun.com/zh/model-studio/use-cases/prompt-guide-for-text-to-image)

## 完整示例

查看完整代码示例：

- **服务端示例**：`./wan25_example.js`
- **客户端示例**：`../client/services/wan25Example.js`

## 故障排查

### 常见错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| "current user api does not support synchronous calls" | 缺少`X-DashScope-Async`请求头 | 确保设置为`enable` |
| "图片不存在或无法访问" | 图片URL无效 | 检查URL是否可公网访问 |
| "配额不足" | 账户配额用尽 | 充值或等待配额恢复 |
| "参数验证失败" | 参数不符合要求 | 检查参数类型和范围 |

### 调试技巧

1. **启用详细日志**：查看控制台输出的`[DEBUG]`信息
2. **检查request_id**：用于请求溯源和问题排查
3. **验证图片URL**：确保图片可公网访问且符合格式要求
4. **测试提示词**：从简单的提示词开始，逐步优化

## 相关资源

- [阿里云百炼API文档](https://help.aliyun.com/zh/model-studio/)
- [模型列表与价格](https://help.aliyun.com/zh/model-studio/getting-started/models)
- [文生图Prompt指南](https://help.aliyun.com/zh/model-studio/use-cases/prompt-guide-for-text-to-image)
- [异步任务管理](https://help.aliyun.com/zh/model-studio/developer-reference/manage-asynchronous-tasks)

## 更新日志

### v1.0.0 (2025-01-XX)

- ✅ 添加万象2.5模型支持
- ✅ 支持单图编辑和多参考图生图
- ✅ 支持自定义分辨率和水印
- ✅ 提供完整的服务端和客户端示例
