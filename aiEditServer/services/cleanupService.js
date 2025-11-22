/**
 * 清理服务模块
 * 
 * 该模块负责定期清理过期的文件和处理结果，释放系统资源，确保服务器的稳定运行。
 * 通过定时任务和手动触发两种方式，管理文件生命周期和存储空间。
 * 
 * 主要功能：
 * - 过期文件清理
 * - 过期结果清理
 * - 未处理图片清理
 * - 存储空间管理
 * - 清理任务调度
 * - 清理统计报告
 * 
 * @module services/cleanup
 * @class CleanupService
 * @property {Object} options - 清理配置选项
 * @property {string} options.uploadDir - 上传目录路径
 * @property {number} options.resultExpiryDays - 结果过期天数
 * @property {number} options.unprocessedImageExpiryHours - 未处理图片过期小时数
 * @method performCleanup - 执行清理任务
 * @method cleanupExpiredResults - 清理过期结果
 * @method cleanupUnprocessedImages - 清理未处理图片
 * @method getCleanupStats - 获取清理统计信息
 */

const path = require('path');
const file = require('../file.js');

class CleanupService {
    /**
     * 创建清理服务实例
     * @param {Object} options - 配置选项
     * @param {string} options.uploadDir - 上传目录路径
     * @param {number} options.resultExpiryDays - 结果过期天数
     * @param {number} options.unprocessedImageExpiryHours - 未处理图片过期小时数
     */
    constructor(options = {}) {
        this.options = {
            uploadDir: './360house-master/uploads',
            resultExpiryDays: 3,
            unprocessedImageExpiryHours: 1,
            ...options
        };
    }

    /**
     * 清理过期结果
     * @param {Object} imageAIResults - ImageAI结果对象
     * @param {Function} callback - 回调函数 (error, cleanedCount)
     */
    cleanupExpiredResults(imageAIResults, callback) {
        const now = new Date();
        const expiryTime = this.options.resultExpiryDays * 24 * 60 * 60 * 1000; // 转换为毫秒
        
        let cleanedCount = 0;
        
        Object.keys(imageAIResults).forEach(key => {
            const result = imageAIResults[key];
            
            // 检查结果是否有创建时间
            if (result.createdAt) {
                const createTime = new Date(result.createdAt).getTime();
                const age = now.getTime() - createTime;
                
                if (age > expiryTime) {
                    delete imageAIResults[key];
                    cleanedCount++;
                    console.log(`自动清理过期结果: ${key}, 创建时间: ${result.createdAt}`);
                }
            } else {
                // 如果没有创建时间，添加当前时间作为创建时间
                result.createdAt = now.toISOString();
            }
        });
        
        callback(null, cleanedCount);
    }

    /**
     * 清理未处理的图片文件
     * 为了降低服务器压力，清理超过一定时间未处理的图片文件
     * @param {Object} imageAIResults - ImageAI结果对象
     * @param {Function} callback - 回调函数 (error, cleanedCount)
     */
    cleanupUnprocessedImages(imageAIResults, callback) {
        const now = new Date();
        const unprocessedExpiryTime = this.options.unprocessedImageExpiryHours * 60 * 60 * 1000; 
        
        file.ls(this.options.uploadDir, (err, files) => {
            if (err) {
                console.error('读取上传目录失败:', err);
                return callback(err, 0);
            }
            
            let cleanedCount = 0;
            let processedCount = 0;
            const totalFiles = files.filter(fileInfo => fileInfo.type === 'file').length;
            
            if (totalFiles === 0) {
                return callback(null, 0);
            }
            
            files.forEach(fileInfo => {
                // 只处理文件，跳过目录
                if (fileInfo.type === 'file') {
                    const filename = fileInfo.name;
                    const filePath = path.join(this.options.uploadDir, filename);
                    
                    // 检查文件是否在结果中存在
                    if (!imageAIResults[filename]) {
                        // 文件不在结果中，可能是未处理的图片
                        const fileMtime = fileInfo.mtime;
                        if (fileMtime) {
                            const fileAge = now.getTime() - new Date(fileMtime).getTime();
                            
                            // 如果文件超过指定时间未被处理，则删除
                            if (fileAge > unprocessedExpiryTime) {
                                file.del(filePath, (delErr) => {
                                    processedCount++;
                                    if (delErr) {
                                        console.error(`删除未处理图片失败 ${filePath}:`, delErr);
                                    } else {
                                        cleanedCount++;
                                        console.log(`已删除未处理图片: ${filePath}`);
                                    }
                                    
                                    // 检查是否所有文件都已处理完
                                    if (processedCount === totalFiles) {
                                        callback(null, cleanedCount);
                                    }
                                });
                                return; // 提前返回，避免执行下面的检查
                            }
                        }
                    }
                    
                    processedCount++;
                    // 检查是否所有文件都已处理完
                    if (processedCount === totalFiles) {
                        callback(null, cleanedCount);
                    }
                }
            });
        });
    }

    /**
     * 执行所有清理任务
     * @param {Object} imageAIResults - ImageAI结果对象
     * @param {Function} callback - 回调函数 (error, results)
     */
    performAllCleanup(imageAIResults, callback) {
        let totalCleaned = 0;
        let completedTasks = 0;
        const results = {
            expiredResults: 0,
            unprocessedImages: 0
        };

        // 清理过期结果
        this.cleanupExpiredResults(imageAIResults, (err, count) => {
            if (err) {
                console.error('清理过期结果时出错:', err);
            } else {
                results.expiredResults = count;
                totalCleaned += count;
            }
            
            completedTasks++;
            if (completedTasks === 2) {
                callback(null, { ...results, total: totalCleaned });
            }
        });

        // 清理未处理图片
        this.cleanupUnprocessedImages(imageAIResults, (err, count) => {
            if (err) {
                console.error('清理未处理图片时出错:', err);
            } else {
                results.unprocessedImages = count;
                totalCleaned += count;
            }
            
            completedTasks++;
            if (completedTasks === 2) {
                callback(null, { ...results, total: totalCleaned });
            }
        });
    }
}

module.exports = CleanupService;