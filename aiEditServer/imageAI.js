/**
 * ImageAI 图像处理工具类 - 提供完整的图像AI处理流程
 * 
 * 调用示例:
 * const imageAI = new ImageAI('api-key', 'model-name');
 * 
 * // 上传图片
 * imageAI.upload('path/to/image.jpg', (error, imageUrl) => {
 *   if (!error) console.log('图片上传成功:', imageUrl);
 * });
 * 
 * // 提交图像编辑任务
 * imageAI.task({
 *   prompt: '让图片更鲜艳',
 *   imageUrl: 'https://example.com/image.jpg'
 * }, (error, result) => {
 *   if (!error) console.log('任务提交成功:', result);
 * });
 * 
 * // 处理图片输入
 * imageAI.process(['file1.jpg', 'file2.png'], { prompt: '处理图片' }, (error, results) => {
 *   if (!error) console.log('处理完成:', results);
 * });
 * 
 * // 查询任务状态
 * imageAI.status('task-id-123', (error, status, result) => {
 *   if (!error) console.log('任务状态:', status, result);
 * });
 * 
 * // 设置回调
 * imageAI.onStart((params) => console.log('任务开始:', params));
 * imageAI.onEnd((taskId, status, result) => console.log('任务结束:', taskId, status, result));
 * 
 * 属性说明:
 * - apiKey: API密钥
 * - modelName: 模型名称
 * - results: 处理结果记录
 * - apiExpiryDays: API结果过期天数
 * - _taskService: 任务服务实例
 * - _dsAdapter: DashScope适配器实例
 * 
 * 方法列表:
 * - constructor(apiKey, modelName): 创建ImageAI实例
 * - _getPolicy(model, callback): 获取上传凭证
 * - _upload(policyData, filePath, callback): 上传文件到OSS
 * - upload(filePath, callback): 上传图片到/upload路由
 * - task(params, callback): 提交图像编辑任务
 * - _submitTask(params, callback): 内部提交任务方法
 * - status(taskId, callback): 查询任务状态
 * - poll(taskId, maxAttempts, interval, callback): 轮询任务状态直到完成
 * - onStart(callback): 设置任务开始回调
 * - onEnd(callback): 设置任务结束回调
 * - _processSingleFile(filePath, editParams, callback): 处理单个文件
 * - process(input, editParams, callback): 处理图片输入
 * - _getAllFiles(input, callback): 获取所有要处理的文件列表
 * - _processFileList(fileList, editParams, callback): 处理文件列表
 * - saveResults(filePath, callback): 保存结果到JSON文件
 * - loadResults(filePath, callback): 从JSON文件加载结果
 * - clearResults(): 清空结果
 * - getResults(): 获取结果
 */

const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const file = require('./file.js'); // 引入文件工具类
const NetServer = require('./net.js');
const TaskService = require('./services/taskService.js');
const DashScopeAdapter = require('./adapters/ds.js');

class ImageAI {
    /**
     * 创建ImageAI实例
     * @param {string} apiKey - API密钥，用于阿里云DashScope身份验证
     * @param {string} modelName - 模型名称，默认'wanx2.1-imageedit'
     */
    constructor(apiKey, modelName = 'wanx2.1-imageedit') {
        /** @type {string} API密钥 */
        this.apiKey = apiKey;
        /** @type {string} 模型名称 */
        this.modelName = modelName;
        /** @type {Object} 处理结果记录，存储所有图片处理状态和URL */
        this.results = {};
        /** @type {number} API结果过期天数，默认3天 */
        this.apiExpiryDays = 3;
        
        // 初始化任务服务
        this._taskService = new TaskService({
            apiExpiryDays: this.apiExpiryDays
        });
        
        // 初始化DashScope适配器
        this._dsAdapter = new DashScopeAdapter(apiKey);
        
        // 初始化文件工具配置
        file.init('utf8', true, 2);
    }

    /**
     * 上传图片到/upload路由
     * @param {string} filePath - 本地图片文件路径
     * @param {Function} callback - 回调函数 (error, imageUrl)
     */
    upload(filePath, callback) {
        NetServer.post('/upload', {
            filePath: filePath
        }, (error, response) => {
            if (error) return callback(error);
            callback(null, response.imageUrl);
        });
    }

    /**
     * 提交图像编辑任务
     * @param {Object} params - 任务参数对象
     * @param {Function} callback - 回调函数 (error, result)
     */
    task(params, callback) {
        if (!params) return callback(new Error('参数不能为空'));
        
        console.log('[DEBUG] params:', JSON.stringify(params));

        // 验证参数
        const validation = this._taskService.validateTaskParams(params);
        if (!validation.valid) {
            return callback(new Error(validation.errors.join(', ')));
        }
        
        this._submitTask(params, callback);
    }

    /**
     * 内部提交任务方法
     * @param {Object} params - 任务参数
     * @param {Function} callback - 回调函数
     */
    _submitTask(params, callback) {
        // 确定使用的模型和操作
        const model = params.model || this.modelName;
        const operation = params.operation || 'description_edit';
        
        console.log(`[DEBUG] 提交任务到DashScope - 模型: ${model}, 操作: ${operation}`);
        console.log(`[DEBUG] 任务参数:`, JSON.stringify(params, null, 2));
        
        // 构建输入参数
        let inputData;
        if (model === 'wan2.5-i2i-preview') {
            // 万象2.5模型使用images数组
            inputData = {
                prompt: params.prompt,
                images: params.images || [params.imageUrl],
                negative_prompt: params.negative_prompt
            };
        } else {
            // 其他模型使用base_image_url
            inputData = {
                prompt: params.prompt,
                "base_image_url": params.imageUrl
            };
        }
        
        // 使用DashScope适配器提交任务
        this._dsAdapter.invoke(
            model,
            operation,
            inputData,
            {
                parameters: params.parameters || {}
            },
            (error, result) => {
                if (error) {
                    console.error(`[ERROR] 提交任务失败:`);
                    return callback(error);
                }
                
                console.log(`[DEBUG] 任务提交成功，响应:`, JSON.stringify(result, null, 2));
                
                const taskId = result.output?.task_id;
                callback(null, {
                    taskId: taskId,
                    status: 'submitted',
                    data: result,
                    request_id: result.request_id
                });
                
                if (taskId) {
                    console.log(`[DEBUG] 开始轮询任务状态，任务ID: ${taskId}`);
                    this._dsAdapter.poll(taskId, 30, 1000, (pollError, taskResult) => {
                        if (pollError) {
                            console.error(`[ERROR] 轮询任务状态失败，任务ID: ${taskId}`, pollError);
                        } else {
                            console.log(`[DEBUG] 任务轮询完成，任务ID: ${taskId}`, JSON.stringify(taskResult, null, 2));
                        }
                        // 更新结果
                        if (this.endCb) this.endCb(taskId, taskResult?.output?.task_status, taskResult);
                    });
                }
            }
        );
    }

    /**
     * 查询任务状态
     * @param {string} taskId - 任务ID
     * @param {Function} callback - 回调函数 (error, status, result)
     */
    status(taskId, callback) {
        this._dsAdapter.task(taskId, callback);
    }

    /**
     * 轮询任务状态直到完成
     * @param {string} taskId - 任务ID
     * @param {number} maxAttempts - 最大轮询次数
     * @param {number} interval - 轮询间隔(毫秒)
     * @param {Function} callback - 回调函数 (error, result)
     */
    poll(taskId, maxAttempts, interval, callback) {
        this._dsAdapter.poll(taskId, maxAttempts, interval, callback);
    }

    /**
     * 设置任务开始回调
     * @param {Function} callback - 回调函数 (params) => void
     * @returns {ImageAI} 当前实例，支持链式调用
     */
    onStart(callback) {
        if (typeof callback === 'function') this.startCb = callback;
        return this;
    }

    /**
     * 设置任务结束回调
     * @param {Function} callback - 回调函数 (taskId, status, result) => void
     * @returns {ImageAI} 当前实例，支持链式调用
     */
    onEnd(callback) {
        if (typeof callback === 'function') this.endCb = callback;
        return this;
    }

    /**
     * 设置结果保存回调 - 用于自动保存到用户结果目录
     * @param {Function} saveCallback - 保存回调函数 (userId, taskId, result, callback)
     * @returns {ImageAI} 当前实例
     */
    onResultSave(saveCallback) {
        if (typeof saveCallback === 'function') this.resultSaveCb = saveCallback;
        return this;
    }

/**
 * 处理单个文件
 * @param {string} filePath - 文件路径（可以是本地路径或远程URL）
 * @param {Object} editParams - 编辑参数
 * @param {Function} callback - 回调函数 (error, result)
 */
_processSingleFile(filePath, editParams, callback) {
    console.log(`[DEBUG] 开始处理图片: ${filePath}`);
    console.log(`[DEBUG] 编辑参数:`, JSON.stringify(editParams, null, 2));
    
    if (filePath.startsWith('http')) {
        // 远程URL，直接提交任务
        this.task({...editParams, imageUrl: filePath}, (error, result) => {
            if (error) {
                console.error(`[ERROR] 提交任务失败: ${filePath}`);
                return callback(error);
            }
            
            const taskId = result.taskId;
            if (!taskId) {
                const errorMsg = '未获取到任务ID';
                console.error(`[ERROR] ${errorMsg}: ${filePath}`);
                return callback(new Error(errorMsg));
            }
            
            console.log(`[DEBUG] 任务提交成功，开始轮询，任务ID: ${taskId}`);
            this._poll(taskId, 30, 1000, (pollError, taskResult) => {
                if (pollError) {
                    console.error(`[ERROR] 轮询任务失败: ${filePath}`, pollError);
                    return callback(pollError);
                }
                
                const status = taskResult?.output?.task_status;
                const imageUrl = taskResult?.output?.results?.[0]?.url;
                if(this.results[filePath]) {
                    this.results[filePath] = [];
                }
                // 使用完整路径作为键，确保唯一性，避免覆盖
                this.results[filePath] = {
                    file: filePath,
                    taskId: taskId,
                    status: status,
                    imageUrl: imageUrl,
                    timestamp: new Date().toISOString(),
                    data: taskResult
                };
                console.log(`[DEBUG] 处理完成: ${filePath} - ${status}`);
                
                callback(null, this.results[filePath]);
            });
        });
    }
}

    /**
     * 处理图片输入（支持文件、目录、文件数组）
     * @param {string|Array} input - 输入内容，可以是：文件路径、目录路径、文件路径数组
     * @param {Object} editParams - 编辑参数
     * @param {Function} callback - 回调函数 (error, results)
     */
    process(input, editParams, callback) {
        console.log(`选择模型：${this.modelName}`);
        console.log(`[DEBUG] ImageAI.process 开始处理输入:`, JSON.stringify(input));
        console.log(`[DEBUG] 编辑参数:`, JSON.stringify(editParams, null, 2));
        
        if (!input) {
            const error = new Error('输入不能为空');
            console.error(`[ERROR] ImageAI.process 输入为空:`, error.message);
            return callback(error);
        }
        
        this._getAllFiles(input, (filesError, fileList) => {
            if (filesError) {
                console.error(`[ERROR] ImageAI.process 获取文件列表失败:`, filesError.message);
                return callback(filesError);
            }
            
            console.log(`[DEBUG] ImageAI.process 获取到文件列表:`, JSON.stringify(fileList, null, 2));
            this._processFileList(fileList, editParams, callback);
        });
    }

  /**
 * 获取所有要处理的文件列表
 * @param {string|Array} input - 输入内容
 * @param {Function} callback - 回调函数 (error, fileList)
 */
_getAllFiles(input, callback) {
    if (typeof input === 'string') {
        // 如果是http链接，直接返回
        if (input.startsWith('http')) {
            axios.head(input)
            .then(() => {
                // 图片存在，直接处理
                callback(null, [input]);
            })
            .catch(() => {
                callback(new Error('图片不存在或无法访问'));
            });
            return;
        }
        
        // 检查是文件还是目录
        file.exists(input, (existsError, exists) => {
            if (existsError) return callback(existsError);
            if (!exists) return callback(new Error(`路径不存在: ${input}`));
            
            file.ls(input, (lsError, itemInfo) => {
                if (lsError) return callback(lsError);
                
                if (itemInfo.type === 'file') {
                    // 单个文件
                    callback(null, [input]);
                } else if (itemInfo.type === 'directory') {
                    // 目录 - 获取所有图片文件
                    file.ls(input, (dirError, dirItems) => {
                        if (dirError) return callback(dirError);
                        
                        const imageFiles = dirItems
                            .filter(item => item.type === 'file' && 
                                ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
                                    .includes(path.extname(item.name).toLowerCase()))
                            .map(item => path.join(input, item.name));
                        
                        callback(null, imageFiles);
                    });
                } else {
                    callback(new Error('不支持的路径类型'));
                }
            });
        });
    } else if (Array.isArray(input)) {
        // 处理数组中的每个元素
        const allFiles = [];
        let processedItems = 0;
        
        const processArrayItem = (index) => {
            if (index >= input.length) {
                return callback(null, allFiles);
            }
            
            const item = input[index];
            if (typeof item === 'string') {
                // 如果是http链接，直接添加
                if (item.startsWith('http')) {
                    allFiles.push(item);
                    processArrayItem(index + 1);
                } else {
                    // 检查是文件还是目录
                    file.exists(item, (existsError, exists) => {
                        if (existsError) {
                            console.warn(`检查路径失败 ${item}:`, existsError.message);
                            processArrayItem(index + 1);
                            return;
                        }
                        
                        if (!exists) {
                            console.warn(`路径不存在: ${item}`);
                            processArrayItem(index + 1);
                            return;
                        }
                        
                        file.ls(item, (lsError, itemInfo) => {
                            if (lsError) {
                                console.warn(`读取路径失败 ${item}:`, lsError.message);
                                processArrayItem(index + 1);
                                return;
                            }
                            
                            if (itemInfo.type === 'file') {
                                // 单个文件
                                allFiles.push(item);
                            } else if (itemInfo.type === 'directory') {
                                // 目录 - 获取所有图片文件
                                file.ls(item, (dirError, dirItems) => {
                                    if (dirError) {
                                        console.warn(`读取目录失败 ${item}:`, dirError.message);
                                        processArrayItem(index + 1);
                                        return;
                                    }
                                    
                                    const imageFiles = dirItems
                                        .filter(dirItem => dirItem.type === 'file' && 
                                            ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
                                                .includes(path.extname(dirItem.name).toLowerCase()))
                                        .map(dirItem => path.join(item, dirItem.name));
                                    
                                    allFiles.push(...imageFiles);
                                    processArrayItem(index + 1);
                                });
                                return;
                            }
                            
                            processArrayItem(index + 1);
                        });
                    });
                }
            } else {
                console.warn(`跳过无效输入项:`, item);
                processArrayItem(index + 1);
            }
        };
        
        processArrayItem(0);
    } else {
        callback(new Error('不支持的输入类型'));
    }
}

    /**
     * 处理文件列表
     * @param {Array} fileList - 文件路径数组
     * @param {Object} editParams - 编辑参数
     * @param {Function} callback - 回调函数 (error, results)
     */
    _processFileList(fileList, editParams, callback) {
        console.log(`[DEBUG] ImageAI._processFileList 开始处理文件列表，文件数量: ${fileList.length}`);
        
        if (fileList.length === 0) {
            console.log(`[DEBUG] ImageAI._processFileList 文件列表为空，直接返回空结果`);
            return callback(null, {});
        }
        
        const results = {};
        let processed = 0;
        
        const checkComplete = () => {
            if (processed === fileList.length) {
                console.log(`[DEBUG] ImageAI._processFileList 所有文件处理完成，返回结果`);
                callback(null, results);
            }
        };
        
        fileList.forEach(filePath => {
            console.log(`[DEBUG] ImageAI._processFileList 处理文件: ${filePath}`);
            this._processSingleFile(filePath, editParams, (error, result) => {
                processed++;
                if (error) {
                    console.error(`[ERROR] ImageAI._processFileList 处理文件失败 ${filePath}:`, error.message);
                    results[filePath] = { error: error.message };
                } else {
                    console.log(`[DEBUG] ImageAI._processFileList 文件处理成功 ${filePath}`);
                    results[filePath] = result;
                    // 合并到实例的results中
                    Object.assign(this.results, results);
                }
                checkComplete();
            });
        });
    }

    /**
     * 保存结果到JSON文件
     * @param {string} filePath - 文件路径
     * @param {Function} callback - 回调函数 (error)
     */
    saveResults(filePath, callback) {
        file.writeJSON(filePath, this.results, callback);
    }

    /**
     * 从JSON文件加载结果
     * @param {string} filePath - 文件路径
     * @param {Function} callback - 回调函数 (error)
     */
    loadResults(filePath, callback) {
        file.readJSON(filePath, (error, data) => {
            if (error) return callback(error);
            this.results = data || {};
            callback(null);
        });
    }

    /**
     * 清空结果
     */
    clearResults() {
        this.results = {};
    }

    /**
     * 获取结果
     * @returns {Object} 处理结果
     */
    getResults() {
        return this.results;
    }

    /**
     * 保存单个结果到用户结果目录
     * @param {string} userId - 用户ID
     * @param {string} taskId - 任务ID
     * @param {Object} result - 结果对象
     * @param {string} resultsDir - 结果目录
     * @param {Function} callback - 回调函数 (error, savedPath)
     */
    saveResultToFile(userId, taskId, result, resultsDir, callback) {
        const resultFileName = `${taskId}_${Date.now()}.json`;
        const resultFilePath = path.join(resultsDir, resultFileName);
        
        // 确保结果目录存在
        file.mkdir(resultsDir, (mkdirErr) => {
            if (mkdirErr && mkdirErr.code !== 'EEXIST') {
                console.error(`创建结果目录失败: ${mkdirErr.message}`);
                return callback(mkdirErr);
            }
            
            // 保存结果到文件
            file.writeJSON(resultFilePath, result, (writeErr) => {
                if (writeErr) {
                    console.error(`保存结果文件失败: ${writeErr.message}`);
                    return callback(writeErr);
                }
                
                console.log(`结果已保存到: ${resultFilePath}`);
                callback(null, resultFilePath);
            });
        });
    }
}

module.exports = ImageAI;