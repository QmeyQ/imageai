/**
 * UI工具模块 - 提供用户界面相关的工具函数和组件管理功能
 * 
 * 调用示例:
 * const uiTools = new UITools();
 * 
 * // 绑定拖放相关事件
 * uiTools.bindDropEvents();
 * 
 * // 绑定按钮事件
 * uiTools.bindButtonEvents({
 *   handleFileSelect: (e) => console.log('文件选择'),
 *   handleUpload: () => console.log('上传处理'),
 *   clearLocalImages: () => console.log('清空本地图片'),
 *   loadServerImages: () => console.log('加载服务器图片'),
 *   clearServerImages: () => console.log('清空服务器图片'),
 *   hideSelectedServerImages: () => console.log('隐藏选中图片'),
 *   deleteSelectedServerImages: () => console.log('删除选中图片'),
 *   showAllProcessedImages: () => console.log('显示所有处理图片')
 * });
 * 
 * // 绑定Prompt下拉功能
 * uiTools.bindPromptEvents();
 * 
 * // 绑定模型选择事件
 * uiTools.bindModelEvents({
 *   onModelChange: (model) => console.log('模型变化:', model),
 *   onOperationChange: (operation) => console.log('操作变化:', operation)
 * });
 * 
 * // 设置默认Prompt
 * uiTools.setDefaultPrompt();
 * 
 * // 处理拖放文件
 * const files = uiTools.handleDrop(event);
 * 
 * // 设置按钮状态
 * uiTools.setButtonState(button, true, '处理中...');
 * 
 * // 显示进度
 * uiTools.showProgress(50, '处理中...');
 * 
 * // 隐藏进度条
 * uiTools.hideProgress();
 * 
 * 属性说明:
 * - elements: UI元素集合
 * 
 * 方法列表:
 * - constructor(): 构造函数，初始化UI工具
 * - cacheElements(): 缓存DOM元素
 * - validateElements(): 验证必要的DOM元素
 * - initProgress(): 初始化进度条
 * - bindDropEvents(): 绑定拖放相关事件
 * - bindButtonEvents(callbacks): 绑定按钮事件
 * - bindPromptEvents(): 绑定Prompt下拉功能
 * - bindModelEvents(callbacks): 绑定模型选择事件
 * - setDefaultPrompt(): 设置默认Prompt
 * - preventDefaults(e): 阻止默认事件
 * - highlight(): 拖放区域高亮
 * - unhighlight(): 拖放区域取消高亮
 * - handleDrop(e): 处理拖放文件
 * - setButtonState(button, disabled, text): 设置按钮状态
 * - showProgress(percent, text): 显示进度
 * - hideProgress(): 隐藏进度条
 * - initServerView(): 初始化服务器视图
 * - clearContainer(container): 清空容器
 * - showEmptyLocalState(): 显示空的本地状态
 * - createLocalImageItem(blob, key, container): 创建本地图片项
 * - createServerImageItem(fileInfo, resultsData, onLoadCallback): 创建服务器图片项
 * - createStatusHtml(resultInfo): 创建状态HTML
 * - extractFilenameFromUrl(url): 从URL提取文件名
 * - formatFileSize(bytes): 格式化文件大小
 * - showNotification(message, type): 显示通知
 * - populateModelSelector(models): 填充模型选择器
 * - populateOperationSelector(operations): 填充操作选择器
 * - getSelectedModel(): 获取选中的模型
 * - getSelectedOperation(): 获取选中的操作
 * - renderModelParams(model): 渲染模型参数配置
 * - getModelParams(): 获取模型参数配置
 */
/**
 * UI工具类 - ui.js
 */
class UITools {
    constructor() {
        this.elements = this.cacheElements();
        this.validateElements();
        this.initProgress();
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        const elements = {
            dropArea: document.getElementById('dropArea'),
            fileInput: document.getElementById('fileInput'),
            loadLocalBtn: document.getElementById('loadLocalBtn'),
            uploadBtn: document.getElementById('uploadBtn'),
            clearLocalBtn: document.getElementById('clearLocalBtn'),
            localImages: document.getElementById('localImages'),
            serverImages: document.getElementById('serverImages'),
            loadServerBtn: document.getElementById('loadServerBtn'),
            clearServerBtn: document.getElementById('clearServerBtn'),
            progress: document.querySelector('.progress'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            promptInput: document.getElementById('promptInput'),
            promptDropdown: document.getElementById('promptDropdown'),
            hideSelectedBtn: document.getElementById('hideSelectedBtn'),
            deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
            showAllBtn: document.getElementById('showAllBtn'),
            modelSelector: document.getElementById('modelSelector'),
            operationSelector: document.getElementById('operationSelector'),
            modelParamsSection: document.getElementById('modelParamsSection'),
            modelParamsGrid: document.getElementById('modelParamsGrid')
        };
        
        // 调试信息：检查所有元素是否正确获取
        console.log('🔍 缓存的DOM元素:', elements);
        Object.keys(elements).forEach(key => {
            if (!elements[key]) {
                console.warn(`⚠️ 元素未找到: ${key}`);
            }
        });
        
        return elements;
    }

    /**
     * 验证必要的DOM元素
     */
    validateElements() {
        const missingElements = Object.keys(this.elements).filter(key => !this.elements[key]);
        if (missingElements.length > 0) {
            console.error('❌ 缺少必要的DOM元素:', missingElements);
            this.showNotification('页面初始化失败: 缺少必要元素', 'error');
            throw new Error('Missing required DOM elements');
        }
        console.log('✅ 所有DOM元素加载成功');
    }

    /**
     * 初始化进度条
     */
    initProgress() {
        if (this.elements.progress) {
            this.elements.progress.style.display = 'none';
        }
    }

    /**
     * 绑定拖放相关事件
     */
    bindDropEvents() {
        // 跟踪拖拽状态，避免闪烁
        let dragCounter = 0;
        
        // 将拖放事件绑定到整个文档
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragCounter++;
                if (dragCounter === 1) {
                    document.body.classList.add('drag-over');
                }
            }, false);
        });

        ['dragleave'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragCounter--;
                if (dragCounter <= 0) {
                    document.body.classList.remove('drag-over');
                    dragCounter = 0; // 确保计数器不会变为负数
                }
            }, false);
        });

        // 处理整个文档的drop事件
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter = 0; // 重置计数器
            document.body.classList.remove('drag-over');
            
            // 获取拖放的文件
            const files = Array.from(e.dataTransfer.files);
            
            // 如果有文件被拖放，触发文件处理
            if (files.length > 0 && window.imageProcessor) {
                console.log('📁 拖放文件数量:', files.length);
                window.imageProcessor.processFiles(files);
            } else {
                console.warn('⚠️ 没有检测到可处理的文件或imageProcessor未定义');
            }
        }, false);
    }

    /**
     * 绑定按钮事件
     */
    bindButtonEvents(callbacks) {
        const {
            loadLocalBtn,
            fileInput,
            uploadBtn,
            clearLocalBtn,
            loadServerBtn,
            clearServerBtn,
            hideSelectedBtn,
            deleteSelectedBtn,
            showAllBtn
        } = this.elements;
        
        // 调试信息：检查按钮元素是否存在
        console.log('🔍 按钮元素检查:', {
            loadLocalBtn: !!loadLocalBtn,
            fileInput: !!fileInput,
            uploadBtn: !!uploadBtn,
            clearLocalBtn: !!clearLocalBtn,
            loadServerBtn: !!loadServerBtn,
            clearServerBtn: !!clearServerBtn,
            hideSelectedBtn: !!hideSelectedBtn,
            deleteSelectedBtn: !!deleteSelectedBtn,
            showAllBtn: !!showAllBtn
        });

        if (loadLocalBtn) loadLocalBtn.addEventListener('click', () => fileInput.click());
        if (fileInput) fileInput.addEventListener('change', callbacks.handleFileSelect);
        if (uploadBtn) uploadBtn.addEventListener('click', callbacks.handleUpload);
        if (clearLocalBtn) clearLocalBtn.addEventListener('click', callbacks.clearLocalImages);
        if (loadServerBtn) loadServerBtn.addEventListener('click', callbacks.loadServerImages);
        if (clearServerBtn) clearServerBtn.addEventListener('click', callbacks.clearServerImages);
        if (hideSelectedBtn) hideSelectedBtn.addEventListener('click', callbacks.hideSelectedServerImages);
        if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', callbacks.deleteSelectedServerImages);

        if (showAllBtn) {
            showAllBtn.addEventListener('click', callbacks.showAllProcessedImages);
        }
        
        console.log('✅ 按钮事件绑定完成');
    }

    /**
     * 绑定Prompt下拉功能
     */
    bindPromptEvents() {
        const { promptInput, promptDropdown } = this.elements;
        
        // 检查元素是否存在
        if (!promptInput || !promptDropdown) {
            console.warn('⚠️ Prompt元素未找到');
            return;
        }

        promptInput.addEventListener('click', (e) => {
            e.stopPropagation();
            promptDropdown.classList.toggle('show');
        });

        // 点击预设选项
        const options = promptDropdown.querySelectorAll('.prompt-option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                promptInput.value = option.textContent;
                promptDropdown.classList.remove('show');
                console.log('📝 选择Prompt:', option.textContent);
            });
        });

        // 点击外部关闭下拉
        document.addEventListener('click', (e) => {
            if (!promptInput.contains(e.target) && !promptDropdown.contains(e.target)) {
                promptDropdown.classList.remove('show');
            }
        });

        // 输入时关闭下拉
        promptInput.addEventListener('input', () => {
            promptDropdown.classList.remove('show');
        });
    }

    /**
     * 绑定模型选择事件
     */
    bindModelEvents(callbacks) {
        const { modelSelector, operationSelector } = this.elements;
        
        // 模型选择变化时，更新操作列表
        modelSelector.addEventListener('change', (e) => {
            const selectedModel = e.target.value;
            if (selectedModel && callbacks.onModelChange) {
                callbacks.onModelChange(selectedModel);
            }
        });
        
        // 操作选择变化时的回调
        operationSelector.addEventListener('change', (e) => {
            const selectedOperation = e.target.value;
            if (selectedOperation && callbacks.onOperationChange) {
                callbacks.onOperationChange(selectedOperation);
            }
        });
    }

    /**
     * 设置默认Prompt
     */
    setDefaultPrompt() {
        const { promptInput, promptDropdown } = this.elements;
        const firstPromptOption = promptDropdown.querySelector('.prompt-option:first-child');
        if (firstPromptOption) {
            promptInput.value = firstPromptOption.textContent;
            console.log('📝 设置默认Prompt:', firstPromptOption.textContent);
        }
    }

    /**
     * 阻止默认事件
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * 拖放区域高亮
     */
    highlight(e) {
        this.preventDefaults(e);
        // 高亮整个页面
        document.body.classList.add('drag-over');
    }

    /**
     * 拖放区域取消高亮
     */
    unhighlight(e) {
        this.preventDefaults(e);
        // 取消高亮整个页面
        document.body.classList.remove('drag-over');
    }

    /**
     * 处理拖放文件
     */
    handleDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        return files;
    }

    /**
     * 设置按钮状态
     */
    setButtonState(button, disabled, text) {
        button.disabled = disabled;
        button.textContent = text;
    }

    /**
     * 显示进度
     */
    showProgress(percent, text = '') {
        const { progress, progressBar, progressText } = this.elements;
        if (progress) {
            progress.style.display = 'block';
            progressBar.style.width = `${percent}%`;
            progressText.textContent = text;
        }
    }

    /**
     * 隐藏进度条
     */
    hideProgress() {
        const { progress } = this.elements;
        if (progress) {
            progress.style.display = 'none';
        }
    }

    /**
     * 初始化服务器视图
     */
    initServerView() {
        const { serverImages } = this.elements;
        if (serverImages) {
            serverImages.innerHTML = `
                <div class="empty-state">
                    <p>暂无服务器图片</p>
                    <p>请先上传本地图片</p>
                </div>
            `;
        }
    }

    /**
     * 清空容器
     */
    clearContainer(container) {
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * 显示加载状态
     */
    showLoadingState(container) {
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>加载中...</p>
                </div>
            `;
        }
    }

    /**
     * 显示空的本地状态
     */
    showEmptyLocalState() {
        const { localImages } = this.elements;
        if (localImages) {
            localImages.innerHTML = `
                <div class="empty-state">
                    <p>暂无本地图片</p>
                    <p>请拖放图片文件或文件夹到上方区域</p>
                </div>
            `;
        }
    }

    /**
     * 创建本地图片项
     */
    createLocalImageItem(blob, key, container) {
        if (!container) return null;

        const item = document.createElement('div');
        item.className = 'image-item';
        item.dataset.key = key;

        const imgUrl = URL.createObjectURL(blob);
        item.innerHTML = `
            <div class="image-container">
                <img src="${imgUrl}" alt="${key}">
            </div>
            <div class="image-info">
                <div class="image-name">${key}</div>
                <div class="image-size">${this.formatFileSize(blob.size)}</div>
            </div>
            <div class="image-actions">
                <button class="action-btn delete-btn" title="删除此图片">🗑️ 删除</button>
            </div>
        `;

        container.appendChild(item);
        return item;
    }

    /**
     * 创建服务器图片项
     */
    createServerImageItem(fileInfo, resultsData, onLoadCallback) {
        const { serverImages } = this.elements;
        if (!serverImages) return null;

        const item = document.createElement('div');
        item.className = 'image-item';
        item.dataset.name = fileInfo.name;

        // 检查是否有匹配的结果数据
        let resultInfo = null;
        if (resultsData) {
            // 尝试匹配结果数据
            Object.keys(resultsData).forEach(url => {
                const resultData = resultsData[url];
                const filename = this.extractFilenameFromUrl(url);
                if (filename === fileInfo.name) {
                    resultInfo = resultData;
                }
            });
        }

        // 设置初始状态类
        if (resultInfo) {
            item.classList.add('has-result');
            if (resultInfo.status === 'SUCCEEDED') {
                item.classList.add('success');
            } else if (resultInfo.status === 'FAILED') {
                item.classList.add('failed');
            } else {
                item.classList.add('processing');
            }
        }

        // 创建图片容器
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';

        // 创建图片元素
        const img = document.createElement('img');
        img.src = fileInfo.url;
        img.alt = fileInfo.name;

        // 设置图片加载错误处理
        img.onerror = function() {
            this.parentElement.innerHTML = '<div class="image-placeholder error"><div class="placeholder-icon">❌</div><div class="placeholder-text">图片加载失败</div></div>';
        };

        // 设置图片加载完成处理
        if (onLoadCallback && typeof onLoadCallback === 'function') {
            img.onload = function() {
                onLoadCallback();
            };
        }

        imageContainer.appendChild(img);

        // 构建其他元素
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'image-checkbox';
        checkboxDiv.innerHTML = `<input type="checkbox" class="image-select-checkbox" id="checkbox-${fileInfo.name.replace(/[^\w]/g, '-')}">`;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'image-info';
        infoDiv.innerHTML = `
            <div class="image-name">${fileInfo.name}</div>
            <div class="image-size">${this.formatFileSize(fileInfo.size)}</div>
            ${resultInfo ? this.createStatusHtml(resultInfo) : ''}
        `;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'image-actions';
        actionsDiv.innerHTML = '<button class="action-btn delete-server-btn" title="删除此图片">🗑️ 删除</button>';

        // 组装所有元素
        item.appendChild(checkboxDiv);
        item.appendChild(imageContainer);
        item.appendChild(infoDiv);
        item.appendChild(actionsDiv);

        serverImages.appendChild(item);
        return item;
    }

    /**
     * 创建状态HTML
     */
    createStatusHtml(resultInfo) {
        let statusHtml = '';
        
        if (resultInfo.status === 'SUCCEEDED') {
            statusHtml = `
                <div class="image-status success">
                    <span class="status-success">处理成功</span>
                    <span class="task-id">任务ID: ${resultInfo.taskId || 'N/A'}</span>
                </div>
            `;
        } else if (resultInfo.status === 'FAILED') {
            statusHtml = `
                <div class="image-status failed">
                    <span class="status-failed">处理失败</span>
                    <span class="error-details">${resultInfo.errorMessage || '未知错误'}</span>
                </div>
            `;
        } else {
            statusHtml = `
                <div class="image-status processing">
                    <span class="status-processing">处理中</span>
                    <span class="task-id">任务ID: ${resultInfo.taskId || 'N/A'}</span>
                </div>
            `;
        }
        
        return statusHtml;
    }

    /**
     * 从URL提取文件名
     */
    extractFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            return pathname.split('/').pop();
        } catch (e) {
            // 如果不是有效的URL，直接返回最后一部分
            return url.split('/').pop();
        }
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 移除现有的通知
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 显示通知
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 填充模型选择器
     */
    populateModelSelector(models) {
        const { modelSelector } = this.elements;
        if (!modelSelector) return;

        // 清空现有选项
        modelSelector.innerHTML = '';

        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择模型';
        modelSelector.appendChild(defaultOption);

        // 添加模型选项
        if (models && Array.isArray(models)) {
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id || model.name;
                option.textContent = model.name || model.id;
                option.title = model.description || '';
                modelSelector.appendChild(option);
            });
        }

        // 如果有模型，自动选择第一个
        if (models && models.length > 0) {
            modelSelector.value = models[0].id || models[0].name;
        }
    }

    /**
     * 填充操作选择器
     */
    populateOperationSelector(operations) {
        const { operationSelector } = this.elements;
        if (!operationSelector) return;

        // 清空现有选项
        operationSelector.innerHTML = '';

        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择操作';
        operationSelector.appendChild(defaultOption);

        // 添加操作选项
        if (operations && Array.isArray(operations)) {
            operations.forEach(op => {
                const option = document.createElement('option');
                option.value = op;
                option.textContent = op;
                operationSelector.appendChild(option);
            });
        }

        // 如果有操作，自动选择第一个
        if (operations && operations.length > 0) {
            operationSelector.value = operations[0];
        }
    }

    /**
     * 获取选中的模型
     */
    getSelectedModel() {
        const { modelSelector } = this.elements;
        return modelSelector ? modelSelector.value : null;
    }

    /**
     * 获取选中的操作
     */
    getSelectedOperation() {
        const { operationSelector } = this.elements;
        return operationSelector ? operationSelector.value : null;
    }
    
    /**
     * 渲染模型参数配置
     */
    renderModelParams(model) {
        const { modelParamsSection, modelParamsGrid } = this.elements;
        
        // 清空现有参数
        if (modelParamsGrid) {
            modelParamsGrid.innerHTML = '';
        }
        
        // 如果没有模型或模型没有参数Schema，则隐藏参数配置区域
        if (!model || !model.paramsSchema) {
            if (modelParamsSection) {
                modelParamsSection.style.display = 'none';
            }
            return;
        }
        
        // 显示参数配置区域
        if (modelParamsSection) {
            modelParamsSection.style.display = 'block';
        }
        
        // 根据参数Schema生成参数配置项，但排除prompt和images参数
        Object.keys(model.paramsSchema).forEach(paramName => {
            // 跳过prompt参数，因为它已经在下拉输入框中了
            if (paramName === 'prompt') return;
            
            const paramConfig = model.paramsSchema[paramName];
            
            // 跳过images参数，因为它会自动填充
            if (paramName === 'images' || paramConfig.autoFill) return;
            
            this._createParamItem(paramName, paramConfig, modelParamsGrid);
        });
    }
    
    /**
     * 创建参数配置项
     */
    _createParamItem(paramName, paramConfig, container) {
        if (!container) return;
        
        const paramItem = document.createElement('div');
        paramItem.className = 'param-item';
        
        const label = document.createElement('label');
        label.textContent = paramConfig.description || paramName;
        label.setAttribute('for', `param-${paramName}`);
        
        let input;
        
        // 根据参数类型创建不同的输入控件
        if (paramConfig.type === 'boolean') {
            // 布尔类型，创建复选框
            input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `param-${paramName}`;
            input.name = paramName;
            
            // 设置默认值
            if (paramConfig.default !== undefined) {
                input.checked = paramConfig.default;
            }
        } else if (paramConfig.enum) {
            // 枚举类型，创建下拉框
            input = document.createElement('select');
            input.id = `param-${paramName}`;
            input.name = paramName;
            
            // 添加枚举选项
            paramConfig.enum.forEach((option, index) => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                input.appendChild(optionElement);
                
                // 如果有默认值，选中默认值；否则选中第一个
                if (paramConfig.default && option === paramConfig.default) {
                    optionElement.selected = true;
                } else if (!paramConfig.default && index === 0) {
                    optionElement.selected = true;
                }
            });
        } else if (paramConfig.type === 'number') {
            // 数字类型，创建数字输入框
            input = document.createElement('input');
            input.type = 'number';
            input.id = `param-${paramName}`;
            input.name = paramName;
            
            // 设置数字范围
            if (paramConfig.min !== undefined) {
                input.min = paramConfig.min;
            }
            if (paramConfig.max !== undefined) {
                input.max = paramConfig.max;
            }
            // 设置默认值
            if (paramConfig.default !== undefined) {
                input.value = paramConfig.default;
            }
        } else {
            // 字符串类型，创建文本输入框
            input = document.createElement('input');
            input.type = 'text';
            input.id = `param-${paramName}`;
            input.name = paramName;
            
            // 设置默认值
            if (paramConfig.default !== undefined) {
                input.value = paramConfig.default;
            }
        }
        
        paramItem.appendChild(label);
        paramItem.appendChild(input);
        container.appendChild(paramItem);
    }
    
    /**
     * 获取模型参数配置
     */
    getModelParams() {
        const { modelParamsGrid } = this.elements;
        if (!modelParamsGrid) return {};
        
        const params = {};
        const inputs = modelParamsGrid.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            const name = input.name;
            let value = input.value;
            
            // 处理 checkbox 类型
            if (input.type === 'checkbox') {
                params[name] = input.checked;
                return;
            }
            
            // 跳过空值（但保留数字0）
            if (value === '' && input.type !== 'number') return;
            
            // 根据输入类型转换值
            if (input.type === 'number') {
                // 如果值为空字符串，设置为0或跳过
                if (value === '') {
                    // 检查是否有默认值配置
                    const paramConfig = this._getCurrentParamConfig(name);
                    if (paramConfig && paramConfig.default !== undefined) {
                        value = paramConfig.default;
                    } else {
                        return; // 没有默认值且为空，跳过
                    }
                } else {
                    value = parseFloat(value);
                }
            }
            
            params[name] = value;
        });
        
        return params;
    }
    
    /**
     * 获取当前参数的配置信息
     */
    _getCurrentParamConfig(paramName) {
        // 从缓存中获取当前选中模型的参数配置
        const modelListCache = localStorage.getItem('modelListCache');
        if (!modelListCache) return null;
        
        try {
            const cacheData = JSON.parse(modelListCache);
            const selectedModelId = this.getSelectedModel();
            
            if (cacheData.data && selectedModelId) {
                const selectedModel = cacheData.data.find(model => 
                    model.id === selectedModelId || model.name === selectedModelId
                );
                
                if (selectedModel && selectedModel.paramsSchema && selectedModel.paramsSchema[paramName]) {
                    return selectedModel.paramsSchema[paramName];
                }
            }
        } catch (e) {
            console.warn('解析模型缓存数据失败:', e);
        }
        
        return null;
    }

}
