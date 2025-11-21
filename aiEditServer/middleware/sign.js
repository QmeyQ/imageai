/**
 * 签名验证中间件模块 - 验证客户端请求的签名
 * 
 * 调用示例:
 * const AuthService = require('../services/auth.js');
 * const SignMiddleware = require('./middleware/sign.js');
 * const authService = new AuthService();
 * const signMiddleware = new SignMiddleware(authService);
 * 
 * // 在服务器中使用
 * server.use((req, res, next) => {
 *   signMiddleware.handle(req, res, next);
 * });
 * 
 * 属性说明:
 * - authService: 鉴权服务实例
 * 
 * 方法列表:
 * - constructor(authService): 创建签名验证中间件实例
 * - handle(req, res, next): 中间件处理函数，验证请求签名
 * - _requiresSignature(req): 检查是否需要签名验证
 */
const AuthService = require('../services/auth.js');

class SignMiddleware {
    /**
     * 创建签名验证中间件实例
     * @param {AuthService} authService - 鉴权服务实例
     */
    constructor(authService) {
        this.authService = authService;
    }

    /**
     * 中间件处理函数
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     * @param {Function} next - 下一个中间件
     */
    handle(req, res, next) {
        // 检查是否需要签名验证（通过路由判断，注册不验签）
        if (!this._requiresSignature(req)) {
            return next();
        }
        
        // 验证签名
        const result = this.authService.verify(req);
        
        if (!result.valid) {
            res.statusCode = 401;
            res.end(JSON.stringify({
                success: false,
                message: result.error || '签名验证失败'
            }));
            return;
        }
        
        next();
    }

    /**
     * 检查是否需要签名验证
     * @param {Object} req - 请求对象
     * @returns {boolean} 是否需要签名验证
     */
    _requiresSignature(req) {
        // 对于某些路由可能不需要签名验证
        const exemptRoutes = ['/health', '/auth/register', '/auth/login'];
        
        // 也排除/me路由的GET请求（获取当前用户信息）
        if (req.path === '/me' && req.method === 'GET') {
            return false;
        }
        
        // 排除模型相关路由（这些路由应该是公开的）
        if (req.path.startsWith('/img/models')) {
            return false;
        }
        
        // 对于上传路由，如果用户未登录，则不需要签名验证
        if (req.path === '/upload' && req.method === 'POST' && !req.headers['x-user-id']) {
            return false;
        }
        
        // 对于文件列表路由，如果用户未登录，则不需要签名验证
        if (req.path === '/files' && req.method === 'GET' && !req.headers['x-user-id']) {
            return false;
        }
        
        // 对于文件删除路由，如果用户未登录，则不需要签名验证
        if (req.path.startsWith('/files/') && req.method === 'DELETE' && !req.headers['x-user-id']) {
            return false;
        }
        
        return !exemptRoutes.includes(req.path);
    }
}

module.exports = SignMiddleware;