/**
 * 图片处理工具模块 - 封装图片处理相关逻辑
 * 
 * 调用示例:
 * const imageProcessor = new ImageProcessor(storage, uiTools);
 * 
 * // 处理文件
 * imageProcessor.processFiles(files);
 * 
 * // 存储图片到IndexedDB
 * imageProcessor.storeImages(files, startIndex, (successCount) => {
 *   console.log('存储完成，成功数量:', successCount);
 * });
 * 
 * // 加载本地存储的图片
 * imageProcessor.loadStoredImages();
 * 
 * // 删除本地图片
 * imageProcessor.deleteLocalImage(key, item, imgUrl);
 * 
 * 属性说明:
 * - storage: 存储实例
 * - uiTools: UI工具实例
 * 
 * 方法列表:
 * - constructor(storage, uiTools): 构造函数，初始化存储和UI工具
 * - processFiles(files): 处理文件，筛选并存储图片
 * - storeImages(files, startIndex, callback): 存储图片到IndexedDB
 * - loadStoredImages(): 加载本地存储的图片
 * - loadImageItems(keys, index): 递归加载图片项（避免阻塞UI）
 * - bindLocalImageDeleteEvent(item, key, blob): 绑定本地图片删除事件
 * - deleteLocalImage(key, item, imgUrl): 删除本地图片
 */
class ImageProcessor {
    constructor(storage, uiTools) {
        this.storage = storage;
        this.uiTools = uiTools;
    }

    /**
     * 处理文件 - 筛选并存储图片
     */
    processFiles(files) {
        if (files.length === 0) return;

        const imageFiles = [];

        // 高效筛选图片文件
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type && file.type.startsWith('image/')) {
                imageFiles.push(file);
            } else if (file.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
                imageFiles.push(file);
            }
        }

        if (imageFiles.length === 0) {
            this.uiTools.showNotification('未找到图片文件', 'error');
            return;
        }

        // 获取当前索引
        this.storage.get('currentImageIndex', (currentIndex) => {
            const startIndex = currentIndex !== null ? currentIndex + 1 : 1;
            this.storeImages(imageFiles, startIndex, (successCount) => {
                if (successCount > 0) {
                    this.uiTools.showNotification(`已添加 ${successCount} 张图片`);
                    // 刷新本地图片展示列表
                    this.loadStoredImages();
                }
            });
        });
    }

    /**
     * 存储图片到IndexedDB
     */
    storeImages(files, startIndex, callback) {
        let storedCount = 0;
        let total = files.length;
        let currentIndex = startIndex;

        const storeNext = () => {
            if (storedCount >= total) {
                // 更新索引
                this.storage.set('currentImageIndex', startIndex + total - 1, () => {
                    callback(storedCount);
                });
                return;
            }

            const file = files[storedCount];
            const imageKey = `image_${currentIndex}`;

            this.storage.getFile(imageKey, (existingBlob) => {
                if (existingBlob) {
                    // 键已存在，跳过
                    storedCount++;
                    currentIndex++;
                    storeNext();
                } else {
                    this.storage.saveFile(imageKey, file, (success) => {
                        if (success) {
                            storedCount++;
                        }
                        currentIndex++;
                        storeNext();
                    });
                }
            });
        };

        storeNext();
    }

    /**
     * 加载本地存储的图片
     */
    loadStoredImages() {
        const { localImages } = this.uiTools.elements;
        this.uiTools.showLoadingState(localImages);

        this.storage.getKeys((keys) => {
            const fileKeys = keys.fileKeys.filter(key => key.startsWith('image_')).sort();

            if (fileKeys.length === 0) {
                this.uiTools.showEmptyLocalState();
                return;
            }

            this.uiTools.clearContainer(localImages);
            this.loadImageItems(fileKeys, 0);
        });
    }

    /**
     * 递归加载图片项（避免阻塞UI）
     */
    loadImageItems(keys, index) {
        const { localImages } = this.uiTools.elements;
        
        if (index >= keys.length) {
            // 所有图片加载完成
            return;
        }

        const key = keys[index];
        this.storage.getFile(key, (blob) => {
            if (blob) {
                const item = this.uiTools.createLocalImageItem(blob, key, localImages);
                // 绑定删除事件
                this.bindLocalImageDeleteEvent(item, key, blob);
            }

            // 继续加载下一张
            if (index + 1 < keys.length) {
                setTimeout(() => this.loadImageItems(keys, index + 1), 0);
            }
        });
    }

    /**
     * 绑定本地图片删除事件
     */
    bindLocalImageDeleteEvent(item, key, blob) {
        const deleteBtn = item.querySelector('.delete-btn');
        const imgUrl = item.querySelector('img').src;

        deleteBtn.addEventListener('click', () => {
            this.deleteLocalImage(key, item, imgUrl);
        });
    }

    /**
     * 删除本地图片
     */
    deleteLocalImage(key, item, imgUrl) {
        this.storage.deleteFile(key, (success) => {
            if (success) {
                item.remove();
                URL.revokeObjectURL(imgUrl);
                this.uiTools.showNotification(`已删除图片: ${key}`);

                const { localImages } = this.uiTools.elements;
                if (localImages.children.length === 0) {
                    this.uiTools.showEmptyLocalState();
                }
            } else {
                this.uiTools.showNotification(`删除失败: ${key}`, 'error');
            }
        });
    }
}

/**
 * 图像工具模块
 * 
 * 该模块提供图像处理相关的工具函数，包括图像格式转换、尺寸调整、
 * 数据提取等功能。专注于处理图像数据，提供高效的图像操作接口。
 * 
 * 主要功能：
 * - 图像格式转换（Base64、Blob、ArrayBuffer）
 * - 图像尺寸调整和裁剪
 * - 图像数据提取和分析
 * - 图像元数据处理
 * - 图像质量优化
 * - 图像预览生成
 * 
 * @module imgUtil
 * @class ImageUtils
 * @property {Object} canvas - Canvas元素用于图像处理
 * @property {Object} ctx - Canvas上下文
 * @method resizeImage - 调整图像尺寸
 * @method convertToBase64 - 转换为Base64
 * @method convertToBlob - 转换为Blob
 * @method extractImageData - 提取图像数据
 * @method get_image_info - 获取图像信息
 * @method createThumbnail - 创建缩略图
 * @method compressImage - 压缩图像
 */