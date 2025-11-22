/**
 * 业务服务器模块 - 提供图片处理和文件管理服务
 * 
 * 该模块实现了完整的业务服务器功能，包括文件上传、下载、删除、列表获取，
 * AI图片处理、用户认证、配置管理等功能。采用模块化设计，职责分离清晰。
 * 
 * 主要功能：
 * - 文件上传、下载、删除、列表获取
 * - AI图片处理服务
 * - 用户认证和会话管理
 * - 配置管理和持久化
 * - 安全控制和权限验证
 * - 结果清理和过期处理
 * 
 * @module server
 * @class BusinessServer
 * @property {NetServer} _netServer - 网络服务器实例
 * @property {ImageAI} _imageAI - AI图片处理实例
 * @property {ConfigService} _configService - 配置服务实例
 * @property {FileService} _fileService - 文件服务实例
 * @property {CleanupService} _cleanupService - 清理服务实例
 * @property {AuthService} _authService - 认证服务实例
 * @property {QuotaService} _quotaService - 配置服务实例
 * @property {TaskService} _taskService - 任务服务实例
 * @property {EventsService} _eventsService - 事件服务实例
 * @property {ModelService} _modelService - 模型服务实例
 * @property {UserService} _userService - 用户服务实例
 * @property {DashScopeAdapter} _dsAdapter - DashScope适配器实例
 * @property {Object} options - 服务器配置选项
 * @property {string} _imageAIPrompt - AI处理提示词
 * @property {number} _cleanupInterval - 清理任务定时器
 * @method constructor - 创建业务服务器实例
 * @method start - 启动服务器
 * @method stop - 停止服务器
 * @method _setupMiddlewares - 设置中间件
 * @method _registerRoutes - 注册路由
 * @method _registerRoute - 注册单个路由模块
 * @method _registerCompatibilityRoutes - 注册兼容性路由
 * @method _health - 健康检查
 * @method _upload - 文件上传
 * @method _processFile - 处理单个文件
 * @method _isImageFile - 判断是否为图片文件
 * @method _processSingleImage - 处理单张图片
 * @method _list - 文件列表
 * @method _delete - 删除文件
 * @method _deleteBatch - 批量删除
 * @method _deleteSingle - 删除单个文件
 * @method _static - 静态文件服务
 * @method _batchResult - 发送批量结果
 * @method _cleanupExpiredResults - 清理过期结果
 * @method _ImageAIConfig - AI配置
 * @method _setImageAIConfig - 设置AI配置
 * @method _manualCleanup - 手动清理
 * @method _processResultsArray - 处理结果数组
 * @method _processResultsObject - 处理结果对象
 * @method _error - 发送错误响应
 * @method _isSafePath - 检查路径安全
 * @method _safeName - 生成安全文件名
 * @method _getMimeType - 获取MIME类型
 * @method _register - 用户注册
 * @method _login - 用户登录
 * @method _modelList - 模型列表
 * @method _modelOperations - 模型操作
 * @method _process - 图像处理
 * @method _startCleanupTask - 启动清理任务
 * @method _performAllCleanup - 执行所有清理
 * @method _ensureUploadDir - 确保上传目录存在
 */
const path = require('path');
const file = require('./file.js');
const NetServer = require('./net.js');
const CorsMiddleware = require('./middleware/cors.js');
const SignMiddleware = require('./middleware/sign.js');
const OwnershipMiddleware = require('./middleware/own.js');
const RateLimitMiddleware = require('./middleware/rate.js');
const JsonMiddleware = require('./middleware/json.js');
const ErrorMiddleware = require('./middleware/err.js');
const ConfigService = require('./services/configService.js');
const FileService = require('./services/fileService.js');
const CleanupService = require('./services/cleanupService.js');
const AuthService = require('./services/auth.js');
const QuotaService = require('./services/quota.js');
const TaskService = require('./services/task.js');
const EventsService = require('./services/events.js');
const ModelService = require('./services/modelService.js');
const UserService = require('./services/userService.js');
const DashScopeAdapter = require('./adapters/ds.js');
const ImageAI = require('./imageAI.js');

class BusinessServer {
    /**
     * 创建业务服务器实例
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        // 设置环境变量
        process.env.IMAGEAI_API_KEY = 'sk-4606777';
        
        // 初始化配置选项
        this.options = {
            port: 3000,
            host: '0.0.0.0',
            uploadDir: './360house-master/uploads',
            externalUrl: 'http://normalgame.cn/uploads/',
            maxFileSize: 10 * 1024 * 1024,
            externalBaseUrl: 'http://normalgame.cn',
            resultExpiryDays: 3, // 结果过期天数
            ...options
        };

        // 初始化网络服务器
        this._netServer = new NetServer({
            port: this.options.port,
            host: this.options.host
        });

        // 初始化服务
        this.init();

        this._setupMiddlewares();
        this._registerRoutes();
        this._ensureUploadDir();
    }

    /**
     * 初始化服务
     */
    init() {
        // 初始化配置服务
        this._configService = new ConfigService();
        
        // 初始化文件服务
        this._fileService = new FileService(this._configService);
        
        // 初始化配额服务
        this._quotaService = new QuotaService();
        
        // 初始化任务服务
        this._taskService = new TaskService();
        
        // 初始化用户服务
        this._userService = new UserService();
        
        // 初始化AI服务
        this._imageAI = new ImageAI(process.env.IMAGEAI_API_KEY, this._taskService);
        
        // 初始化DashScope适配器
        this._dsAdapter = new DashScopeAdapter(process.env.IMAGEAI_API_KEY);
        
        // 初始化清理服务
        this._cleanupService = new CleanupService({
            uploadDir: this.options.uploadDir,
            resultExpiryDays: this.options.resultExpiryDays,
            unprocessedImageExpiryHours: 1 // 未处理图片1小时后清理
        });
        
        // 初始化模型服务
        this._modelService = new ModelService();
        
        // 初始化认证服务
        this._authService = new AuthService();
        
        // 初始化事件服务
        this._eventsService = new EventsService();
        
        // 启动定时清理任务
        this._startCleanupTask();
    }

    /**
     * 设置中间件
     */
    _setupMiddlewares() {
        // 初始化服务
        this._authService = new AuthService();
        this._quotaService = new QuotaService();
        this._taskService = new TaskService();
        this._eventsService = new EventsService();
        this._modelService = new ModelService(); // 初始化模型服务
        this._userService = new UserService(); // 初始化用户服务
        
        // 初始化中间件
        this._corsMiddleware = new CorsMiddleware();
        this._signMiddleware = new SignMiddleware(this._authService);
        this._ownershipMiddleware = new OwnershipMiddleware({ uploadDir: this.options.uploadDir });
        this._rateLimitMiddleware = new RateLimitMiddleware();
        this._jsonMiddleware = new JsonMiddleware();
        this._errorMiddleware = new ErrorMiddleware();
        
        // CORS中间件 - 放在最前面
        this._netServer.use((req, res, next) => {
            this._corsMiddleware.handle(req, res, next);
        });

        // 限流中间件
        this._netServer.use((req, res, next) => {
            this._rateLimitMiddleware.handle(req, res, next);
        });

        // 日志中间件 - 添加请求日志
        this._netServer.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });

        // JSON请求体解析中间件
        this._netServer.use((req, res, next) => {
            this._jsonMiddleware.handle(req, res, next);
        });

        // 签名验证中间件
        this._netServer.use((req, res, next) => {
            this._signMiddleware.handle(req, res, next);
        });

        // 归属校验中间件
        this._netServer.use((req, res, next) => {
            this._ownershipMiddleware.handle(req, res, next);
        });

        // 错误处理中间件
        this._netServer.use((req, res, next) => {
            this._errorMiddleware.handle(req, res, next);
        });
    }

    /**
     * 注册路由
     */
    _registerRoutes() {
        // 创建路由服务对象
        const services = {
            fileService: this._fileService,
            imageAI: this._imageAI,
            configService: this._configService,
            cleanupService: this._cleanupService,
            taskService: this._imageAI._taskService, // 从imageAI获取taskService
            auth: this._authService,
            quotaService: this._quotaService,
            eventsService: this._eventsService,
            modelService: this._modelService, // 添加模型服务
            user: this._userService, // 添加用户服务
            dsAdapter: this._dsAdapter // 添加DashScope适配器
        };
        
        // 动态加载并注册路由
        this._registerRoute('files', services);
        this._registerRoute('image', services);
        this._registerRoute('auth', services);
        this._registerRoute('events', services);
        this._registerRoute('admin', services);
        
        // 健康检查路由
        this._netServer.get('/health', (req, res) => this._health(req, res));
        
    }
    
    /**
     * 注册单个路由模块
     * @param {string} routeName - 路由模块名称
     * @param {Object} services - 服务对象
     */
    _registerRoute(routeName, services) {
        try {
            const RouterClass = require(`./routes/${routeName}.js`);
            const router = new RouterClass(services);
            router.registerRoutes(this._netServer);
            console.log(`已注册路由模块: ${routeName}`);
        } catch (err) {
            console.error(`注册路由模块失败 ${routeName}:`, err.message);
        }
    }
    

    /**
     * 健康检查
     */
    _health(req, res) {
        res.end(JSON.stringify({
            success: true,
            message: '服务运行正常',
            timestamp: new Date().toISOString()
        }));
    }

    /**
     * 文件上传
     */
    _upload(req, res) {
        // 获取用户ID
        const userId = req.headers['x-user-id'];
        
        // 如果没有用户ID，使用anonymous
        const effectiveUserId = userId || 'anonymous';
        
        if (!req.body?.files || !Array.isArray(req.body.files)) {
            return this._error(res, 400, '无效的请求参数，缺少文件数据');
        }
        
        // 直接使用客户端提交的完整模型参数
        const modelConfig = {
            model: req.body.model || 'wanx2.1-imageedit',
            prompt: req.body.prompt || this._imageAIPrompt,
            parameters: req.body.parameters || {}
        };

        const files = req.body.files;
        const results = [];
        let processed = 0;

        const checkComplete = () => {
            if (processed === files.length) {
                this._batchResult(res, results);
            }
        };

        files.forEach(fileData => {
            this._processFile(fileData, effectiveUserId, (result) => {
                results.push(result);
                processed++;
                
                // 如果是图片文件且上传成功，立即处理单张图片
                if (result.success && result.savedAs && this._isImageFile(result.savedAs)) {
                    // 构建用户特定的文件路径
                    const userUploadDir = path.join(this.options.uploadDir, effectiveUserId);
                    const filePath = path.join(userUploadDir, result.savedAs);
                    // 使用用户特定的URL
                    //const localUrl = `${this.options.uploadDir}/${effectiveUserId}/${result.savedAs}`;
                    console.log(`处理单张图片信息: ${JSON.stringify(result)}`);
                    this._processSingleImage(result.externalUrl, result.savedAs, modelConfig, filePath);
                }
                
                checkComplete();
            });
        });
    }
    
    /**
     * 判断是否为图片文件
     */
    _isImageFile(filename) {
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(filename).toLowerCase();
        return imageExts.includes(ext);
    }
    
/**
 * 处理单张图片
 */
_processSingleImage(externalUrl, filename, modelConfig, filePath) {
    
    if (!modelConfig.prompt) {
        console.log('未设置处理提示词，跳过图片处理');
        return;
    }

    // 检查是否已存在处理结果
    if (this._imageAI.results[filename]) {
        console.log(`图片 ${filename} 已处理过，跳过重复处理`);
        return;
    }
    
    console.log(`开始处理图片: ${filename}, 使用外部URL: ${externalUrl}`);
    console.log(`使用模型: ${model}, 提示词: ${prompt}`);
    
    // 使用外部URL而不是本地文件路径
    this._imageAI.process([externalUrl], modelConfig, (error, results) => {
        if (error) {
            console.error(`图片处理失败 ${filename}:`, error);
            // 逻辑错误（如文件不存在、API错误等），不删除图片
            return;
        }
        
        console.log(`图片处理完成: ${filename}`);
        console.log('处理结果:', JSON.stringify(results, null, 2));
        
        // 将处理结果合并到现有结果中，使用文件名作为key，并添加时间戳
        const now = new Date().toISOString();
        
        // 记录详细的处理结果，包含创建时间
        if (results[externalUrl]) {
            this._imageAI.results[filename] = {
                originalUrl: externalUrl,
                processedAt: now,
                createdAt: now, // 添加创建时间
                result: results[externalUrl],
                model: model, // 保存使用的模型
                prompt: prompt // 保存使用的提示词
            };
            console.log(`已保存处理结果 for ${filename}, 创建时间: ${now}`);
            
            // 只有当filePath存在且不是远程URL时才删除文件
            if (filePath && !externalUrl.startsWith('http')) {
                file.del(filePath, (deleteErr) => {
                    if (deleteErr) {
                        console.error(`删除文件失败 ${filePath}:`, deleteErr);
                    } else {
                        console.log(`已删除处理过的文件: ${filePath}`);
                    }
                });
            }
            // 如果需要删除本地文件，应该在_upload方法中处理
        } else {
            console.log(`图片处理无结果，不删除文件: ${filename}`);
        }
    });
}

    /**
     * 处理单个文件
     */
    _processFile(fileData, userId, callback) {
        // 允许空文件内容，但文件名必须存在
        if (!fileData.filename) {
            return callback({
                filename: fileData.filename || '未知',
                success: false,
                message: '无效的文件数据'
            });
        }
        
        // 如果文件内容为空，设置为空字符串而不是返回错误
        if (!fileData.content) {
            fileData.content = '';
        }

        const contentBuffer = Buffer.from(fileData.content, 'base64');
        if (contentBuffer.length > this.options.maxFileSize) {
            return callback({
                filename: fileData.filename,
                success: false,
                message: `文件大小超过限制（最大${this.options.maxFileSize / 1024 / 1024}MB）`
            });
        }

        const safeFilename = this._safeName(fileData.filename);
        // 为用户创建独立的上传目录
        const userUploadDir = path.join(this.options.uploadDir, userId);
        const filePath = path.join(userUploadDir, safeFilename);

        // 确保用户目录存在
        file.mkdir(userUploadDir, (mkdirErr) => {
            if (mkdirErr) {
                return callback({
                    filename: fileData.filename,
                    success: false,
                    message: `创建用户目录失败: ${mkdirErr.message}`
                });
            }

            file.write(filePath, contentBuffer, (err) => {
                const result = {
                    filename: fileData.filename,
                    savedAs: safeFilename,
                    size: contentBuffer.length,
                    success: !err,
                    message: err ? `文件写入失败: ${err.message}` : '文件上传成功'
                };
                
                // 如果上传成功，添加外部访问URL
                if (!err) {
                    result.externalUrl = `${this.options.externalBaseUrl}/uploads/${userId}/${safeFilename}`;
                }
                
                callback(result);
            });
        });
    }
    
    /**
     * 生成安全的文件名
     */
    _safeName(filename) {
        const name = path.basename(filename);
        const ext = path.extname(name);
        const baseName = name.slice(0, -ext.length);
        const safeName = baseName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        return `${safeName}_${Date.now()}${ext}`;
    }

    /**
     * 文件列表
     */
    _list(req, res) {
        // 获取用户ID
        const userId = req.headers['x-user-id'] || 'anonymous';
        
        // 获取用户特定的上传目录
        const userUploadDir = path.join(this.options.uploadDir, userId);
        
        // 确保用户目录存在
        file.mkdir(userUploadDir, (mkdirErr) => {
            if (mkdirErr) {
                return this._error(res, 500, `创建用户目录失败: ${mkdirErr.message}`);
            }
            
            // 获取用户特定目录的文件列表
            file.ls(userUploadDir, (err, files) => {
                if (err) {
                    return this._error(res, 500, `获取文件列表失败: ${err.message}`);
                }

                const fileList = files
                    .filter(item => item.type === 'file')
                    .map(item => ({
                        name: item.name,
                        size: item.size,
                        mtime: item.mtime?.toISOString() || null,
                        externalUrl: `${this.options.externalBaseUrl}/uploads/${userId}/${item.name}`
                    }));

                res.end(JSON.stringify({
                    success: true,
                    files: fileList,
                    total: fileList.length,
                    message: '获取文件列表成功'
                }));
            });
        });
    }

    /**
     * 删除文件
     */
    _delete(req, res) {
        const filename = req.params.filename;
        if (!filename) {
            return this._error(res, 400, '无效的文件名');
        }

        // 获取用户ID
        const userId = req.headers['x-user-id'] || 'anonymous';
        
        // 构建用户特定的文件路径
        const userUploadDir = path.join(this.options.uploadDir, userId);
        const filePath = path.join(userUploadDir, filename);

        // 检查路径安全性
        if (!this._isSafePath(filePath)) {
            return this._error(res, 403, '不允许的文件操作');
        }

        file.exists(filePath, (existsErr, exists) => {
            if (existsErr) {
                return this._error(res, 500, `检查文件失败: ${existsErr.message}`);
            }

            if (!exists) {
                return this._error(res, 404, '文件不存在');
            }

            file.del(filePath, (delErr) => {
                if (delErr) {
                    return this._error(res, 500, `删除文件失败: ${delErr.message}`);
                }

                res.end(JSON.stringify({
                    success: true,
                    message: '文件删除成功',
                    filename: filename
                }));
            });
        });
    }

    /**
     * 批量删除
     */
    _deleteBatch(req, res) {
        if (!req.body?.filenames || !Array.isArray(req.body.filenames)) {
            return this._error(res, 400, '无效的文件列表格式');
        }

        const filenames = req.body.filenames;
        if (filenames.length === 0) {
            return this._batchResult(res, []);
        }

        const results = [];
        let processed = 0;

        const checkComplete = () => {
            if (processed === filenames.length) {
                this._batchResult(res, results);
            }
        };

        filenames.forEach(filename => {
            this._deleteSingle(filename, (result) => {
                results.push(result);
                processed++;
                checkComplete();
            });
        });
    }


    /**
     * 静态文件服务
     */
    _static(req, res) {
        const filename = req.params.filename;
        // 获取用户ID
        const userId = req.headers['x-user-id'] || 'anonymous';
        
        // 构建用户特定的文件路径
        const userUploadDir = path.join(this.options.uploadDir, userId);
        const userFilePath = path.join(userUploadDir, filename);
        
        this._fileService.serveStaticFile(req, res, userFilePath, (err) => {
            if (err) {
                this._error(res, 404, err.message);
            }
        });
    }

    /**
     * 删除单个文件
     */
    _deleteSingle(filename, callback) {
        // 获取用户ID
        const userId = 'anonymous'; // 在批量删除中，我们需要从调用上下文获取用户ID
        
        // 构建用户特定的文件路径
        const userUploadDir = path.join(this.options.uploadDir, userId);
        const filePath = path.join(userUploadDir, filename);

        if (!this._isSafePath(filePath)) {
            return callback({
                success: false,
                filename: filename,
                message: '不允许的文件操作'
            });
        }

        file.exists(filePath, (existsErr, exists) => {
            if (existsErr) {
                return callback({
                    success: false,
                    filename: filename,
                    message: `检查文件失败: ${existsErr.message}`
                });
            }

            if (!exists) {
                return callback({
                    success: false,
                    filename: filename,
                    message: '文件不存在'
                });
            }

            file.del(filePath, (delErr) => {
                callback({
                    success: !delErr,
                    filename: filename,
                    message: delErr ? `删除失败: ${delErr.message}` : '删除成功'
                });
            });
        });
    }

    /**
     * 发送批量结果
     */
    _batchResult(res, results) {
        const successCount = results.filter(r => r.success).length;
        res.end(JSON.stringify({
            success: successCount > 0,
            results,
            total: results.length,
            successCount,
            failedCount: results.length - successCount
        }));
    }

    /**
     * 清理过期结果
     */
    _cleanupExpiredResults() {
        try {
            // 使用清理服务清理过期结果
            this._cleanupService.performAllCleanup(this._imageAI.results, (err, results) => {
                if (err) {
                    console.error('清理过期结果时出错:', err);
                } else {
                    if (results.total > 0) {
                        console.log(`清理了 ${results.total} 个过期结果`);
                    }
                }
            });
        } catch (error) {
            console.error('清理过期结果时发生异常:', error);
        }
    }
    
    _ImageAIConfig(req, res) {
        try {
            // 先清理过期结果
            this._cleanupExpiredResults();
            if (req.body.prompt) {
                this._imageAIPrompt = req.body.prompt;
            }
            if (req.body.results) {
                this._setImageAIConfig(req, res);
            } else {
                res.end(JSON.stringify({
                    success: true,
                    data: {
                        prompt: this._imageAIPrompt || '',
                        results: this._imageAI.results || {}
                    }
                }));
            }
        } catch (error) {
            this._error(res, 500, `配置操作失败: ${error.message}`);
        }
    }

    /**
     * 设置ImageAI配置（prompt和results）
     * 整合处理逻辑：只有标记del的项才删除，传入项比现有少时只加入多出来的项
     */
    _setImageAIConfig(req, res) {
        try {
            const { prompt, results } = req.body || {};
            
            // 先清理过期结果
            this._cleanupExpiredResults();
            
            // 更新prompt（如果提供）
            if (prompt !== undefined) {
                this._imageAIPrompt = prompt;
                console.log(`更新处理提示词: ${prompt}`);
            }
            
            // 更新results（如果提供）
            if (results !== undefined) {
                if (Array.isArray(results)) {
                    // 如果是数组，处理删除和添加逻辑
                    this._processResultsArray(results);
                } else if (typeof results === 'object' && results !== null) {
                    // 如果是对象，处理为单个结果项
                    this._processResultsObject(results);
                }
            }
            
            // 返回更新后的配置
            res.end(JSON.stringify({
                success: true,
                data: {
                    prompt: this._imageAIPrompt,
                    results: this._imageAI.results
                },
                message: '配置更新成功'
            }));
        } catch (error) {
            this._error(res, 500, `设置配置失败: ${error.message}`);
        }
    }

    /**
     * 手动清理过期结果
     */
    _manualCleanup(req, res) {
        try {
            this._cleanupService.performAllCleanup(this._imageAI.results, (err, results) => {
                if (err) {
                    this._error(res, 500, `手动清理失败: ${err.message}`);
                } else {
                    res.end(JSON.stringify({
                        success: true,
                        message: `手动清理完成，删除了 ${results.total} 个项目`,
                        details: results
                    }));
                }
            });
        } catch (error) {
            this._error(res, 500, `手动清理失败: ${error.message}`);
        }
    }

    /**
     * 处理results数组
     * 只有标记del的项才删除，传入项比现有少时只加入多出来的项
     */
    _processResultsArray(resultsArray) {
        // 首先处理删除标记的项
        resultsArray.forEach(item => {
            if (item.del && item.key) {
                // 删除标记了del的项
                delete this._imageAI.results[item.key];
                console.log(`删除结果项: ${item.key}`);
            }
        });

        // 然后处理新增项（没有del标记的项）
        resultsArray.forEach(item => {
            if (!item.del && item.key && item.value !== undefined) {
                // 只有当该项不存在时才添加（传入项比现有少时只加入多出来的项）
                if (!this._imageAI.results.hasOwnProperty(item.key)) {
                    // 为新项添加创建时间
                    const now = new Date().toISOString();
                    if (typeof item.value === 'object' && item.value !== null) {
                        item.value.createdAt = now;
                    } else {
                        // 如果值不是对象，将其包装为对象
                        item.value = {
                            value: item.value,
                            createdAt: now
                        };
                    }
                    this._imageAI.results[item.key] = item.value;
                    console.log(`添加新结果项: ${item.key}, 创建时间: ${now}`);
                }
            }
        });
    }

    /**
     * 处理results对象
     * 将对象转换为数组形式处理
     */
    _processResultsObject(resultsObj) {
        const resultsArray = Object.entries(resultsObj).map(([key, value]) => ({
            key,
            value
        }));
        this._processResultsArray(resultsArray);
    }

    /**
     * 发送错误响应
     */
    _error(res, statusCode, message) {
        res.statusCode = statusCode;
        res.end(JSON.stringify({
            success: false,
            message
        }));
    }

    /**
     * 检查路径安全
     */
    _isSafePath(filePath) {
        return this._fileService.isSafePath(filePath);
    }

    /**
     * 获取MIME类型
     */
    _getMimeType(ext) {
        return this._fileService.getMimeType(ext);
    }

    /**
     * 用户注册
     */
    _register(req, res) {
        // 检查请求体
        if (!req.body) {
            return this._error(res, 400, '请求体不能为空');
        }

        const { username, password } = req.body;

        // 验证参数
        if (!username || !password) {
            return this._error(res, 400, '用户名和密码不能为空');
        }

        // 检查用户是否已存在
        if (this._userService.users[username]) {
            return this._error(res, 400, '用户已存在');
        }

        // 创建新用户
        const user = new (require('./models/User.js'))({
            username,
            password
        });

        // 保存用户
        this._userService.users[username] = user;
        this._userService._saveUsers();

        // 返回成功响应
        res.end(JSON.stringify({
            success: true,
            message: '注册成功',
            user: {
                id: user.id,
                username: user.username
            }
        }));
    }

    /**
     * 用户登录
     */
    _login(req, res) {
        // 检查请求体
        if (!req.body) {
            return this._error(res, 400, '请求体不能为空');
        }

        const { username, password } = req.body;

        // 验证参数
        if (!username || !password) {
            return this._error(res, 400, '用户名和密码不能为空');
        }

        // 查找用户
        this._userService.findByUsername(username, (err, user) => {
            if (err || !user) {
                return this._error(res, 401, '用户不存在');
            }

            // 验证密码
            if (user.password !== password) {
                return this._error(res, 401, '密码错误');
            }

            // 返回成功响应
            res.end(JSON.stringify({
                success: true,
                message: '登录成功',
                user: {
                    id: user.id,
                    username: user.username
                }
            }));
        });
    }

    /**
     * 模型列表
     */
    _modelList(req, res) {
        try {
            const models = this._modelService.getModels();
            res.end(JSON.stringify({
                success: true,
                data: models
            }));
        } catch (error) {
            this._error(res, 500, `获取模型列表失败: ${error.message}`);
        }
    }

    /**
     * 模型操作
     */
    _modelOperations(req, res) {
        try {
            const modelId = req.params.modelId;
            if (!modelId) {
                return this._error(res, 400, '模型ID不能为空');
            }

            const operations = this._modelService.getOperations(modelId);
            res.end(JSON.stringify({
                success: true,
                data: {
                    model: modelId,
                    operations: operations
                }
            }));
        } catch (error) {
            this._error(res, 500, `获取模型操作失败: ${error.message}`);
        }
    }

    /**
     * 图像处理
     */
    _process(req, res) {
        try {
            const { images, parameters } = req.body;
            if (!images || !Array.isArray(images) || images.length === 0) {
                return this._error(res, 400, '图片列表不能为空');
            }

            if (!parameters) {
                return this._error(res, 400, '参数不能为空');
            }

            // 使用DashScope适配器处理图片
            this._dsAdapter.process(images, parameters, (error, result) => {
                if (error) {
                    return this._error(res, 500, `图片处理失败: ${error.message}`);
                }

                res.end(JSON.stringify({
                    success: true,
                    data: result
                }));
            });
        } catch (error) {
            this._error(res, 500, `图片处理失败: ${error.message}`);
        }
    }

    /**
     * 启动定时清理任务
     */
    _startCleanupTask() {
        // 每6小时检查一次过期结果
        this._cleanupInterval = setInterval(() => {
            this._performAllCleanup();
        }, 6 * 60 * 60 * 1000); // 6小时

        // 立即执行一次清理
        this._performAllCleanup();
        
        console.log(`已启动定时清理任务，每6小时清理一次过期结果和未处理图片`);
    }

    /**
     * 执行所有清理任务
     */
    _performAllCleanup() {
        this._cleanupService.performAllCleanup(this._imageAI.results, (err, results) => {
            if (err) {
                console.error('执行清理任务时出错:', err);
            } else {
                if (results.total > 0) {
                    console.log(`清理任务完成: ${results.expiredResults} 个过期结果, ${results.unprocessedImages} 个未处理图片`);
                }
            }
        });
    }

    /**
     * 确保上传目录存在
     */
    _ensureUploadDir() {
        file.mkdir(this.options.uploadDir, (err) => {
            if (err) {
                console.error(`创建上传目录失败: ${err.message}`);
                return;
            }
            console.log(`创建上传目录: ${this.options.uploadDir}`);
        });
    }

    /**
     * 启动服务器
     */
    start(callback) {
        console.log(`启动业务服务器，监听端口 ${this.options.port}...`);
        console.log(`文件上传目录: ${this.options.uploadDir}`);
        console.log(`外部访问地址: ${this.options.externalBaseUrl}`);
        console.log(`结果过期天数: ${this.options.resultExpiryDays}天`);

        this._netServer.start((err) => {
            if (err) {
                console.error('启动服务器失败:', err);
                return callback && callback(err);
            }
            console.log(`HTTP服务已成功启动在 http://${this.options.host}:${this.options.port}`);
            callback && callback();
        });
    }

    /**
     * 停止服务器
     */
    stop(callback) {
        console.log('正在关闭业务服务器...');
        
        // 清理定时任务
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
            console.log('已停止定时清理任务');
        }
        
        // 如果服务器已经停止，直接回调
        if (!this._netServer.server) {
            console.log('业务服务器已成功关闭');
            return callback && callback();
        }
        
        this._netServer.stop((err) => {
            if (err) {
                console.error('关闭服务器时发生错误:', err);
                return callback && callback(err);
            }
            console.log('业务服务器已成功关闭');
            if (callback) {
                setTimeout(() => {
                    callback();
                }, 100); // 延迟一点时间确保日志输出完成
            }
        });
    }
}

module.exports = BusinessServer;

// 文件直接运行时启动服务器
if (require.main === module) {
    const server = new BusinessServer();
    
    server.start((err) => {
        if (err) {
            console.error('服务器启动失败:', err);
            process.exit(1);
        }
    });
    
    // 标记是否正在关闭服务器
    let isShuttingDown = false;
    
    const shutdown = () => {
        // 防止重复触发关闭
        if (isShuttingDown) {
            console.log('服务器已在关闭过程中...');
            return;
        }
        
        isShuttingDown = true;
        console.log('正在关闭业务服务器...');
        
        server.stop((err) => {
            if (err) {
                console.error('关闭服务器时发生错误:', err);
                process.exit(1);
            }
            console.log('服务器已完全停止');
            process.exit(0);
        });
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}