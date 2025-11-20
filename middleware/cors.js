/**
 * CORS中间件模块 - 处理跨域资源共享
 * 
 * 调用示例:
 * const CorsMiddleware = require('./middleware/cors.js');
 * const corsMiddleware = new CorsMiddleware();
 * 
 * // 在服务器中使用
 * server.use((req, res, next) => {
 *   corsMiddleware.handle(req, res, next);
 * });
 * 
 * 属性说明:
 * 无特定属性
 * 
 * 方法列表:
 * - constructor(): 创建CORS中间件实例
 * - handle(req, res, next): 处理CORS请求
 */
class CorsMiddleware {
    /**
     * 创建CORS中间件实例
     */
    constructor() {
        // 可以在这里添加CORS配置选项
    }

    /**
     * 中间件处理函数
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     * @param {Function} next - 下一个中间件
     */
    handle(req, res, next) {
        // 设置CORS头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-UserId, X-Timestamp, X-Nonce, X-BodyDigest, X-Signature, x-user-id, x-timestamp, x-nonce, x-body-digest, x-signature');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24小时缓存
        
        // 处理预检请求
        if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
        }
        
        next();
    }
}

module.exports = CorsMiddleware;