/**
 * 图像处理路由模块
 * 
 * 该模块处理图像AI处理相关的路由请求，包括任务提交、状态查询、结果获取等功能。
 * 提供与AI模型交互的接口，支持多种图像处理操作和模型。
 * 
 * 主要功能：
 * - 图像处理任务提交接口
 * - 任务状态查询接口
 * - 处理结果获取接口
 * - 模型列表获取接口
 * - 操作类型获取接口
 * - 配置管理接口
 * 
 * @module routes/image
 * @class ImageRouter
 * @property {Object} services - 服务依赖
 * @property {ImageAIService} imageAI - 图像AI服务实例
 * @property {DashScopeAdapter} dsAdapter - DashScope适配器实例
 * @property {ModelService} modelService - 模型服务实例
 * @method registerRoutes - 注册路由
 * @method handleTaskSubmit - 处理任务提交请求
 * @method handleTaskStatus - 处理任务状态查询请求
 * @method handleGetModels - 处理获取模型列表请求
 * @method handleGetOperations - 处理获取操作类型请求
 * @method handleConfig - 处理配置管理请求
 */

const Task = require('../models/Task.js');

class ImageRouter {
    /**
     * 创建图像路由实例
     * @param {Object} services - 服务对象
     */
    constructor(services) {
        this._imageAI = services.imageAI;
        this._taskService = services.taskService;
        this._quotaService = services.quotaService;
        this._eventsService = services.eventsService;
        this._modelService = services.modelService; // 添加模型服务
        this._dsAdapter = services.dsAdapter; // 添加DashScope适配器
    }

    /**
     * 注册路由
     * @param {Object} netServer - 网络服务器实例
     */
    registerRoutes(netServer) {
        // 提交图像处理任务
        netServer.post('/img/task', (req, res) => this.submitTask(req, res));
        
        // 查询任务状态
        netServer.get('/img/task/:id', (req, res) => this.getTaskStatus(req, res));
        
        // 获取处理结果
        netServer.get('/img/results', (req, res) => this.getResults(req, res));
        
        // 配置管理
        netServer.get('/img/config', (req, res) => this.getConfig(req, res));
        netServer.post('/img/config', (req, res) => this.setConfig(req, res));
        
        // 模型管理
        netServer.get('/img/models', (req, res) => this.getModels(req, res));
        netServer.get('/img/models/:model/operations', (req, res) => this.getModelOperations(req, res));
    }

    /**
     * 提交图像处理任务
     */
    submitTask(req, res) {
        // 获取用户ID
        const userId = req.headers['x-user-id'] || 'anonymous';
        
        // 检查用户配额
        if (this._quotaService.cap({ quotaRemaining: 0 })) {
            return this._sendError(res, 400, '配额不足，无法提交任务');
        }
        
        // 检查是否已存在相同幂等键的任务
        const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotencyKey;
        if (idempotencyKey && this._quotaService.idemHas(idempotencyKey)) {
            return this._sendError(res, 400, '重复的任务提交');
        }
        
        // 验证参数
        if (!req.body || !req.body.prompt) {
            return this._sendError(res, 400, '缺少必要的参数: prompt');
        }
        
        // 验证模型和操作
        const modelId = req.body.model || 'wanx2.1-imageedit';
        const operation = req.body.operation || 'description_edit';
        
        if (this._modelService && !this._modelService.validate(modelId, operation)) {
            return this._sendError(res, 400, `模型 ${modelId} 不支持操作 ${operation}`);
        }
        
        // 验证参数是否符合模型要求
        if (this._modelService) {
            const validation = this._modelService.validateParams(modelId, req.body);
            if (!validation.valid) {
                return this._sendError(res, 400, '参数验证失败: ' + validation.errors.join(', '));
            }
        }
        
        // 创建任务
        const task = new Task({
            userId: userId,
            model: modelId,
            operation: operation,
            sourceFile: req.body.sourceFile || null,
            sourceUrl: req.body.sourceUrl || null
        });
        
        // 保存任务
        this._taskService.add(task);
        
        // 设置幂等键
        if (idempotencyKey) {
            this._quotaService.idemSet(idempotencyKey);
        }
        
        // 扣除配额（根据模型成本）
        let cost = 1;
        if (this._modelService) {
            const model = this._modelService.get(modelId);
            cost = model?.cost || 1;
        }
        
        this._quotaService.deduct({ quotaRemaining: cost });
        
        // 提交到AI处理
        this._imageAI.task(req.body, (error, result) => {
            if (error) {
                // 处理失败，返还配额
                this._quotaService.refund({ quotaRemaining: cost, quotaUsed: 0 });
                
                // 更新任务状态
                task.updateStatus('failed', { error: error.message });
                this._taskService.set(task.id, task);
                
                // 发送事件
                this._eventsService.emit('task_failed', { taskId: task.id, error: error.message });
                
                return this._sendError(res, 500, '任务提交失败: ' + error.message);
            }
            
            // 更新任务状态
            task.updateStatus('processing', { taskId: result.taskId });
            this._taskService.set(task.id, task);
            
            // 发送事件
            this._eventsService.emit('task_submitted', { taskId: task.id, aiTaskId: result.taskId });
            
            // 返回结果
            res.end(JSON.stringify({
                success: true,
                data: {
                    taskId: task.id,
                    aiTaskId: result.taskId,
                    status: 'processing'
                }
            }));
        });
    }

    /**
     * 查询任务状态
     */
    getTaskStatus(req, res) {
        const taskId = req.params.id;
        
        if (!taskId) {
            return this._sendError(res, 400, '缺少任务ID');
        }
        
        // 获取任务
        const task = this._taskService.get(taskId);
        
        if (!task) {
            return this._sendError(res, 404, '任务不存在');
        }
        
        // 查询AI任务状态
        this._imageAI.status(task.aiTaskId, (error, status, result) => {
            if (error) {
                return this._sendError(res, 500, '查询任务状态失败: ' + error.message);
            }
            
            // 更新任务状态
            if (status === 'SUCCEEDED') {
                task.updateStatus('succeeded', { 
                    outputUrl: result.output?.results?.[0]?.url 
                });
                // 增加已使用配额
                this._quotaService.increaseUsedQuota({ quotaUsed: 1 });
            } else if (status === 'FAILED') {
                task.updateStatus('failed', { 
                    error: result.output?.message || '处理失败' 
                });
                // 返还配额
                this._quotaService.refund({ quotaRemaining: 1, quotaUsed: 0 });
            }
            
            this._taskService.set(taskId, task);
            
            // 发送事件
            this._eventsService.emit('task_status_updated', { 
                taskId: task.id, 
                status: task.status,
                outputUrl: task.outputUrl,
                error: task.error
            });
            
            // 返回结果
            res.end(JSON.stringify({
                success: true,
                data: {
                    taskId: task.id,
                    status: task.status,
                    outputUrl: task.outputUrl,
                    error: task.error,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt
                }
            }));
        });
    }

    /**
     * 获取处理结果
     */
    getResults(req, res) {
        // 获取所有任务
        const tasks = this._taskService.ls({
            userId: req.headers['x-user-id'] || 'anonymous'
        });
        
        // 过滤已完成的任务
        const completedTasks = tasks.filter(task => task.isCompleted());
        
        res.end(JSON.stringify({
            success: true,
            data: completedTasks.map(task => task.toJSON())
        }));
    }

    /**
     * 获取配置
     */
    getConfig(req, res) {
        // 设置响应头，确保中文字符正确显示
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // 如果有模型服务，返回模型配置版本信息
        if (this._modelService) {
            const version = this._modelService.getConfigVersion();
            res.end(JSON.stringify({
                success: true,
                data: {
                    modelConfigVersion: version
                }
            }));
            return;
        }
        
        this._sendError(res, 500, '未实现');
    }

    /**
     * 设置配置
     */
    setConfig(req, res) {
        // 实现细节将在后续完善
        this._sendError(res, 500, '未实现');
    }

    /**
     * 获取模型列表
     */
    getModels(req, res) {
        // 设置响应头，确保中文字符正确显示
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // 如果有模型服务，使用本地配置
        if (this._modelService) {
            const models = this._modelService.list();
            const version = this._modelService.getConfigVersion();
            
            res.end(JSON.stringify({
                success: true,
                data: models,
                version: version
            }));
            return;
        }
        
        // 否则使用DashScope适配器获取
        this._dsAdapter.getModels((error, result) => {
            if (error) {
                return this._sendError(res, 500, '获取模型列表失败: ' + error.message);
            }
            
            res.end(JSON.stringify({
                success: true,
                data: result
            }));
        });
    }

    /**
     * 获取模型支持的操作
     */
    getModelOperations(req, res) {
        const modelId = req.params.model;
        
        if (!modelId) {
            return this._sendError(res, 400, '缺少模型ID');
        }
        
        // 设置响应头，确保中文字符正确显示
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // 如果有模型服务，使用本地配置
        if (this._modelService) {
            const operations = this._modelService.getOperations(modelId);
            res.end(JSON.stringify({
                success: true,
                data: { operations }
            }));
            return;
        }
        
        // 否则使用DashScope适配器获取
        this._dsAdapter.getOperations(modelId, (error, result) => {
            if (error) {
                return this._sendError(res, 500, '获取模型操作失败: ' + error.message);
            }
            
            res.end(JSON.stringify({
                success: true,
                data: result
            }));
        });
    }

    /**
     * 发送错误响应
     */
    _sendError(res, statusCode, message) {
        res.statusCode = statusCode;
        res.end(JSON.stringify({
            success: false,
            message
        }));
    }
}

module.exports = ImageRouter;