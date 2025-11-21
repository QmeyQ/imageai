/**
 * DashScope 适配器模块
 * 
 * 该模块提供了与 DashScope API 交互的接口，屏蔽了外部 API 的差异性。
 * 主要功能包括：
 * - 统一模型调用接口
 * - 任务查询和轮询
 * - 模型和操作列表获取
 * 
 * @module adapters/ds
 * @class DashScopeAdapter
 * @property {string} apiKey - API 密钥
 * @property {string} apiUrl - 图像合成 API 地址
 * @property {string} taskUrl - 任务查询 API 地址
 * @property {string} uploadUrl - 文件上传 API 地址
 * @property {string} modelsUrl - 模型列表 API 地址
 */

const axios = require('axios');

class DashScopeAdapter {
    /**
     * 创建 DashScope 适配器实例
     * @param {string} apiKey - API 密钥
     */
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis';
        this.taskUrl = 'https://dashscope.aliyuncs.com/api/v1/tasks';
        this.uploadUrl = 'https://dashscope.aliyuncs.com/api/v1/uploads';
        this.modelsUrl = 'https://dashscope.aliyuncs.com/api/v1/models';
    }

    /**
     * 统一模型调用
     * @param {string} model - 模型名称
     * @param {string} op - 操作类型
     * @param {Object} input - 输入数据
     * @param {Object} cfg - 配置参数
     * @param {Function} callback - 回调函数
     */
    invoke(model, op, input, cfg, callback) {
        // 直接使用客户端提交的完整参数，无需转换
        const parameters = cfg.parameters || {};
        
        // 确保model参数是字符串类型
        const modelStr = typeof model === 'object' && model !== null ? model.id || model.name || JSON.stringify(model) : model;
        
        const payload = {
            model: modelStr,
            input: {
                "function": op,
                ...input
            },
            parameters: parameters
        };
        console.log(`[DEBUG] 请求体:`, JSON.stringify(payload, null, 2));

        axios.post(this.apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'X-DashScope-Async': 'enable',
                'X-DashScope-OssResourceResolve': 'enable'
            }
        })
        .then(response => {
            console.log(`[DEBUG] API调用成功，状态码: ${response.status}`);
            console.log(`[DEBUG] 响应数据:`, JSON.stringify(response.data, null, 2));
            console.log('响应体：', JSON.stringify(response.headers));
            callback(null, response.data);
        })
        .catch(error => {
            console.error(`[ERROR] API调用失败:`, error.message);
            if (error.response) {
                console.error(`[ERROR] 响应状态: ${error.response.status}`);
                console.error(`[ERROR] 响应数据:`, JSON.stringify(error.response.data, null, 2));
            }
            callback(error);
        });

        console.log('负载：', JSON.stringify(payload));
    }



    /**
     * 查任务
     * @param {string} id - 任务ID
     * @param {Function} callback - 回调函数
     */
    task(id, callback) {
        if (!id) return callback(new Error('任务ID不能为空'));

        axios.get(`${this.taskUrl}/${id}`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            callback(null, response.data);
        })
        .catch(callback);
    }

    /**
     * 轮询任务状态
     * @param {string} id - 任务ID
     * @param {number} max - 最大轮询次数
     * @param {number} interval - 轮询间隔(毫秒)
     * @param {Function} callback - 回调函数
     */
    poll(id, max, interval, callback) {
        let attempts = 0;

        const check = () => {
            this.task(id, (error, result) => {
                if (error) return callback(error);

                const status = result.output?.task_status;
                if (status === 'SUCCEEDED' || status === 'FAILED' || attempts >= max) {
                    callback(null, result);
                } else {
                    attempts++;
                    setTimeout(check, interval);
                }
            });
        };

        check();
    }

    /**
     * 获取可用模型列表
     * @param {Function} callback - 回调函数
     */
    getModels(callback) {
        axios.get(this.modelsUrl, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            callback(null, response.data);
        })
        .catch(callback);
    }

    /**
     * 获取模型支持的操作
     * @param {string} model - 模型名称
     * @param {Function} callback - 回调函数
     */
    getOperations(model, callback) {
        // 这里应该调用实际的API来获取模型支持的操作
        // 由于DashScope API可能没有直接提供此功能，我们返回预定义的操作列表
        const operations = {
            'wanx2.1-imageedit': ['description_edit', 'object_replace', 'background_change', 'style_transfer'],
            'wanx-v1': ['text_to_image', 'image_variation'],
            'qwen-vl-plus': ['description_edit', 'object_replace', 'background_change'],
            'qwen-vl-max': ['description_edit', 'object_replace', 'background_change', 'style_transfer', 'image_inpainting'],
            'stable-diffusion-3.5': ['text_to_image', 'image_to_image', 'image_inpainting', 'image_outpainting', 'controlnet']
        };

        const modelOps = operations[model] || [];
        callback(null, { operations: modelOps });
    }
}

module.exports = DashScopeAdapter;