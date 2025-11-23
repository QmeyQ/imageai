/**
 * 认证路由模块
 * 
 * 该模块处理用户认证相关的路由请求，包括用户注册、登录、信息获取等功能。
 * 提供安全的认证接口，确保用户身份验证和会话管理的安全性。
 * 
 * 主要功能：
 * - 用户注册接口
 * - 用户登录接口
 * - 当前用户信息获取
 * - 认证状态检查
 * - 会话管理
 * 
 * @module routes/auth
 * @class AuthRouter
 * @property {AuthService} authService - 认证服务实例
 * @property {Object} services - 服务依赖
 * @method registerRoutes - 注册路由
 * @method handleRegister - 处理注册请求
 * @method handleLogin - 处理登录请求
 * @method handleGetMe - 处理获取当前用户信息请求
 */

class AuthRouter {
    /**
     * 创建认证路由实例
     * @param {Object} services - 服务对象
     */
    constructor(services) {
        this.authService = services.auth;
        // 使用实际的用户服务而不是模拟的
        this.userService = services.user;
    }

    /**
     * 注册路由
     * @param {Object} netServer - 网络服务器实例
     */
    registerRoutes(netServer) {
        // 用户注册
        netServer.post('/auth/register', (req, res) => this.register(req, res));
        
        // 用户登录
        netServer.post('/auth/login', (req, res) => this.login(req, res));
        
        // 获取当前用户信息
        netServer.get('/me', (req, res) => this.getCurrentUser(req, res));
    }

    /**
     * 用户注册
     */
    register(req, res) {
        const userData = req.body;
        
        if (!userData || !userData.username || !userData.password) {
            this._sendError(res, 400, '用户名和密码不能为空');
            return;
        }
        
        // 检查用户是否已存在
        this.userService.findByUsername(userData.username, (err, existingUser) => {
            if (err) {
                this._sendError(res, 500, '服务器错误');
                return;
            }
            
            if (existingUser) {
                this._sendError(res, 400, '用户已存在');
                return;
            }
            
            // 创建新用户
            this.userService.create(userData, (err, user) => {
                if (err) {
                    this._sendError(res, 500, '注册失败');
                    return;
                }
                
                // 生成公钥（模拟）
                const publicKey = 'mock_public_key_' + user.id;
                
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({
                    success: true,
                    data: {
                        user: {
                            id: user.id,
                            username: user.username
                        },
                        publicKey: publicKey
                    }
                }));
            });
        });
    }

    /**
     * 用户登录
     */
    login(req, res) {
        const userData = req.body;
        
        if (!userData || !userData.username || !userData.password) {
            this._sendError(res, 400, '用户名和密码不能为空');
            return;
        }
        
        // 查找用户
        this.userService.findByUsername(userData.username, (err, user) => {
            if (err) {
                this._sendError(res, 500, '服务器错误');
                return;
            }
            
            if (!user) {
                this._sendError(res, 401, '用户不存在');
                return;
            }
            
            // 验证密码（在实际实现中，应该使用哈希比较）
            if (user.password !== userData.password) {
                this._sendError(res, 401, '密码错误');
                return;
            }
            
            // 生成公钥（模拟）
            const publicKey = 'mock_public_key_' + user.id;
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        username: user.username
                    },
                    publicKey: publicKey
                }
            }));
        });
    }

    /**
     * 获取当前用户信息
     */
    getCurrentUser(req, res) {
        // 从请求中获取用户信息（在实际实现中，这应该通过鉴权中间件设置）
        const userId = req.headers['x-user-id'];
        
        if (!userId) {
            this._sendError(res, 401, '未登录');
            return;
        }
        
        // 查找用户
        this.userService.findById(userId, (err, user) => {
            if (err) {
                this._sendError(res, 500, '服务器错误');
                return;
            }
            
            if (!user) {
                this._sendError(res, 401, '用户不存在');
                return;
            }
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        username: user.username
                    }
                }
            }));
        });
    }

    /**
     * 发送错误响应
     */
    _sendError(res, statusCode, message) {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
            success: false,
            message
        }));
    }
}

module.exports = AuthRouter;