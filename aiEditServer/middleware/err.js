/**
 * 错误处理中间件模块 - 统一处理服务器错误
 * 
 * 调用示例:
 * const ErrorMiddleware = require('./middleware/err.js');
 * const errorMiddleware = new ErrorMiddleware();
 * 
 * // 在服务器中使用
 * server.use((req, res, next) => {
 *   errorMiddleware.handle(req, res, next);
 * });
 * 
 * 属性说明:
 * 无特定属性
 * 
 * 方法列表:
 * - constructor(): 创建错误处理中间件实例
 * - handle(req, res, next): 处理错误
 */
class ErrorMiddleware {
    /**
     * 创建错误处理中间件实例
     */
    constructor() {
        // 可以在这里添加配置选项
    }

    /**
     * 中间件处理函数
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     * @param {Function} next - 下一个中间件
     */
    handle(req, res, next) {
        // 捕获下一个中间件中的错误
        try {
            next();
        } catch (error) {
            console.error('服务器错误:', error);
            
            // 设置错误响应
            res.statusCode = 500;
            res.end(JSON.stringify({
                success: false,
                message: '服务器内部错误'
            }));
        }
    }
}

module.exports = ErrorMiddleware;