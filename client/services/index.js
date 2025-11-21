/**
 * 客户端服务模块入口文件
 * 
 * 该模块整合所有客户端服务模块，提供统一的初始化和访问接口。
 * 主要功能包括：
 * - 所有客户端服务的初始化
 * - 服务实例的全局注册
 * - 服务可用性检查
 * - 服务获取接口
 * 
 * @module services/index
 * @function initServices - 初始化所有服务模块
 * @function window.getService - 获取服务实例
 * @function window.isServiceAvailable - 检查服务是否可用
 * @property {AuthService} window.authService - 鉴权服务实例
 * @property {QuotaService} window.quotaService - 配额服务实例
 * @property {DashScopeAdapter} window.dsAdapter - DashScope适配器实例
 * @property {ImageAIService} window.imageAIService - 图像处理服务实例
 * @property {TaskService} window.taskService - 任务服务实例
 * @property {EventsService} window.eventsService - 事件服务实例
 * @property {FileUtils} window.fileUtils - 文件工具服务实例
 */

// 确保所有依赖的模块都已加载
(function() {
    // 检查必要的全局对象是否存在
    if (typeof window === 'undefined') {
        throw new Error('该模块只能在浏览器环境中使用');
    }

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServices);
    } else {
        // DOM已经加载完成
        initServices();
    }

    /**
     * 初始化所有服务模块
     */
    function initServices() {
        console.log('🚀 初始化客户端服务模块...');
        
        try {
            // 初始化鉴权服务
            if (typeof window.AuthService !== 'undefined') {
                window.authService = new window.AuthService();
                console.log('✅ 鉴权服务初始化完成');
            } else {
                console.warn('⚠️ 鉴权服务未定义');
            }
            
            // 初始化配额服务
            if (typeof window.QuotaService !== 'undefined') {
                window.quotaService = new window.QuotaService();
                console.log('✅ 配额服务初始化完成');
            } else {
                console.warn('⚠️ 配额服务未定义');
            }
            
            // 初始化DashScope适配器
            if (typeof window.DashScopeAdapter !== 'undefined' && typeof window.Net !== 'undefined') {
                window.dsAdapter = new window.DashScopeAdapter(window.Net);
                console.log('✅ DashScope适配器初始化完成');
            } else {
                console.warn('⚠️ DashScope适配器未定义或缺少Net实例');
            }
            
            // 初始化图像处理服务
            if (typeof window.ImageAIService !== 'undefined' && typeof window.Net !== 'undefined') {
                window.imageAIService = new window.ImageAIService(window.Net);
                console.log('✅ 图像处理服务初始化完成');
            } else {
                console.warn('⚠️ 图像处理服务未定义或缺少Net实例');
            }
            
            // 初始化任务服务
            if (typeof window.TaskService !== 'undefined') {
                window.taskService = new window.TaskService();
                console.log('✅ 任务服务初始化完成');
            } else {
                console.warn('⚠️ 任务服务未定义');
            }
            
            // 初始化事件服务
            if (typeof window.EventsService !== 'undefined') {
                window.eventsService = new window.EventsService();
                console.log('✅ 事件服务初始化完成');
            } else {
                console.warn('⚠️ 事件服务未定义');
            }
            
            // 初始化文件工具服务
            if (typeof window.FileUtils !== 'undefined') {
                window.fileUtils = new window.FileUtils();
                console.log('✅ 文件工具服务初始化完成');
            } else {
                console.warn('⚠️ 文件工具服务未定义');
            }
            
            console.log('🎉 所有客户端服务模块初始化完成');
            
            // 触发自定义事件，通知其他模块服务已准备就绪
            window.dispatchEvent(new CustomEvent('servicesReady'));
        } catch (error) {
            console.error('💥 客户端服务模块初始化失败:', error);
        }
    }

    /**
     * 获取服务实例
     * @param {string} serviceName - 服务名称
     * @returns {Object|null} 服务实例或null
     */
    window.getService = function(serviceName) {
        const serviceMap = {
            'auth': window.authService,
            'quota': window.quotaService,
            'ds': window.dsAdapter,
            'imageAI': window.imageAIService,
            'task': window.taskService,
            'events': window.eventsService,
            'file': window.fileUtils
        };
        
        return serviceMap[serviceName] || null;
    };

    /**
     * 检查服务是否可用
     * @param {string} serviceName - 服务名称
     * @returns {boolean} 是否可用
     */
    window.isServiceAvailable = function(serviceName) {
        return window.getService(serviceName) !== null;
    };
})();