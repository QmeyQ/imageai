/**
 * 模型服务示例模块
 * 
 * 该模块提供模型服务的使用示例和最佳实践，展示如何获取模型列表、
 * 操作类型、配置模型参数等。帮助开发者正确集成和使用AI模型功能。
 * 
 * 主要功能：
 * - 模型列表获取示例
 * - 操作类型查询示例
 * - 模型参数配置示例
 * - 模型成本计算示例
 * - 模型信息展示示例
 * 
 * @module services/modelExample
 * @class ModelServiceExample
 * @method runModelListExample - 运行模型列表示例
 * @method runModelOperationsExample - 运行模型操作示例
 * @method runModelCostExample - 运行模型成本示例
 */

/**
 * 多模型功能使用示例
 * 展示如何使用不同模型和操作类型
 */

// 注意：以下示例代码仅供开发参考，不会在生产环境中自动执行
// 等待服务模块准备就绪
/*
window.addEventListener('servicesReady', function() {
    console.log('🔧 多模型功能示例开始...');
    
    // 示例1: 获取模型列表
    exampleGetModels();
    
    // 示例2: 获取模型操作
    exampleGetModelOperations();
    
    // 示例3: 使用不同模型处理图片
    exampleMultiModelProcessing();
});
*/

/**
 * 示例1: 获取模型列表
 */
function exampleGetModels() {
    console.group('🤖 获取模型列表示例');
    
    try {
        // 检查服务是否可用
        if (!window.isServiceAvailable('ds')) {
            console.warn('DashScope适配器不可用');
            console.groupEnd();
            return;
        }
        
        const dsAdapter = window.getService('ds');
        
        // 获取模型列表
        dsAdapter.getModels((error, result) => {
            if (error) {
                console.error('获取模型列表失败:', error);
                console.groupEnd();
                return;
            }
            
            console.log('✅ 获取模型列表成功:', result);
            console.groupEnd();
        });
    } catch (error) {
        console.error('获取模型列表示例出错:', error);
        console.groupEnd();
    }
}

/**
 * 示例2: 获取模型操作
 */
function exampleGetModelOperations() {
    console.group('⚙️ 获取模型操作示例');
    
    try {
        // 检查服务是否可用
        if (!window.isServiceAvailable('ds')) {
            console.warn('DashScope适配器不可用');
            console.groupEnd();
            return;
        }
        
        const dsAdapter = window.getService('ds');
        
        // 获取万相图像编辑模型支持的操作
        dsAdapter.getOperations('wanx2.1-imageedit', (error, result) => {
            if (error) {
                console.error('获取模型操作失败:', error);
                console.groupEnd();
                return;
            }
            
            console.log('✅ 获取万相图像编辑模型操作成功:', result);
            console.groupEnd();
        });
    } catch (error) {
        console.error('获取模型操作示例出错:', error);
        console.groupEnd();
    }
}

/**
 * 示例3: 使用不同模型处理图片
 */
function exampleMultiModelProcessing() {
    console.group('🎨 多模型图片处理示例');
    
    try {
        // 检查服务是否可用
        if (!window.isServiceAvailable('imageAI')) {
            console.warn('图像处理服务不可用');
            console.groupEnd();
            return;
        }
        
        const imageAIService = window.getService('imageAI');
        
        // 模拟图片URL
        const imageUrl = 'https://example.com/image.jpg';
        
        // 使用万相图像编辑模型
        const wanxParams = {
            model: 'wanx2.1-imageedit',
            operation: 'description_edit',
            prompt: '将图片产品渲染成白色场景的keyshot渲染效果图',
            imageUrl: imageUrl
        };
        
        console.log('🖼️ 使用万相图像编辑模型处理图片:', wanxParams);
        
        // 提交任务
        imageAIService.task(wanxParams, (error, result) => {
            if (error) {
                console.error('万相图像编辑模型任务提交失败:', error);
            } else {
                console.log('✅ 万相图像编辑模型任务提交成功:', result);
            }
            
            // 使用通义千问VL Plus模型
            const qwenParams = {
                model: 'qwen-vl-plus',
                operation: 'object_replace',
                prompt: '将图片中的产品替换为红色',
                imageUrl: imageUrl
            };
            
            console.log('🖼️ 使用通义千问VL Plus模型处理图片:', qwenParams);
            
            // 提交任务
            imageAIService.task(qwenParams, (error, result) => {
                if (error) {
                    console.error('通义千问VL Plus模型任务提交失败:', error);
                } else {
                    console.log('✅ 通义千问VL Plus模型任务提交成功:', result);
                }
                
                console.groupEnd();
            });
        });
    } catch (error) {
        console.error('多模型图片处理示例出错:', error);
        console.groupEnd();
    }
}