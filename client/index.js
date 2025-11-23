/**
 * 图片处理结果管理模块 - 重构版本
 * 
 * 该模块负责管理图片处理的整个流程，包括本地图片管理、服务器图片加载、
 * AI处理结果展示等功能。采用工具类架构，职责分离清晰。
 * 
 * 主要功能：
 * - 本地图片选择和管理
 * - 服务器图片加载和显示
 * - AI模型选择和操作类型选择
 * - 图片上传和处理
 * - 处理结果展示和管理
 * - 图片隐藏和删除功能
 * 
 * @module index
 * @class ImageProcessor - 图片处理器
 * @class UITools - UI工具类
 * @class StateManager - 状态管理器
 * @class IDBStorage - IndexedDB存储
 * @property {IDBStorage} storage - IndexedDB存储实例
 * @property {UITools} uiTools - UI工具类实例
 * @property {ImageProcessor} imageProcessor - 图片处理器实例
 * @property {StateManager} stateManager - 状态管理器实例
 * @property {Client} client - 客户端实例
 * @method initEvents - 初始化所有事件监听器
 * @method loadModelList - 加载模型列表
 * @method handleModelChange - 处理模型选择变化
 * @method handleOperationChange - 处理操作选择变化
 * @method loadModelOperations - 加载模型支持的操作
 * @method handleUpload - 处理上传操作
 * @method clearLocalImages - 清空本地图片
 * @method loadServerImages - 加载服务器图片
 * @method displayServerImages - 显示服务器图片
 * @method continueDisplayImages - 继续显示图片
 * @method bindServerImageDeleteEvent - 绑定服务器图片删除事件
 * @method bindImageCheckboxEvent - 绑定图片复选框事件
 * @method processResultsData - 处理results数据
 * @method updateImageItemStatus - 更新图片项状态显示
 * @method getValidProcessedImageUrl - 获取有效的处理后图片URL
 * @method extractErrorCode - 从结果数据中提取错误代码
 * @method createResultImageItem - 创建结果图片项
 * @method updateHiddenImagesStatus - 更新隐藏图片状态
 * @method applyHiddenImagesStatus - 应用隐藏图片状态
 * @method hideSelectedServerImages - 隐藏选中的服务器图片
 * @method deleteSelectedServerImages - 删除选中的服务器图片
 * @method showAllProcessedImages - 显示所有处理过的图片
 * @method clearServerImages - 清空服务器图片
 * @method initAuthUI - 初始化认证UI
 */

// 初始化工具类实例
const storage = new IDBStorage('ImageStorage', 1);
const uiTools = new UITools();
const imageProcessor = new ImageProcessor(storage, uiTools);
const stateManager = new StateManager(storage);

// 将imageProcessor设置为全局可访问
window.imageProcessor = imageProcessor;

// 在DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    console.log('🏗️ DOM加载完成，初始化图片管理模块');
    
    // 确保服务模块已准备就绪
    if (document.readyState === 'loading') {
        document.addEventListener('servicesReady', initApp);
    } else {
        // 检查服务是否已准备就绪
        if (window.authService && window.quotaService && window.dsAdapter) {
            initApp();
        } else {
            // 等待服务准备就绪
            window.addEventListener('servicesReady', initApp);
        }
    }
    
    function initApp() {
        console.log('🔧 开始初始化应用');
        
        // 初始化数据库
        storage.init((db, error) => {
            console.log('🔧 IndexedDB初始化回调执行');
            if (error) {
                console.error('❌ IndexedDB初始化失败:', error);
                uiTools.showNotification('本地存储初始化失败: ' + error.message, 'error');
                // 即使数据库初始化失败，也要继续初始化其他组件
                console.log('🔄 使用备用初始化流程');
                initializeAppWithoutDB();
                return;
            }
            
            console.log('✅ IndexedDB初始化成功');
        });
        
            initializeApp();
    }

    /**
     * 当数据库初始化失败时的备用初始化函数
     */
    function initializeAppWithoutDB() {
        console.log('🔧 开始备用初始化流程');
        // 创建一个模拟的存储对象
        const mockStorage = {
            init: (callback) => {
                console.log('🔧 模拟存储初始化');
                callback(null);
            },
            getFile: (key, callback) => {
                console.log('🔧 模拟getFile调用');
                callback(null);
            },
            saveFile: (key, file, callback) => {
                console.log('🔧 模拟saveFile调用');
                callback(false);
            },
            deleteFile: (key, callback) => {
                console.log('🔧 模拟deleteFile调用');
                callback(false);
            },
            get: (key, callback) => {
                console.log('🔧 模拟get调用');
                callback(null);
            },
            set: (key, value, callback) => {
                console.log('🔧 模拟set调用');
                callback(false);
            },
            delete: (key, callback) => {
                console.log('🔧 模拟delete调用');
                callback(false);
            },
            getKeys: (callback) => {
                console.log('🔧 模拟getKeys调用');
                callback({ dataKeys: [], fileKeys: [] });
            },
            clear: (callback) => {
                console.log('🔧 模拟clear调用');
                callback(false);
            }
        };
        
        // 初始化客户端
        console.log('🔧 初始化客户端');
        const client = new Client({ net: window.Net });
        window.client = client; // 确保全局可访问

        // 初始化认证UI
        console.log('🔧 初始化认证UI');
        initAuthUI();

        // 事件回调函数集合
        console.log('🔧 设置事件回调函数');
        const callbacks = {
            handleFileSelect: () => {
                console.log('🔧 handleFileSelect回调执行');
                const files = Array.from(uiTools.elements.fileInput.files);
                // 使用模拟存储
                imageProcessor.processFiles(files);
                uiTools.elements.fileInput.value = ''; // 重置input
            },
            
            handleUpload: () => {
                console.log('🔧 handleUpload回调执行');
                handleUpload(client);
            },
            
            clearLocalImages: () => {
                console.log('🔧 clearLocalImages回调执行');
                clearLocalImages();
            },
            
            loadServerImages: () => {
                console.log('🔧 loadServerImages回调执行');
                loadServerImages(client);
            },
            
            clearServerImages: () => {
                console.log('🔧 clearServerImages回调执行');
                clearServerImages(client);
            },
            
            hideSelectedServerImages: () => {
                console.log('🔧 hideSelectedServerImages回调执行');
                hideSelectedServerImages();
            },
            
            deleteSelectedServerImages: () => {
                console.log('🔧 deleteSelectedServerImages回调执行');
                deleteSelectedServerImages(client);
            },
            
            showAllProcessedImages: () => {
                console.log('🔧 showAllProcessedImages回调执行');
                showAllProcessedImages();
            },
            
            // 模型选择相关回调
            onModelChange: (modelId) => {
                console.log('🔧 onModelChange回调执行:', modelId);
                handleModelChange(modelId);
            },
            
            onOperationChange: (operation) => {
                console.log('🔧 onOperationChange回调执行:', operation);
                handleOperationChange(operation);
            }
        };

        // 初始化事件监听
        console.log('🔧 初始化事件监听');
        initEvents(callbacks);

        // 初始化数据加载（使用模拟存储）
        console.log('🔧 初始化数据加载');
        imageProcessor.loadStoredImages();
        uiTools.initServerView();
        stateManager.loadHiddenImagesStatus();

        // 设置默认Prompt
        console.log('🔧 设置默认Prompt');
        uiTools.setDefaultPrompt();

        // 加载模型列表
        console.log('🔧 加载模型列表');
        loadModelList();

        console.log('🎉 图片管理模块初始化完成（无数据库）');
    }

    /**
     * 正常初始化函数
     */
    function initializeApp() {
        console.log('🔧 开始正常初始化流程');
        // 初始化客户端
        const client = new Client({ net: window.Net });
        window.client = client; // 确保全局可访问

        // 初始化认证UI
        initAuthUI();

        // 事件回调函数集合
        const callbacks = {
            handleFileSelect: () => {
                console.log('🔧 handleFileSelect回调执行');
                const files = Array.from(uiTools.elements.fileInput.files);
                imageProcessor.processFiles(files);
                uiTools.elements.fileInput.value = ''; // 重置input
            },
            
            handleUpload: () => {
                console.log('🔧 handleUpload回调执行');
                handleUpload(client);
            },
            
            clearLocalImages: () => {
                console.log('🔧 clearLocalImages回调执行');
                clearLocalImages();
            },
            
            loadServerImages: () => {
                console.log('🔧 loadServerImages回调执行');
                loadServerImages(client);
            },
            
            clearServerImages: () => {
                console.log('🔧 clearServerImages回调执行');
                clearServerImages(client);
            },
            
            hideSelectedServerImages: () => {
                console.log('🔧 hideSelectedServerImages回调执行');
                hideSelectedServerImages();
            },
            
            deleteSelectedServerImages: () => {
                console.log('🔧 deleteSelectedServerImages回调执行');
                deleteSelectedServerImages(client);
            },
            
            showAllProcessedImages: () => {
                console.log('🔧 showAllProcessedImages回调执行');
                showAllProcessedImages();
            },
            
            // 模型选择相关回调
            onModelChange: (modelId) => {
                console.log('🔧 onModelChange回调执行:', modelId);
                handleModelChange(modelId);
            },
            
            onOperationChange: (operation) => {
                console.log('🔧 onOperationChange回调执行:', operation);
                handleOperationChange(operation);
            }
        };

        // 初始化事件监听
        console.log('🔧 初始化事件监听');
        initEvents(callbacks);

        // 初始化数据加载
        console.log('🔧 初始化数据加载');
        imageProcessor.loadStoredImages();
        uiTools.initServerView();
        stateManager.loadHiddenImagesStatus();

        // 设置默认Prompt
        console.log('🔧 设置默认Prompt');
        uiTools.setDefaultPrompt();

        // 加载模型列表
        console.log('🔧 加载模型列表');
        loadModelList();

        console.log('🎉 图片管理模块初始化完成');
    }

    /**
     * 初始化所有事件监听器
     */
    function initEvents(callbacks) {
        console.log('🔗 初始化事件监听器');
        
        // 确保UI工具已正确初始化
        if (!uiTools || !uiTools.elements) {
            console.error('❌ UI工具未正确初始化');
            return;
        }
        
        // 检查必要的元素是否存在
        const requiredElements = [
            'dropArea', 'fileInput', 'loadLocalBtn', 'uploadBtn', 
            'clearLocalBtn', 'loadServerBtn', 'clearServerBtn',
            'hideSelectedBtn', 'deleteSelectedBtn', 'showAllBtn',
            'modelSelector', 'operationSelector', 'promptInput', 'promptDropdown'
        ];
        
        const missingElements = requiredElements.filter(key => !uiTools.elements[key]);
        if (missingElements.length > 0) {
            console.warn('⚠️ 缺少必要的UI元素:', missingElements);
        }

        try {
            uiTools.bindDropEvents();
            uiTools.bindButtonEvents(callbacks);
            uiTools.bindPromptEvents();
            uiTools.bindModelEvents(callbacks);

            // 拖放事件已在ui.js的bindDropEvents方法中处理，此处不再重复绑定

            console.log('✅ 所有事件监听器初始化完成');
        } catch (error) {
            console.error('❌ 事件监听器初始化失败:', error);
        }
    }

    /**
     * 加载模型列表
     */
    function loadModelList() {
        console.log('🤖 开始加载模型列表...');
        
        // 显示加载状态
        uiTools.elements.modelSelector.innerHTML = '<option value="">加载中...</option>';
        
        // 首先从服务器获取版本信息，用于版本比对
        window.Net.getModels((error, response) => {
            if (error) {
                console.error('❌ 获取模型列表失败:', error);
                
                // 如果网络请求失败，尝试使用缓存
                storage.get('modelListCache', (cachedData) => {
                    if (cachedData && cachedData.data) {
                        console.log('🔄 网络请求失败，使用缓存数据');
                        uiTools.populateModelSelector(cachedData.data);
                        
                        const defaultModel = cachedData.data[0];
                        if (defaultModel) {
                            loadModelOperations(defaultModel.id || defaultModel.name);
                            uiTools.renderModelParams(defaultModel);
                            localStorage.setItem('modelListCache', JSON.stringify(cachedData));
                        }
                    } else {
                        uiTools.showNotification('获取模型列表失败: ' + error.message, 'error');
                        uiTools.elements.modelSelector.innerHTML = '<option value="">加载失败</option>';
                    }
                });
                return;
            }
            
            if (!response.success || !response.data) {
                uiTools.elements.modelSelector.innerHTML = '<option value="">无可用模型</option>';
                return;
            }
            
            const serverVersion = response.version || '1.0.0';
            console.log('✅ 获取模型列表成功，服务器版本:', serverVersion);
            
            // 检查缓存版本
            storage.get('modelListCache', (cachedData) => {
                let shouldUpdateCache = true;
                
                if (cachedData && cachedData.version === serverVersion && cachedData.data) {
                    // 版本一致，使用缓存
                    console.log('✅ 缓存版本一致 (' + serverVersion + ')，使用缓存数据');
                    uiTools.populateModelSelector(cachedData.data);
                    shouldUpdateCache = false;
                    
                    const defaultModel = cachedData.data[0];
                    if (defaultModel) {
                        loadModelOperations(defaultModel.id || defaultModel.name);
                        uiTools.renderModelParams(defaultModel);
                        localStorage.setItem('modelListCache', JSON.stringify(cachedData));
                    }
                } else {
                    // 版本不一致或无缓存，使用服务器数据
                    if (cachedData && cachedData.version) {
                        console.log('🔄 缓存版本 (' + cachedData.version + ') 与服务器版本 (' + serverVersion + ') 不一致，更新缓存');
                    } else {
                        console.log('🆕 无缓存数据，使用服务器数据');
                    }
                    
                    uiTools.populateModelSelector(response.data);
                    
                    const defaultModel = response.data[0];
                    if (defaultModel) {
                        loadModelOperations(defaultModel.id || defaultModel.name);
                        uiTools.renderModelParams(defaultModel);
                    }
                }
                
                // 更新缓存（如果需要）
                if (shouldUpdateCache) {
                    const cacheData = {
                        data: response.data,
                        version: serverVersion,
                        timestamp: Date.now()
                    };
                    storage.set('modelListCache', cacheData, (success) => {
                        if (success) {
                            console.log('💾 模型列表已缓存，版本:', serverVersion);
                            localStorage.setItem('modelListCache', JSON.stringify(cacheData));
                        } else {
                            console.warn('⚠️ 模型列表缓存失败');
                        }
                    });
                }
            });
        });
    }

    /**
     * 处理模型选择变化
     */
    function handleModelChange(modelId) {
        console.log('🔄 模型选择变化:', modelId);
        
        // 清空操作选择器
        uiTools.elements.operationSelector.innerHTML = '<option value="">加载中...</option>';
        
        // 获取模型详细信息
        storage.get('modelListCache', (cachedData) => {
            let selectedModel = null;
            if (cachedData && cachedData.data) {
                selectedModel = cachedData.data.find(model => 
                    model.id === modelId || model.name === modelId
                );
            }
            
            // 渲染模型参数配置
            uiTools.renderModelParams(selectedModel);
            // 保存缓存数据到localStorage供其他函数使用
            if (cachedData) {
                localStorage.setItem('modelListCache', JSON.stringify(cachedData));
            }
        });
        
        // 加载模型支持的操作
        loadModelOperations(modelId);
    }

    /**
     * 处理操作选择变化
     */
    function handleOperationChange(operation) {
        console.log('🔄 操作选择变化:', operation);
        // 这里可以添加操作变化后的处理逻辑
    }

    /**
     * 加载模型支持的操作
     */
    function loadModelOperations(modelId) {
        if (!modelId) return;
        
        console.log('⚙️ 开始加载模型操作列表:', modelId);
        
        // 显示加载状态
        uiTools.elements.operationSelector.innerHTML = '<option value="">加载中...</option>';
        
        // 构建缓存键
        const cacheKey = `modelOperations_${modelId}`;
        
        // 首先尝试从缓存获取
        storage.get(cacheKey, (cachedData) => {
            if (cachedData && cachedData.data && cachedData.timestamp) {
                // 检查缓存是否过期（5分钟内有效）
                const now = Date.now();
                const cacheAge = now - cachedData.timestamp;
                const cacheExpiry = 5 * 60 * 1000; // 5分钟
                
                if (cacheAge < cacheExpiry) {
                    console.log('✅ 使用缓存的模型操作列表');
                    uiTools.populateOperationSelector(cachedData.data);
                    return;
                } else {
                    console.log('🕒 操作列表缓存已过期，重新获取');
                }
            } else {
                console.log('🕒 无有效操作列表缓存，重新获取');
            }
            
            // 从服务器获取模型操作列表
            window.Net.getOperations(modelId, (error, response) => {
                if (error) {
                    console.error('❌ 获取模型操作列表失败:', error);
                    uiTools.showNotification('获取模型操作列表失败: ' + error.message, 'error');
                    uiTools.elements.operationSelector.innerHTML = '<option value="">加载失败</option>';
                    
                    // 如果有缓存数据，即使过期也尝试使用
                    if (cachedData && cachedData.data) {
                        console.log('🔄 使用过期缓存数据');
                        uiTools.populateOperationSelector(cachedData.data);
                    }
                    return;
                }
                
                console.log('✅ 获取模型操作列表成功:', response);
                
                // 填充操作选择器
                if (response.success && response.data && response.data.operations) {
                    uiTools.populateOperationSelector(response.data.operations);
                    
                    // 缓存数据到IndexedDB
                    const cacheData = {
                        data: response.data.operations,
                        modelId: modelId,
                        timestamp: Date.now()
                    };
                    storage.set(cacheKey, cacheData, (success) => {
                        if (success) {
                            console.log('💾 模型操作列表已缓存');
                        } else {
                            console.warn('⚠️ 模型操作列表缓存失败');
                        }
                    });
                } else {
                    uiTools.elements.operationSelector.innerHTML = '<option value="">无可用操作</option>';
                }
            });
        });
    }

    /**
     * 处理上传操作
     */
    function handleUpload(client) {
        const { promptInput, uploadBtn, modelSelector, operationSelector } = uiTools.elements;
        const prompt = promptInput.value.trim();
        const model = modelSelector.value;
        const operation = operationSelector.value;
        
        if (!prompt) {
            uiTools.showNotification('Prompt不能为空，请先输入或选择提示词', 'error');
            return;
        }
        
        if (!model) {
            uiTools.showNotification('请选择AI模型', 'error');
            return;
        }
        
        if (!operation) {
            uiTools.showNotification('请选择操作类型', 'error');
            return;
        }

        uiTools.showProgress(20, '正在保存配置...');
        
        // 获取模型参数配置
        const parameters = uiTools.getModelParams();
        
        // 保存配置到服务器
        const config = { 
            prompt,
            model,
            operation,
            parameters
        };
        
        window.Net.post('/config', config, (promptError, result) => {
            if (promptError) {
                uiTools.showNotification(`保存配置失败: ${promptError.message}`, 'error');
                return;
            }
            
            // 构建模型配置用于上传
            const modelConfig = {
                prompt: prompt,
                model: model,
                operation: operation,
                parameters: parameters
            };
            
            storage.getKeys((allKeys) => {
                const keys = allKeys.fileKeys;

                if (keys.length === 0) {
                    uiTools.showNotification('没有可上传的图片', 'info');
                    return;
                }

                uiTools.setButtonState(uploadBtn, true, '上传中...');

                client.uploadFromStorage(storage, keys, (error, result) => {
                    if (error) {
                        uiTools.showNotification(`上传失败: ${error.message}`, 'error');
                        uiTools.setButtonState(uploadBtn, false, '上传所有图片');
                        return;
                    }

                    // 清理本地文件
                    client.cleanup(storage, keys, (cleanError) => {
                        if (!cleanError) {
                            uiTools.showNotification(`成功上传 ${keys.length} 张图片`, 'success');
                            loadServerImages(client);
                            imageProcessor.loadStoredImages();
                        }
                        uiTools.setButtonState(uploadBtn, false, '上传所有图片');
                        uiTools.hideProgress();
                    });
                }, modelConfig); // 传递模型配置
            });
        });
    }

    /**
     * 清空本地图片
     */
    function clearLocalImages() {
        if (!confirm('确定要清空所有本地图片吗？')) return;

        storage.getKeys((keys) => {
            const fileKeys = keys.fileKeys.filter(key => key.startsWith('image_'));

            if (fileKeys.length === 0) {
                uiTools.showEmptyLocalState();
                uiTools.showNotification('本地图片已清空');
                return;
            }

            let deletedCount = 0;

            fileKeys.forEach((key) => {
                storage.deleteFile(key, () => {
                    deletedCount++;
                    if (deletedCount === fileKeys.length) {
                        storage.set('currentImageIndex', 0, () => {
                            imageProcessor.loadStoredImages();
                            uiTools.showNotification('本地图片已清空');
                        });
                    }
                });
            });
        });
    }

    /**
     * 加载服务器图片
     */
    function loadServerImages(client) {
        uiTools.setButtonState(uiTools.elements.loadServerBtn, true, '加载中...');
        uiTools.showProgress(0, '正在获取图片列表...');

        window.Net.list((error, list) => {
            if (error) {
                uiTools.showNotification('加载失败: ' + error.message, 'error');
                uiTools.elements.serverImages.innerHTML = `
                    <div class="empty-state">
                        <p>加载失败</p>
                        <p>请检查网络连接</p>
                    </div>
                `;
                uiTools.setButtonState(uiTools.elements.loadServerBtn, false, '加载服务器图片');
                uiTools.hideProgress();
                return;
            }

            // 列表获取完成，开始加载图片
            uiTools.showProgress(30, '正在加载图片...');
            displayServerImages(list.files, () => {
                // 应用隐藏状态
                applyHiddenImagesStatus();

                // 所有图片加载完成
                uiTools.showNotification('加载完成');
                uiTools.setButtonState(uiTools.elements.loadServerBtn, false, '加载服务器图片');
                uiTools.showProgress(100, '加载完成');
                setTimeout(() => uiTools.hideProgress(), 1000);
            });
        });
    }

    /**
     * 显示服务器图片 - 基于实际图片加载进度，包含results处理
     */
    function displayServerImages(images, callback) {
        console.group('🔄 displayServerImages - 显示服务器图片');
        console.log('📋 开始处理服务器图片，数量:', images.length);

        // 首先请求/config获取配置和results数据
        window.Net.post(window.Net.CFG, {}, (error, response) => {
            if (error) {
                console.error('❌ 获取配置失败:', error);
                uiTools.showNotification('获取配置失败: ' + error.message, 'error');
                // 继续显示图片，但没有results数据
                continueDisplayImages(images, {}, () => {
                    // 图片加载完成后，处理结果数据
                    processResultsData({});
                    callback();
                });
                return;
            }

            console.log('✅ 获取配置成功:', response);

            // 检查response结构，提取results数据
            let resultsData = {};
            if (response && response.data && response.data.results) {
                resultsData = response.data.results;
                console.log('📊 找到results数据，条目数:', Object.keys(resultsData).length);
            } else {
                console.log('ℹ️ 未找到results数据');
            }

            // 继续显示图片，传入results数据用于匹配
            continueDisplayImages(images, resultsData, () => {
                // 图片加载完成后，处理结果数据
                processResultsData(resultsData);
                callback();
            });
        });
    }

    /**
     * 继续显示图片，使用results数据进行状态匹配
     */
    function continueDisplayImages(images, resultsData, callback) {
        uiTools.clearContainer(uiTools.elements.serverImages);

        // 清除结果区域
        const resultsContainer = document.getElementById('resultImages');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<h3>处理结果</h3>';
        }

        if (images.length === 0) {
            uiTools.elements.serverImages.innerHTML = `
                <div class="empty-state">
                    <p>暂无服务器图片</p>
                </div>
            `;
            callback();
            return;
        }

        let loadedCount = 0;
        const totalImages = images.length;

        // 更新进度函数
        const updateProgress = () => {
            loadedCount++;
            const progress = 30 + (70 * loadedCount / totalImages);
            uiTools.showProgress(Math.min(progress, 99), `加载图片中... (${loadedCount}/${totalImages})`);

            if (loadedCount === totalImages) {
                console.log('✅ 所有服务器图片加载完成');
                callback();
            }
        };

        // 创建图片项，传入results数据用于状态匹配
        for (let i = 0; i < images.length; i++) {
            const item = uiTools.createServerImageItem(images[i], resultsData, updateProgress);
            
            // 绑定服务器图片删除事件
            bindServerImageDeleteEvent(item, images[i].name);
            
            // 绑定复选框事件
            bindImageCheckboxEvent(item);
        }
    }

    /**
     * 绑定服务器图片删除事件
     */
    function bindServerImageDeleteEvent(item, imageName) {
        const deleteBtn = item.querySelector('.delete-server-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                deleteServerImage(imageName, item);
            });
        }
    }

    /**
     * 绑定图片复选框事件
     */
    function bindImageCheckboxEvent(item) {
        const checkbox = item.querySelector('.image-select-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', function () {
                updateHiddenImagesStatus();
            });
        }
    }

    /**
     * 处理results数据，更新图片状态
     */
    function processResultsData(resultsData) {
        console.group('🔄 processResultsData - 处理results数据');
        console.log('📋 开始处理results数据，总条目数:', Object.keys(resultsData).length);

        if (!resultsData || typeof resultsData !== 'object') {
            console.warn('❌ 无效的results数据');
            console.groupEnd();
            return false;
        }

        try {
            // 存储results数据到localStorage，用于后续获取
            localStorage.setItem('processingResults', JSON.stringify(resultsData));
            console.log('💾 已保存results数据到localStorage');

            // 获取所有服务器图片项和结果图片项
            const serverImageItems = document.querySelectorAll('#serverImages .image-item');
            const resultImageItems = document.querySelectorAll('#resultImages .image-item');
            const allImageItems = [...serverImageItems, ...resultImageItems];

            console.log(`🔍 找到 ${serverImageItems.length} 个服务器图片项, ${resultImageItems.length} 个结果图片项`);

            const processedImagesMap = JSON.parse(localStorage.getItem('processedImages') || '{}');
            console.log(`📊 现有processedImages记录数: ${Object.keys(processedImagesMap).length}`);

            let updatedCount = 0;
            let createdCount = 0;
            let matchedCount = 0;

            // 处理每个result
            Object.keys(resultsData).forEach((rawUrl, index) => {
                // 剥离URL中的反引号
                const url = rawUrl.replace(/^`|`$/g, '');
                console.group(`🖼️ 处理第 ${index + 1} 个结果:`, url);

                try {
                    const resultData = resultsData[url];
                    const filename = uiTools.extractFilenameFromUrl(url); // 提取文件名

                    console.log('📄 提取的文件名:', filename);
                    console.log('📊 结果数据:', resultData);

                    // 查找对应的图片元素 - 在服务器图片和结果图片中查找
                    let foundElement = null;
                    allImageItems.forEach(item => {
                        const itemName = item.dataset.name;
                        if (itemName === filename) {
                            foundElement = item;
                            console.log('✅ 找到匹配的图片元素:', itemName);
                        }
                    });

                    // 构建图片信息对象
                    const imageInfo = {
                        imageUrl: (resultData.imageUrl ? resultData.imageUrl.replace(/^`|`$/g, '') : (resultData.file ? resultData.file.replace(/^`|`$/g, '') : url)),
                        taskId: resultData.taskId,
                        status: resultData.data?.output?.task_status || resultData.status,
                        timestamp: resultData.timestamp,
                        originalUrl: url,
                        processedAt: new Date().toISOString(),
                        errorMessage: uiTools.extractErrorMessage(resultData),
                        errorCode: extractErrorCode(resultData)
                    };

                    console.log('📝 完整的图片信息:', imageInfo);

                    // 保存到processedImages
                    processedImagesMap[filename] = imageInfo;

                    // 如果找到了对应元素，更新其状态显示
                    if (foundElement) {
                        const success = updateImageItemStatus(foundElement, imageInfo);
                        if (success) {
                            updatedCount++;
                            matchedCount++;
                            console.log('✅ 成功更新匹配的图片项状态');
                        } else {
                            console.warn('❌ 更新图片项状态失败');
                        }
                    } else {
                        console.log('🆕 未找到匹配的图片项，创建新的结果项');
                        // 如果图片不在当前显示列表中，创建新的图片项
                        const success = createResultImageItem(filename, imageInfo);
                        if (success) {
                            createdCount++;
                            console.log('✅ 成功创建结果图片项');
                        } else {
                            console.warn('❌ 创建结果图片项失败');
                        }
                    }
                } catch (itemError) {
                    console.error('💥 处理单个结果时出错:', itemError);
                    console.error('🔍 错误详情:', {
                        url: url,
                        error: itemError.message
                    });
                }

                console.groupEnd();
            });

            // 保存更新后的processedImages
            localStorage.setItem('processedImages', JSON.stringify(processedImagesMap));
            console.log(`💾 已保存更新后的processedImages，总计 ${Object.keys(processedImagesMap).length} 条记录`);

            // 输出处理统计
            console.log('📈 处理统计:', {
                匹配项数: matchedCount,
                更新项数: updatedCount,
                新建项数: createdCount,
                总计: Object.keys(resultsData).length
            });

            const success = (updatedCount + createdCount) > 0;
            if (success) {
                console.log(`✅ 成功处理 ${updatedCount + createdCount} 个结果`);
            } else {
                console.warn('⚠️ 没有成功处理任何结果');
            }

            console.groupEnd();
            return success;

        } catch (error) {
            console.error('💥 处理results数据时发生严重错误:', error);
            console.error('🔍 错误堆栈:', error.stack);
            console.groupEnd();
            return false;
        }
    }

    /**
     * 更新图片项状态显示
     */
    function updateImageItemStatus(item, imageInfo) {
        try {
            let statusEl = item.querySelector('.image-status');
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.className = 'image-status';
                const infoEl = item.querySelector('.image-info');
                if (infoEl) {
                    infoEl.appendChild(statusEl);
                } else {
                    return false;
                }
            }

            // 清除现有状态类
            item.classList.remove('failed', 'processing', 'success', 'completed', 'pending');

            // 添加结果标记
            item.classList.add('has-result');

            // 获取有效的处理后图片URL
            const processedImageUrl = getValidProcessedImageUrl(imageInfo);
            const hasValidProcessedImage = stateManager.isValidImageUrl(processedImageUrl);

            console.log('🔄 更新图片项状态:', {
                name: item.dataset.name,
                status: imageInfo.status,
                hasValidProcessedImage: hasValidProcessedImage,
                processedImageUrl: processedImageUrl
            });

            // 根据状态更新显示
            let statusHTML = '';
            let statusClass = '';

            switch (imageInfo.status) {
                case 'FAILED':
                    item.classList.add('failed');
                    statusClass = 'failed';
                    statusHTML = `
                        <span class="status-failed">❌ 处理失败</span>
                        <span class="error-details">${imageInfo.errorMessage || '处理过程中发生错误'}</span>
                        ${imageInfo.errorCode ? `<span class="error-code">错误代码: ${imageInfo.errorCode}</span>` : ''}
                    `;
                    break;

                case 'PROCESSING':
                case 'PENDING':
                case 'submitted':
                    item.classList.add('processing');
                    statusClass = 'processing';
                    statusHTML = `
                        <span class="status-processing">⏳ 处理中</span>
                        <span class="task-id">任务ID: ${imageInfo.taskId || 'N/A'}</span>
                        <span class="progress-info">请耐心等待处理完成</span>
                    `;
                    break;

                case 'COMPLETED':
                case 'SUCCEEDED':
                    if (hasValidProcessedImage) {
                        item.classList.add('success', 'completed');
                        statusClass = 'success';
                        statusHTML = `
                            <span class="status-success">✅ 处理成功</span>
                            <span class="task-id">任务ID: ${imageInfo.taskId || 'N/A'}</span>
                            <span class="timestamp">完成时间: ${new Date(imageInfo.timestamp).toLocaleString()}</span>
                        `;
                    } else {
                        // 状态为完成但没有有效图片，标记为失败
                        item.classList.add('failed');
                        statusClass = 'failed';
                        statusHTML = `
                            <span class="status-failed">❌ 处理结果异常</span>
                            <span class="task-id">任务ID: ${imageInfo.taskId || 'N/A'}</span>
                            <span class="error-details">处理成功但缺少结果图片</span>
                            <span class="timestamp">完成时间: ${new Date(imageInfo.timestamp).toLocaleString()}</span>
                        `;
                    }
                    break;

                default:
                    statusClass = 'unknown';
                    statusHTML = `<span class="status-unknown">❓ 未知状态: ${imageInfo.status}</span>`;
                    break;
            }

            statusEl.className = `image-status ${statusClass}`;
            statusEl.innerHTML = statusHTML;

            // 更新处理后图片显示
            const imgContainer = item.querySelector('.image-container');
            if (imgContainer) {
                // 移除现有的处理后图片或占位符
                const existingProcessed = item.querySelector('.processed-image, .processed-image-placeholder');
                if (existingProcessed) {
                    existingProcessed.remove();
                }

                // 只有在有有效处理后图片且状态为完成时才显示处理后图片
                if (hasValidProcessedImage && (imageInfo.status === 'COMPLETED' || imageInfo.status === 'SUCCEEDED')) {
                    const processedImg = document.createElement('img');
                    processedImg.src = processedImageUrl;
                    processedImg.alt = '处理后的图片';
                    processedImg.className = 'processed-image';
                    processedImg.onerror = function () {
                        console.warn('❌ 处理后图片加载失败:', processedImageUrl);
                        // 替换为错误占位符
                        const placeholder = document.createElement('div');
                        placeholder.className = 'processed-image-placeholder error';
                        placeholder.innerHTML = `
                            <div class="placeholder-icon">❌</div>
                            <div class="placeholder-text">图片加载失败</div>
                        `;
                        this.replaceWith(placeholder);
                        
                        // 更新状态为失败
                        statusEl.innerHTML = `
                            <span class="status-failed">❌ 处理失败</span>
                            <span class="error-details">处理后图片加载失败</span>
                        `;
                        item.classList.add('failed');
                        item.classList.remove('success', 'completed');
                    };
                    imgContainer.appendChild(processedImg);
                } else if (imageInfo.status === 'COMPLETED' || imageInfo.status === 'SUCCEEDED') {
                    // 状态为完成但没有有效图片，显示占位符
                    const placeholder = document.createElement('div');
                    placeholder.className = 'processed-image-placeholder no-image';
                    placeholder.innerHTML = `
                        <div class="placeholder-icon">⚠️</div>
                        <div class="placeholder-text">无结果图片</div>
                    `;
                    imgContainer.appendChild(placeholder);
                }
            }

            return true;

        } catch (error) {
            console.error('更新图片项状态时出错:', error);
            return false;
        }
    }

    /**
     * 获取有效的处理后图片URL
     */
    function getValidProcessedImageUrl(resultData) {
        if (!resultData) return null;
        
        let imageUrl = '';
        
        // 尝试从不同字段获取图片URL
        if (resultData.imageUrl && stateManager.isValidImageUrl(resultData.imageUrl)) {
            imageUrl = resultData.imageUrl.replace(/^`|`$/g, '');
        } else if (resultData.file && stateManager.isValidImageUrl(resultData.file)) {
            imageUrl = resultData.file.replace(/^`|`$/g, '');
        } else if (resultData.data && resultData.data.output && resultData.data.output.image_url && stateManager.isValidImageUrl(resultData.data.output.image_url)) {
            imageUrl = resultData.data.output.image_url.replace(/^`|`$/g, '');
        }
        
        return imageUrl || null;
    }

    /**
     * 从结果数据中提取错误代码
     */
    function extractErrorCode(resultData) {
        // 优先从data.output.code获取错误代码
        if (resultData.data && resultData.data.output && resultData.data.output.code) {
            return resultData.data.output.code;
        }
        // 其次从data.code获取
        if (resultData.data && resultData.data.code) {
            return resultData.data.code;
        }
        return null;
    }

    /**
     * 创建结果图片项（不在当前列表中的图片）
     */
    function createResultImageItem(filename, imageInfo) {
        console.group(`🆕 createResultImageItem - 创建结果图片项: ${filename}`);

        try {
            // 创建结果区域（如果不存在）
            let resultsContainer = document.getElementById('resultImages');
            if (!resultsContainer) {
                console.log('📦 创建结果容器');
                resultsContainer = document.createElement('div');
                resultsContainer.id = 'resultImages';
                resultsContainer.className = 'result-images-container';
                resultsContainer.innerHTML = '<h3>🎯 处理结果</h3>';
                const serverImagesParent = uiTools.elements.serverImages.parentNode;
                if (serverImagesParent) {
                    serverImagesParent.appendChild(resultsContainer);
                    console.log('✅ 结果容器已添加到页面');
                } else {
                    console.error('❌ 无法找到服务器图片的父容器');
                    console.groupEnd();
                    return false;
                }
            }

            // 检查是否已存在相同文件名的项
            const existingItem = resultsContainer.querySelector(`[data-name="${filename}"]`);
            if (existingItem) {
                console.log('ℹ️ 已存在相同文件名的项，进行更新');
                const success = updateImageItemStatus(existingItem, imageInfo);
                console.groupEnd();
                return success;
            }

            console.log('🎨 创建新的结果图片项');

            // 创建图片项
            const item = document.createElement('div');
            item.className = 'image-item result-item has-result';
            item.dataset.name = filename;

            let statusClass = '';
            let statusContent = '';
            let imageContent = '';

            console.log('📊 设置状态:', imageInfo.status);

            switch (imageInfo.status) {
                case 'FAILED':
                    statusClass = 'failed';
                    statusContent = `
                        <span class="status-failed">❌ 处理失败</span>
                        <span class="error-details">${imageInfo.errorMessage || '处理过程中发生错误'}</span>
                        ${imageInfo.errorCode ? `<span class="error-code">错误代码: ${imageInfo.errorCode}</span>` : ''}
                    `;
                    imageContent = `
                        <div class="image-placeholder failed">
                            <div class="placeholder-icon">❌</div>
                            <div class="placeholder-text">处理失败</div>
                        </div>
                    `;
                    break;

                case 'submitted':
                    statusClass = 'processing';
                    statusContent = `
                        <span class="status-processing">⏳ 等待处理</span>
                        <span class="task-id">任务ID: ${imageInfo.taskId || 'N/A'}</span>
                        <span class="progress-info">任务已提交，请耐心等待</span>
                    `;
                    imageContent = `
                        <div class="image-placeholder processing">
                            <div class="loading-spinner"></div>
                            <div class="placeholder-text">等待处理中...</div>
                        </div>
                    `;
                    break;

                case 'PROCESSING':
                    statusClass = 'processing';
                    statusContent = `
                        <span class="status-processing">⏳ 处理中</span>
                        <span class="task-id">任务ID: ${imageInfo.taskId || 'N/A'}</span>
                        <span class="progress-info">请耐心等待处理完成</span>
                    `;
                    imageContent = `
                        <div class="image-placeholder processing">
                            <div class="loading-spinner"></div>
                            <div class="placeholder-text">处理中...</div>
                        </div>
                    `;
                    break;

                case 'COMPLETED':
                case 'SUCCEEDED':
                    statusClass = 'success';
                    statusContent = `
                        <span class="status-success">✅ 处理成功</span>
                        <span class="task-id">任务ID: ${imageInfo.taskId || 'N/A'}</span>
                        <span class="timestamp">完成时间: ${new Date(imageInfo.timestamp).toLocaleString()}</span>
                    `;

                    // 检查是否有有效的处理后图片
                    if (imageInfo.imageUrl && stateManager.isValidImageUrl(imageInfo.imageUrl)) {
                        imageContent = `
                            <img src="${imageInfo.imageUrl}" alt="处理后的${filename}" class="processed-image result-image">
                        `;
                    } else {
                        imageContent = `
                            <div class="image-placeholder no-result">
                                <div class="placeholder-icon">⚠️</div>
                                <div class="placeholder-text">无结果图片</div>
                            </div>
                        `;
                        // 没有有效图片，标记为失败状态
                        statusClass = 'failed';
                        statusContent = `
                            <span class="status-failed">❌ 处理结果异常</span>
                            <span class="task-id">任务ID: ${imageInfo.taskId || 'N/A'}</span>
                            <span class="error-details">处理成功但缺少结果图片</span>
                        `;
                    }
                    break;

                default:
                    statusClass = 'unknown';
                    statusContent = `<span class="status-unknown">❓ 未知状态: ${imageInfo.status}</span>`;
                    imageContent = `
                        <div class="image-placeholder unknown">
                            <div class="placeholder-icon">❓</div>
                            <div class="placeholder-text">未知状态</div>
                        </div>
                    `;
                    break;
            }

            item.classList.add(statusClass);

            item.innerHTML = `
                <div class="image-checkbox">
                    <input type="checkbox" class="image-select-checkbox" id="checkbox-result-${filename.replace(/[^\w]/g, '-')}">
                </div>
                <div class="image-container">
                    ${imageContent}
                </div>
                <div class="image-info">
                    <div class="image-name">${filename}</div>
                    <div class="image-original">原图: ${imageInfo.originalUrl ? uiTools.extractFilenameFromUrl(imageInfo.originalUrl) : '未知'}</div>
                    <div class="image-status">${statusContent}</div>
                </div>
                <div class="image-actions">
                    <button class="action-btn delete-btn" title="删除此结果">🗑️ 删除</button>
                </div>
            `;

            // 绑定删除事件
            item.querySelector('.delete-btn').addEventListener('click', function () {
                console.log(`🗑️ 删除结果项: ${filename}`);
                if (confirm(`确定要删除结果 "${filename}" 吗？`)) {
                    // 从processedImages中移除
                    const processedImages = JSON.parse(localStorage.getItem('processedImages') || '{}');
                    delete processedImages[filename];
                    localStorage.setItem('processedImages', JSON.stringify(processedImages));

                    item.remove();
                    uiTools.showNotification(`已删除结果: ${filename}`);

                    // 如果没有更多结果项，移除结果容器
                    if (resultsContainer.children.length === 1) { // 只有h3标题
                        resultsContainer.remove();
                    }
                }
            });

            // 绑定复选框事件
            bindImageCheckboxEvent(item);

            // 添加图片加载错误处理
            const resultImage = item.querySelector('.result-image');
            if (resultImage) {
                resultImage.onerror = function () {
                    console.warn('❌ 结果图片加载失败:', this.src);
                    this.style.display = 'none';
                    const container = this.parentElement;
                    container.innerHTML = `
                        <div class="image-placeholder failed">
                            <div class="placeholder-icon">❌</div>
                            <div class="placeholder-text">图片加载失败</div>
                        </div>
                    `;

                    // 更新状态显示
                    const statusEl = item.querySelector('.image-status');
                    statusEl.innerHTML = `
                        <span class="status-failed">❌ 图片加载失败</span>
                        <span class="error-details">处理后图片无法访问</span>
                    `;
                };

                resultImage.onload = function () {
                    console.log('✅ 结果图片加载成功');
                };
            }

            resultsContainer.appendChild(item);
            console.log('✅ 结果图片项创建并添加完成');
            console.groupEnd();
            return true;

        } catch (error) {
            console.error('💥 创建结果图片项时出错:', error);
            console.groupEnd();
            return false;
        }
    }

    /**
     * 更新隐藏图片状态
     */
    function updateHiddenImagesStatus() {
        const hiddenImages = [];
        const checkboxes = document.querySelectorAll('.image-select-checkbox:checked');
        
        checkboxes.forEach(checkbox => {
            const imageItem = checkbox.closest('.image-item');
            const imageName = imageItem.dataset.name;
            hiddenImages.push(imageName);
        });

        // 保存到存储
        stateManager.saveHiddenImages(hiddenImages, (error) => {
            if (error) {
                console.error('保存隐藏图片状态失败:', error);
                // 降级存储到localStorage
                localStorage.setItem('hiddenImages', JSON.stringify(hiddenImages));
            }
        });
    }

    /**
     * 应用隐藏图片状态 - 只应用于处理过的图片
     */
    function applyHiddenImagesStatus() {
        if (!stateManager.hiddenImages || stateManager.hiddenImages.length === 0) return;

        const imageItems = document.querySelectorAll('.image-item');
        imageItems.forEach(item => {
            const imageName = item.dataset.name;

            // 只对处理过的图片应用隐藏状态
            const processedImageInfo = stateManager.getProcessedImageInfo(imageName);
            if (processedImageInfo && stateManager.hiddenImages.includes(imageName)) {
                item.classList.add('hidden');
            }
        });
    }

    /**
     * 隐藏选中的服务器图片 - 只作用于处理过的图片
     */
    function hideSelectedServerImages() {
        const selectedCheckboxes = document.querySelectorAll('.image-select-checkbox:checked');

        if (selectedCheckboxes.length === 0) {
            uiTools.showNotification('请先选择要隐藏的图片', 'info');
            return;
        }

        const selectedImages = [];
        selectedCheckboxes.forEach(checkbox => {
            const imageItem = checkbox.closest('.image-item');
            const imageName = imageItem.dataset.name;

            // 只隐藏有处理过图片信息的图片（包括成功和失败的）
            const processedImageInfo = stateManager.getProcessedImageInfo(imageName);
            if (processedImageInfo) {
                selectedImages.push(imageName);
                // 隐藏图片项
                imageItem.classList.add('hidden');
                // 取消选中
                checkbox.checked = false;
            }
        });

        if (selectedImages.length === 0) {
            uiTools.showNotification('所选图片中没有处理过的图片', 'info');
            return;
        }

        // 保存隐藏状态
        updateHiddenImagesStatus();

        uiTools.showNotification(`已隐藏 ${selectedImages.length} 张处理过的图片`, 'success');
    }

    /**
     * 删除选中的服务器图片
     */
    function deleteSelectedServerImages(client) {
        const selectedCheckboxes = document.querySelectorAll('.image-select-checkbox:checked');

        if (selectedCheckboxes.length === 0) {
            uiTools.showNotification('请先选择要删除的图片', 'info');
            return;
        }

        if (!confirm(`确定要删除选中的 ${selectedCheckboxes.length} 张图片吗？`)) return;

        const filenames = Array.from(selectedCheckboxes).map(checkbox => {
            const imageItem = checkbox.closest('.image-item');
            return imageItem.dataset.name;
        });

        client.delete(filenames, (error) => {
            if (error) {
                uiTools.showNotification(`删除失败: ${error.message}`, 'error');
            } else {
                selectedCheckboxes.forEach(checkbox => {
                    const imageItem = checkbox.closest('.image-item');
                    imageItem.remove();
                });

                uiTools.showNotification(`已删除 ${filenames.length} 张图片`, 'success');

                if (uiTools.elements.serverImages.children.length === 0) {
                    uiTools.initServerView();
                }
            }
        });
    }

    /**
     * 删除服务器图片
     */
    function deleteServerImage(filename, item) {
        if (!confirm(`确定要删除 ${filename} 吗？`)) return;

        client.delete(filename, (error) => {
            if (error) {
                uiTools.showNotification(`删除失败: ${error.message}`, 'error');
            } else {
                item.remove();
                uiTools.showNotification(`已删除: ${filename}`, 'success');

                if (uiTools.elements.serverImages.children.length === 0) {
                    uiTools.initServerView();
                }
            }
        });
    }

    /**
     * 显示所有处理过的图片
     */
    function showAllProcessedImages() {
        const hiddenImages = document.querySelectorAll('.image-item.hidden');
        let shownCount = 0;

        hiddenImages.forEach(item => {
            const imageName = item.dataset.name;
            const processedImageInfo = stateManager.getProcessedImageInfo(imageName);

            // 只显示处理过的图片
            if (processedImageInfo) {
                item.classList.remove('hidden');
                shownCount++;
            }
        });

        // 清空隐藏状态存储
        if (shownCount > 0) {
            stateManager.saveHiddenImages([], (error) => {
                if (error) {
                    console.error('清空隐藏状态失败:', error);
                    localStorage.setItem('hiddenImages', JSON.stringify([]));
                }
            });

            uiTools.showNotification(`已显示 ${shownCount} 张处理过的图片`, 'success');
        } else {
            uiTools.showNotification('没有隐藏的处理过的图片', 'info');
        }
    }

    /**
     * 清空服务器图片
     */
    function clearServerImages(client) {
        if (!confirm('确定要清空服务器图片吗？')) return;

        window.Net.list((error, list) => {
            if (error) {
                uiTools.showNotification('获取列表失败', 'error');
                return;
            }

            const filenames = list.files.map(f => f.name);
            if (filenames.length === 0) {
                uiTools.showNotification('服务器已无图片', 'info');
                return;
            }

            client.delete(filenames, (deleteError) => {
                if (deleteError) {
                    uiTools.showNotification('清空失败: ' + deleteError.message, 'error');
                } else {
                    uiTools.initServerView();
                    uiTools.showNotification('服务器图片已清空', 'success');
                }
            });
        });
    }

    /**
     * 初始化认证UI
     */
    function initAuthUI() {
        console.log('🔐 初始化认证UI');
        
        // 获取认证相关元素
        const authNotLoggedIn = document.getElementById('authNotLoggedIn');
        const authLoggedIn = document.getElementById('authLoggedIn');
        const currentUser = document.getElementById('currentUser');
        const usernameInput = document.getElementById('usernameInput');
        const passwordInput = document.getElementById('passwordInput');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        // 页面加载时检查是否有保存的登录状态
        storage.get('userAuthData', (authData) => {
            if (authData && authData.user && authData.timestamp) {
                // 检查数据是否过期（24小时）
                const now = Date.now();
                const dataAge = now - authData.timestamp;
                const dataExpiry = 24 * 60 * 60 * 1000; // 24小时
                
                if (dataAge < dataExpiry) {
                    // 恢复登录状态
                    window.authService.user = authData.user;
                    window.authService.publicKey = authData.publicKey;
                    
                    // 更新UI
                    authNotLoggedIn.style.display = 'none';
                    authLoggedIn.style.display = 'block';
                    currentUser.textContent = authData.user.id || '用户';
                    
                    console.log('✅ 恢复保存的登录状态');
                } else {
                    console.log('🕒 保存的登录状态已过期');
                    // 清除过期数据
                    storage.delete('userAuthData', () => {});
                }
            }
            
            // 检查是否已登录
            if (window.authService && window.authService.user) {
                // 已登录，显示用户信息
                authNotLoggedIn.style.display = 'none';
                authLoggedIn.style.display = 'block';
                currentUser.textContent = window.authService.user.id || '用户';
            }
        });
        
        // 绑定登录事件
        loginBtn.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                uiTools.showNotification('请输入用户名和密码', 'error');
                return;
            }
            
            // 调用登录服务
            window.authService.login({ username: username, password: password }, (error, result) => {
                if (error) {
                    uiTools.showNotification('登录失败: ' + error.message, 'error');
                    return;
                }
                
                // 登录成功，更新UI
                authNotLoggedIn.style.display = 'none';
                authLoggedIn.style.display = 'block';
                currentUser.textContent = result.data.user.id || '用户';
                
                // 保存登录状态到IndexedDB
                const authData = {
                    user: result.data.user,
                    publicKey: result.data.publicKey,
                    timestamp: Date.now()
                };
                storage.set('userAuthData', authData, (success) => {
                    if (success) {
                        console.log('💾 登录状态已保存');
                    } else {
                        console.warn('⚠️ 登录状态保存失败');
                    }
                });
                
                uiTools.showNotification('登录成功', 'success');
            });
        });
        
        // 绑定注册事件
        registerBtn.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                uiTools.showNotification('请输入用户名和密码', 'error');
                return;
            }
            
            // 调用注册服务
            window.authService.reg({ username: username, password: password }, (error, result) => {
                if (error) {
                    uiTools.showNotification('注册失败: ' + error.message, 'error');
                    return;
                }
                
                // 注册成功，自动登录
                authNotLoggedIn.style.display = 'none';
                authLoggedIn.style.display = 'block';
                currentUser.textContent = result.data.user.id || '用户';
                
                // 保存登录状态到IndexedDB
                const authData = {
                    user: result.data.user,
                    publicKey: result.data.publicKey,
                    timestamp: Date.now()
                };
                storage.set('userAuthData', authData, (success) => {
                    if (success) {
                        console.log('💾 登录状态已保存');
                    } else {
                        console.warn('⚠️ 登录状态保存失败');
                    }
                });
                
                uiTools.showNotification('注册成功', 'success');
            });
        });
        
        // 绑定退出事件
        logoutBtn.addEventListener('click', () => {
            // 清除用户信息
            window.authService.user = null;
            window.authService.publicKey = null;
            
            // 从存储中删除登录状态
            storage.delete('userAuthData', (success) => {
                if (success) {
                    console.log('🗑️ 登录状态已清除');
                } else {
                    console.warn('⚠️ 登录状态清除失败');
                }
            });
            
            // 更新UI
            authNotLoggedIn.style.display = 'block';
            authLoggedIn.style.display = 'none';
            usernameInput.value = '';
            passwordInput.value = '';
            uiTools.showNotification('已退出登录', 'info');
        });
    }
});






















