/**
 * DashScope 适配器模块（客户端版本） - 提供与 DashScope API 交互的接口
 * 
 * 调用示例:
 * const dsAdapter = new DashScopeAdapter(window.Net);
 * 
 * // 统一模型调用
 * dsAdapter.invoke('model-name', 'operation', { input: 'data' }, { parameters: {} }, (error, result) => {
 *   if (!error) console.log('模型调用成功:', result);
 * });
 * 
 * // 查询任务
 * dsAdapter.task('task-id-123', (error, result) => {
 *   if (!error) console.log('任务查询成功:', result);
 * });
 * 
 * // 轮询任务状态
 * dsAdapter.poll('task-id-123', 30, 1000, (error, result) => {
 *   if (!error) console.log('轮询完成:', result);
 * });
 * 
 * // 获取可用模型列表
 * dsAdapter.getModels((error, models) => {
 *   if (!error) console.log('模型列表:', models);
 * });
 * 
 * // 获取模型支持的操作
 * dsAdapter.getOperations('model-name', (error, operations) => {
 *   if (!error) console.log('操作列表:', operations);
 * });
 * 
 * 属性说明:
 * - net: 网络客户端实例
 * 
 * 方法列表:
 * - constructor(net): 创建 DashScope 适配器实例
 * - invoke(model, op, input, cfg, callback): 统一模型调用
 * - task(id, callback): 查询任务
 * - poll(id, max, interval, callback): 轮询任务状态
 * - getModels(callback): 获取可用模型列表
 * - getOperations(model, callback): 获取模型支持的操作
 */

class DashScopeAdapter {
    /**
     * 创建 DashScope 适配器实例
     * @param {Object} net - 网络客户端实例
     */
    constructor(net) {
        this.net = net;
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
        const payload = {
            model: model,
            input: {
                "function": op,
                ...input
            },
            parameters: cfg.parameters || {"n": 1}
        };

        // 使用 Net 客户端发送请求
        this.net.post('/img/task', payload, callback);
    }

    /**
     * 查任务
     * @param {string} id - 任务ID
     * @param {Function} callback - 回调函数
     */
    task(id, callback) {
        if (!id) return callback(new Error('任务ID不能为空'));
        
        this.net.get(`/img/task/${id}`, null, callback);
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

                const status = result.data?.status;
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
        this.net.getModels(callback);
    }

    /**
     * 获取模型支持的操作
     * @param {string} model - 模型名称
     * @param {Function} callback - 回调函数
     */
    getOperations(model, callback) {
        this.net.getOperations(model, callback);
    }
}

// 全局实例
window.DashScopeAdapter = DashScopeAdapter;