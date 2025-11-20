/**
 * 图像AI处理模块 - 提供图像AI处理的核心功能
 * 
 * 调用示例:
 * const imageAI = new ImageAI('your-api-key');
 * imageAI.uploadImage('path/to/image.jpg', (error, imageUrl) => {
 *   if (!error) console.log('图片上传成功:', imageUrl);
 * });
 * 
 * imageAI.task({
 *   prompt: '让图片更鲜艳',
 *   imageUrl: 'https://example.com/image.jpg'
 * }, (taskId, status, result) => {
 *   console.log('任务提交结果:', taskId, status, result);
 * });
 * 
 * imageAI.status('task-id-123', (status, result) => {
 *   console.log('任务状态:', status, result);
 * });
 * 
 * 属性说明:
 * - apiKey: API密钥，用于身份验证
 * - modelName: 模型名称，默认为'wanx2.1-imageedit'
 * - apiUrl: API端点URL
 * - taskUrl: 任务查询端点URL
 * - uploadUrl: 文件上传端点URL
 * - startCallback: 任务开始回调函数
 * - endCallback: 任务结束回调函数
 * 
 * 方法列表:
 * - constructor(apiKey, modelName): 构造函数，初始化API密钥和模型名称
 * - _getUploadPolicy(callback): 内部方法，获取上传凭证
 * - _uploadFile(policyData, filePath, callback): 内部方法，上传文件到OSS
 * - uploadImage(filePath, callback): 上传图片并获取URL
 * - task(params, callback): 提交图像编辑任务
 * - _submitTaskInternal(params, callback): 内部方法，提交任务
 * - status(taskId, callback): 查询任务状态
 * - onStart(callback): 设置任务开始回调
 * - onEnd(callback): 设置任务结束回调
 * - downloadImage(url, outputPath, callback): 下载图片
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class ImageAI {
    /**
     * 构造函数
     * @param {string} apiKey - API密钥
     * @param {string} modelName - 模型名称
     */
    constructor(apiKey, modelName = 'wanx2.1-imageedit') {
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis';
        this.taskUrl = 'https://dashscope.aliyuncs.com/api/v1/tasks';
        this.uploadUrl = 'https://dashscope.aliyuncs.com/api/v1/uploads';
        this.startCallback = null;
        this.endCallback = null;
    }

    /**
     * 内部方法：获取上传凭证
     * @private
     * @param {Function} callback - 回调函数 (error, policyData) => void
     */
    _getUploadPolicy(callback) {
        axios.get(this.uploadUrl, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            params: {
                'action': 'getPolicy',
                'model': this.modelName
            }
        })
        .then(response => {
            if (response.status === 200 && response.data && response.data.data) {
                callback(null, response.data.data);
            } else {
                callback(new Error(`获取上传凭证失败，状态码: ${response.status}`));
            }
        })
        .catch(error => {
            callback(error);
        });
    }

    /**
     * 内部方法：上传文件到OSS
     * @private
     * @param {Object} policyData - 上传凭证数据
     * @param {string} filePath - 文件路径
     * @param {Function} callback - 回调函数 (error, ossUrl) => void
     */
    _uploadFile(policyData, filePath, callback) {
        if (!policyData || !policyData.upload_host || !policyData.upload_dir) {
            callback(new Error('上传凭证数据无效'));
            return;
        }
        
        const fileName = path.basename(filePath);
        const key = `${policyData.upload_dir}/${fileName}`;
        const form = new FormData();
        
        form.append('OSSAccessKeyId', policyData.oss_access_key_id);
        form.append('Signature', policyData.signature);
        form.append('policy', policyData.policy);
        form.append('x-oss-object-acl', policyData.x_oss_object_acl || 'private');
        form.append('key', key);
        form.append('success_action_status', 200);
        form.append('file', fs.createReadStream(filePath));
        
        axios.post(policyData.upload_host, form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        })
        .then(response => {
            if (response.status === 200) {
                callback(null, policyData.file_url);
            } else {
                callback(new Error(`文件上传失败，状态码: ${response.status}`));
            }
        })
        .catch(error => {
            callback(error);
        });
    }

    /**
     * 上传图片并获取URL
     * @param {string} filePath - 本地文件路径
     * @param {Function} callback - 回调函数 (error, imageUrl) => void
     */
    uploadImage(filePath, callback) {
        this._getUploadPolicy((error, policyData) => {
            if (error) {
                callback(error);
                return;
            }
            
            this._uploadFile(policyData, filePath, callback);
        });
    }

    /**
     * 提交图像编辑任务
     * @param {Object} params - 任务参数
     * @param {Function} callback - 回调函数 (taskId, status, result) => void
     */
    task(params, callback) {
        if (!params) {
            callback(null, null, new Error('参数不能为空'));
            return;
        }
        
        // 如果参数中包含文件路径，则先上传文件
        if (params.filePath) {
            this.uploadImage(params.filePath, (error, imageUrl) => {
                if (error) {
                    callback(null, null, error);
                    return;
                }
                
                params.imageUrl = imageUrl;
                this._submitTaskInternal(params, callback);
            });
        } else {
            // 直接提交任务
            this._submitTaskInternal(params, callback);
        }
    }

    /**
     * 内部方法：提交任务
     * @private
     * @param {Object} params - 任务参数
     * @param {Function} callback - 回调函数 (taskId, status, result) => void
     */
    _submitTaskInternal(params, callback) {
        if (!params.prompt) {
            callback(null, null, new Error('缺少必要参数: prompt'));
            return;
        }
        
        if (!params.imageUrl) {
            callback(null, null, new Error('缺少必要参数: imageUrl'));
            return;
        }
        
        const payload = {
            model: this.modelName,
            input: {
                "function": "description_edit",
                prompt: params.prompt,
                "base_image_url": params.imageUrl
            },
            parameters: params.parameters || {"n": 1}
        };
        
        // 触发开始回调
        if (this.startCallback) {
            this.startCallback(params);
        }
        
        axios.post(this.apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'X-DashScope-Async': 'enable',
                'X-DashScope-OssResourceResolve': 'enable'
            }
        })
        .then(response => {
            const taskId = response.data.output?.task_id;
            callback(taskId, 'submitted', response.data);
            
            // 自动开始查询任务状态
            if (taskId) {
                this.waitForTaskComplete(taskId, 30, 1000, (error, taskResult) => {
                    const status = taskResult?.output?.task_status;
                    if (this.endCallback) {
                        this.endCallback(taskId, status, taskResult);
                    }
                });
            }
        })
        .catch(error => {
            callback(null, null, error);
        });
    }

    /**
     * 查询任务状态
     * @param {string} taskId - 任务ID
     * @param {Function} callback - 回调函数 (status, result) => void
     */
    status(taskId, callback) {
        if (!taskId) {
            callback(null, new Error('任务ID不能为空'));
            return;
        }
        
        axios.get(`${this.taskUrl}/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            const status = response.data.output?.task_status;
            callback(status, response.data);
        })
        .catch(error => {
            callback(null, error);
        });
    }

    /**
     * 设置任务开始回调
     * @param {Function} callback - 回调函数 (params) => void
     * @returns {ImageAI} - 返回this以支持链式调用
     */
    onStart(callback) {
        if (typeof callback === 'function') {
            this.startCallback = callback;
        }
        return this;
    }

    /**
     * 设置任务结束回调
     * @param {Function} callback - 回调函数 (taskId, status, result) => void
     * @returns {ImageAI} - 返回this以支持链式调用
     */
    onEnd(callback) {
        if (typeof callback === 'function') {
            this.endCallback = callback;
        }
        return this;
    }

    /**
     * 下载图片
     * @param {string} url - 图片URL
     * @param {string} outputPath - 输出路径
     * @param {Function} callback - 回调函数 (error) => void
     */
    downloadImage(url, outputPath, callback) {
        // 确保输出目录存在
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const writer = fs.createWriteStream(outputPath);
        
        axios.get(url, { responseType: 'stream' })
            .then(response => {
                response.data.pipe(writer);
                writer.on('finish', () => {
                    callback(null);
                });
                writer.on('error', (error) => {
                    callback(error);
                });
            })
            .catch(error => {
                callback(error);
            });
    }
}
