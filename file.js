/**
 * 文件操作工具模块 - 提供简化的文件系统操作API
 * 
 * 调用示例:
 * const file = require('./file.js');
 * 
 * // 初始化配置
 * file.init('utf8', true, 2);
 * 
 * // 创建目录
 * file.mkdir('path/to/dir', (error) => {
 *   if (!error) console.log('目录创建成功');
 * });
 * 
 * // 读取文件
 * file.read('path/to/file.txt', (error, data) => {
 *   if (!error) console.log('文件内容:', data);
 * });
 * 
 * // 写入文件
 * file.write('path/to/file.txt', 'file content', false, (error) => {
 *   if (!error) console.log('文件写入成功');
 * });
 * 
 * // 删除文件或目录
 * file.del('path/to/target', true, (error) => {
 *   if (!error) console.log('删除成功');
 * });
 * 
 * // 检查文件是否存在
 * file.exists('path/to/file.txt', (error, exists) => {
 *   console.log('文件是否存在:', exists);
 * });
 * 
 * // 复制文件
 * file.copy('source.txt', 'destination.txt', (error) => {
 *   if (!error) console.log('文件复制成功');
 * });
 * 
 * // 重命名或移动文件
 * file.ren('old-name.txt', 'new-name.txt', (error) => {
 *   if (!error) console.log('文件重命名成功');
 * });
 * 
 * // 读取目录内容或文件信息
 * file.ls('path/to/dir', (error, items) => {
 *   if (!error) console.log('目录内容:', items);
 * });
 * 
 * // 写入JSON文件
 * file.writeJSON('data.json', { key: 'value' }, (error) => {
 *   if (!error) console.log('JSON文件写入成功');
 * });
 * 
 * // 读取JSON文件
 * file.readJSON('data.json', (error, data) => {
 *   if (!error) console.log('JSON数据:', data);
 * });
 * 
 * 属性说明:
 * - config: 默认配置对象
 * - config.encoding: 文件编码，默认null（Buffer）
 * - config.recursive: 是否递归创建目录，默认true
 * - config.space: JSON缩进空格数，默认2
 * 
 * 方法列表:
 * - init(encoding, recursive, space): 初始化配置
 * - mkdir(dirPath, callback): 创建目录
 * - read(filePath, callback): 读取文件内容
 * - write(filePath, data, append, callback): 写入文件内容
 * - del(targetPath, recursive, callback): 删除文件或目录
 * - exists(targetPath, callback): 检查文件或目录是否存在
 * - copy(srcPath, destPath, callback): 复制文件
 * - ren(oldPath, newPath, callback): 重命名或移动文件/目录
 * - ls(targetPath, callback): 读取目录内容或文件信息
 * - writeJSON(filePath, data, callback): 写入JSON文件
 * - readJSON(filePath, callback): 读取JSON文件
 * - isFile(targetPath, callback): 检查路径是否为文件
 * - isDir(targetPath, callback): 检查路径是否为目录
 * - getSize(filePath, callback): 获取文件大小
 */
const fs = require('fs');
const path = require('path');

class FileUtils {
    /**
     * 默认配置
     */
    config = {
        encoding: null, // 默认使用buffer
        recursive: true,
        space: 2
    };

    /**
     * 初始化配置
     * @param {string|null} encoding - 文件编码，默认null（Buffer）
     * @param {boolean} recursive - 是否递归创建目录，默认true
     * @param {number} space - JSON缩进空格数，默认2
     */
    init(encoding, recursive, space) {
        if (encoding !== undefined) this.config.encoding = encoding;
        if (recursive !== undefined) this.config.recursive = recursive;
        if (space !== undefined) this.config.space = space;
    }

    /**
     * 创建目录
     * @param {string} dirPath - 目录路径
     * @param {Function} callback - 回调函数(error)
     */
    mkdir(dirPath, callback) {
        fs.mkdir(dirPath, { recursive: this.config.recursive }, (err) => {
            if (err) {
                console.error(`创建目录失败: ${dirPath}`, err);
                callback(err);
                return;
            }
            callback(null);
        });
    }

    /**
     * 读取文件内容
     * @param {string} filePath - 文件路径
     * @param {Function} callback - 回调函数(error, data)
     */
    read(filePath, callback) {
        fs.readFile(filePath, this.config.encoding, (err, data) => {
            if (err) {
                console.error(`读取文件失败: ${filePath}`, err);
                callback(err, null);
                return;
            }
            callback(null, data);
        });
    }

    /**
     * 写入文件内容
     * @param {string} filePath - 文件路径
     * @param {string|Buffer|Stream} data - 要写入的数据
     * @param {boolean|Function} [append=false] - 是否追加或回调
     * @param {Function} [callback] - 回调函数(error)
     */
    write(filePath, data, append = false, callback) {
        // 参数重载处理
        let finalAppend = false;
        let finalCallback;
        
        if (typeof append === 'function') {
            finalCallback = append;
        } else {
            finalAppend = append;
            finalCallback = callback;
        }
        
        const flags = finalAppend ? 'a' : 'w';
        const dirPath = path.dirname(filePath);
        
        // 确保目录存在
        this.mkdir(dirPath, (mkdirErr) => {
            if (mkdirErr) {
                console.error(`创建目录失败: ${dirPath}`, mkdirErr);
                finalCallback(mkdirErr);
                return;
            }
            
            if (typeof data === 'string' || Buffer.isBuffer(data)) {
                // 字符串或Buffer直接写入
                fs.writeFile(filePath, data, { encoding: this.config.encoding, flags }, (err) => {
                    if (err) {
                        console.error(`写入文件失败: ${filePath}`, err);
                        finalCallback(err);
                        return;
                    }
                    finalCallback(null);
                });
            } else if (data && typeof data.pipe === 'function') {
                // 流数据
                const writeStream = fs.createWriteStream(filePath, { 
                    flags, 
                    encoding: this.config.encoding 
                });
                
                writeStream.on('error', (err) => {
                    console.error(`流写入失败: ${filePath}`, err);
                    finalCallback(err);
                });
                
                writeStream.on('finish', () => {
                    finalCallback(null);
                });
                
                data.pipe(writeStream);
            } else {
                const err = new Error('不支持的数据类型，必须是字符串、Buffer或Stream');
                console.error(err.message);
                finalCallback(err);
            }
        });
    }

    /**
     * 删除文件或目录
     * @param {string} targetPath - 目标路径
     * @param {boolean|Function} [recursive=true] - 递归删除或回调
     * @param {Function} [callback] - 回调函数(error)
     */
    del(targetPath, recursive = true, callback) {
        // 参数重载处理
        let finalRecursive = true;
        let finalCallback;
        
        if (typeof recursive === 'function') {
            finalCallback = recursive;
        } else {
            finalRecursive = recursive;
            finalCallback = callback;
        }
        
        const options = { 
            recursive: finalRecursive, 
            force: true 
        };
        
        // 优先使用 fs.rm (Node.js 14.14.0+)
        if (fs.rm) {
            fs.rm(targetPath, options, (err) => {
                if (err) {
                    console.error(`删除失败: ${targetPath}`, err);
                    finalCallback(err);
                    return;
                }
                finalCallback(null);
            });
        } else {
            // 降级方案
            fs.stat(targetPath, (statErr, stats) => {
                if (statErr) {
                    console.error(`获取文件状态失败: ${targetPath}`, statErr);
                    finalCallback(statErr);
                    return;
                }
                
                if (stats.isDirectory()) {
                    fs.rmdir(targetPath, options, (rmdirErr) => {
                        if (rmdirErr) {
                            console.error(`删除目录失败: ${targetPath}`, rmdirErr);
                            finalCallback(rmdirErr);
                            return;
                        }
                        finalCallback(null);
                    });
                } else {
                    fs.unlink(targetPath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error(`删除文件失败: ${targetPath}`, unlinkErr);
                            finalCallback(unlinkErr);
                            return;
                        }
                        finalCallback(null);
                    });
                }
            });
        }
    }

    /**
     * 检查文件或目录是否存在
     * @param {string} targetPath - 目标路径
     * @param {Function} callback - 回调函数(error, exists)
     */
    exists(targetPath, callback) {
        fs.access(targetPath, (err) => {
            callback(null, !err);
        });
    }

    /**
     * 复制文件
     * @param {string} srcPath - 源路径
     * @param {string} destPath - 目标路径
     * @param {Function} callback - 回调函数(error)
     */
    copy(srcPath, destPath, callback) {
        const destDir = path.dirname(destPath);
        
        this.mkdir(destDir, (mkdirErr) => {
            if (mkdirErr) {
                console.error(`创建目录失败: ${destDir}`, mkdirErr);
                callback(mkdirErr);
                return;
            }
            
            fs.copyFile(srcPath, destPath, (copyErr) => {
                if (copyErr) {
                    console.error(`复制文件失败: ${srcPath} -> ${destPath}`, copyErr);
                    callback(copyErr);
                    return;
                }
                callback(null);
            });
        });
    }

    /**
     * 重命名或移动文件/目录
     * @param {string} oldPath - 原路径
     * @param {string} newPath - 新路径
     * @param {Function} callback - 回调函数(error)
     */
    ren(oldPath, newPath, callback) {
        const newDir = path.dirname(newPath);
        
        this.mkdir(newDir, (mkdirErr) => {
            if (mkdirErr) {
                console.error(`创建目录失败: ${newDir}`, mkdirErr);
                callback(mkdirErr);
                return;
            }
            
            fs.rename(oldPath, newPath, (renameErr) => {
                if (renameErr) {
                    console.error(`重命名失败: ${oldPath} -> ${newPath}`, renameErr);
                    callback(renameErr);
                    return;
                }
                callback(null);
            });
        });
    }

    /**
     * 读取目录内容或文件信息
     * @param {string} targetPath - 目标路径（文件或目录）
     * @param {Function} callback - 回调函数(error, result)
     */
    ls(targetPath, callback) {
        // 首先检查路径类型
        fs.stat(targetPath, (statErr, stats) => {
            if (statErr) {
                console.error(`获取路径状态失败: ${targetPath}`, statErr);
                callback(statErr, null);
                return;
            }
            
            if (stats.isFile()) {
                // 如果是文件，返回文件信息
                const fileInfo = {
                    type: 'file',
                    name: path.basename(targetPath),
                    path: targetPath,
                    size: stats.size,
                    mtime: stats.mtime,
                    ctime: stats.ctime,
                    stats: stats
                };
                callback(null, [fileInfo]);
            } else if (stats.isDirectory()) {
                // 如果是目录，读取目录内容
                fs.readdir(targetPath, (readErr, files) => {
                    if (readErr) {
                        console.error(`读取目录失败: ${targetPath}`, readErr);
                        callback(readErr, null);
                        return;
                    }
                    
                    const results = [];
                    let pending = files.length;
                    
                    if (pending === 0) {
                        callback(null, results);
                        return;
                    }
                    
                    files.forEach((file) => {
                        const filePath = path.join(targetPath, file);
                        fs.stat(filePath, (fileStatErr, fileStats) => {
                            const result = {
                                name: file,
                                path: filePath,
                                type: fileStats ? (fileStats.isFile() ? 'file' : 'directory') : 'unknown',
                                size: fileStats ? fileStats.size : 0,
                                mtime: fileStats ? fileStats.mtime : null,
                                ctime: fileStats ? fileStats.ctime : null
                            };
                            
                            if (fileStatErr) {
                                result.error = fileStatErr.message;
                            } else {
                                result.stats = fileStats;
                            }
                            
                            results.push(result);
                            
                            if (--pending === 0) {
                                callback(null, results);
                            }
                        });
                    });
                });
            } else {
                const err = new Error(`不支持的路径类型: ${targetPath}`);
                console.error(err.message);
                callback(err, null);
            }
        });
    }

    /**
     * 写入JSON文件
     * @param {string} filePath - 文件路径
     * @param {any} data - JSON数据
     * @param {Function} callback - 回调函数(error)
     */
    writeJSON(filePath, data, callback) {
        try {
            const jsonString = JSON.stringify(data, null, this.config.space);
            this.write(filePath, jsonString, callback);
        } catch (stringifyErr) {
            console.error(`JSON序列化失败`, stringifyErr);
            callback(stringifyErr);
        }
    }

    /**
     * 读取JSON文件
     * @param {string} filePath - 文件路径
     * @param {Function} callback - 回调函数(error, data)
     */
    readJSON(filePath, callback) {
        this.read(filePath, (err, data) => {
            if (err) {
                callback(err, null);
                return;
            }
            
            try {
                const dataStr = data.toString();
                const jsonData = JSON.parse(dataStr);
                callback(null, jsonData);
            } catch (parseErr) {
                console.error(`JSON解析失败: ${filePath}`, parseErr);
                callback(parseErr, null);
            }
        });
    }

    /**
     * 检查路径是否为文件
     * @param {string} targetPath - 目标路径
     * @param {Function} callback - 回调函数(error, isFile)
     */
    isFile(targetPath, callback) {
        fs.stat(targetPath, (err, stats) => {
            if (err) {
                callback(err, false);
                return;
            }
            callback(null, stats.isFile());
        });
    }

    /**
     * 检查路径是否为目录
     * @param {string} targetPath - 目标路径
     * @param {Function} callback - 回调函数(error, isDirectory)
     */
    isDir(targetPath, callback) {
        fs.stat(targetPath, (err, stats) => {
            if (err) {
                callback(err, false);
                return;
            }
            callback(null, stats.isDirectory());
        });
    }

    /**
     * 获取文件大小
     * @param {string} filePath - 文件路径
     * @param {Function} callback - 回调函数(error, size)
     */
    getSize(filePath, callback) {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                console.error(`获取文件大小失败: ${filePath}`, err);
                callback(err, null);
                return;
            }
            callback(null, stats.size);
        });
    }
}

// 创建并导出单例实例
const file = new FileUtils();
module.exports = file;