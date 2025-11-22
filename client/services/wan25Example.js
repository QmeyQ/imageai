/**
 * 万象2.5模型客户端使用示例
 * 
 * 在浏览器中使用万象2.5模型进行图像处理
 * 需要先引入相关的客户端服务
 */

// 确保已经加载了 ImageAIService
// <script src="./services/imageAI.js"></script>

/**
 * 示例1: 基本使用 - 单图编辑
 */
function example1_basicUsage() {
    console.log('=== 示例1: 单图编辑 ===');
    
    // 创建图像AI服务实例
    const imageAI = new ImageAIService(window.Net);
    
    // 提交任务
    imageAI.task({
        model: 'wan2.5-i2i-preview',
        prompt: '将花卉连衣裙换成一件复古风格的蕾丝长裙，领口和袖口有精致的刺绣细节。',
        imageUrl: 'https://img.alicdn.com/imgextra/i2/O1CN01vHOj4h28jOxUJPwY8_!!6000000007968-49-tps-1344-896.webp',
        parameters: {
            n: 1
        }
    }, (error, result) => {
        if (error) {
            console.error('任务提交失败:', error.message);
            return;
        }
        
        console.log('任务提交成功！');
        console.log('结果:', result);
    });
}

/**
 * 示例2: 多参考图生图
 */
function example2_multipleImages() {
    console.log('=== 示例2: 多参考图生图 ===');
    
    const imageAI = new ImageAIService(window.Net);
    
    imageAI.task({
        model: 'wan2.5-i2i-preview',
        prompt: '结合这些图片的风格，创作一幅新的艺术作品',
        images: [
            'https://example.com/reference1.jpg',
            'https://example.com/reference2.jpg',
            'https://example.com/reference3.jpg'
        ],
        parameters: {
            n: 2 // 生成2张图片
        }
    }, (error, result) => {
        if (error) {
            console.error('任务提交失败:', error.message);
            return;
        }
        
        console.log('任务提交成功！', result);
    });
}

/**
 * 示例3: 使用反向提示词和水印
 */
function example3_advancedOptions() {
    console.log('=== 示例3: 高级选项 ===');
    
    const imageAI = new ImageAIService(window.Net);
    
    imageAI.task({
        model: 'wan2.5-i2i-preview',
        prompt: '将图片转换为水彩画风格，色彩柔和',
        imageUrl: 'https://example.com/your-image.jpg',
        negative_prompt: '低分辨率、错误、最差质量、低质量',
        parameters: {
            size: '1280*720',
            n: 1,
            watermark: true, // 添加AI生成水印
            seed: 42 // 固定种子值
        }
    }, (error, result) => {
        if (error) {
            console.error('任务提交失败:', error.message);
            return;
        }
        
        console.log('任务提交成功！', result);
    });
}

/**
 * 示例4: 批量处理多张图片
 */
function example4_batchProcessing() {
    console.log('=== 示例4: 批量处理 ===');
    
    const imageAI = new ImageAIService(window.Net);
    
    const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
    ];
    
    imageAI.process(imageUrls, {
        model: 'wan2.5-i2i-preview',
        prompt: '增强图片的色彩饱和度',
        parameters: {
            n: 1
        }
    }, (error, results) => {
        if (error) {
            console.error('批量处理失败:', error.message);
            return;
        }
        
        console.log('批量处理完成！');
        console.log('结果:', results);
    });
}

/**
 * 示例5: 监听任务生命周期
 */
function example5_withCallbacks() {
    console.log('=== 示例5: 监听任务生命周期 ===');
    
    const imageAI = new ImageAIService(window.Net);
    
    // 设置开始回调
    imageAI.onStart((params) => {
        console.log('任务开始:', params);
        // 可以在这里显示加载动画
        showLoadingSpinner();
    });
    
    // 设置结束回调
    imageAI.onEnd((taskId, status, result) => {
        console.log('任务结束:', taskId, status);
        // 隐藏加载动画
        hideLoadingSpinner();
        
        if (status === 'SUCCEEDED') {
            const imageUrl = result.data?.outputUrl;
            console.log('生成的图片URL:', imageUrl);
            // 显示结果图片
            displayResultImage(imageUrl);
        } else {
            console.error('任务失败');
        }
    });
    
    // 提交任务
    imageAI.task({
        model: 'wan2.5-i2i-preview',
        prompt: '将图片转换为油画风格',
        imageUrl: 'https://example.com/your-image.jpg',
        parameters: {
            n: 1
        }
    }, (error, result) => {
        if (error) {
            console.error('任务提交失败:', error.message);
            hideLoadingSpinner();
            return;
        }
        
        console.log('任务已提交，等待处理...');
    });
}

/**
 * 示例6: 在HTML表单中使用
 */
function example6_htmlForm() {
    console.log('=== 示例6: HTML表单集成 ===');
    
    // HTML代码示例：
    const htmlExample = `
    <div class="image-editor">
        <h2>万象2.5 图像编辑器</h2>
        
        <form id="imageEditForm">
            <div class="form-group">
                <label for="imageUrl">图片URL：</label>
                <input type="text" id="imageUrl" required 
                    placeholder="https://example.com/image.jpg">
            </div>
            
            <div class="form-group">
                <label for="prompt">编辑提示词：</label>
                <textarea id="prompt" required 
                    placeholder="描述您想要的编辑效果..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="negativePrompt">反向提示词（可选）：</label>
                <textarea id="negativePrompt" 
                    placeholder="描述不希望出现的内容..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="size">输出分辨率：</label>
                <select id="size">
                    <option value="">默认(1280*1280)</option>
                    <option value="1280*720">1280*720</option>
                    <option value="720*1280">720*1280</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="watermark">
                    添加AI生成水印
                </label>
            </div>
            
            <button type="submit">开始处理</button>
        </form>
        
        <div id="result" style="display: none;">
            <h3>处理结果</h3>
            <img id="resultImage" alt="处理结果">
            <p>注意：图片链接24小时内有效，请及时保存！</p>
        </div>
    </div>
    `;
    
    console.log('HTML示例代码:', htmlExample);
    
    // JavaScript处理代码：
    document.getElementById('imageEditForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const imageAI = new ImageAIService(window.Net);
        
        const params = {
            model: 'wan2.5-i2i-preview',
            prompt: document.getElementById('prompt').value,
            imageUrl: document.getElementById('imageUrl').value,
            negative_prompt: document.getElementById('negativePrompt').value || undefined,
            parameters: {
                n: 1,
                watermark: document.getElementById('watermark').checked
            }
        };
        
        const sizeValue = document.getElementById('size').value;
        if (sizeValue) {
            params.parameters.size = sizeValue;
        }
        
        imageAI.onEnd((taskId, status, result) => {
            if (status === 'SUCCEEDED') {
                const imageUrl = result.data?.outputUrl;
                document.getElementById('resultImage').src = imageUrl;
                document.getElementById('result').style.display = 'block';
            }
        });
        
        imageAI.task(params, (error, result) => {
            if (error) {
                alert('任务提交失败: ' + error.message);
            }
        });
    });
}

/**
 * 辅助函数
 */
function showLoadingSpinner() {
    // 显示加载动画的实现
    console.log('显示加载动画...');
}

function hideLoadingSpinner() {
    // 隐藏加载动画的实现
    console.log('隐藏加载动画...');
}

function displayResultImage(imageUrl) {
    // 显示结果图片的实现
    console.log('显示结果图片:', imageUrl);
}

// 导出示例函数
window.Wan25Examples = {
    example1_basicUsage,
    example2_multipleImages,
    example3_advancedOptions,
    example4_batchProcessing,
    example5_withCallbacks,
    example6_htmlForm
};

console.log('万象2.5客户端示例已加载！');
console.log('使用 window.Wan25Examples 访问示例函数');
