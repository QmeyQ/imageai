/**
 * 网络服务模块 - 提供HTTP服务器的核心功能
 * 
 * 调用示例:
 * const NetServer = require('./net.js');
 * const server = new NetServer({ port: 3000, host: '0.0.0.0' });
 * 
 * // 注册中间件
 * server.use((req, res, next) => {
 *   console.log('中间件处理');
 *   next();
 * });
 * 
 * // 注册路由
 * server.get('/api/users', (req, res) => {
 *   res.end(JSON.stringify({ message: '获取用户列表' }));
 * });
 * 
 * server.post('/api/users', (req, res) => {
 *   res.end(JSON.stringify({ message: '创建用户' }));
 * });
 * 
 * // 启动服务器
 * server.start((err) => {
 *   if (!err) console.log('服务器启动成功');
 * });
 * 
 * // 停止服务器
 * server.stop((err) => {
 *   if (!err) console.log('服务器停止成功');
 * });
 * 
 * 属性说明:
 * - options: 服务器配置选项
 * - options.port: 服务器端口
 * - options.host: 服务器主机
 * - options.https: HTTPS配置（如果需要HTTPS服务器）
 * - server: HTTP服务器实例
 * - _routes: 路由映射表
 * - _middlewares: 中间件列表
 * - _errorHandler: 错误处理函数
 * 
 * 方法列表:
 * - constructor(options): 创建网络服务器实例
 * - use(middleware): 注册中间件
 * - error(errorHandler): 注册错误处理中间件
 * - get(path, handler): 注册GET路由
 * - post(path, handler): 注册POST路由
 * - put(path, handler): 注册PUT路由
 * - delete(path, handler): 注册DELETE路由
 * - patch(path, handler): 注册PATCH路由
 * - _registerRoute(method, path, handler): 内部方法：注册路由
 * - start(callback): 启动服务器
 * - stop(callback): 停止服务器
 * - _handleRequest(req, res): 内部方法：处理请求
 * - _routeRequest(req, res): 内部方法：路由请求到对应的处理函数
 * - _matchRoute(requestPath, routes): 处理路径匹配，支持简单的参数路由
 * - _handleError(error, req, res): 内部方法：处理错误
 */
const http = require('http');
const https = require('https');
const url = require('url');

/**
 * 网络服务器类
 * 用于注册HTTP/HTTPS服务器并分发请求到对应的处理函数
 * 不负责实现具体业务逻辑，仅提供请求路由和分发机制
 */
class NetServer {
    /**
     * 创建网络服务器实例
     * @param {Object} [options={}] - 服务器配置选项
     * @param {number} [options.port=3000] - 服务器监听端口
     * @param {string} [options.host='0.0.0.0'] - 服务器监听地址
     * @param {Object} [options.https] - HTTPS配置（如果需要HTTPS服务器）
     */
    constructor(options = {}) {
        /**
         * 服务器配置
         * @type {Object}
         */
        this.options = {
            port: options.port || 3000,
            host: options.host || '0.0.0.0',
            https: options.https || null
        };
        
        /**
         * HTTP服务器实例
         * @type {http.Server|null}
         */
        this.server = null;
        
        /**
         * 路由映射表
         * @type {Object}
         * @private
         */
        this._routes = {
            GET: {},
            POST: {},
            PUT: {},
            DELETE: {},
            PATCH: {}
        };
        
        /**
         * 中间件列表
         * @type {Array<Function>}
         * @private
         */
        this._middlewares = [];
        
        /**
         * 错误处理函数
         * @type {Function|null}
         * @private
         */
        this._errorHandler = null;
    }
    
    /**
     * 注册中间件
     * @param {Function} middleware - 中间件函数 (req, res, next)
     * @returns {NetServer} 当前实例，支持链式调用
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new TypeError('中间件必须是一个函数');
        }
        this._middlewares.push(middleware);
        return this;
    }
    
    /**
     * 注册错误处理中间件
     * @param {Function} errorHandler - 错误处理函数 (err, req, res)
     * @returns {NetServer} 当前实例，支持链式调用
     */
    error(errorHandler) {
        if (typeof errorHandler !== 'function') {
            throw new TypeError('错误处理器必须是一个函数');
        }
        this._errorHandler = errorHandler;
        return this;
    }
    
    /**
     * 注册GET路由
     * @param {string} path - 路由路径
     * @param {Function} handler - 处理函数 (req, res)
     * @returns {NetServer} 当前实例，支持链式调用
     */
    get(path, handler) {
        return this._registerRoute('GET', path, handler);
    }
    
    /**
     * 注册POST路由
     * @param {string} path - 路由路径
     * @param {Function} handler - 处理函数 (req, res)
     * @returns {NetServer} 当前实例，支持链式调用
     */
    post(path, handler) {
        return this._registerRoute('POST', path, handler);
    }
    
    /**
     * 注册PUT路由
     * @param {string} path - 路由路径
     * @param {Function} handler - 处理函数 (req, res)
     * @returns {NetServer} 当前实例，支持链式调用
     */
    put(path, handler) {
        return this._registerRoute('PUT', path, handler);
    }
    
    /**
     * 注册DELETE路由
     * @param {string} path - 路由路径
     * @param {Function} handler - 处理函数 (req, res)
     * @returns {NetServer} 当前实例，支持链式调用
     */
    delete(path, handler) {
        return this._registerRoute('DELETE', path, handler);
    }
    
    /**
     * 注册PATCH路由
     * @param {string} path - 路由路径
     * @param {Function} handler - 处理函数 (req, res)
     * @returns {NetServer} 当前实例，支持链式调用
     */
    patch(path, handler) {
        return this._registerRoute('PATCH', path, handler);
    }
    
    /**
     * 内部方法：注册路由
     * @param {string} method - HTTP方法
     * @param {string} path - 路由路径
     * @param {Function} handler - 处理函数
     * @returns {NetServer} 当前实例
     * @private
     */
    _registerRoute(method, path, handler) {
        if (typeof handler !== 'function') {
            throw new TypeError('处理函数必须是一个函数');
        }
        
        if (!this._routes[method]) {
            this._routes[method] = {};
        }
        
        this._routes[method][path] = handler;
        return this;
    }
    
    /**
     * 启动服务器
     * @param {Function} [callback] - 启动回调函数
     * @returns {http.Server|https.Server} 服务器实例
     */
    start(callback) {
        // 创建请求处理函数
        const requestHandler = (req, res) => {
            this._handleRequest(req, res);
        };
        
        // 创建服务器实例
        if (this.options.https) {
            this.server = https.createServer(this.options.https, requestHandler);
        } else {
            this.server = http.createServer(requestHandler);
        }
        
        // 启动服务器
        this.server.listen(this.options.port, this.options.host, () => {
            const protocol = this.options.https ? 'HTTPS' : 'HTTP';
            console.log(`${protocol} 服务器启动成功: http://${this.options.host}:${this.options.port}`);
            if (callback) {
                callback();
            }
        });
        
        // 错误处理
        this.server.on('error', (error) => {
            console.error('服务器错误:', error);
            if (this._errorHandler) {
                this._errorHandler(error);
            }
        });
        
        return this.server;
    }
    
    /**
     * 停止服务器
     * @param {Function} [callback] - 停止回调函数
     */
    stop(callback) {
        if (this.server) {
            this.server.close((error) => {
                if (error) {
                    console.error('服务器停止错误:', error);
                    if (callback) {
                        callback(error);
                    }
                } else {
                    console.log('服务器已停止');
                    this.server = null;
                    if (callback) {
                        callback();
                    }
                }
            });
        } else {
            console.warn('服务器未启动');
            if (callback) {
                callback();
            }
        }
    }
    
    /**
     * 内部方法：处理请求
     * @param {http.IncomingMessage} req - 请求对象
     * @param {http.ServerResponse} res - 响应对象
     * @private
     */
    _handleRequest(req, res) {
        // 解析URL
        const parsedUrl = url.parse(req.url, true);
        req.path = parsedUrl.pathname;
        req.query = parsedUrl.query;
        
        // 设置默认Content-Type为JSON
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // 创建next函数用于中间件链
        let middlewareIndex = 0;
        const next = (error) => {
            if (error) {
                this._handleError(error, req, res);
                return;
            }
            
            if (middlewareIndex < this._middlewares.length) {
                const middleware = this._middlewares[middlewareIndex++];
                try {
                    middleware(req, res, next);
                } catch (err) {
                    this._handleError(err, req, res);
                }
            } else {
                // 中间件处理完成后，路由到对应的处理函数
                this._routeRequest(req, res);
            }
        };
        
        // 开始执行中间件链
        next();
    }
    
    /**
     * 内部方法：路由请求到对应的处理函数
     * @param {http.IncomingMessage} req - 请求对象
     * @param {http.ServerResponse} res - 响应对象
     * @private
     */
    _routeRequest(req, res) {
        const method = req.method;
        const path = req.path;
        
        // 检查是否存在对应方法的路由
        if (!this._routes[method]) {
            // 未找到路由，返回404
            res.statusCode = 404;
            res.end(JSON.stringify({
                error: 'Not Found',
                message: `未找到路径: ${path}`
            }));
            return;
        }
        
        // 尝试匹配路由（支持参数路由）
        const routeMatch = this._matchRoute(path, this._routes[method]);
        if (!routeMatch) {
            // 未找到路由，返回404
            res.statusCode = 404;
            res.end(JSON.stringify({
                error: 'Not Found',
                message: `未找到路径: ${path}`
            }));
            return;
        }
        
        // 将路由参数附加到请求对象
        req.params = routeMatch.params;
        
        // 路由处理函数
        const handler = routeMatch.handler;
        try {
            handler(req, res);
        } catch (error) {
            this._handleError(error, req, res);
        }
    }
    
    /**
     * 处理路径匹配，支持简单的参数路由
     * @param {string} requestPath - 请求路径
     * @param {Object} routes - 路由对象
     * @returns {Object|null} 匹配结果，包含处理函数和参数
     * @private
     */
    _matchRoute(requestPath, routes) {
        // 首先尝试精确匹配
        if (routes[requestPath]) {
            return {
                handler: routes[requestPath],
                params: {}
            };
        }
        
        // 尝试参数路由匹配（如 /api/files/:filename）
        for (const routePath in routes) {
            if (routePath.includes(':')) {
                const requestParts = requestPath.split('/').filter(Boolean);
                const routeParts = routePath.split('/').filter(Boolean);
                
                if (requestParts.length === routeParts.length) {
                    const params = {};
                    let isMatch = true;
                    
                    for (let i = 0; i < routeParts.length; i++) {
                        if (routeParts[i].startsWith(':')) {
                            // 这是一个参数，提取参数名和值
                            const paramName = routeParts[i].substring(1);
                            params[paramName] = requestParts[i];
                        } else if (routeParts[i] !== requestParts[i]) {
                            // 路径部分不匹配
                            isMatch = false;
                            break;
                        }
                    }
                    
                    if (isMatch) {
                        return {
                            handler: routes[routePath],
                            params: params
                        };
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * 内部方法：处理错误
     * @param {Error} error - 错误对象
     * @param {http.IncomingMessage} req - 请求对象
     * @param {http.ServerResponse} res - 响应对象
     * @private
     */
    _handleError(error, req, res) {
        console.error('请求处理错误:', error);
        
        // 如果已经发送过响应头，则结束响应
        if (res.headersSent) {
            return res.end();
        }
        
        // 设置状态码
        res.statusCode = error.statusCode || 500;
        
        // 如果有自定义错误处理器，则调用
        if (this._errorHandler) {
            try {
                this._errorHandler(error, req, res);
            } catch (handlerError) {
                // 如果错误处理器本身出错，则发送默认错误响应
                res.end(JSON.stringify({
                    error: 'Internal Server Error',
                    message: '服务器内部错误'
                }));
            }
        } else {
            // 发送默认错误响应
            res.end(JSON.stringify({
                error: error.name || 'Error',
                message: error.message || '未知错误'
            }));
        }
    }
}

module.exports = NetServer;

