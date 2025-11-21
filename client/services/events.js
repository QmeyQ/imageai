/**
 * SSE 事件服务模块（客户端版本） - 处理客户端服务器发送事件的订阅和管理
 * 
 * 调用示例:
 * const eventsService = new EventsService();
 * 
 * // 订阅事件
 * eventsService.sub('http://localhost:3000/events');
 * 
 * // 添加事件监听器
 * eventsService.on('task-complete', (data) => {
 *   console.log('任务完成:', data);
 * });
 * 
 * // 移除事件监听器
 * eventsService.off('task-complete', callback);
 * 
 * // 关闭连接
 * eventsService.close();
 * 
 * // 获取连接状态
 * const state = eventsService.getReadyState();
 * 
 * 属性说明:
 * - eventSource: EventSource实例
 * - listeners: 事件监听器映射表
 * 
 * 方法列表:
 * - constructor(): 创建事件服务实例
 * - sub(url): 订阅事件
 * - on(type, callback): 添加事件监听器
 * - off(type, callback): 移除事件监听器
 * - _emit(type, data): 触发事件
 * - close(): 关闭连接
 * - getReadyState(): 获取连接状态
 */

class EventsService {
    /**
     * 创建事件服务实例
     */
    constructor() {
        this.eventSource = null;
        this.listeners = new Map();
    }

    /**
     * 订阅事件
     * @param {string} url - SSE服务端点URL
     */
    sub(url) {
        // 如果已有连接，先关闭
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        // 创建新的EventSource连接
        this.eventSource = new EventSource(url);
        
        // 设置事件监听器
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this._emit(data.type, data.data);
            } catch (err) {
                console.error('解析SSE消息失败:', err);
            }
        };
        
        this.eventSource.onerror = (err) => {
            console.error('SSE连接错误:', err);
        };
    }

    /**
     * 添加事件监听器
     * @param {string} type - 事件类型
     * @param {Function} callback - 回调函数
     */
    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(callback);
    }

    /**
     * 移除事件监听器
     * @param {string} type - 事件类型
     * @param {Function} callback - 回调函数
     */
    off(type, callback) {
        if (this.listeners.has(type)) {
            this.listeners.get(type).delete(callback);
        }
    }

    /**
     * 触发事件
     * @param {string} type - 事件类型
     * @param {Object} data - 事件数据
     */
    _emit(type, data) {
        if (this.listeners.has(type)) {
            for (const callback of this.listeners.get(type)) {
                try {
                    callback(data);
                } catch (err) {
                    console.error('事件回调执行失败:', err);
                }
            }
        }
    }

    /**
     * 关闭连接
     */
    close() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    /**
     * 获取连接状态
     * @returns {number} 连接状态
     */
    getReadyState() {
        return this.eventSource ? this.eventSource.readyState : EventSource.CLOSED;
    }
}

// 全局实例
window.EventsService = EventsService;