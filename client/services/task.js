/**
 * 任务服务模块（客户端版本） - 处理客户端任务管理和结果存储
 * 
 * 调用示例:
 * const taskService = new TaskService();
 * 
 * // 新增任务
 * const task = taskService.add({ name: 'task1', status: 'pending' });
 * 
 * // 查询任务
 * const foundTask = taskService.get('task-id-123');
 * 
 * // 获取任务列表
 * const tasks = taskService.ls({ status: 'pending' });
 * 
 * // 更新任务
 * const updatedTask = taskService.set('task-id-123', { status: 'completed' });
 * 
 * // 保存结果
 * taskService.saveResult('task-id-123', { output: 'result-data' });
 * 
 * // 获取结果
 * const result = taskService.getResult('task-id-123');
 * 
 * 属性说明:
 * - tasks: 任务存储映射表
 * - results: 结果存储映射表
 * 
 * 方法列表:
 * - constructor(): 创建任务服务实例
 * - add(task): 新增任务
 * - get(id): 查询任务
 * - ls(filter): 获取任务列表
 * - set(id, patch): 更新任务
 * - saveResult(taskId, result): 保存结果
 * - getResult(taskId): 获取结果
 * - _generateTaskId(): 生成任务ID
 */

class TaskService {
    /**
     * 创建任务服务实例
     */
    constructor() {
        // 任务存储 (在客户端使用Map存储)
        this.tasks = new Map();
        // 结果存储
        this.results = new Map();
    }

    /**
     * 新增任务
     * @param {Object} task - 任务对象
     * @returns {Object} 任务对象
     */
    add(task) {
        // 生成任务ID
        const taskId = task.id || this._generateTaskId();
        task.id = taskId;
        
        // 设置时间戳
        const now = new Date().toISOString();
        task.createdAt = task.createdAt || now;
        task.updatedAt = now;
        
        // 存储任务
        this.tasks.set(taskId, task);
        
        return task;
    }

    /**
     * 查询任务
     * @param {string} id - 任务ID
     * @returns {Object|null} 任务对象
     */
    get(id) {
        return this.tasks.get(id) || null;
    }

    /**
     * 任务列表
     * @param {Object} filter - 过滤条件
     * @returns {Array} 任务列表
     */
    ls(filter = {}) {
        let tasks = Array.from(this.tasks.values());
        
        // 应用过滤条件
        if (filter.userId) {
            tasks = tasks.filter(task => task.userId === filter.userId);
        }
        
        if (filter.status) {
            tasks = tasks.filter(task => task.status === filter.status);
        }
        
        return tasks;
    }

    /**
     * 更新任务
     * @param {string} id - 任务ID
     * @param {Object} patch - 更新内容
     * @returns {Object|null} 更新后的任务对象
     */
    set(id, patch) {
        const task = this.get(id);
        if (!task) {
            return null;
        }
        
        // 更新任务
        Object.assign(task, patch);
        task.updatedAt = new Date().toISOString();
        
        // 存储更新后的任务
        this.tasks.set(id, task);
        
        return task;
    }

    /**
     * 保存结果
     * @param {string} taskId - 任务ID
     * @param {Object} result - 结果数据
     */
    saveResult(taskId, result) {
        this.results.set(taskId, {
            taskId: taskId,
            result: result,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * 获取结果
     * @param {string} taskId - 任务ID
     * @returns {Object|null} 结果数据
     */
    getResult(taskId) {
        return this.results.get(taskId) || null;
    }

    /**
     * 生成任务ID
     * @returns {string} 任务ID
     */
    _generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// 全局实例
window.TaskService = TaskService;