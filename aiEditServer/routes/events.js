/**
 * 事件路由模块
 * 
 * 该模块处理服务器发送事件（SSE）相关的路由请求，提供实时事件推送功能。
 * 支持任务状态更新、系统通知、处理结果推送等实时通信功能。
 * 
 * 主要功能：
 * - SSE连接建立接口
 * - 实时事件推送
 * - 任务状态更新推送
 * - 系统通知推送
 * - 连接管理
 * 
 * @module routes/events
 * @class EventsRouter
 * @property {Object} services - 服务依赖
 * @property {EventsService} eventsService - 事件服务实例
 * @method registerRoutes - 注册路由
 * @method handleSSEConnection - 处理SSE连接请求
 */

class EventsRouter {
    /**
     * 创建事件路由实例
     * @param {Object} services - 服务对象
     */
    constructor(services) {
        // 事件服务将在后续实现
    }

    /**
     * 注册路由
     * @param {Object} netServer - 网络服务器实例
     */
    registerRoutes(netServer) {
        // SSE事件订阅
        netServer.get('/events', (req, res) => this.subscribe(req, res));
    }

    /**
     * SSE事件订阅
     */
    subscribe(req, res) {
        // 获取事件服务
        if (!this._eventsService) {
            return this._sendError(res, 500, '事件服务未初始化');
        }
        
        // 订阅SSE事件
        this._eventsService.sub(res);
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

module.exports = EventsRouter;