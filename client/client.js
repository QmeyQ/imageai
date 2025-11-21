/**
 * 客户端主模块 - 客户端应用的入口点
 * 
 * 调用示例:
 * const client = new Client({ net: window.Net });
 * 
 * // 文件转Base64
 * client.fileToBase64(file, (error, base64String) => {
 *   if (!error) console.log('Base64转换成功:', base64String);
 * });
 * 
 * // 健康检查
 * client.health((error, result) => {
 *   if (!error) console.log('服务健康状态:', result);
 * });
 * 
 * // 从存储上传文件
 * client.uploadFromStorage(storage, ['key1', 'key2'], (error, result) => {
 *   if (!error) console.log('上传完成:', result);
 * });
 * 
 * // 删除服务器文件
 * client.delete(['file1.jpg', 'file2.png'], (error, result) => {
 *   if (!error) console.log('删除完成:', result);
 * });
 * 
 * // 清理本地存储文件
 * client.cleanup(storage, ['key1', 'key2'], (error, result) => {
 *   if (!error) console.log('清理完成:', result);
 * });
 * 
 * 属性说明:
 * - net: 网络客户端实例
 * - maxRetries: 最大重试次数，默认3次
 * - retryDelay: 重试延迟时间，默认1000ms
 * 
 * 方法列表:
 * - constructor(options): 构造函数，初始化网络客户端
 * - fileToBase64(file, callback): 文件转Base64
 * - health(callback): 健康检查
 * - uploadFromStorage(storage, keys, callback): 从存储上传文件
 * - _uploadWithRetry(files, callback, attempt): 带重试的上传逻辑
 * - delete(filenames, callback): 删除服务器文件
 * - cleanup(storage, keys, callback): 清理本地存储文件
 */
class Client {
    constructor(options = {}) {
        // 直接依赖注入，避免复杂的环境检测
        this.net = options.net || window.Net;
        if (!this.net) {
            throw new Error('必须提供net实例');
        }
        
        // 简化配置
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
    }

    /**
     * 文件转Base64 - 直接高效实现
     * @param {File|Blob} file - 要转换的文件对象
     * @param {Function} callback - 回调函数 (error, base64String)
     */
    fileToBase64(file, callback) {
        if (!file) {
            callback(new Error('文件为空'), null);
            return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => callback(null, reader.result);
        reader.onerror = () => callback(new Error('文件读取失败'), null);
        reader.readAsDataURL(file);
    }
    
    /**
     * 健康检查 - 直接代理到net
     * @param {Function} callback - 回调函数 (error, result)
     */
    health(callback) {
        this.net.health(callback);
    }

    /**
     * 从存储上传文件 - 统一上传方法
     * @param {Object} storage - 存储实例，必须提供getFile方法
     * @param {Array<string>} keys - 要上传的文件键名数组
     * @param {Function} callback - 回调函数 (error, result)
     * @param {Object} modelConfig - 模型配置 {model, prompt, parameters}
     */
    uploadFromStorage(storage, keys, callback, modelConfig = {}) {
        // 参数验证
        if (!storage || !storage.getFile) {
            callback(new Error('无效存储实例'), null);
            return;
        }
        
        if (!Array.isArray(keys) || keys.length === 0) {
            callback(new Error('无效键名数组'), null);
            return;
        }
        
        const uploadFiles = [];
        let processed = 0;
        const total = keys.length;
        
        // 处理单个文件
        const processFile = (index) => {
            if (index >= total) {
                // 所有文件处理完成，开始上传
                this._uploadWithRetry(uploadFiles, callback, 0, modelConfig);
                return;
            }
            
            const key = keys[index];
            storage.getFile(key, (fileBlob) => {
                if (!fileBlob) {
                    console.warn('文件不存在:', key);
                    processed++;
                    processFile(index + 1);
                    return;
                }
                
                // 转换为Base64
                this.fileToBase64(fileBlob, (error, base64Data) => {
                    if (error) {
                        console.error('转换失败:', key, error);
                        processed++;
                        processFile(index + 1);
                        return;
                    }
                    
                    // 生成文件名
                    const ext = fileBlob.type ? fileBlob.type.split('/')[1] || 'bin' : 'bin';
                    const filename = `file_${Date.now()}_${index}.${ext}`;
                    
                    uploadFiles.push({
                        name: filename,
                        data: base64Data,
                        key: key
                    });
                    
                    processed++;
                    processFile(index + 1);
                });
            });
        };
        
        processFile(0);
    }

    /**
     * 带重试的上传逻辑
     * @param {Array} files - 文件数组
     * @param {Function} callback - 回调函数
     * @param {number} attempt - 当前重试次数
     * @param {Object} modelConfig - 模型配置 {model, prompt, parameters}
     */
    _uploadWithRetry(files, callback, attempt = 0, modelConfig = {}) {
        if (files.length === 0) {
            callback(new Error('无有效文件'), null);
            return;
        }
        
        this.net.upload(files, (error, result) => {
            if (error && attempt < this.maxRetries) {
                const delay = this.retryDelay * (attempt + 1);
                console.warn(`上传失败，${delay}ms后重试:`, error);
                setTimeout(() => this._uploadWithRetry(files, callback, attempt + 1, modelConfig), delay);
                return;
            }
            
            if (error) {
                console.error('上传失败，已达最大重试次数:', error);
                callback(error, null);
                return;
            }
            
            callback(null, result);
        }, modelConfig);
    }
    
    /**
     * 删除服务器文件
     * @param {string|Array<string>} filenames - 文件名或文件名数组
     * @param {Function} callback - 回调函数 (error, result)
     */
    delete(filenames, callback) {
        if (Array.isArray(filenames)) {
            this.net.deleteMultiple(filenames, callback);
        } else {
            this.net.delete(filenames, callback);
        }
    }

    /**
     * 清理本地存储文件
     * @param {Object} storage - 存储实例，必须提供deleteFile方法
     * @param {Array<string>} keys - 要删除的键名数组
     * @param {Function} callback - 回调函数 (error, result)
     */
    cleanup(storage, keys, callback) {
        if (!storage || !storage.deleteFile) {
            callback(new Error('无效存储实例'), null);
            return;
        }
        
        if (!Array.isArray(keys) || keys.length === 0) {
            callback(null, { deleted: 0, failed: 0, total: 0 });
            return;
        }
        
        let deleted = 0;
        let failed = 0;
        const total = keys.length;
        
        const deleteFile = (index) => {
            if (index >= total) {
                callback(null, { deleted, failed, total });
                return;
            }
            
            const key = keys[index];
            storage.deleteFile(key, (success) => {
                if (success) {
                    deleted++;
                } else {
                    failed++;
                    console.error('删除失败:', key);
                }
                deleteFile(index + 1);
            });
        };
        
        deleteFile(0);
    }
}

// 全局实例
window.Client = Client;