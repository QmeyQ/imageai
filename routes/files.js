/**
 * 文件路由模块
 * 
 * 该模块处理文件相关的路由请求，包括文件上传、下载、删除、列表获取等功能。
 * 提供安全的文件操作接口，确保文件访问的权限控制和数据完整性。
 * 
 * 主要功能：
 * - 文件上传接口
 * - 文件下载接口
 * - 文件删除接口
 * - 文件列表获取接口
 * - 文件信息查询
 * - 文件访问权限控制
 * 
 * @module routes/files
 * @class FilesRouter
 * @property {FileService} fileService - 文件服务实例
 * @property {Object} services - 服务依赖
 * @method registerRoutes - 注册路由
 * @method handleUpload - 处理文件上传请求
 * @method handleList - 处理文件列表请求
 * @method handleDelete - 处理文件删除请求
 * @method handleDownload - 处理文件下载请求
 */

const path = require('path');

class FilesRouter {
    /**
     * 创建文件路由实例
     * @param {Object} services - 服务对象
     */
    constructor(services) {
        this._fileService = services.fileService;
        this._imageAI = services.imageAI;
        this._configService = services.configService;
        this._quotaService = services.quotaService;
        this._taskService = services.taskService;
        this._userService = services.user; // 添加用户服务
    }

    /**
     * 注册路由
     * @param {Object} netServer - 网络服务器实例
     */
    registerRoutes(netServer) {
        // 上传文件
        netServer.post('/upload', (req, res) => this.upload(req, res));
        
        // 获取文件列表
        netServer.get('/files', (req, res) => this.list(req, res));
        
        // 删除单个文件
        netServer.delete('/files/:filename', (req, res) => this.delete(req, res));
        
        // 批量删除文件
        netServer.post('/files/delete', (req, res) => this.deleteBatch(req, res));
        
        // 静态文件服务
        netServer.get('/uploads/:filename', (req, res) => this.static(req, res));
    }

    /**
     * 文件上传
     */
    upload(req, res) {
        // 获取用户ID
        const userId = req.headers['x-user-id'];
        
        // 如果没有用户ID，使用anonymous
        const effectiveUserId = userId || 'anonymous';
        
        // 检查用户配额
        // 这里应该从数据库获取用户信息
        const user = {
            id: effectiveUserId,
            quotaTotal: 100,
            quotaUsed: 0,
            quotaRemaining: 100,
            reserved: 0
        };
        
        if (!this._quotaService.deduct(user)) {
            return this._sendError(res, 400, '配额不足，无法上传文件');
        }
        
        if (!req.body?.files || !Array.isArray(req.body.files)) {
            // 返还配额
            this._quotaService.refund(user);
            return this._sendError(res, 400, '无效的请求参数，缺少文件数据');
        }
        
        // 获取模型和prompt参数
        const modelConfig = {
            model: req.body.model || 'wanx2.1-imageedit',
            prompt: req.body.prompt || '',
            parameters: req.body.parameters || { "n": 1 }
        };

        const files = req.body.files;
        const results = [];
        let processed = 0;

        const checkComplete = () => {
            if (processed === files.length) {
                this._sendBatchResult(res, results);
            }
        };

        files.forEach(fileData => {
            this._processFile(fileData, user, effectiveUserId, (result) => {
                results.push(result);
                processed++;
                
                // 如果是图片文件且上传成功，立即处理单张图片
                if (result.success && result.savedAs && this._isImageFile(result.savedAs)) {
                    // 构建用户特定的文件路径
                    const userUploadDir = path.join(this._configService.get('uploadDir'), effectiveUserId);
                    const filePath = path.join(userUploadDir, result.savedAs);
                    // 使用用户特定的URL
                    const localUrl = `${this._configService.get('uploadDir')}/${effectiveUserId}/${result.savedAs}`;
                    console.log(`立即处理单张图片: ${result.savedAs}`);
                    this._processSingleImage(filePath, localUrl, result.savedAs, user, modelConfig);
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
    _processSingleImage(filePath, externalUrl, filename, user, modelConfig) {
        // 检查用户配额
        if (!this._quotaService.deduct(user)) {
            console.log(`用户配额不足，跳过图片处理: ${filename}`);
            return;
        }
        
        // 使用传入的模型配置
        const model = modelConfig.model || 'wanx2.1-imageedit';
        const prompt = modelConfig.prompt || '';
        const parameters = modelConfig.parameters || { "n": 1 };
        
        // 这里应该调用imageAI服务处理图片
        console.log(`处理单张图片: ${filename}`);
        console.log(`文件路径: ${filePath}`);
        console.log(`外部URL: ${externalUrl}`);
        console.log(`使用模型: ${model}, 提示词: ${prompt}`);
        
        // 模拟处理完成，返还配额
        setTimeout(() => {
            this._quotaService.refund(user);
        }, 1000);
    }

    /**
     * 处理单个文件
     */
    _processFile(fileData, user, userId, callback) {
        if (!fileData.filename || !fileData.content) {
            return callback({
                filename: fileData.filename || '未知',
                success: false,
                message: '无效的文件数据'
            });
        }

        const contentBuffer = Buffer.from(fileData.content, 'base64');
        if (contentBuffer.length > this._configService.get('maxFileSize')) {
            return callback({
                filename: fileData.filename,
                success: false,
                message: `文件大小超过限制（最大${this._configService.get('maxFileSize') / 1024 / 1024}MB）`
            });
        }

        const safeFilename = this._safeName(fileData.filename);
        // 为用户创建独立的上传目录
        const userUploadDir = path.join(this._configService.get('uploadDir'), userId);
        const filePath = path.join(userUploadDir, safeFilename);

        // 确保用户目录存在
        const fileUtil = require('../file.js');
        fileUtil.mkdir(userUploadDir, (mkdirErr) => {
            if (mkdirErr) {
                return callback({
                    filename: fileData.filename,
                    success: false,
                    message: `创建用户目录失败: ${mkdirErr.message}`
                });
            }

            fileUtil.write(filePath, contentBuffer, (err) => {
                const result = {
                    filename: fileData.filename,
                    savedAs: safeFilename,
                    size: contentBuffer.length,
                    success: !err,
                    message: err ? `文件写入失败: ${err.message}` : '文件上传成功'
                };
                
                // 如果上传成功，添加外部访问URL
                if (!err) {
                    result.externalUrl = `${this._configService.get('externalBaseUrl')}/uploads/${userId}/${safeFilename}`;
                }
                
                callback(result);
            });
        });
    }
    
    /**
     * 生成安全的文件名
     */
    _safeName(filename) {
        // 移除路径信息，只保留文件名
        const basename = path.basename(filename);
        // 替换特殊字符
        return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    /**
     * 文件列表
     */
    list(req, res) {
        console.log('文件列表路由处理开始:', {
            method: req.method,
            path: req.path,
            body: req.body,
            headers: req.headers
        });
        
        // 获取用户ID
        const userId = req.headers['x-user-id'] || 'anonymous';
        
        // 获取用户特定的上传目录
        const userUploadDir = path.join(this._configService.get('uploadDir'), userId);
        
        // 确保用户目录存在
        const fileUtil = require('../file.js');
        fileUtil.mkdir(userUploadDir, (mkdirErr) => {
            if (mkdirErr) {
                return this._sendError(res, 500, `创建用户目录失败: ${mkdirErr.message}`);
            }
            
            // 获取用户特定目录的文件列表
            fileUtil.ls(userUploadDir, (err, files) => {
                if (err) {
                    return this._sendError(res, 500, `获取文件列表失败: ${err.message}`);
                }

                const fileList = files
                    .filter(item => item.type === 'file')
                    .map(item => ({
                        name: item.name,
                        size: item.size,
                        mtime: item.mtime?.toISOString() || null,
                        externalUrl: `${this._configService.get('externalBaseUrl')}/uploads/${userId}/${item.name}`
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
    delete(req, res) {
        const filename = req.params.filename;
        if (!filename) {
            return this._sendError(res, 400, '无效的文件名');
        }

        // 获取用户ID
        const userId = req.headers['x-user-id'] || 'anonymous';
        
        // 构建用户特定的文件路径
        const userUploadDir = path.join(this._configService.get('uploadDir'), userId);
        const filePath = path.join(userUploadDir, filename);

        // 检查路径安全性
        const fileUtil = require('../file.js');
        if (!this._fileService.isSafePath(filePath)) {
            return this._sendError(res, 403, '不允许的文件操作');
        }

        fileUtil.exists(filePath, (existsErr, exists) => {
            if (existsErr) {
                return this._sendError(res, 500, `检查文件失败: ${existsErr.message}`);
            }

            if (!exists) {
                return this._sendError(res, 404, '文件不存在');
            }

            fileUtil.del(filePath, (delErr) => {
                if (delErr) {
                    return this._sendError(res, 500, `删除文件失败: ${delErr.message}`);
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
    deleteBatch(req, res) {
        if (!req.body?.filenames || !Array.isArray(req.body.filenames)) {
            return this._sendError(res, 400, '无效的文件列表格式');
        }

        const filenames = req.body.filenames;
        if (filenames.length === 0) {
            return this._sendBatchResult(res, []);
        }

        const results = [];
        let processed = 0;

        const checkComplete = () => {
            if (processed === filenames.length) {
                this._sendBatchResult(res, results);
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
     * 删除单个文件
     */
    _deleteSingle(filename, callback) {
        // 获取用户ID
        const userId = 'anonymous'; // 在批量删除中，我们需要从调用上下文获取用户ID
        
        // 构建用户特定的文件路径
        const userUploadDir = path.join(this._configService.get('uploadDir'), userId);
        const filePath = path.join(userUploadDir, filename);

        const fileUtil = require('../file.js');
        if (!this._fileService.isSafePath(filePath)) {
            return callback({
                success: false,
                filename: filename,
                message: '不允许的文件操作'
            });
        }

        fileUtil.exists(filePath, (existsErr, exists) => {
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

            fileUtil.del(filePath, (delErr) => {
                callback({
                    success: !delErr,
                    filename: filename,
                    message: delErr ? `删除失败: ${delErr.message}` : '删除成功'
                });
            });
        });
    }

    /**
     * 静态文件服务
     */
    static(req, res) {
        const filename = req.params.filename;
        // 获取用户ID
        const userId = req.headers['x-user-id'] || 'anonymous';
        
        // 构建用户特定的文件路径
        const userUploadDir = path.join(this._configService.get('uploadDir'), userId);
        const userFilePath = path.join(userUploadDir, filename);
        
        // 使用文件服务提供用户特定的文件
        this._fileService.serveStaticFile(req, res, userFilePath, (err) => {
            if (err) {
                this._sendError(res, 404, err.message);
            }
        });
    }

    /**
     * 发送错误响应
     */
    _sendError(res, statusCode, message) {
        res.statusCode = statusCode;
        res.end(JSON.stringify({
            success: false,
            message
        }));
    }

    /**
     * 发送批量结果
     */
    _sendBatchResult(res, results) {
        const successCount = results.filter(r => r.success).length;
        res.end(JSON.stringify({
            success: successCount > 0,
            results,
            total: results.length,
            successCount,
            failedCount: results.length - successCount
        }));
    }
}

module.exports = FilesRouter;