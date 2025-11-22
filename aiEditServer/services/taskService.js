/**
 * 任务服务模块
 * 
 * 该模块管理AI处理任务的生命周期，包括任务创建、状态更新、结果存储等。
 * 提供任务的增删改查功能，支持任务状态的实时监控和结果管理。
 * 
 * 主要功能：
 * - 任务生命周期管理
 * - 任务状态更新
 * - 任务结果存储
 * - 任务查询和过滤
 * - 任务幂等性控制
 * - 任务统计信息
 * 
 * @module services/task
 * @class TaskService
 * @property {Map} tasks - 任务存储映射表
 * @property {Map} results - 结果存储映射表
 * @property {Set} idempotencyKeys - 幂等键集合
 * @method createTask - 创建任务
 * @method getTask - 获取任务
 * @method updateTask - 更新任务
 * @method deleteTask - 删除任务
 * @method listTasks - 列出任务
 * @method saveResult - 保存结果
 * @method getResult - 获取结果
 * @method isIdempotent - 检查幂等性
 */

const path = require('path');

class TaskService {
    /**
     * 创建任务服务实例
     * @param {Object} options - 配置选项
     * @param {number} options.apiExpiryDays - API结果过期天数
     */
    constructor(options = {}) {
        this.options = {
            apiExpiryDays: 3, // API结果默认3天过期
            ...options
        };
    }

    /**
     * 创建任务记录
     * @param {Object} params - 任务参数
     * @returns {Object} 任务记录
     */
    createTaskRecord(params) {
        const now = new Date().toISOString();
        return {
            id: this._generateTaskId(),
            userId: params.userId || 'anonymous',
            model: params.model || 'wanx2.1-imageedit',
            operation: params.operation || 'description_edit',
            sourceFile: params.sourceFile || null,
            sourceUrl: params.sourceUrl || null,
            status: 'submitted',
            outputUrl: null,
            idempotencyKey: params.idempotencyKey || this._generateIdempotencyKey(),
            createdAt: now,
            updatedAt: now,
            error: null
        };
    }

    /**
     * 更新任务状态
     * @param {Object} task - 任务记录
     * @param {string} status - 状态
     * @param {Object} result - 结果数据
     * @returns {Object} 更新后的任务记录
     */
    updateTaskStatus(task, status, result = null) {
        task.status = status;
        task.updatedAt = new Date().toISOString();
        
        if (result) {
            if (result.output && result.output.results && result.output.results.length > 0) {
                task.outputUrl = result.output.results[0].url;
            }
            if (result.output && result.output.task_status) {
                task.status = result.output.task_status;
            }
            if (result.error) {
                task.error = result.error;
            }
        }
        
        return task;
    }

    /**
     * 生成任务ID
     * @returns {string} 任务ID
     */
    _generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 生成幂等键
     * @returns {string} 幂等键
     */
    _generateIdempotencyKey() {
        return 'idem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 清理过期的API结果
     * 考虑到API提供方的三天过期时间，清理本地存储的过期结果
     * @param {Object} results - 结果对象
     * @returns {number} 清理的数量
     */
    cleanupExpiredResults(results) {
        const now = new Date();
        const expiryTime = this.options.apiExpiryDays * 24 * 60 * 60 * 1000; // 转换为毫秒
        
        let cleanedCount = 0;
        
        Object.keys(results).forEach(key => {
            const result = results[key];
            
            // 检查结果是否有创建时间
            if (result.createdAt) {
                const createTime = new Date(result.createdAt).getTime();
                const age = now.getTime() - createTime;
                
                // 如果结果超过API过期时间，则删除
                if (age > expiryTime) {
                    delete results[key];
                    cleanedCount++;
                    console.log(`清理过期API结果: ${key}, 创建时间: ${result.createdAt}`);
                }
            }
        });
        
        if (cleanedCount > 0) {
            console.log(`API结果清理完成，共删除 ${cleanedCount} 个过期结果`);
        }
        
        return cleanedCount;
    }

    /**
     * 验证任务参数
     * @param {Object} params - 任务参数
     * @returns {Object} 验证结果 {valid: boolean, errors: Array}
     */
    validateTaskParams(params) {
        const errors = [];
        
        if (!params.prompt) {
            errors.push('缺少prompt参数');
        }
        
        if (!params.imageUrl && !params.filePath) {
            errors.push('必须提供imageUrl或filePath参数');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 格式化任务结果
     * @param {Object} task - 任务记录
     * @param {Object} result - API结果
     * @returns {Object} 格式化后的结果
     */
    formatTaskResult(task, result) {
        return {
            taskId: task.id,
            status: task.status,
            outputUrl: task.outputUrl,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            sourceFile: task.sourceFile,
            sourceUrl: task.sourceUrl,
            error: task.error,
            apiResult: result
        };
    }
}

module.exports = TaskService;