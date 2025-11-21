/**
 * 文件操作工具模块（客户端版本） - 提供简化的文件系统操作API
 * 
 * 调用示例:
 * const fileUtils = new FileUtils();
 * 
 * // 读取文件内容
 * fileUtils.read(file, (error, data) => {
 *   if (!error) console.log('文件内容:', data);
 * });
 * 
 * // 读取文件为Base64
 * fileUtils.readAsBase64(file, (error, base64Data) => {
 *   if (!error) console.log('Base64数据:', base64Data);
 * });
 * 
 * // 读取文件为ArrayBuffer
 * fileUtils.readAsArrayBuffer(file, (error, arrayBuffer) => {
 *   if (!error) console.log('ArrayBuffer数据:', arrayBuffer);
 * });
 * 
 * // 写入JSON文件并下载
 * fileUtils.writeJSON('data.json', { key: 'value' });
 * 
 * // 下载文件
 * fileUtils.download('file.txt', 'file content', 'text/plain');
 * 
 * // 读取JSON文件
 * fileUtils.readJSON(file, (error, data) => {
 *   if (!error) console.log('JSON数据:', data);
 * });
 * 
 * // 获取文件信息
 * const info = fileUtils.getInfo(file);
 * 
 * // 检查文件类型
 * const isImage = fileUtils.isImage(file);
 * const isText = fileUtils.isText(file);
 * 
 * 属性说明:
 * - config: 默认配置
 * - config.space: JSON缩进空格数
 * 
 * 方法列表:
 * - constructor(): 创建文件操作工具实例
 * - init(space): 初始化配置
 * - read(file, callback): 读取文件内容
 * - readAsBase64(file, callback): 读取文件为Base64
 * - readAsArrayBuffer(file, callback): 读取文件为ArrayBuffer
 * - writeJSON(filename, data): 写入JSON文件并下载
 * - download(filename, data, mimeType): 下载文件
 * - readJSON(file, callback): 读取JSON文件
 * - getInfo(file): 获取文件信息
 * - isType(file, mimeType): 检查文件类型
 * - isImage(file): 检查文件是否为图片
 * - isText(file): 检查文件是否为文本文件
 */

class FileUtils {
    /**
     * 默认配置
     */
    config = {
        space: 2
    };

    /**
     * 初始化配置
     * @param {number} space - JSON缩进空格数，默认2
     */
    init(space) {
        if (space !== undefined) this.config.space = space;
    }

    /**
     * 读取文件内容（从File对象）
     * @param {File|Blob} file - File或Blob对象
     * @param {Function} callback - 回调函数(error, data)
     */
    read(file, callback) {
        if (!file) {
            callback(new Error('文件对象不能为空'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            callback(null, e.target.result);
        };
        reader.onerror = (e) => {
            callback(new Error('文件读取失败'));
        };
        reader.readAsText(file);
    }

    /**
     * 读取文件为Base64
     * @param {File|Blob} file - File或Blob对象
     * @param {Function} callback - 回调函数(error, base64Data)
     */
    readAsBase64(file, callback) {
        if (!file) {
            callback(new Error('文件对象不能为空'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            callback(null, e.target.result);
        };
        reader.onerror = (e) => {
            callback(new Error('文件读取失败'));
        };
        reader.readAsDataURL(file);
    }

    /**
     * 读取文件为ArrayBuffer
     * @param {File|Blob} file - File或Blob对象
     * @param {Function} callback - 回调函数(error, arrayBuffer)
     */
    readAsArrayBuffer(file, callback) {
        if (!file) {
            callback(new Error('文件对象不能为空'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            callback(null, e.target.result);
        };
        reader.onerror = (e) => {
            callback(new Error('文件读取失败'));
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * 写入JSON文件并下载
     * @param {string} filename - 文件名
     * @param {any} data - JSON数据
     */
    writeJSON(filename, data) {
        try {
            const jsonString = JSON.stringify(data, null, this.config.space);
            this.download(filename, jsonString, 'application/json');
        } catch (stringifyErr) {
            console.error('JSON序列化失败', stringifyErr);
            throw stringifyErr;
        }
    }

    /**
     * 下载文件
     * @param {string} filename - 文件名
     * @param {string|Blob} data - 文件数据
     * @param {string} mimeType - MIME类型
     */
    download(filename, data, mimeType = 'text/plain') {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * 读取JSON文件
     * @param {File} file - JSON文件
     * @param {Function} callback - 回调函数(error, data)
     */
    readJSON(file, callback) {
        this.read(file, (err, data) => {
            if (err) {
                callback(err, null);
                return;
            }
            
            try {
                const jsonData = JSON.parse(data);
                callback(null, jsonData);
            } catch (parseErr) {
                console.error('JSON解析失败', parseErr);
                callback(parseErr, null);
            }
        });
    }

    /**
     * 获取文件信息
     * @param {File} file - File对象
     * @returns {Object} 文件信息
     */
    getInfo(file) {
        if (!file) return null;
        
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            webkitRelativePath: file.webkitRelativePath || ''
        };
    }

    /**
     * 检查文件类型
     * @param {File} file - File对象
     * @param {string} mimeType - MIME类型
     * @returns {boolean} 是否匹配
     */
    isType(file, mimeType) {
        if (!file || !mimeType) return false;
        return file.type === mimeType;
    }

    /**
     * 检查文件是否为图片
     * @param {File} file - File对象
     * @returns {boolean} 是否为图片
     */
    isImage(file) {
        if (!file) return false;
        return file.type.startsWith('image/');
    }

    /**
     * 检查文件是否为文本文件
     * @param {File} file - File对象
     * @returns {boolean} 是否为文本文件
     */
    isText(file) {
        if (!file) return false;
        return file.type.startsWith('text/') || 
               file.type === 'application/json' ||
               file.type === 'application/javascript';
    }
}

// 全局实例
window.FileUtils = FileUtils;