/**res.js 全局static
 * - init(): 初始化资源管理器
 * - url(url: string, force: boolean = false): 加载资源配置文件
 * - down(key: string, force: boolean = false): 下载单个资源组
 * - downRes(): 下载所有包含url属性的资源组
 * - get(name: string, subkey?:string, index?: number): 获取已加载资源
 * - getList(): 获取资源配置信息
 * - getProcess(): 获取下载进度信息
 * - 支持复杂JSON结构，自动识别包含url属性的资源组进行下载
 */
/**
 * 资源管理模块 - 管理系统中的各种资源
 * 
 * 调用示例:
 * // 初始化资源管理器
 * Res.init();
 * 
 * // 加载资源配置文件
 * Res.url('http://example.com/res.json', (list) => {
 *   console.log('资源配置加载完成:', list);
 * });
 * 
 * // 下载单个资源组
 * Res.down('images', false, (success) => {
 *   console.log('资源组下载完成:', success);
 * });
 * 
 * // 下载所有包含url属性的资源组
 * Res.downRes();
 * 
 * // 获取已加载资源
 * const resource = Res.get('images', 'logo');
 * 
 * // 获取资源配置信息
 * const config = Res.getList();
 * 
 * // 获取下载进度信息
 * const progress = Res.getProcess();
 * 
 * 属性说明:
 * - storage: 存储实例
 * - _net: 网络请求实例
 * - _list: 资源配置列表
 * - _img: 图片资源映射表
 * - _process: 下载进度计数器
 * - _atlasCache: 图集缓存
 * - _textureCache: 纹理缓存
 * - _err: 错误计数器
 * - _count: 总资源计数器
 * - _loadingKeys: 正在加载的资源键集合
 * - _isInitialized: 是否已初始化
 * 
 * 方法列表:
 * - init(): 初始化资源管理器
 * - url(url, forceOrsuc, force2): 加载资源配置文件
 * - down(key, force, callback): 下载单个资源组
 * - downRes(): 下载所有包含url属性的资源组
 * - get(name, subKey, index): 获取已加载资源
 * - getList(): 获取资源配置信息
 * - getProcess(): 获取下载进度信息
 * - _isDownloadableResourceGroup(group): 检查资源组是否可下载
 * - _getDownloadableResourceGroups(): 获取所有可下载的资源组
 * - _getResourceCount(group): 计算资源组中的资源数量
 * - _downResourceGroup(groupKey, resourceGroup, force, callback): 下载资源组
 * - _downloadSingleResource(groupKey, subKey, resource, force, callback): 下载单个资源
 * - onUrl(list): 资源配置加载完成回调
 * - onUrlError(error): 资源配置加载失败回调
 * - onDownComplete(key, success): 资源下载完成回调
 * - onDownResComplete(successCount, errorCount, totalCount): 所有资源下载完成回调
 * - onProcessUpdate(process, err, count): 下载进度更新回调
 * - onLoadComplete(key, resource): 资源加载完成回调
 * - onLoadError(key, error): 资源加载失败回调
 */

class Res {
    static storage = null;
    static _net = null;
    static _list = null;
    static _img = {};
    static _process = 0;
    static _atlasCache = {};
    static _textureCache = {};
    static _err = 0;
    static _count = 0;
    static _loadingKeys = new Set();
    static _isInitialized = false;

    // ==================== 事件回调函数 ====================
    
    static onUrl(list) {
        console.log('res.json加载完成', list);
    }
    
    static onUrlError(error) {
        console.error('res.json加载失败:', error);
    }
    
    static onDownComplete(key, success) {
        console.log(`资源[${key}]下载${success ? '成功' : '失败'}`);
    }
    
    static onDownResComplete(successCount, errorCount, totalCount) {
        console.log(`所有资源下载完成: 成功${successCount}个, 失败${errorCount}个, 总计${totalCount}个`);
    }
    
    static onProcessUpdate(process, err, count) {
        const progress = count > 0 ? (process / count * 100).toFixed(2) : '0.00';
        console.log(`下载进度: ${process}/${count} (${progress}%), 错误: ${err}`);
    }
    
    static onLoadComplete(key, resource) {
        console.log(`资源[${key}]加载完成`, resource);
    }
    
    static onLoadError(key, error) {
        console.error(`资源[${key}]加载失败:`, error);
    }

    // ==================== 核心方法 ====================

    static init() {
        if(Res.storage) return;
        // 使用localStorage代替IDBStorage
        Res.storage = {
            get: function(key, callback) {
                const value = localStorage.getItem(key);
                callback(value);
            },
            set: function(key, value, callback) {
                localStorage.setItem(key, value);
                callback && callback();
            },
            delete: function(key, callback) {
                localStorage.removeItem(key);
                callback && callback();
            }
        };
        // 简单的网络请求实现
        Res._net = {
            download: function(url, options) {
                fetch(url)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        return response.blob();
                    })
                    .then(blob => {
                        options.onComplete(blob);
                    })
                    .catch(error => {
                        options.onError(error.message);
                    });
            }
        };
        Res._isInitialized = true;
    }

    static url(url, forceOrsuc = false, force2 = false) {
        if (!Res._isInitialized) {
            console.error('Res未初始化，请先调用Res.init()');
            return;
        }
        Res.storage.get('resJson', function(cachedData) {
            if (cachedData === null || forceOrsuc || force2) {
                console.log('加载res.json（远程）');
                Res._net.download(url, {
                    key: 'resJson',
                    force: typeof forceOrsuc == "boolean" ? forceOrsuc : force2,
                    onComplete: function(blob) {
                        if (blob) {
                            const reader = new FileReader();
                            reader.onload = function() {
                                try {
                                    Res._list = JSON.parse(reader.result);
                                    Res.storage.set('resJson', JSON.stringify(Res._list), function() {});
                                    Res.onUrl(Res._list);
                                    if (typeof forceOrsuc == 'function') forceOrsuc(Res._list);
                                } catch (e) {
                                    console.error('解析res.json失败:', e);
                                    Res.storage.delete('resJson', function() {});
                                    Res.onUrlError(`解析res.json失败: ${e}`);
                                    if (typeof forceOrsuc == 'function') forceOrsuc(undefined);
                                }
                            };
                            reader.readAsText(blob);
                        } else {
                            Res.storage.delete('resJson', function() {});
                            Res.onUrlError('下载的res.json为空');
                            if (typeof forceOrsuc == 'function') forceOrsuc(undefined);
                        }
                    },
                    onError: function(mes) {
                        console.log('下载json文件失败: ' + mes);
                        Res.storage.delete('resJson', function() {});
                        Res.onUrlError(`下载res.json失败: ${mes}`);
                        if (typeof forceOrsuc == 'function') forceOrsuc(undefined);
                    }
                });
            } else {
                try {
                    Res._list = JSON.parse(cachedData);
                    Res.onUrl(Res._list);
                } catch (e) {
                    console.error('解析缓存的res.json失败:', e);
                    Res.storage.delete('resJson', function() {
                        Res.url(url, true);
                    });
                }
            }
        });
    }

    /**
     * 下载单个资源组
     */
    static down(key, force, callback) {
        if (!this._list) {
            console.error('请先通过url()加载res.json');
            callback && callback(false);
            Res.onDownComplete(key, false);
            return;
        }

        if (this._loadingKeys.has(key)) {
            console.log(`资源[${key}]正在加载中，已忽略重复请求`);
            return;
        }

        const resourceGroup = this._list[key];
        this._count = this._getResourceCount(resourceGroup);
        if (!resourceGroup) {
            console.error(`资源键${key}不存在于res.json中`);
            callback && callback(false);
            Res.onDownComplete(key, false);
            return;
        }

        // 判断资源组类型并下载
        if (this._isDownloadableResourceGroup(resourceGroup)) {
            this._downResourceGroup(key, resourceGroup, force || false, callback);
        } else {
            console.log(`资源组[${key}]不包含可下载资源，跳过下载`);
            callback && callback(true);
            Res.onDownComplete(key, true);
        }
    }

    /**
     * 下载所有包含url属性的资源组
     */
    static downRes() {
        if (!Res._list) {
            console.error('请先通过url()加载res.json');
            return;
        }

        Res._err = 0;
        Res._process = 0;
        Res._img = {};
        Res._count = 0;

        // 获取所有可下载的资源组
        const downloadableGroups = this._getDownloadableResourceGroups();
        
        if (downloadableGroups.length === 0) {
            console.log('没有找到可下载的资源组');
            Res.onDownResComplete(0, 0, 0);
            return;
        }

        // 计算总资源数量
        downloadableGroups.forEach(function({ key, group }) {
            Res._count += Res._getResourceCount(group);
        });

        console.log(`开始下载 ${downloadableGroups.length} 个资源组，共 ${Res._count} 个资源`);

        let completedGroups = 0;
        const totalGroups = downloadableGroups.length;
        let totalSuccessCount = 0;
        let totalErrorCount = 0;

        downloadableGroups.forEach(function({ key, group }) {
            Res._downResourceGroup(key, group, false, function(success) {
                completedGroups++;
                if (success) {
                    totalSuccessCount++;
                } else {
                    totalErrorCount++;
                }
                
                if (completedGroups >= totalGroups) {
                    Res.onDownResComplete(totalSuccessCount, totalErrorCount, totalGroups);
                }
            });
        });
    }

    /**
     * 检查资源组是否可下载
     */
    static _isDownloadableResourceGroup(group) {
        if (!group) return false;
        
        // 如果是对象且有url属性，可下载
        if (typeof group === 'object' && group !== null && group.url) {
            return true;
        }
        
        // 检查数组中的每个元素
        if (Array.isArray(group)) {
            for (let i = 0; i < group.length; i++) {
                if (typeof group[i] === 'object' && group[i] !== null && group[i].url) {
                    return true;
                }
            }
        }
        
        // 检查对象的每个属性
        if (typeof group === 'object' && group !== null && !Array.isArray(group)) {
            for (const key in group) {
                if (group.hasOwnProperty(key)) {
                    const value = group[key];
                    if (typeof value === 'object' && value !== null && value.url) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * 获取所有可下载的资源组
     */
    static _getDownloadableResourceGroups() {
        const groups = [];
        if (!this._list) return groups;
        
        for (const key in this._list) {
            if (this._list.hasOwnProperty(key)) {
                const group = this._list[key];
                if (this._isDownloadableResourceGroup(group)) {
                    groups.push({ key, group });
                }
            }
        }
        
        return groups;
    }

    /**
     * 计算资源组中的资源数量
     */
    static _getResourceCount(group) {
        let count = 0;
        
        if (!group) return count;
        
        // 如果是单个资源对象
        if (typeof group === 'object' && group !== null && group.url) {
            return 1;
        }
        
        // 遍历数组
        if (Array.isArray(group)) {
            for (let i = 0; i < group.length; i++) {
                const item = group[i];
                if (typeof item === 'object' && item !== null && item.url) {
                    count++;
                }
            }
        }
        
        // 遍历对象属性
        if (typeof group === 'object' && group !== null && !Array.isArray(group)) {
            for (const key in group) {
                if (group.hasOwnProperty(key)) {
                    const item = group[key];
                    if (typeof item === 'object' && item !== null && item.url) {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }

    /**
     * 下载资源组
     */
    static _downResourceGroup(groupKey, resourceGroup, force = false, callback) {
        this._loadingKeys.add(groupKey);
        
        // 存储该资源组的资源
        if (!Res._img[groupKey]) {
            Res._img[groupKey] = {};
        }
        
        let successCount = 0;
        let errorCount = 0;
        const totalCount = this._getResourceCount(resourceGroup);
        
        // 处理单个资源对象
        if (typeof resourceGroup === 'object' && resourceGroup !== null && resourceGroup.url) {
            this._downloadSingleResource(groupKey, null, resourceGroup, force, function(success) {
                if (success) successCount++;
                else errorCount++;
                
                this._loadingKeys.delete(groupKey);
                const overallSuccess = errorCount === 0;
                callback && callback(overallSuccess);
                Res.onDownComplete(groupKey, overallSuccess);
            }.bind(this));
            return;
        }
        
        // 处理数组资源
        if (Array.isArray(resourceGroup)) {
            resourceGroup.forEach(function(item, index) {
                if (typeof item === 'object' && item !== null && item.url) {
                    this._downloadSingleResource(groupKey, index, item, force, function(success) {
                        if (success) successCount++;
                        else errorCount++;
                        
                        // 更新进度
                        Res._process++;
                        Res._err += success ? 0 : 1;
                        Res.onProcessUpdate(Res._process, Res._err, Res._count);
                        
                        // 检查是否全部完成
                        if (successCount + errorCount >= totalCount) {
                            this._loadingKeys.delete(groupKey);
                            const overallSuccess = errorCount === 0;
                            callback && callback(overallSuccess);
                            Res.onDownComplete(groupKey, overallSuccess);
                        }
                    }.bind(this));
                }
            }, this);
            return;
        }
        
        // 处理对象资源
        if (typeof resourceGroup === 'object' && resourceGroup !== null) {
            const keys = Object.keys(resourceGroup);
            keys.forEach(function(key) {
                const item = resourceGroup[key];
                if (typeof item === 'object' && item !== null && item.url) {
                    this._downloadSingleResource(groupKey, key, item, force, function(success) {
                        if (success) successCount++;
                        else errorCount++;
                        
                        // 更新进度
                        Res._process++;
                        Res._err += success ? 0 : 1;
                        Res.onProcessUpdate(Res._process, Res._err, Res._count);
                        
                        // 检查是否全部完成
                        if (successCount + errorCount >= totalCount) {
                            this._loadingKeys.delete(groupKey);
                            const overallSuccess = errorCount === 0;
                            callback && callback(overallSuccess);
                            Res.onDownComplete(groupKey, overallSuccess);
                        }
                    }.bind(this));
                }
            }, this);
        }
    }

    /**
     * 下载单个资源
     */
    static _downloadSingleResource(groupKey, subKey, resource, force = false, callback) {
        const storageKey = `${groupKey}_${subKey || 'default'}`;
        
        // 检查缓存
        Res.storage.get(storageKey, function(cachedData) {
            if (cachedData && !force) {
                try {
                    const resourceData = JSON.parse(cachedData);
                    Res._img[groupKey][subKey || 'default'] = resourceData;
                    callback && callback(true);
                    return;
                } catch (e) {
                    console.error('解析缓存资源失败:', e);
                    Res.storage.delete(storageKey, function() {});
                }
            }
            
            // 下载资源
            Res._net.download(resource.url, {
                onComplete: function(blob) {
                    if (blob) {
                        // 创建资源数据
                        const resourceData = {
                            url: URL.createObjectURL(blob),
                            type: blob.type,
                            size: blob.size,
                            name: resource.name || 'unknown',
                            timestamp: Date.now()
                        };
                        
                        // 保存到缓存（只保存元数据，不保存实际blob）
                        Res.storage.set(storageKey, JSON.stringify(resourceData), function() {});
                        
                        // 保存到内存
                        Res._img[groupKey][subKey || 'default'] = resourceData;
                        
                        callback && callback(true);
                    } else {
                        callback && callback(false);
                    }
                },
                onError: function(error) {
                    console.error(`下载资源失败 [${groupKey}:${subKey}]:`, error);
                    callback && callback(false);
                }
            });
        });
    }

    /**
     * 获取资源
     */
    static get(name, subKey, index = 0) {
        if (!Res._img[name]) {
            console.error(`资源组[${name}]不存在`);
            return null;
        }
        
        if (subKey !== undefined) {
            return Res._img[name][subKey] || null;
        } else if (index !== undefined) {
            // 假设是数组索引
            const keys = Object.keys(Res._img[name]);
            return Res._img[name][keys[index]] || null;
        }
        
        // 返回整个资源组
        return Res._img[name];
    }

    /**
     * 获取资源配置信息
     */
    static getList() {
        return Res._list;
    }

    /**
     * 获取下载进度
     */
    static getProcess() {
        return {
            process: Res._process,
            err: Res._err,
            count: Res._count
        };
    }
}

// 导出Res类
window.Res = Res;