/**
 * 限流中间件模块 - 限制请求频率，防止滥用
 * 
 * 调用示例:
 * const RateLimitMiddleware = require('./middleware/rate.js');
 * const rateLimitMiddleware = new RateLimitMiddleware({
 *   windowMs: 15 * 60 * 1000, // 15分钟
 *   max: 100 // 限制每个IP在窗口期内最多100个请求
 * });
 * 
 * // 在服务器中使用
 * server.use((req, res, next) => {
 *   rateLimitMiddleware.handle(req, res, next);
 * });
 * 
 * 属性说明:
 * - options: 配置选项
 * - options.windowMs: 时间窗口（毫秒）
 * - options.max: 最大请求数
 * - requests: 请求记录映射表
 * 
 * 方法列表:
 * - constructor(options): 创建限流中间件实例
 * - handle(req, res, next): 处理限流检查
 * - _getClientId(req): 获取客户端标识
 * - _cleanup(): 清理过期记录
 */
class RateLimitMiddleware {
    /**
     * 创建限流中间件实例
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = {
            windowMs: 15 * 60 * 1000, // 15分钟
            max: 100, // 限制每个IP在窗口期内最多100个请求
            ...options
        };
        
        // 请求记录存储
        this.requests = new Map();
        
        // 定期清理过期记录
        setInterval(() => {
            this._cleanup();
        }, this.options.windowMs);
    }

    /**
     * 中间件处理函数
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     * @param {Function} next - 下一个中间件
     */
    handle(req, res, next) {
        const clientId = this._getClientId(req);
        const now = Date.now();
        
        // 获取客户端的请求记录
        if (!this.requests.has(clientId)) {
            this.requests.set(clientId, {
                count: 0,
                startTime: now
            });
        }
        
        const clientRecord = this.requests.get(clientId);
        
        // 检查时间窗口是否已过期
        if (now - clientRecord.startTime > this.options.windowMs) {
            // 重置计数器
            clientRecord.count = 0;
            clientRecord.startTime = now;
        }
        
        // 增加请求计数
        clientRecord.count++;
        
        // 检查是否超过限制
        if (clientRecord.count > this.options.max) {
            res.statusCode = 429;
            res.end(JSON.stringify({
                success: false,
                message: '请求过于频繁，请稍后再试'
            }));
            return;
        }
        
        // 设置响应头
        res.setHeader('X-RateLimit-Limit', this.options.max);
        res.setHeader('X-RateLimit-Remaining', this.options.max - clientRecord.count);
        res.setHeader('X-RateLimit-Reset', new Date(clientRecord.startTime + this.options.windowMs).toISOString());
        
        next();
    }

    /**
     * 获取客户端标识
     * @param {Object} req - 请求对象
     * @returns {string} 客户端标识
     */
    _getClientId(req) {
        // 优先使用X-Forwarded-For头，如果没有则使用远程地址
        return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }

    /**
     * 清理过期记录
     */
    _cleanup() {
        const now = Date.now();
        for (const [clientId, record] of this.requests.entries()) {
            if (now - record.startTime > this.options.windowMs) {
                this.requests.delete(clientId);
            }
        }
    }
}

module.exports = RateLimitMiddleware;