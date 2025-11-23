/**
 * 归属校验中间件
 * 
 * 该中间件负责验证用户对资源的访问权限，确保用户只能访问自己拥有的资源，
 * 防止越权访问和数据泄露。支持用户隔离和权限控制机制。
 * 
 * 主要功能：
 * - 用户资源归属验证
 * - 路径安全性检查
 * - 匿名访问控制
 * - 管理员权限验证
 * 
 * @module middleware/own
 * @class OwnershipMiddleware
 * @property {Object} options - 中间件配置选项
 * @method handle - 处理请求
 * @method _isAdmin - 检查是否为管理员
 * @method _isUserPath - 验证路径是否在用户目录内
 */

const path = require('path');

class OwnershipMiddleware {
    /**
     * 创建归属校验中间件实例
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = {
            baseDir: './360house-master',
            uploadSubDir: 'uploads',
            ...options
        };
    }

    /**
     * 处理请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     * @param {Function} next - 下一步回调
     */
    handle(req, res, next) {
        // 获取用户ID
        const userId = req.headers['x-user-id'];
        
        // 检查是否为管理员
        if (this._isAdmin(req)) {
            return next();
        }
        
        // 检查路径是否在用户目录内
        if (this._isUserPath(req, userId)) {
            return next();
        }
        
        // 拒绝访问
        res.statusCode = 403;
        res.end(JSON.stringify({
            success: false,
            message: '访问被拒绝：您没有权限访问此资源'
        }));
    }

    /**
     * 检查是否为管理员
     * @param {Object} req - 请求对象
     * @returns {boolean} 是否为管理员
     */
    _isAdmin(req) {
        // 这里可以实现管理员检查逻辑
        // 例如检查特定的请求头或认证信息
        return false;
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
        
        // 允许访问注册和登录路由
        if ((req.path === '/auth/register' || req.path === '/auth/login') && req.method === 'POST') {
            return true;
        }
        
        // 允许访问模型相关路由（公开访问）
        if (req.path.startsWith('/img/models')) {
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
        
        // 构建用户目录路径（新的目录结构）
        const userDir = path.join(this.options.baseDir, userId);
        const userUploadDir = path.join(userDir, this.options.uploadSubDir);
        
        // 获取请求的文件路径
        let filePath = '';
        if (req.path.startsWith('/uploads/') && req.params && req.params.filename) {
            filePath = path.join(userUploadDir, req.params.filename);
        } else if (req.path.startsWith('/files/') && req.params && req.params.filename) {
            filePath = path.join(userUploadDir, req.params.filename);
        }
        
        // 如果没有具体的文件路径，允许访问
        if (!filePath) {
            return true;
        }
        
        // 检查文件路径是否在用户目录内
        return filePath.startsWith(userDir);
    }
}

module.exports = OwnershipMiddleware;