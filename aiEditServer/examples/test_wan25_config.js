/**
 * 万象2.5模型配置测试
 * 
 * 运行此脚本以验证万象2.5模型是否正确配置
 */

const path = require('path');
const fs = require('fs');

console.log('=== 万象2.5模型配置检查 ===\n');

// 1. 检查models.json配置
console.log('1. 检查models.json配置...');
try {
    const modelsPath = path.join(__dirname, '..', 'models.json');
    const modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
    
    if (modelsData['wan2.5-i2i-preview']) {
        console.log('   ✅ 万象2.5模型配置已添加');
        console.log('   模型信息:', {
            id: modelsData['wan2.5-i2i-preview'].id,
            name: modelsData['wan2.5-i2i-preview'].name,
            description: modelsData['wan2.5-i2i-preview'].description,
            supportedOperations: modelsData['wan2.5-i2i-preview'].supportedOperations
        });
    } else {
        console.log('   ❌ 未找到万象2.5模型配置');
    }
} catch (error) {
    console.log('   ❌ 读取models.json失败:', error.message);
}

console.log();

// 2. 检查DashScope适配器
console.log('2. 检查DashScope适配器...');
try {
    const DashScopeAdapter = require('../adapters/ds.js');
    const adapter = new DashScopeAdapter('test-key');
    
    // 检查getOperations方法是否包含wan2.5
    adapter.getOperations('wan2.5-i2i-preview', (error, result) => {
        if (error) {
            console.log('   ❌ 获取操作列表失败:', error.message);
        } else if (result.operations && result.operations.length > 0) {
            console.log('   ✅ 适配器支持万象2.5模型');
            console.log('   支持的操作:', result.operations);
        } else {
            console.log('   ❌ 适配器不支持万象2.5模型');
        }
        
        continueChecks();
    });
} catch (error) {
    console.log('   ❌ 加载适配器失败:', error.message);
    continueChecks();
}

function continueChecks() {
    console.log();
    
    // 3. 检查ImageAI类
    console.log('3. 检查ImageAI类...');
    try {
        const ImageAI = require('../imageAI.js');
        const imageAI = new ImageAI('test-key', 'wan2.5-i2i-preview');
        
        if (imageAI.modelName === 'wan2.5-i2i-preview') {
            console.log('   ✅ ImageAI可以使用万象2.5模型');
        } else {
            console.log('   ❌ ImageAI模型设置不正确');
        }
    } catch (error) {
        console.log('   ❌ 加载ImageAI失败:', error.message);
    }
    
    console.log();
    
    // 4. 检查示例文件
    console.log('4. 检查示例文件...');
    const examplePath = path.join(__dirname, 'wan25_example.js');
    const clientExamplePath = path.join(__dirname, '..', '..', 'client', 'services', 'wan25Example.js');
    const readmePath = path.join(__dirname, 'WAN25_README.md');
    
    if (fs.existsSync(examplePath)) {
        console.log('   ✅ 服务端示例文件存在:', examplePath);
    } else {
        console.log('   ❌ 服务端示例文件不存在');
    }
    
    if (fs.existsSync(clientExamplePath)) {
        console.log('   ✅ 客户端示例文件存在:', clientExamplePath);
    } else {
        console.log('   ❌ 客户端示例文件不存在');
    }
    
    if (fs.existsSync(readmePath)) {
        console.log('   ✅ 使用文档存在:', readmePath);
    } else {
        console.log('   ❌ 使用文档不存在');
    }
    
    console.log();
    
    // 5. 配置检查总结
    console.log('=== 配置检查完成 ===\n');
    console.log('如需使用万象2.5模型，请参考以下文档：');
    console.log('  - 使用指南: ./examples/WAN25_README.md');
    console.log('  - 服务端示例: ./examples/wan25_example.js');
    console.log('  - 客户端示例: ./client/services/wan25Example.js');
    console.log();
    console.log('快速开始：');
    console.log('```javascript');
    console.log('const ImageAI = require(\'./imageAI.js\');');
    console.log('const imageAI = new ImageAI(\'your-api-key\', \'wan2.5-i2i-preview\');');
    console.log();
    console.log('imageAI.task({');
    console.log('    model: \'wan2.5-i2i-preview\',');
    console.log('    prompt: \'将图片转换为油画风格\',');
    console.log('    images: [\'https://example.com/image.jpg\'],');
    console.log('    parameters: { n: 1 }');
    console.log('}, (error, result) => {');
    console.log('    if (!error) console.log(\'任务ID:\', result.taskId);');
    console.log('});');
    console.log('```');
}
