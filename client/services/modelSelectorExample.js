/**
 * 模型选择功能示例
 * 展示如何使用模型选择器和操作选择器
 */

// 注意：以下示例代码仅供开发参考，不会在生产环境中自动执行
// 等待DOM加载完成
/*
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 模型选择功能示例开始...');
    
    // 示例1: 监听模型选择变化
    exampleModelSelection();
    
    // 示例2: 监听操作选择变化
    exampleOperationSelection();
});
*/

/**
 * 示例1: 监听模型选择变化
 */
function exampleModelSelection() {
    console.group('🤖 模型选择监听示例');
    
    try {
        const modelSelector = document.getElementById('modelSelector');
        if (!modelSelector) {
            console.warn('模型选择器元素未找到');
            console.groupEnd();
            return;
        }
        
        // 监听模型选择变化
        modelSelector.addEventListener('change', function(e) {
            const selectedModel = e.target.value;
            console.log('✅ 模型选择变化:', selectedModel);
            
            // 这里可以添加模型选择后的处理逻辑
            if (selectedModel) {
                // 例如：加载模型的详细信息
                loadModelDetails(selectedModel);
            }
        });
        
        console.log('✅ 模型选择监听器已绑定');
        console.groupEnd();
    } catch (error) {
        console.error('模型选择监听示例出错:', error);
        console.groupEnd();
    }
}

/**
 * 示例2: 监听操作选择变化
 */
function exampleOperationSelection() {
    console.group('⚙️ 操作选择监听示例');
    
    try {
        const operationSelector = document.getElementById('operationSelector');
        if (!operationSelector) {
            console.warn('操作选择器元素未找到');
            console.groupEnd();
            return;
        }
        
        // 监听操作选择变化
        operationSelector.addEventListener('change', function(e) {
            const selectedOperation = e.target.value;
            console.log('✅ 操作选择变化:', selectedOperation);
            
            // 这里可以添加操作选择后的处理逻辑
            if (selectedOperation) {
                // 例如：更新提示词建议
                updatePromptSuggestions(selectedOperation);
            }
        });
        
        console.log('✅ 操作选择监听器已绑定');
        console.groupEnd();
    } catch (error) {
        console.error('操作选择监听示例出错:', error);
        console.groupEnd();
    }
}

/**
 * 加载模型详细信息
 * @param {string} modelId - 模型ID
 */
function loadModelDetails(modelId) {
    console.group(`🔍 加载模型详细信息: ${modelId}`);
    
    try {
        // 使用Net客户端获取模型详细信息
        window.Net.getModels((error, response) => {
            if (error) {
                console.error('获取模型列表失败:', error);
                console.groupEnd();
                return;
            }
            
            if (response.success && response.data) {
                // 查找选中的模型
                const selectedModel = response.data.find(model => 
                    (model.id || model.name) === modelId
                );
                
                if (selectedModel) {
                    console.log('✅ 模型详细信息:', selectedModel);
                    
                    // 可以在这里更新UI，显示模型的详细信息
                    displayModelInfo(selectedModel);
                } else {
                    console.warn('未找到选中的模型');
                }
            }
            
            console.groupEnd();
        });
    } catch (error) {
        console.error('加载模型详细信息出错:', error);
        console.groupEnd();
    }
}

/**
 * 显示模型信息
 * @param {Object} model - 模型对象
 */
function displayModelInfo(model) {
    // 这里可以添加显示模型信息的逻辑
    console.log('ℹ️ 显示模型信息:', {
        名称: model.name,
        描述: model.description,
        支持的操作: model.supportedOperations,
        成本: model.cost,
        最大并发数: model.maxConcurrent
    });
}

/**
 * 更新提示词建议
 * @param {string} operation - 操作类型
 */
function updatePromptSuggestions(operation) {
    console.group(`📝 更新提示词建议: ${operation}`);
    
    try {
        // 根据操作类型提供不同的提示词建议
        const promptSuggestions = {
            'description_edit': [
                '将图片产品渲染成白色场景的keyshot渲染效果图，产品在原视角偏转25度',
                '渲染图中的主体产品，白色场景，爆炸图形式，展示内部结构，去掉logo，文字等',
                '将图片产品渲染成白色场景的keyshot渲染效果图，产品在原视角偏转25度，去掉logo，文字等具有辨识度的标识'
            ],
            'object_replace': [
                '将图片中的产品替换为红色',
                '将图片中的背景替换为白色',
                '将图片中的logo替换为新产品标识'
            ],
            'background_change': [
                '将背景替换为纯白色',
                '将背景替换为室外场景',
                '将背景替换为工作室环境'
            ],
            'style_transfer': [
                '将图片转换为卡通风格',
                '将图片转换为油画风格',
                '将图片转换为素描风格'
            ]
        };
        
        const suggestions = promptSuggestions[operation] || [];
        console.log('✅ 提示词建议:', suggestions);
        
        // 可以在这里更新UI，显示提示词建议
        updatePromptDropdown(suggestions);
        
        console.groupEnd();
    } catch (error) {
        console.error('更新提示词建议出错:', error);
        console.groupEnd();
    }
}

/**
 * 更新提示词下拉框
 * @param {Array} suggestions - 提示词建议数组
 */
function updatePromptDropdown(suggestions) {
    const promptDropdown = document.getElementById('promptDropdown');
    if (!promptDropdown) return;
    
    // 清空现有选项
    promptDropdown.innerHTML = '';
    
    // 添加新的建议选项
    suggestions.forEach(suggestion => {
        const option = document.createElement('div');
        option.className = 'prompt-option';
        option.textContent = suggestion;
        promptDropdown.appendChild(option);
    });
    
    console.log('✅ 提示词下拉框已更新');
}