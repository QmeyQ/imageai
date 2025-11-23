/**
 * 归属校验中间件模块 - 验证用户对资源的访问权限
 * 
 * 调用示例:
 * const OwnershipMiddleware = require('./middleware/own.js');
 * const ownershipMiddleware = new OwnershipMiddleware({
 *   uploadDir: './uploads'
 * });
 * 
 * // 在服务器中使用
 * server.use((req, res, next) => {
 *   ownershipMiddleware.handle(req, res, next);
 * });
 * 
 * 属性说明:
 * - options: 配置选项
 * - options.uploadDir: 上传目录路径
 * 
 * 方法列表:
 * - constructor(options): 创建归属校验中间件实例
 * - handle(req, res, next): 处理归属校验请求
 * - _requiresOwnershipCheck(req): 检查是否需要归属校验
 * - _isUserPath(req, userId): 验证路径是否在用户目录内
 * - _isAdmin(req): 检查是否为管理员
 */
const path = require('path');

class OwnershipMiddleware {
    /**
     * 创建归属校验中间件实例
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = {
            uploadDir: './uploads',
            ...options
        };
    }

    /**
     * 中间件处理函数
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     * @param {Function} next - 下一个中间件
     */
    handle(req, res, next) {
        // 获取用户ID
        const userId = req.headers['x-user-id'];
        
        // 检查是否需要归属校验
        if (!this._requiresOwnershipCheck(req)) {
            return next();
        }
        
        // 验证路径是否在用户目录内
        if (!this._isUserPath(req, userId)) {
            res.statusCode = 403;
            res.end(JSON.stringify({
                success: false,
                message: '访问被拒绝：您无权访问此资源'
            }));
            return;
        }
        
        next();
    }

    /**
     * 检查是否需要归属校验
     * @param {Object} req - 请求对象
     * @returns {boolean} 是否需要归属校验
     */
    _requiresOwnershipCheck(req) {
        // 对于文件相关操作需要校验归属
        const fileRoutes = ['/upload', '/files', '/uploads'];
        
        // 检查是否是文件相关路由
        const isFileRoute = fileRoutes.some(route => req.path.startsWith(route));
        
        // 对于上传路由，如果用户未登录，则允许匿名上传
        if (req.path === '/upload' && req.method === 'POST' && !req.headers['x-user-id']) {
            return false;
        }
        
        // 对于静态文件路由，如果用户未登录，则允许匿名访问
        if (req.path.startsWith('/uploads/') && !req.headers['x-user-id']) {
            return false;
        }
        
        return isFileRoute;
    }

    /**
     * 验证路径是否在用户目录内
     * @param {Object} req - 请求对象
     * @param {string} userId - 用户ID
     * @returns {boolean} 是否在用户目录内
     */
    _isUserPath(req, userId) {
        // 管理员可以访问所有目录
        if (this._isAdmin(req)) {
            return true;
        }
        
        // 对于文件列表请求，允许用户访问自己的文件
        if (req.path === '/files' && req.method === 'GET') {
            return true;
        }
        
        // 对于上传请求，如果用户未登录，则允许匿名上传
        if (req.path === '/upload' && req.method === 'POST' && !userId) {
            return true;
        }
        
        // 对于静态文件请求，如果用户未登录，则允许匿名访问
        if (req.path.startsWith('/uploads/') && !userId) {
            return true;
        }
        
        // 对于文件删除请求，如果用户未登录，则允许匿名删除
        if (req.path.startsWith('/files/') && req.method === 'DELETE' && !userId) {
            return true;
        }
        
        // 如果没有用户ID，则拒绝访问（除了上面的特殊情况）
        if (!userId) {
            return false;
        }
        
        // 构建用户目录路径
        const userDir = path.join(this.options.uploadDir, userId);
        
        // 获取请求的文件路径
        let filePath = '';
        if (req.path.startsWith('/uploads/') && req.params && req.params.filename) {
            filePath = path.join(this.options.uploadDir, userId, req.params.filename);
        } else if (req.path.startsWith('/files/') && req.params && req.params.filename) {
            filePath = path.join(this.options.uploadDir, userId, req.params.filename);
        }
        
        // 如果没有具体的文件路径，允许访问
        if (!filePath) {
            return true;
        }
        
        // 检查文件路径是否在用户目录内
        return filePath.startsWith(userDir);
    }

    /**
     * 检查是否为管理员
     * @param {Object} req - 请求对象
     * @returns {boolean} 是否为管理员
     */
    _isAdmin(req) {
        // 这里应该检查用户角色
        // 暂时返回false
        return false;
    }
}

module.exports = OwnershipMiddleware;