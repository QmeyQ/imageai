/**
 * 服务使用示例模块
 * 
 * 该模块提供各种服务的使用示例和最佳实践，帮助开发者快速上手和正确使用系统服务。
 * 包含认证、配额、任务、事件等核心服务的使用方法和示例代码。
 * 
 * 主要功能：
 * - 服务使用示例
 * - 最佳实践演示
 * - 错误处理示例
 * - 异步操作示例
 * - 服务集成示例
 * 
 * @module services/example
 * @class ServiceExample
 * @method runAuthExample - 运行认证服务示例
 * @method runQuotaExample - 运行配额服务示例
 * @method runTaskExample - 运行任务服务示例
 * @method runEventExample - 运行事件服务示例
 */

/**
 * 客户端服务使用示例
 * 展示如何使用各个服务模块
 */
 
// 注意：以下示例代码仅供开发参考，不会在生产环境中自动执行
// 等待服务模块准备就绪
/*
window.addEventListener('servicesReady', function() {
    console.log('🔧 服务模块已准备就绪，开始示例演示...');
    
    // 示例1: 使用鉴权服务
    exampleAuthService();
    
    // 示例2: 使用配额服务
    exampleQuotaService();
    
    // 示例3: 使用图像处理服务
    exampleImageAIService();
    
    // 示例4: 使用任务服务
    exampleTaskService();
    
    // 示例5: 使用文件工具服务
    exampleFileService();
});
*/

/**
 * 示例1: 使用鉴权服务
 */
function exampleAuthService() {
    console.group('🔐 鉴权服务示例');
    
    try {
        // 检查服务是否可用
        if (!window.isServiceAvailable('auth')) {
            console.warn('鉴权服务不可用');
            console.groupEnd();
            return;
        }
        
        const authService = window.getService('auth');
        
        // 模拟用户注册
        const user = {
            username: 'testuser',
            email: 'test@example.com'
        };
        
        console.log('📝 用户注册信息:', user);
        
        // 注意：实际使用时需要连接到服务器进行注册
        console.log('✅ 鉴权服务示例完成');
    } catch (error) {
        console.error('鉴权服务示例出错:', error);
    }
    
    console.groupEnd();
}

/**
 * 示例2: 使用配额服务
 */
function exampleQuotaService() {
    console.group('📊 配额服务示例');
    
    try {
        // 检查服务是否可用
        if (!window.isServiceAvailable('quota')) {
            console.warn('配额服务不可用');
            console.groupEnd();
            return;
        }
        
        const quotaService = window.getService('quota');
        
        // 模拟用户对象
        const user = {
            id: 'user123',
            quotaTotal: 100,
            quotaUsed: 10,
            quotaRemaining: 90,
            reserved: 0
        };
        
        console.log('👤 用户信息:', user);
        
        // 检查是否可以扣除配额
        if (quotaService.deduct(user)) {
            console.log('✅ 成功扣除配额，剩余:', user.quotaRemaining);
        } else {
            console.log('❌ 配额不足，无法扣除');
        }
        
        // 检查是否达到封顶
        if (quotaService.cap(user)) {
            console.log('🚫 已达到配额封顶');
        } else {
            console.log('✅ 仍有可用配额');
        }
        
        console.log('📊 更新后的用户信息:', user);
        console.log('✅ 配额服务示例完成');
    } catch (error) {
        console.error('配额服务示例出错:', error);
    }
    
    console.groupEnd();
}

/**
 * 示例3: 使用图像处理服务
 */
function exampleImageAIService() {
    console.group('🎨 图像处理服务示例');
    
    try {
        // 检查服务是否可用
        if (!window.isServiceAvailable('imageAI')) {
            console.warn('图像处理服务不可用');
            console.groupEnd();
            return;
        }
        
        const imageAIService = window.getService('imageAI');
        
        // 模拟图像编辑参数
        const editParams = {
            prompt: '将图片产品渲染成白色场景的keyshot渲染效果图',
            imageUrl: 'https://example.com/image.jpg'
        };
        
        console.log('🖼️ 图像编辑参数:', editParams);
        
        // 注意：实际使用时需要连接到服务器进行图像处理
        console.log('✅ 图像处理服务示例完成');
    } catch (error) {
        console.error('图像处理服务示例出错:', error);
    }
    
    console.groupEnd();
}

/**
 * 示例4: 使用任务服务
 */
function exampleTaskService() {
    console.group('📋 任务服务示例');
    
    try {
        // 检查服务是否可用
        if (!window.isServiceAvailable('task')) {
            console.warn('任务服务不可用');
            console.groupEnd();
            return;
        }
        
        const taskService = window.getService('task');
        
        // 创建任务
        const task = taskService.add({
            userId: 'user123',
            model: 'wanx2.1-imageedit',
            operation: 'description_edit',
            sourceFile: 'image.jpg',
            sourceUrl: 'https://example.com/image.jpg',
            status: 'pending'
        });
        
        console.log('➕ 创建任务:', task);
        
        // 查询任务
        const retrievedTask = taskService.get(task.id);
        console.log('🔍 查询任务:', retrievedTask);
        
        // 更新任务状态
        const updatedTask = taskService.set(task.id, {
            status: 'processing',
            updatedAt: new Date().toISOString()
        });
        console.log('✏️ 更新任务:', updatedTask);
        
        // 保存任务结果
        taskService.saveResult(task.id, {
            outputUrl: 'https://example.com/result.jpg',
            status: 'SUCCEEDED'
        });
        
        // 获取任务结果
        const result = taskService.getResult(task.id);
        console.log('📥 任务结果:', result);
        
        console.log('✅ 任务服务示例完成');
    } catch (error) {
        console.error('任务服务示例出错:', error);
    }
    
    console.groupEnd();
}

/**
 * 示例5: 使用文件工具服务
 */
function exampleFileService() {
    console.group('📁 文件工具服务示例');
    
    try {
        // 检查服务是否可用
        if (!window.isServiceAvailable('file')) {
            console.warn('文件工具服务不可用');
            console.groupEnd();
            return;
        }
        
        const fileUtils = window.getService('file');
        
        // 获取文件信息示例
        console.log('ℹ️ 文件工具服务实例:', fileUtils);
        
        // 检查文件类型的方法
        console.log('🔍 文件类型检查方法可用');
        
        console.log('✅ 文件工具服务示例完成');
    } catch (error) {
        console.error('文件工具服务示例出错:', error);
    }
    
    console.groupEnd();
}

/**
 * 使用DashScope适配器示例
 */
function exampleDashScopeAdapter() {
    console.group('🌐 DashScope适配器示例');
    
    try {
        // 检查服务是否可用
        if (!window.isServiceAvailable('ds')) {
            console.warn('DashScope适配器不可用');
            console.groupEnd();
            return;
        }
        
        const dsAdapter = window.getService('ds');
        
        console.log('🔌 DashScope适配器实例:', dsAdapter);
        console.log('✅ DashScope适配器示例完成');
    } catch (error) {
        console.error('DashScope适配器示例出错:', error);
    }
    
    console.groupEnd();
}

/**
 * 使用事件服务示例
 */
function exampleEventsService() {
    console.group('📡 事件服务示例');
    
    try {
        // 检查服务是否可用
        if (!window.isServiceAvailable('events')) {
            console.warn('事件服务不可用');
            console.groupEnd();
            return;
        }
        
        const eventsService = window.getService('events');
        
        console.log('🔌 事件服务实例:', eventsService);
        console.log('✅ 事件服务示例完成');
    } catch (error) {
        console.error('事件服务示例出错:', error);
    }
    
    console.groupEnd();
}