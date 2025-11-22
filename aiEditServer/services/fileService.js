/**
 * 文件服务模块 - 提供文件操作相关的核心服务功能
 * 
 * 调用示例:
 * const FileService = require('./services/fileService.js');
 * const fileService = new FileService({
 *   uploadDir: './360house-master/uploads',
 *   externalBaseUrl: 'http://localhost:3000'
 * });
 * 
 * // 检查路径安全
 * const isSafe = fileService.isSafePath('/path/to/file');
 * 
 * // 获取MIME类型
 * const mimeType = fileService.getMimeType('.jpg');
 * 
 * // 服务静态文件
 * fileService.serveStaticFile(req, res, 'filename.jpg', (error) => {
 *   if (error) console.error('文件服务错误:', error);
 * });
 * 
 * // 获取文件列表
 * fileService.getFileList((error, fileList) => {
 *   if (!error) console.log('文件列表:', fileList);
 * });
 * 
 * 属性说明:
 * - options: 配置选项
 * - options.uploadDir: 上传目录路径
 * - options.externalBaseUrl: 外部基础URL
 * 
 * 方法列表:
 * - constructor(options): 创建文件服务实例
 * - isSafePath(filePath): 检查路径安全性
 * - getMimeType(ext): 获取MIME类型
 * - serveStaticFile(req, res, filename, callback): 提供静态文件服务
 * - getFileList(callback): 获取文件列表
 */
const path = require('path');
const fs = require('fs');
const file = require('../file.js');

class FileService {
    /**
     * 创建文件服务实例
     * @param {Object} options - 配置选项
     * @param {string} options.uploadDir - 上传目录路径
     * @param {string} options.externalBaseUrl - 外部基础URL
     */
    constructor(options = {}) {
        this.options = {
            uploadDir: './360house-master/uploads',
            externalBaseUrl: 'http://normalgame.cn',
            ...options
        };
    }

    /**
     * 检查路径安全
     * @param {string} filePath - 文件路径
     * @returns {boolean} 是否安全
     */
    isSafePath(filePath) {
        // 检查路径是否在上传目录或其子目录中
        const normalizedUploadDir = path.resolve(this.options.uploadDir);
        const normalizedFilePath = path.resolve(filePath);
        return normalizedFilePath.startsWith(normalizedUploadDir);
    }

    /**
     * 获取MIME类型
     * @param {string} ext - 文件扩展名
     * @returns {string} MIME类型
     */
    getMimeType(ext) {
        const types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        return types[ext] || 'application/octet-stream';
    }

    /**
     * 服务静态文件
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     * @param {string} filePath - 文件路径（完整路径）
     * @param {Function} callback - 回调函数 (error)
     */
    serveStaticFile(req, res, filePath, callback) {
        console.log(`[${new Date().toISOString()}] 开始处理静态文件请求: ${req.path}`);
        
        if (!filePath) {
            console.log(`[${new Date().toISOString()}] 错误: 无效的文件路径`);
            return callback(new Error('无效的文件路径'));
        }

        const ext = path.extname(filePath).toLowerCase();
        
        console.log(`[${new Date().toISOString()}] 文件信息: 路径=${filePath}, 扩展名=${ext}`);

        if (!this.isSafePath(filePath)) {
            console.log(`[${new Date().toISOString()}] 安全检查失败: 不允许的文件操作`);
            return callback(new Error('不允许的文件操作'));
        }

        file.exists(filePath, (existsErr, exists) => {
            if (existsErr || !exists) {
                console.log(`[${new Date().toISOString()}] 文件不存在: ${filePath}`);
                return callback(new Error('文件不存在'));
            }

            file.read(filePath, { encoding: null }, (readErr, fileData) => {
                if (readErr) {
                    console.log(`[${new Date().toISOString()}] 读取文件失败: ${readErr.message}`);
                    return callback(new Error('读取文件失败'));
                }

                // 设置响应头
                res.setHeader('Content-Type', this.getMimeType(ext));
                res.setHeader('Content-Length', fileData.length);
                
                // 添加CORS头，允许跨域访问
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                
                console.log(`[${new Date().toISOString()}] 响应头设置完成，开始发送文件数据`);
                // 发送数据
                res.end(fileData);
                
                callback(null);
            });
        });
    }

    /**
     * 获取文件列表
     * @param {string} userUploadDir - 用户特定的上传目录
     * @param {Function} callback - 回调函数 (error, fileList)
     */
    getFileList(userUploadDir, callback) {
        file.ls(userUploadDir, (err, files) => {
            if (err) {
                return callback(err, null);
            }

            const fileList = files
                .filter(item => item.type === 'file')
                .map(item => ({
                    name: item.name,
                    size: item.size,
                    mtime: item.mtime?.toISOString() || null
                }));

            callback(null, fileList);
        });
    }
}

module.exports = FileService;