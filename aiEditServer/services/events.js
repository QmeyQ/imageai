/**
 * 事件服务模块
 * 
 * 该模块处理服务器端的事件管理和推送功能，基于SSE（Server-Sent Events）
 * 技术实现实时事件推送。支持任务状态更新、系统通知等事件的广播和管理。
 * 
 * 主要功能：
 * - SSE事件推送
 * - 事件广播管理
 * - 客户端连接管理
 * - 事件数据格式化
 * - 连接状态监控
 * 
 * @module services/events
 * @class EventsService
 * @property {Set} clients - 客户端连接集合
 * @property {Map} eventListeners - 事件监听器映射
 * @method addClient - 添加客户端连接
 * @method removeClient - 移除客户端连接
 * @method broadcast - 广播事件
 * @method sendToClient - 发送事件给特定客户端
 * @method emit - 触发事件
 */

class EventsService {
    /**
     * 创建事件服务实例
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = {
            // 事件存储
            subscribers: new Set(),
            ...options
        };
    }

    /**
     * 订阅事件
     * @param {Object} res - 响应对象
     */
    sub(res) {
        // 设置SSE响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 发送初始连接消息
        res.write('data: {"type": "connected", "message": "SSE连接已建立"}\n\n');
        
        // 添加订阅者
        this.options.subscribers.add(res);
        
        // 监听连接关闭事件
        res.on('close', () => {
            this.options.subscribers.delete(res);
        });
    }

    /**
     * 广播事件
     * @param {string} type - 事件类型
     * @param {Object} data - 事件数据
     */
    emit(type, data) {
        // 构造SSE消息
        const message = `data: ${JSON.stringify({ type, data })}\n\n`;
        
        // 向所有订阅者发送消息
        for (const res of this.options.subscribers) {
            try {
                res.write(message);
            } catch (err) {
                // 如果发送失败，移除订阅者
                this.options.subscribers.delete(res);
            }
        }
    }

    /**
     * 发送心跳
     */
    sendHeartbeat() {
        const heartbeat = 'data: {"type": "heartbeat"}\n\n';
        
        for (const res of this.options.subscribers) {
            try {
                res.write(heartbeat);
            } catch (err) {
                this.options.subscribers.delete(res);
            }
        }
    }

    /**
     * 获取订阅者数量
     * @returns {number} 订阅者数量
     */
    getSubscriberCount() {
        return this.options.subscribers.size;
    }
}

module.exports = EventsService;