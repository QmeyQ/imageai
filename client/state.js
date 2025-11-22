/**
 * 状态管理模块 - 管理应用的状态
 * 
 * 调用示例:
 * const stateManager = new StateManager(storage);
 * 
 * // 加载隐藏图片状态
 * stateManager.loadHiddenImagesStatus((hiddenImages) => {
 *   console.log('隐藏图片状态:', hiddenImages);
 * });
 * 
 * // 保存隐藏图片状态
 * stateManager.saveHiddenImages(['image1.jpg', 'image2.png'], (error) => {
 *   if (!error) console.log('状态保存成功');
 * });
 * 
 * // 获取处理后的图片信息
 * const imageInfo = stateManager.getProcessedImageInfo('image.jpg');
 * 
 * 属性说明:
 * - storage: 存储实例
 * - hiddenImages: 隐藏图片集合
 * 
 * 方法列表:
 * - constructor(storage): 构造函数，初始化存储实例
 * - loadHiddenImagesStatus(callback): 加载隐藏图片状态
 * - saveHiddenImages(hiddenImages, callback): 保存隐藏图片状态
 * - getProcessedImageInfo(filename): 获取处理后的图片信息
 * - extractFilenameFromUrl(url): 从URL中提取文件名
 * - extractErrorMessage(resultData): 从结果数据中提取错误信息
 * - isValidImageUrl(url): 检查图片URL是否有效
 */
class StateManager {
    constructor(storage) {
        this.storage = storage;
        this.hiddenImages = [];
    }

    /**
     * 加载隐藏图片状态
     */
    loadHiddenImagesStatus(callback) {
        this.storage.get('hiddenImages', (hiddenImages) => {
            this.hiddenImages = hiddenImages || [];

            // 如果有降级存储的数据，也加载进来
            try {
                const localStorageHiddenImages = JSON.parse(localStorage.getItem('hiddenImages') || '[]');
                this.hiddenImages = [...new Set([...this.hiddenImages, ...localStorageHiddenImages])];
            } catch (e) {
                console.warn('加载localStorage隐藏图片状态失败:', e);
            }

            if (callback) callback(this.hiddenImages);
        });
    }

    /**
     * 保存隐藏图片状态
     */
    saveHiddenImages(hiddenImages, callback) {
        this.hiddenImages = hiddenImages;
        this.storage.set('hiddenImages', hiddenImages, (success) => {
            if (!success) {
                // 降级存储到localStorage
                localStorage.setItem('hiddenImages', JSON.stringify(hiddenImages));
                if (callback) callback(new Error('保存隐藏图片状态失败'));
            } else {
                if (callback) callback(null);
            }
        });
    }

    /**
     * 获取处理后的图片信息
     */
    getProcessedImageInfo(filename) {
        console.group(`🔍 getProcessedImageInfo - 获取图片信息: ${filename}`);

        try {
            // 先从processedImages获取
            let processedImages = JSON.parse(localStorage.getItem('processedImages') || '{}');
            let imageInfo = processedImages[filename];

            console.log('📁 从processedImages获取:', imageInfo ? '找到' : '未找到');

            // 如果没有找到，尝试从processingResults中查找
            if (!imageInfo) {
                console.log('🔍 从processingResults中查找');
                const results = JSON.parse(localStorage.getItem('processingResults') || '{}');
                // 遍历results查找匹配的文件名
                for (const url in results) {
                    const resultFilename = this.extractFilenameFromUrl(url);
                    if (resultFilename === filename) {
                        const resultData = results[url];
                        
                        // 剥离URL中的反引号
                        let imageUrl = '';
                        if (resultData.imageUrl) {
                            imageUrl = resultData.imageUrl.replace(/^`|`$/g, '');
                        } else if (resultData.file) {
                            imageUrl = resultData.file.replace(/^`|`$/g, '');
                        } else {
                            imageUrl = url.replace(/^`|`$/g, '');
                        }
                        
                        imageInfo = {
                            imageUrl: imageUrl,
                            taskId: resultData.taskId,
                            status: resultData.status,
                            timestamp: resultData.timestamp,
                            errorMessage: this.extractErrorMessage(resultData),
                            errorCode: this.extractErrorCode(resultData),
                            originalData: resultData
                        };
                        // 保存到processedImages
                        processedImages[filename] = imageInfo;
                        localStorage.setItem('processedImages', JSON.stringify(processedImages));
                        console.log('✅ 从processingResults找到并保存到processedImages');
                        break;
                    }
                }
            }

            let result = null;

            if (imageInfo) {
                result = {
                    ...imageInfo,
                    isProcessed: true,
                    isSuccess: (imageInfo.status === 'COMPLETED' || imageInfo.status === 'SUCCEEDED') &&
                        imageInfo.imageUrl && this.isValidImageUrl(imageInfo.imageUrl),
                    isFailed: imageInfo.status === 'FAILED' ||
                        ((imageInfo.status === 'COMPLETED' || imageInfo.status === 'SUCCEEDED') &&
                            (!imageInfo.imageUrl || !this.isValidImageUrl(imageInfo.imageUrl))),
                    isProcessing: imageInfo.status === 'PROCESSING' || 
                                  imageInfo.status === 'submitted' || 
                                  (imageInfo.data && imageInfo.data.output && 
                                   imageInfo.data.output.task_status === 'PENDING')
                };
            }

            console.groupEnd();
            return result;

        } catch (error) {
            console.error('💥 获取处理图片信息时发生错误:', error);
            console.groupEnd();
            return null;
        }
    }

    /**
     * 从URL中提取文件名
     */
    extractFilenameFromUrl(url) {
        if (!url) return 'unknown';

        try {
            const cleanUrl = url.replace(/^`|`$/g, '');
            const urlObj = new URL(cleanUrl);
            const pathname = urlObj.pathname;
            return pathname.split('/').pop() || 'unknown';
        } catch (e) {
            const cleanUrl = url.replace(/^`|`$/g, '');
            const parts = cleanUrl.split('/');
            return parts.pop() || 'unknown';
        }
    }

    /**
     * 从结果数据中提取错误信息
     */
    extractErrorMessage(resultData) {
        if (resultData.data && resultData.data.output && resultData.data.output.message) {
            return resultData.data.output.message;
        }
        if (resultData.data && resultData.data.message) {
            return resultData.data.message;
        }
        if (resultData.message) {
            return resultData.message;
        }
        return '未知错误';
    }

    /**
     * 检查图片URL是否有效
     */
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        const cleanUrl = url.replace(/^`|`$/g, '').trim();
        
        if (!cleanUrl || 
            cleanUrl === 'null' || 
            cleanUrl === 'undefined' || 
            cleanUrl === 'error' ||
            cleanUrl === 'None' ||
            cleanUrl === 'N/A') {
            return false;
        }
        
        if (cleanUrl.length < 5) return false;
        
        const imageIndicators = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.bmp',
            'image', 'img', 'pic', 'photo', 'output'
        ];
        
        const lowerUrl = cleanUrl.toLowerCase();
        return imageIndicators.some(indicator => lowerUrl.includes(indicator));
    }
}