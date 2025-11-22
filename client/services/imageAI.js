/**
 * 图像处理服务模块（客户端版本） - 处理客户端图像AI处理相关功能
 * 
 * 调用示例:
 * const imageAIService = new ImageAIService(window.Net);
 * 
 * // 提交任务
 * imageAIService.task({
 *   prompt: '让图片更鲜艳',
 *   imageUrl: 'https://example.com/image.jpg'
 * }, (error, result) => {
 *   if (!error) console.log('任务提交成功:', result);
 * });
 * 
 * // 查询状态
 * imageAIService.status('task-id-123', (error, result) => {
 *   if (!error) console.log('任务状态:', result);
 * });
 * 
 * // 批量处理
 * imageAIService.process(['url1.jpg', 'url2.png'], { prompt: '处理图片' }, (error, results) => {
 *   if (!error) console.log('批量处理完成:', results);
 * });
 * 
 * // 设置生命周期回调
 * imageAIService.onStart((params) => console.log('任务开始:', params));
 * imageAIService.onEnd((taskId, status, result) => console.log('任务结束:', taskId, status, result));
 * 
 * // 保存和加载结果
 * imageAIService.save('results.json', (error) => {
 *   if (!error) console.log('结果保存成功');
 * });
 * 
 * imageAIService.load('results.json', (error) => {
 *   if (!error) console.log('结果加载成功');
 * });
 * 
 * 属性说明:
 * - net: 网络客户端实例
 * - dsAdapter: DashScope适配器实例
 * - results: 处理结果存储
 * - startCallback: 生命周期开始回调
 * - endCallback: 生命周期结束回调
 * 
 * 方法列表:
 * - constructor(net): 创建图像处理服务实例
 * - task(params, callback): 提交任务
 * - status(id, callback): 查询状态
 * - process(input, editParams, callback): 批量处理
 * - onStart(callback): 设置生命周期开始回调
 * - onEnd(callback): 设置生命周期结束回调
 * - save(file, callback): 保存结果
 * - load(file, callback): 加载结果
 */

class ImageAIService {
    /**
     * 创建图像处理服务实例
     * @param {Object} net - 网络客户端实例
     */
    constructor(net) {
        this.net = net;
        this.dsAdapter = new window.DashScopeAdapter(net);
        this.results = {};
    }

    /**
     * 提交任务
     * @param {Object} params - 任务参数
     * @param {Function} callback - 回调函数
     */
    task(params, callback) {
        if (!params) return callback(new Error('参数不能为空'));
        
        // 验证必要参数
        if (!params.prompt) {
            return callback(new Error('缺少必要参数: prompt'));
        }
        
        // 对于万象2.5模型，支持images数组
        const model = params.model || 'wanx2.1-imageedit';
        if (model === 'wan2.5-i2i-preview') {
            // 万象2.5可以使用images数组或单个imageUrl
            if (!params.images && !params.imageUrl) {
                return callback(new Error('缺少必要参数: images 或 imageUrl'));
            }
        } else {
            // 其他模型需要imageUrl
            if (!params.imageUrl) {
                return callback(new Error('缺少必要参数: imageUrl'));
            }
        }
        
        // 构建输入数据
        let inputData;
        if (model === 'wan2.5-i2i-preview') {
            inputData = {
                prompt: params.prompt,
                images: params.images || [params.imageUrl],
                negative_prompt: params.negative_prompt
            };
        } else {
            inputData = {
                prompt: params.prompt,
                "base_image_url": params.imageUrl
            };
        }
        
        // 使用适配器提交任务
        this.dsAdapter.invoke(
            model,
            params.operation || 'description_edit',
            inputData,
            {
                parameters: params.parameters || {"n": 1}
            },
            (error, result) => {
                if (error) return callback(error);
                
                const taskId = result.data?.taskId;
                if (taskId) {
                    // 保存任务结果
                    const imageKey = params.images ? params.images[0] : params.imageUrl;
                    this.results[imageKey] = {
                        taskId: taskId,
                        status: 'submitted',
                        createdAt: new Date().toISOString()
                    };
                    
                    // 开始轮询任务状态
                    this.dsAdapter.poll(taskId, 30, 1000, (pollError, pollResult) => {
                        if (!pollError) {
                            // 更新结果
                            this.results[imageKey] = {
                                ...this.results[imageKey],
                                status: pollResult.data?.status,
                                outputUrl: pollResult.data?.outputUrl,
                                updatedAt: new Date().toISOString()
                            };
                        }
                    });
                }
                
                callback(null, result);
            }
        );
    }

    /**
     * 查询状态
     * @param {string} id - 任务ID
     * @param {Function} callback - 回调函数
     */
    status(id, callback) {
        this.dsAdapter.task(id, callback);
    }

    /**
     * 批量处理
     * @param {Array|string} input - 输入文件列表或目录
     * @param {Object} editParams - 编辑参数
     * @param {Function} callback - 回调函数
     */
    process(input, editParams, callback) {
        // 统一处理输入格式
        const files = Array.isArray(input) ? input : [input];
        
        let completed = 0;
        const total = files.length;
        const results = {};
        
        if (total === 0) {
            return callback(null, results);
        }
        
        const checkCompletion = () => {
            completed++;
            if (completed === total) {
                callback(null, results);
            }
        };
        
        // 处理每个文件
        files.forEach((fileUrl) => {
            const params = {
                ...editParams,
                imageUrl: fileUrl
            };
            
            this.task(params, (error, result) => {
                results[fileUrl] = {
                    success: !error,
                    error: error?.message || null,
                    result: result
                };
                checkCompletion();
            });
        });
    }

    /**
     * 生命周期开始回调
     * @param {Function} callback - 回调函数
     */
    onStart(callback) {
        this.startCallback = callback;
        return this;
    }

    /**
     * 生命周期结束回调
     * @param {Function} callback - 回调函数
     */
    onEnd(callback) {
        this.endCallback = callback;
        return this;
    }

    /**
     * 保存结果
     * @param {string} file - 文件路径
     * @param {Function} callback - 回调函数
     */
    save(file, callback) {
        // 这里应该将结果保存到本地存储
        try {
            const data = JSON.stringify(this.results);
            localStorage.setItem('imageAI_results', data);
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    /**
     * 加载结果
     * @param {string} file - 文件路径
     * @param {Function} callback - 回调函数
     */
    load(file, callback) {
        try {
            const data = localStorage.getItem('imageAI_results');
            if (data) {
                this.results = JSON.parse(data);
            }
            callback(null);
        } catch (error) {
            callback(error);
        }
    }
}

// 全局实例
window.ImageAIService = ImageAIService;