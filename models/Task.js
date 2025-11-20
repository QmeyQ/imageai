/**
 * 任务模型模块
 * 
 * 该模块定义了任务数据模型，包括任务的基本信息、状态信息和处理结果。
 * 提供任务数据的创建、更新、查询和管理功能，确保任务数据的一致性和完整性。
 * 
 * 主要功能：
 * - 任务数据模型定义
 * - 任务状态管理
 * - 任务结果存储
 * - 任务生命周期管理
 * - 任务数据持久化
 * 
 * @module models/Task
 * @class Task
 * @property {string} id - 任务ID
 * @property {string} userId - 用户ID
 * @property {string} model - 使用的模型
 * @property {string} operation - 操作类型
 * @property {string} input - 输入数据
 * @property {Object} parameters - 参数配置
 * @property {string} status - 任务状态
 * @property {Object} result - 处理结果
 * @property {string} errorMessage - 错误信息
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 * @property {Date} completedAt - 完成时间
 * @method validate - 验证任务数据
 * @method updateStatus - 更新任务状态
 * @method setResult - 设置处理结果
 * @method toJSON - 转换为JSON对象
 * @method fromJSON - 从JSON对象创建任务
 */

class Task {
    /**
     * 创建任务实例
     * @param {Object} data - 任务数据
     */
    constructor(data = {}) {
        this.id = data.id || this._generateId();
        this.userId = data.userId || '';
        this.model = data.model || 'wanx2.1-imageedit';
        this.operation = data.operation || 'description_edit';
        this.sourceFile = data.sourceFile || null;
        this.sourceUrl = data.sourceUrl || null;
        this.status = data.status || 'pending'; // pending, processing, succeeded, failed
        this.outputUrl = data.outputUrl || null;
        this.idempotencyKey = data.idempotencyKey || this._generateIdempotencyKey();
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.error = data.error || null;
    }

    /**
     * 生成任务ID
     * @returns {string} 任务ID
     */
    _generateId() {
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
     * 更新任务状态
     * @param {string} status - 状态
     * @param {Object} data - 附加数据
     */
    updateStatus(status, data = {}) {
        this.status = status;
        this.updatedAt = new Date().toISOString();
        
        if (data.outputUrl) {
            this.outputUrl = data.outputUrl;
        }
        
        if (data.error) {
            this.error = data.error;
        }
    }

    /**
     * 检查任务是否完成
     * @returns {boolean} 是否完成
     */
    isCompleted() {
        return this.status === 'succeeded' || this.status === 'failed';
    }

    /**
     * 转换为JSON对象
     * @returns {Object} 任务数据对象
     */
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            model: this.model,
            operation: this.operation,
            sourceFile: this.sourceFile,
            sourceUrl: this.sourceUrl,
            status: this.status,
            outputUrl: this.outputUrl,
            idempotencyKey: this.idempotencyKey,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            error: this.error
        };
    }

    /**
     * 从JSON对象创建任务实例
     * @param {Object} data - 任务数据
     * @returns {Task} 任务实例
     */
    static fromJSON(data) {
        return new Task(data);
    }
}

module.exports = Task;