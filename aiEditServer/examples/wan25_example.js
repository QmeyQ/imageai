/**
 * 万象2.5模型使用示例
 * 
 * 万象2.5 (wan2.5-i2i-preview) 是一个强大的图生图模型，支持：
 * - 单图编辑：根据提示词编辑单张图片
 * - 多参考图生图：使用最多3张参考图生成新图像
 * 
 * 主要特性：
 * - 输出PNG格式图像
 * - 支持自定义分辨率（默认1280*1280）
 * - 支持添加AI生成水印
 * - 支持反向提示词来限制不希望出现的内容
 */

const ImageAI = require('../imageAI.js');

// 初始化万象2.5模型
const apiKey = 'your-dashscope-api-key'; // 替换为你的API Key
const imageAI = new ImageAI(apiKey, 'wan2.5-i2i-preview');

/**
 * 示例1: 单图编辑
 * 使用一张图片，根据提示词进行编辑
 */
function example1_singleImageEdit() {
    console.log('=== 示例1: 单图编辑 ===');
    
    imageAI.task({
        model: 'wan2.5-i2i-preview',
        prompt: '将花卉连衣裙换成一件复古风格的蕾丝长裙，领口和袖口有精致的刺绣细节。',
        images: [
            'https://img.alicdn.com/imgextra/i2/O1CN01vHOj4h28jOxUJPwY8_!!6000000007968-49-tps-1344-896.webp'
        ],
        parameters: {
            n: 1 // 生成1张图片
        }
    }, (error, result) => {
        if (error) {
            console.error('任务提交失败:', error.message);
            return;
        }
        
        console.log('任务提交成功！');
        console.log('任务ID:', result.taskId);
        console.log('任务状态:', result.status);
    });
}

/**
 * 示例2: 使用反向提示词
 * 指定不希望在画面中出现的内容
 */
function example2_withNegativePrompt() {
    console.log('=== 示例2: 使用反向提示词 ===');
    
    imageAI.task({
        model: 'wan2.5-i2i-preview',
        prompt: '将图片转换为水彩画风格，色彩柔和',
        images: [
            'https://example.com/your-image.jpg'
        ],
        negative_prompt: '低分辨率、错误、最差质量、低质量、残缺、多余的手指、比例不良',
        parameters: {
            n: 1
        }
    }, (error, result) => {
        if (error) {
            console.error('任务提交失败:', error.message);
            return;
        }
        
        console.log('任务提交成功！任务ID:', result.taskId);
    });
}

/**
 * 示例3: 多参考图生图
 * 使用多张图片作为参考生成新图像
 */
function example3_multiReferenceGeneration() {
    console.log('=== 示例3: 多参考图生图 ===');
    
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
        
        console.log('任务提交成功！任务ID:', result.taskId);
    });
}

/**
 * 示例4: 自定义分辨率和添加水印
 * 设置输出图像的分辨率，并添加AI生成水印
 */
function example4_customSizeWithWatermark() {
    console.log('=== 示例4: 自定义分辨率和添加水印 ===');
    
    imageAI.task({
        model: 'wan2.5-i2i-preview',
        prompt: '增强图片的色彩饱和度，使画面更加鲜艳',
        images: [
            'https://example.com/your-image.jpg'
        ],
        parameters: {
            size: '1280*720', // 设置输出分辨率为1280x720
            n: 1,
            watermark: true // 添加"AI生成"水印
        }
    }, (error, result) => {
        if (error) {
            console.error('任务提交失败:', error.message);
            return;
        }
        
        console.log('任务提交成功！任务ID:', result.taskId);
    });
}

/**
 * 示例5: 使用固定种子生成可复现结果
 * 使用相同的seed值可以生成相似的结果
 */
function example5_withSeed() {
    console.log('=== 示例5: 使用固定种子 ===');
    
    imageAI.task({
        model: 'wan2.5-i2i-preview',
        prompt: '将照片转换为油画风格',
        images: [
            'https://example.com/your-image.jpg'
        ],
        parameters: {
            n: 1,
            seed: 42 // 固定种子值，提高结果可复现性
        }
    }, (error, result) => {
        if (error) {
            console.error('任务提交失败:', error.message);
            return;
        }
        
        console.log('任务提交成功！任务ID:', result.taskId);
    });
}

/**
 * 示例6: 完整流程 - 监听任务完成事件
 * 设置回调函数监听任务开始和结束
 */
function example6_completeWorkflow() {
    console.log('=== 示例6: 完整流程 ===');
    
    // 设置任务开始回调
    imageAI.onStart((params) => {
        console.log('任务开始处理:', params);
    });
    
    // 设置任务结束回调
    imageAI.onEnd((taskId, status, result) => {
        console.log('任务处理完成！');
        console.log('任务ID:', taskId);
        console.log('状态:', status);
        
        if (status === 'SUCCEEDED') {
            const imageUrl = result.output?.results?.[0]?.url;
            console.log('生成的图片URL:', imageUrl);
            console.log('注意：图片链接24小时内有效，请及时下载保存！');
        } else {
            console.log('任务失败，错误信息:', result.output?.message);
        }
    });
    
    // 提交任务
    imageAI.task({
        model: 'wan2.5-i2i-preview',
        prompt: '将图片转换为赛博朋克风格，添加霓虹灯效果',
        images: [
            'https://example.com/your-image.jpg'
        ],
        parameters: {
            n: 1
        }
    }, (error, result) => {
        if (error) {
            console.error('任务提交失败:', error.message);
            return;
        }
        
        console.log('任务已提交，等待处理...');
    });
}

/**
 * 示例7: 使用本地图片
 * 先上传本地图片，然后进行处理
 */
function example7_localImage() {
    console.log('=== 示例7: 使用本地图片 ===');
    
    const localImagePath = './test-image.jpg'; // 本地图片路径
    
    imageAI.task({
        model: 'wan2.5-i2i-preview',
        filePath: localImagePath, // 指定本地文件路径，会自动上传
        prompt: '将这张照片转换为动漫风格',
        parameters: {
            n: 1
        }
    }, (error, result) => {
        if (error) {
            console.error('任务提交失败:', error.message);
            return;
        }
        
        console.log('任务提交成功！任务ID:', result.taskId);
    });
}

// 运行示例
if (require.main === module) {
    console.log('万象2.5模型使用示例\n');
    
    // 取消下面的注释来运行相应的示例
    // example1_singleImageEdit();
    // example2_withNegativePrompt();
    // example3_multiReferenceGeneration();
    // example4_customSizeWithWatermark();
    // example5_withSeed();
    // example6_completeWorkflow();
    // example7_localImage();
    
    console.log('\n请在代码中取消注释来运行示例');
    console.log('别忘了替换 apiKey 和图片URL！');
}

module.exports = {
    example1_singleImageEdit,
    example2_withNegativePrompt,
    example3_multiReferenceGeneration,
    example4_customSizeWithWatermark,
    example5_withSeed,
    example6_completeWorkflow,
    example7_localImage
};
