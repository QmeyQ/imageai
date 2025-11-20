/**
 * 网络客户端模块 - 提供HTTP请求和文件上传功能
 * 
 * 调用示例:
 * const net = new Net({ baseUrl: 'http://api.example.com' });
 * 
 * // 发送请求
 * net.send('GET', '/endpoint', null, null, (error, result) => {
 *   if (!error) console.log('请求成功:', result);
 * });
 * 
 * // 上传文件
 * net.upload([{ filename: 'file.jpg', data: 'base64data' }], (error, result) => {
 *   if (!error) console.log('上传成功:', result);
 * });
 * 
 * // 健康检查
 * net.health((error, result) => {
 *   if (!error) console.log('服务健康:', result);
 * });
 * 
 * // 获取文件列表
 * net.list((error, result) => {
 *   if (!error) console.log('文件列表:', result);
 * });
 * 
 * // 删除文件
 * net.delete('file.jpg', (error, result) => {
 *   if (!error) console.log('删除成功:', result);
 * });
 * 
 * // 批量删除文件
 * net.deleteMultiple(['file1.jpg', 'file2.png'], (error, result) => {
 *   if (!error) console.log('批量删除成功:', result);
 * });
 * 
 * 属性说明:
 * - baseUrl: 基础API地址，默认 'http://localhost:3000'
 * - timeout: 请求超时时间(毫秒)，默认 30000
 * - UPLOAD_ENDPOINT: 文件上传端点，默认 '/upload'
 * - FILES_ENDPOINT: 文件管理端点，默认 '/files'
 * - HEALTH_ENDPOINT: 健康检查端点，默认 '/health'
 * - IMGS: 图片资源端点，默认 '/uploads/'
 * - CFG: 配置端点，默认 '/config'
 * - MODELS_ENDPOINT: 模型列表端点，默认 '/img/models'
 * - MODEL_OPERATIONS_ENDPOINT: 模型操作端点，默认 '/img/models/{model}/operations'
 * 
 * 方法列表:
 * - constructor(options): 构造函数，初始化网络配置
 * - send(method, endpoint, data, headers, callback): 核心请求方法
 * - upload(files, callback): 统一文件上传方法
 * - health(callback): 服务健康检查
 * - list(callback): 获取文件列表
 * - delete(filename, callback): 删除单个文件
 * - deleteMultiple(filenames, callback): 批量删除文件
 * - base64ToBlob(base64Data, mimeType): Base64转Blob工具
 * - get(endpoint, params, callback): GET请求快捷方法
 * - post(endpoint, data, callback): POST请求快捷方法
 * - getModels(callback): 获取模型列表
 * - getOperations(model, callback): 获取模型支持的操作
 */

class Net {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:3000';
        this.timeout = options.timeout || 30000;
        
        // 直接端点配置
        this.UPLOAD_ENDPOINT = options.uploadEndpoint || '/upload';
        this.FILES_ENDPOINT = options.filesEndpoint || '/files';
        this.HEALTH_ENDPOINT = options.healthEndpoint || '/health';
        this.IMGS = options.imgs || '/uploads/';
        this.CFG = options.cfg || '/config';
        this.MODELS_ENDPOINT = options.modelsEndpoint || '/img/models';
        this.MODEL_OPERATIONS_ENDPOINT = options.modelOperationsEndpoint || '/img/models/{model}/operations';
    }

    /**
     * 核心发送方法 - 纯回调，无Promise开销
     */
    send(method, endpoint, data, headers, callback) {
        const xhr = new XMLHttpRequest();
        const url = this.baseUrl + endpoint;
        
        xhr.timeout = this.timeout;
        xhr.open(method, url);
        
        // 设置基础headers
        const finalHeaders = {
            'Content-Type': 'application/json',
            ...headers
        };
        
        // 如果存在鉴权服务且用户已登录，则添加签名头
        if (typeof window !== 'undefined' && window.authService && window.authService.user) {
            window.authService.sign(data).then((signHeaders) => {
                Object.assign(finalHeaders, signHeaders);
                
                // 设置请求头
                for (const key in finalHeaders) {
                    xhr.setRequestHeader(key, finalHeaders[key]);
                }
                
                // 发送请求
                xhr.send(data ? JSON.stringify(data) : null);
            }).catch((signError) => {
                console.warn('签名生成失败:', signError);
                
                // 即使签名失败也发送请求
                for (const key in finalHeaders) {
                    xhr.setRequestHeader(key, finalHeaders[key]);
                }
                
                xhr.send(data ? JSON.stringify(data) : null);
            });
        } else {
            // 没有鉴权服务，直接发送请求
            for (const key in finalHeaders) {
                xhr.setRequestHeader(key, finalHeaders[key]);
            }
            
            xhr.send(data ? JSON.stringify(data) : null);
        }
        
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    callback(null, JSON.parse(xhr.responseText));
                } catch (e) {
                    callback(null, xhr.responseText);
                }
            } else {
                callback(new Error(`HTTP ${xhr.status}`));
            }
        };
        
        xhr.onerror = () => callback(new Error('Network error'));
        xhr.ontimeout = () => callback(new Error('Timeout'));
    }

    /**
     * 统一上传方法 - 处理单文件和多文件
     */
    upload(files, callback, modelConfig = {}) {
        // 统一处理文件格式
        const fileArray = Array.isArray(files) ? files : [files];
        const formattedFiles = [];
        
        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            let content = file.data || file.content;
            
            // 直接处理base64，避免函数调用开销
            if (content.startsWith('data:')) {
                content = content.substring(content.indexOf(',') + 1);
            }
            
            formattedFiles.push({
                filename: file.filename || file.name,
                content: content
            });
        }

        // 构建包含模型配置的请求数据
        const requestData = {
            files: formattedFiles,
            ...modelConfig // 包含model, prompt, parameters等配置
        };

        this.send('POST', this.UPLOAD_ENDPOINT, requestData, null, callback);
    }

    /**
     * 健康检查
     */
    health(callback) {
        this.send('GET', this.HEALTH_ENDPOINT, null, null, callback);
    }

    /**
     * 获取文件列表
     */
    list(callback) {
        this.send('GET', this.FILES_ENDPOINT, null, null, callback);
    }

    /**
     * 删除文件
     */
    delete(filename, callback) {
        const endpoint = this.FILES_ENDPOINT + '/' + encodeURIComponent(filename);
        this.send('DELETE', endpoint, null, null, callback);
    }

    /**
     * 批量删除 - 并行执行，最高效
     */
    deleteMultiple(filenames, callback) {
        let completed = 0;
        const total = filenames.length;
        const results = [];
        
        if (total === 0) {
            callback(null, []);
            return;
        }
        
        const checkCompletion = () => {
            completed++;
            if (completed === total) {
                callback(null, results);
            }
        };
        
        for (let i = 0; i < total; i++) {
            const filename = filenames[i];
            this.delete(filename, (error, result) => {
                results.push({
                    filename: filename,
                    success: !error,
                    result: result,
                    error: error ? error.message : null
                });
                checkCompletion();
            });
        }
    }

    /**
     * 直接工具方法 - 内联优化
     */
    base64ToBlob(base64Data, mimeType) {
        const commaIndex = base64Data.indexOf(',');
        const base64Content = commaIndex > -1 ? base64Data.substring(commaIndex + 1) : base64Data;
        const binary = atob(base64Content);
        const bytes = new Uint8Array(binary.length);
        
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
    }

    /**
     * 直接GET方法 - 避免参数构建开销
     */
    get(endpoint, params, callback) {
        let url = endpoint;
        if (params) {
            const query = new URLSearchParams(params).toString();
            url += '?' + query;
        }
        this.send('GET', url, null, null, callback);
    }

    /**
     * 直接POST方法
     */
    post(endpoint, data, callback) {
        this.send('POST', endpoint, data, null, callback);
    }

    /**
     * 获取模型列表
     */
    getModels(callback) {
        this.send('GET', this.MODELS_ENDPOINT, null, null, callback);
    }

    /**
     * 获取模型支持的操作
     */
    getOperations(model, callback) {
        const endpoint = this.MODEL_OPERATIONS_ENDPOINT.replace('{model}', encodeURIComponent(model));
        this.send('GET', endpoint, null, null, callback);
    }
}

// 全局实例
window.Net = new Net();