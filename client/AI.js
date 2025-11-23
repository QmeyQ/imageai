/**
 * AI处理核心模块 - 提供AI图像处理的核心功能
 * 
 * 调用示例:
 * // 创建ImageAI实例
 * const imageAI = new ImageAI('your-api-key', 'model-name');
 * 
 * // 处理单个图片
 * processSingleImage(imageAI, 'path/to/image.jpg', editParams, 'output/dir', (error, result) => {
 *   if (!error) console.log('图片处理完成:', result);
 * });
 * 
 * // 处理图片目录
 * processImageDirectory(imageAI, 'images/dir', editParams, 'output/dir', (error, results) => {
 *   if (!error) console.log('所有图片处理完成:', results);
 * });
 * 
 * // 加载任务ID文件
 * loadTaskIdsFromFile('task_ids.txt', (error, taskIds) => {
 *   if (!error) console.log('任务ID列表:', taskIds);
 * });
 * 
 * // 保存任务ID到文件
 * saveTaskIdsToFile(taskIds, 'task_ids.txt', (error) => {
 *   if (!error) console.log('任务ID保存成功');
 * });
 * 
 * 属性说明:
 * - CONFIG: 配置常量对象，包含API密钥、模型名称、目录路径等
 * 
 * 方法列表:
 * - loadTaskIdsFromFile(filePath, callback): 读取任务ID文件
 * - saveTaskIdsToFile(taskIds, filePath, callback): 保存任务ID到文件
 * - processSingleImage(imageAI, imagePath, editParams, outputDir, callback): 处理单个图片
 * - processImageDirectory(imageAI, imageDir, editParams, outputDir, callback): 处理图片目录
 */
/**
 * AI处理核心模块
 * 
 * 该模块提供AI图像处理的核心功能，包括任务提交、状态查询、结果处理等。
 * 采用适配器模式，支持多种AI服务提供商，当前主要集成DashScope服务。
 * 
 * 主要功能：
 * - AI任务提交和管理
 * - 任务状态轮询和监控
 * - 处理结果存储和检索
 * - 生命周期回调支持
 * - 错误处理和重试机制
 * 
 * @module AI
 * @class AI
 * @property {Object} net - 网络客户端实例
 * @property {DashScopeAdapter} ds - DashScope适配器实例
 * @property {TaskService} _taskService - 任务服务实例
 * @property {Object} results - 处理结果存储
 * @method task - 提交AI处理任务
 * @method status - 查询任务状态
 * @method process - 批量处理图像
 * @method onStart - 设置开始回调
 * @method onEnd - 设置结束回调
 * @method save - 保存处理结果
 * @method load - 加载处理结果
 */

const ImageAI = require('./imageAI');

// 配置常量
const CONFIG = {
    API_KEY: 'sk-4606777c987a4fe3a013379e98a641b7a',
    MODEL_NAME: 'wanx2.1-imageedit',
    IMAGE_DIR: './images',
    OUTPUT_DIR: './output',
    TASK_ID_FILE: './task_ids.txt',
    // 图像编辑参数
    EDIT_PARAMS: {
        prompt: '让这个柠檬更加鲜艳，增强其黄色调并提高对比度',
        parameters: {
            "n": 1,
            "resolution": "1024x1024"
        }
    }
};

// 读取任务ID文件
function loadTaskIdsFromFile(filePath, callback) {
    if (!fs.existsSync(filePath)) {
        console.log(`任务ID文件不存在: ${filePath}`);
        callback(null, []);
        return;
    }
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // 尝试解析为JSON格式
        try {
            const taskIds = JSON.parse(fileContent);
            callback(null, taskIds);
            return;
        } catch (jsonError) {
            // 如果不是JSON，则按行读取
            const lines = fileContent.trim().split('\n');
            const taskIds = lines.filter(line => line.trim()).map(line => ({
                task_id: line.trim()
            }));
            callback(null, taskIds);
        }
    } catch (error) {
        console.error(`读取任务ID文件错误: ${error.message}`);
        callback(error);
    }
}

// 保存任务ID到文件
function saveTaskIdsToFile(taskIds, filePath, callback) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(taskIds, null, 2));
        console.log(`所有任务ID已保存到 ${filePath}`);
        console.log(`共提交 ${taskIds.length} 个任务`);
        callback(null);
    } catch (error) {
        console.error(`保存任务ID到文件时出错: ${error.message}`);
        callback(error);
    }
}

// 处理单个图片
function processSingleImage(imageAI, imagePath, editParams, outputDir, callback) {
    console.log(`\n========================================`);
    console.log(`处理图片: ${path.basename(imagePath)}`);
    
    // 生成输出文件名和路径
    const imageName = path.basename(imagePath, path.extname(imagePath));
    const outputPath = path.join(outputDir, `${imageName}_result${path.extname(imagePath)}`);
    
    // 使用新的processImage方法，提交后立即查询并在成功时下载
    imageAI.processImage(imagePath, editParams, outputPath, (error, result) => {
        if (error) {
            console.error(`处理图片失败:`, error.message);
            callback(error);
            return;
        }
        
        const status = result.output?.task_status;
        console.log(`\n图片处理结果:`);
        console.log(`- 任务ID: ${result.output?.task_id}`);
        console.log(`- 任务状态: ${status}`);
        
        if (status === 'SUCCEEDED') {
            if (result.downloaded) {
                console.log(`- 结果已下载到: ${result.outputPath}`);
            } else if (result.downloadError) {
                console.log(`- 任务成功但下载失败: ${result.downloadError.message}`);
            }
        } else if (status === 'FAILED') {
            console.error(`- 任务失败原因: ${JSON.stringify(result)}`);
        }
        
        callback(null, {
            file: path.basename(imagePath),
            task_id: result.output?.task_id,
            status: status,
            timestamp: new Date().toISOString()
        });
    });
}

// 处理图片目录
function processImageDirectory(imageAI, imageDir, editParams, outputDir, callback) {
    console.log(`\n扫描图片目录: ${imageDir}`);
    
    try {
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`创建输出目录: ${outputDir}`);
        }
        
        const imageFiles = fs.readdirSync(imageDir).filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        });
        
        console.log(`找到 ${imageFiles.length} 个图片文件`);
        
        if (imageFiles.length === 0) {
            callback(null, []);
            return;
        }
        
        const taskResults = [];
        let processedCount = 0;
        let hasError = false;
        
        // 处理每个图片（串行处理，一个完成后再处理下一个）
        const processNextImage = (index) => {
            if (index < imageFiles.length) {
                const imageFile = imageFiles[index];
                const imagePath = path.join(imageDir, imageFile);
                
                processSingleImage(imageAI, imagePath, editParams, outputDir, (error, taskInfo) => {
                    if (error) {
                        hasError = true;
                    } else if (taskInfo) {
                        taskResults.push(taskInfo);
                    }
                    
                    processedCount++;
                    console.log(`\n进度: ${processedCount}/${imageFiles.length}`);
                    
                    // 处理下一个图片
                    processNextImage(index + 1);
                });
            } else {
                // 所有图片处理完成
                callback(hasError ? new Error('部分图片处理失败') : null, taskResults);
            }
        };
        
        // 开始处理第一张图片
        processNextImage(0);
        
    } catch (error) {
        console.error(`读取图片目录时出错: ${error.message}`);
        callback(error);
    }
}

// // 主函数
// function main() {
//     console.log(`\n========================================`);
//     console.log(`初始化图像AI处理工具`);
//     console.log(`========================================`);
    
//     // 创建ImageAI实例
//     const imageAI = new ImageAI(CONFIG.API_KEY, CONFIG.MODEL_NAME);
    
//     // 创建输出目录
//     if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
//         fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
//     }
    
//     // 检查任务ID文件是否存在，决定是查询还是提交任务
//     if (fs.existsSync(CONFIG.TASK_ID_FILE)) {
//         console.log(`发现任务ID文件，将查询现有任务状态`);
        
//         loadTaskIdsFromFile(CONFIG.TASK_ID_FILE, (error, taskIds) => {
//             if (error) {
//                 console.error('加载任务ID失败:', error.message);
//                 return;
//             }
            
//             console.log(`\n开始查询 ${taskIds.length} 个任务的状态...`);
            
//             // 依次查询每个任务状态
//             let processedCount = 0;
//             taskIds.forEach((taskInfo, index) => {
//                 imageAI.getTaskStatus(taskInfo.task_id, (error, taskResult) => {
//                     if (error) {
//                         console.error(`查询任务 ${taskInfo.task_id} 失败:`, error.message);
//                     } else {
//                         const status = taskResult.output?.task_status;
//                         console.log(`\n任务 ${taskInfo.task_id} 状态: ${JSON.stringify(taskResult)}`);
                        
//                         // 如果任务成功且有结果URL，则下载图片
//                         if (status === 'SUCCEEDED' && taskResult.output?.results?.[0]?.url) {
//                             const resultUrl = taskResult.output.results[0].url;
//                             const outputPath = path.join(CONFIG.OUTPUT_DIR, `task_${taskInfo.task_id}.png`);
//                             console.log(`任务成功，开始下载结果图片...`);
                            
//                             imageAI.downloadImage(resultUrl, outputPath, (error) => {
//                                 if (error) {
//                                     console.error('下载图片失败:', error.message);
//                                 } else {
//                                     console.log(`图片已下载到: ${outputPath}`);
//                                 }
//                             });
//                         }
//                     }
                    
//                     processedCount++;
//                     if (processedCount === taskIds.length) {
//                         console.log('\n所有任务查询完成');
//                     }
//                 });
//             });
//         });
//     } else {
//         console.log(`未发现任务ID文件，将处理图片目录并提交新任务`);
        
//         processImageDirectory(imageAI, CONFIG.IMAGE_DIR, CONFIG.EDIT_PARAMS, CONFIG.OUTPUT_DIR, (error, taskResults) => {
//             if (error) {
//                 console.error('处理图片目录失败:', error.message);
//             } else {
//                 console.log(`\n========================================`);
//                 console.log(`所有图片处理完成`);
//                 console.log(`总计: ${taskResults.length} 个任务`);
//                 console.log(`成功: ${taskResults.filter(t => t.status === 'SUCCEEDED').length}`);
//                 console.log(`失败: ${taskResults.filter(t => t.status === 'FAILED').length}`);
//                 console.log(`处理中: ${taskResults.filter(t => t.status !== 'SUCCEEDED' && t.status !== 'FAILED').length}`);
//                 console.log(`========================================`);
                
//                 // 保存任务ID到文件
//                 saveTaskIdsToFile(taskResults, CONFIG.TASK_ID_FILE, (error) => {
//                     if (error) {
//                         console.error('保存任务ID失败:', error.message);
//                     } else {
//                         console.log('\n任务结果已保存，可以后续查询任务状态');
//                     }
//                 });
//             }
//         });
//     }
// }

// // 运行主函数
// main();
