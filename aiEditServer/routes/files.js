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
        this._eventsService = services.eventsService; // 添加事件服务
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
        netServer.delete('/delete/:filename', (req, res) => this.delete(req, res));
        
        // 批量删除文件
        netServer.post('/delete', (req, res) => this.deleteBatch(req, res));
        
        // 静态文件服务 - 支持新的目录结构：/:userId/uploads/:filename
        netServer.get('/:userId/uploads/:filename', (req, res) => this.static(req, res));
        // 兼容旧路由（将被废弃）
        netServer.get('/uploads/:filename', (req, res) => this.staticLegacy(req, res));
        
        // 配置管理
        netServer.get('/config', (req, res) => this.config(req, res));
        netServer.post('/config', (req, res) => this.config(req, res));
        
        // 手动清理
        netServer.post('/image-ai/cleanup', (req, res) => this.manualCleanup(req, res));
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
            parameters: this._parseParameters(req.body)
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
                    // 使用新的目录结构：用户目录/uploads
                    const userUploadDir = this._configService.getUserUploadDir(effectiveUserId);
                    const filePath = path.join(userUploadDir, result.savedAs);
                    // 使用正确的外部URL（新目录结构：用户目录/uploads/文件）
                    const externalUrl = `${this._configService.get('externalBaseUrl')}/${effectiveUserId}/uploads/${result.savedAs}`;
                    console.log(`立即处理单张图片: ${result.savedAs}`);
                    this._processSingleImage(filePath, externalUrl, result.savedAs, user, modelConfig);
                }
                
                checkComplete();
            });
        });
    }
    
    /**
     * 解析请求参数
     */
    _parseParameters(body) {
        const parameters = {};
        
        // 基本参数
        if (body.n !== undefined) parameters.n = parseInt(body.n);
        if (body.seed !== undefined) parameters.seed = parseInt(body.seed);
        if (body.strength !== undefined) parameters.strength = parseFloat(body.strength);
        if (body.steps !== undefined) parameters.steps = parseInt(body.steps);
        if (body.cfg_scale !== undefined) parameters.cfg_scale = parseFloat(body.cfg_scale);
        if (body.width !== undefined) parameters.width = parseInt(body.width);
        if (body.height !== undefined) parameters.height = parseInt(body.height);
        
        // 字符串参数
        if (body.prompt) parameters.prompt = body.prompt;
        if (body.negative_prompt) parameters.negative_prompt = body.negative_prompt;
        if (body.style) parameters.style = body.style;
        if (body.size) parameters.size = body.size;
        
        // 从parameters字段获取额外参数
        if (body.parameters && typeof body.parameters === 'object') {
            Object.assign(parameters, body.parameters);
        }
        
        // 确保至少有一个生成数量参数
        if (parameters.n === undefined) {
            parameters.n = 1;
        }
        
        return parameters;
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
        // 使用传入的模型配置
        const model = modelConfig.model || 'wanx2.1-imageedit';
        const prompt = modelConfig.prompt || '';
        const parameters = modelConfig.parameters || { "n": 1 };
        
        // 如果没有设置提示词，跳过处理
        if (!prompt) {
            console.log(`未设置提示词，跳过图片处理: ${filename}`);
            return;
        }
        
        // 根据模型类型准备图像输入参数
        const taskParams = {
            model: model,
            prompt: prompt,
            parameters: parameters
        };
        
        // 根据模型类型设置图像参数
        if (model === 'wan2.5-i2i-preview') {
            // 万相2.5使用images数组参数
            taskParams.images = [externalUrl];
        } else {
            // 其他模型使用imageUrl参数
            taskParams.imageUrl = externalUrl;
        }
        
        console.log(`开始处理图片: ${filename}`);
        console.log(`使用模型: ${model}, 提示词: ${prompt}`);
        console.log(`图像输入:`, model === 'wan2.5-i2i-preview' ? taskParams.images : taskParams.imageUrl);
        
        // 调用imageAI服务处理图片
        this._imageAI.task(taskParams, (error, result) => {
            if (error) {
                console.error(`提交图片处理失败 ${filename}:`, error.message);
                // 发送错误事件
                if (this._eventsService) {
                    this._eventsService.emit('task_error', { 
                        filename: filename, 
                        error: error.message 
                    });
                }
                return;
            }
            
            console.log(`图片处理任务提交成功: ${filename}`);
            console.log(`任务ID: ${result.taskId}, 状态: ${result.status}`);
            
            // 发送任务提交事件
            if (this._eventsService) {
                this._eventsService.emit('task_submitted', { 
                    filename: filename, 
                    taskId: result.taskId, 
                    status: result.status,
                    request_id: result.data?.request_id
                });
            }
            
            // 设置任务结束回调，保存结果并推送状态
            this._imageAI.onEnd((taskId, status, taskResult) => {
                console.log(`任务结束: ${taskId}, 状态: ${status}`);
                
                // 保存结果到imageAI.results
                if (!this._imageAI.results[filename]) {
                    this._imageAI.results[filename] = {};
                }
                
                // 更新结果
                this._imageAI.results[filename] = {
                    taskId: taskId,
                    status: status,
                    filename: filename,
                    model: model,
                    prompt: prompt,
                    parameters: parameters,
                    result: taskResult,
                    timestamp: new Date().toISOString()
                };
                
                console.log(`已保存处理结果 for ${filename}`);
                
                // 发送任务状态更新事件
                if (this._eventsService) {
                    this._eventsService.emit('task_status_updated', { 
                        filename: filename, 
                        taskId: taskId, 
                        status: status,
                        result: taskResult
                    });
                }
                
                // 保存结果到用户目录
                const userId = user.id || 'anonymous';
                if (this._configService && this._imageAI.saveResultToFile) {
                    const userResultsDir = this._configService.getUserResultsDir(userId);
                    this._imageAI.saveResultToFile(userId, taskId, this._imageAI.results[filename], userResultsDir, (saveErr, savedPath) => {
                        if (saveErr) {
                            console.error(`保存结果文件失败: ${saveErr.message}`);
                        } else {
                            console.log(`结果已保存到用户目录: ${savedPath}`);
                            
                            // 发送结果保存事件
                            if (this._eventsService) {
                                this._eventsService.emit('result_saved', { 
                                    filename: filename, 
                                    taskId: taskId, 
                                    savedPath: savedPath
                                });
                            }
                        }
                    });
                }
            });
        });
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
        // 为用户创建独立的上传目录 - 使用新的目录结构（按需创建）
        const userUploadDir = this._configService.getUserUploadDir(userId);
        const filePath = path.join(userUploadDir, safeFilename);

        // 确保用户上传目录存在（只在需要时创建）
        const fileUtil = require('../file.js');
        fileUtil.mkdir(userUploadDir, (mkdirErr) => {
            if (mkdirErr && mkdirErr.code !== 'EEXIST') {
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
                
                // 如果上传成功，添加外部访问URL（新目录结构：用户目录/uploads/文件）
                if (!err) {
                    result.externalUrl = `${this._configService.get('externalBaseUrl')}/${userId}/uploads/${safeFilename}`;
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
        
        // 获取用户特定的上传目录 - 使用新的目录结构
        const userUploadDir = this._configService.getUserUploadDir(userId);
        
        // 使用文件工具
        const fileUtil = require('../file.js');
        
        // 检查目录是否存在
        fileUtil.exists(userUploadDir, (existsErr, exists) => {
            if (!exists) {
                // 目录不存在，返回空列表
                return res.end(JSON.stringify({
                    success: true,
                    files: [],
                    total: 0,
                    message: '获取文件列表成功'
                }));
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
                        externalUrl: `${this._configService.get('externalBaseUrl')}/${userId}/uploads/${item.name}`
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
        
        // 构建用户特定的文件路径 - 使用新的目录结构
        const userUploadDir = this._configService.getUserUploadDir(userId);
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
                    return this._sendError(res, 500, `删除文件失败: ${delErr.message},文件路径：${filePath}`);
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
            this._deleteSingle(filename, req, (result) => {  // 传递req参数
                results.push(result);
                processed++;
                checkComplete();
            });
        });
    }


    /**
     * 删除单个文件
     */
    _deleteSingle(filename, req, callback) {  // 添加req参数
        // 获取用户ID
        const userId = req.headers['x-user-id'] || 'anonymous';  // 从req中获取用户ID
        
        // 构建用户特定的文件路径 - 使用新的目录结构
        const userUploadDir = this._configService.getUserUploadDir(userId);
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
                // 如果在用户目录找不到，尝试在匿名目录查找
                const anonymousUploadDir = this._configService.getUserUploadDir('anonymous');
                const anonymousFilePath = path.join(anonymousUploadDir, filename);
                
                fileUtil.exists(anonymousFilePath, (anonExistsErr, anonExists) => {
                    if (anonExistsErr || !anonExists) {
                        return callback({
                            success: false,
                            filename: filename,
                            message: '文件不存在'
                        });
                    }
                    
                    // 在匿名目录找到文件，删除它
                    fileUtil.del(anonymousFilePath, (delErr) => {
                        callback({
                            success: !delErr,
                            filename: filename,
                            message: delErr ? `删除失败: ${delErr.message}` : '删除成功'
                        });
                    });
                });
                return;
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
     * 配置管理 - 支持用户专属结果
     */
    config(req, res) {
        // 获取用户ID
        const userId = req.headers['x-user-id'] || 'anonymous';
        const fileUtil = require('../file.js');
        
        try {
            // 获取用户结果目录
            const userResultsDir = this._configService.getUserResultsDir(userId);
            const resultsFilePath = path.join(userResultsDir, 'results.json');
            
            // 如果是GET请求，读取用户的结果
            if (req.method === 'GET') {
                // 首先尝试从imageAI.results获取实时结果
                if (this._imageAI && this._imageAI.results) {
                    // 构建结果数据
                    const resultsData = {};
                    Object.keys(this._imageAI.results).forEach(filename => {
                        const result = this._imageAI.results[filename];
                        resultsData[filename] = {
                            taskId: result.taskId,
                            status: result.status,
                            model: result.model,
                            prompt: result.prompt,
                            parameters: result.parameters,
                            timestamp: result.timestamp,
                            // 只包含基本的输出信息，不包含完整的结果数据
                            output: result.result?.output ? {
                                task_id: result.result.output.task_id,
                                task_status: result.result.output.task_status,
                                submit_time: result.result.output.submit_time,
                                scheduled_time: result.result.output.scheduled_time,
                                end_time: result.result.output.end_time,
                                code: result.result.output.code,
                                message: result.result.output.message,
                                results: result.result.output.results ? 
                                    result.result.output.results.map(r => ({ url: r.url })) : []
                            } : null
                        };
                    });
                    
                    return res.end(JSON.stringify({
                        success: true,
                        data: {
                            prompt: '', // 默认prompt
                            results: resultsData
                        }
                    }));
                }
                
                // 如果没有实时结果，尝试从文件读取
                fileUtil.exists(resultsFilePath, (existsErr, exists) => {
                    if (!exists) {
                        // 结果文件不存在，返回空结果
                        return res.end(JSON.stringify({
                            success: true,
                            data: {
                                prompt: '',
                                results: {}
                            }
                        }));
                    }
                    
                    // 读取结果文件
                    fileUtil.readJSON(resultsFilePath, (readErr, data) => {
                        if (readErr) {
                            console.error(`读取结果文件失败: ${readErr.message}`);
                            return res.end(JSON.stringify({
                                success: true,
                                data: {
                                    prompt: '',
                                    results: {}
                                }
                            }));
                        }
                        
                        res.end(JSON.stringify({
                            success: true,
                            data: {
                                prompt: data.prompt || '',
                                results: data.results || {}
                            }
                        }));
                    });
                });
            } else if (req.method === 'POST') {
                // POST请求，更新结果
                fileUtil.exists(resultsFilePath, (existsErr, exists) => {
                    const loadAndUpdate = (existingData) => {
                        const updatedData = existingData || { prompt: '', results: {} };
                        
                        // 更新prompt
                        if (req.body && req.body.prompt !== undefined) {
                            updatedData.prompt = req.body.prompt;
                        }
                        
                        // 处理results数据
                        if (req.body && req.body.results) {
                            if (!updatedData.results) updatedData.results = {};
                            
                            if (Array.isArray(req.body.results)) {
                                // 处理数组形式的results
                                req.body.results.forEach(item => {
                                    if (item.del && item.key) {
                                        // 删除标记了del的项
                                        delete updatedData.results[item.key];
                                    } else if (item.key && item.value !== undefined) {
                                        // 添加或更新项
                                        updatedData.results[item.key] = item.value;
                                    }
                                });
                            } else if (typeof req.body.results === 'object' && req.body.results !== null) {
                                // 处理对象形式的results
                                Object.entries(req.body.results).forEach(([key, value]) => {
                                    updatedData.results[key] = value;
                                });
                            }
                        }
                        
                        // 检查是否有有效数据
                        if (!updatedData.prompt && (!updatedData.results || Object.keys(updatedData.results).length === 0)) {
                            // 没有有效数据，不创建文件
                            return res.end(JSON.stringify({
                                success: true,
                                message: '没有有效数据，不创建结果文件',
                                data: { prompt: '', results: {} }
                            }));
                        }
                        
                        // 有有效数据，保存更新后的结果（按需创建目录）
                        fileUtil.mkdir(userResultsDir, (mkdirErr) => {
                            if (mkdirErr && mkdirErr.code !== 'EEXIST') {
                                console.error(`创建结果目录失败: ${mkdirErr.message}`);
                                return this._sendError(res, 500, `创建结果目录失败: ${mkdirErr.message}`);
                            }
                            
                            fileUtil.writeJSON(resultsFilePath, updatedData, (writeErr) => {
                                if (writeErr) {
                                    console.error(`保存结果文件失败: ${writeErr.message}`);
                                    return this._sendError(res, 500, `保存结果失败: ${writeErr.message}`);
                                }
                                
                                res.end(JSON.stringify({
                                    success: true,
                                    data: {
                                        prompt: updatedData.prompt,
                                        results: updatedData.results
                                    }
                                }));
                            });
                        });
                    };
                    
                    if (exists) {
                        // 文件存在，读取后更新
                        fileUtil.readJSON(resultsFilePath, (readErr, data) => {
                            if (readErr) {
                                console.error(`读取结果文件失败: ${readErr.message}`);
                                loadAndUpdate({});
                            } else {
                                loadAndUpdate(data);
                            }
                        });
                    } else {
                        // 文件不存在，直接创建
                        loadAndUpdate({});
                    }
                });
            }
        } catch (error) {
            this._sendError(res, 500, `配置操作失败: ${error.message}`);
        }
    }

    /**
     * 手动清理过期结果
     */
    manualCleanup(req, res) {
        try {
            // 使用清理服务清理过期结果
            // 注意：这里应该从服务中获取清理服务实例
            res.end(JSON.stringify({
                success: true,
                message: '手动清理完成'
            }));
        } catch (error) {
            this._sendError(res, 500, `手动清理失败: ${error.message}`);
        }
    }

    /**
     * 静态文件服务 - 支持新的目录结构：/:userId/uploads/:filename
     */
    static(req, res) {
        const userId = req.params.userId || 'anonymous';
        const filename = req.params.filename;
        
        // 构建用户特定的文件路径 - 使用新的目录结构
        const userUploadDir = this._configService.getUserUploadDir(userId);
        const userFilePath = path.join(userUploadDir, filename);
        
        // 使用文件服务提供用户特定的文件
        this._fileService.serveStaticFile(req, res, userFilePath, (err) => {
            if (err) {
                this._sendError(res, 404, err.message);
            }
        });
    }

    /**
     * 静态文件服务 - 兼容旧路由（将被废弃）
     */
    staticLegacy(req, res) {
        const filename = req.params.filename;
        // 获取用户ID
        const userId = req.headers['x-user-id'] || 'anonymous';
        
        // 构建用户特定的文件路径 - 使用新的目录结构
        const userUploadDir = this._configService.getUserUploadDir(userId);
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