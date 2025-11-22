/**
 * JSON解析中间件模块 - 解析请求体中的JSON数据
 * 
 * 调用示例:
 * const JsonMiddleware = require('./middleware/json.js');
 * const jsonMiddleware = new JsonMiddleware();
 * 
 * // 在服务器中使用
 * server.use((req, res, next) => {
 *   jsonMiddleware.handle(req, res, next);
 * });
 * 
 * 属性说明:
 * 无特定属性
 * 
 * 方法列表:
 * - constructor(): 创建JSON解析中间件实例
 * - handle(req, res, next): 处理JSON解析
 */
class JsonMiddleware {
    /**
     * 创建JSON解析中间件实例
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
        // 只处理包含JSON内容类型的请求
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
            return next();
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                if (body) {
                    req.body = JSON.parse(body);
                } else {
                    req.body = null;
                }
                next();
            } catch (error) {
                res.statusCode = 400;
                res.end(JSON.stringify({
                    success: false,
                    message: '无效的JSON格式'
                }));
            }
        });
    }
}

module.exports = JsonMiddleware;