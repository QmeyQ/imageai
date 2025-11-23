/**
 * 文件头部检查工具模块 - 用于检查文件头部信息和验证文件格式
 * 
 * 该模块提供了一个简单的工具来检查文件的头部信息，
 * 特别是验证PNG文件的签名。
 * 
 * 调用示例:
 * node check_file_header.js [filename]
 * 
 * 属性说明:
 * // 该模块没有导出属性
 * 
 * 方法列表:
 * - checkFileHeader(filePath): 检查文件头部信息
 */

const fs = require('fs');
const path = require('path');

// 检查文件头部
function checkFileHeader(filePath) {
    console.log(`检查文件: ${filePath}`);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error('读取文件失败:', err);
            return;
        }
        
        // 显示文件大小
        console.log(`文件大小: ${data.length} 字节`);
        
        // 显示前16个字节的十六进制表示
        const header = data.slice(0, 16).toString('hex');
        console.log(`文件头部前16个字节(十六进制): ${header}`);
        
        // 验证PNG签名 (89 50 4e 47 0d 0a 1a 0a)
        const pngSignature = '89504e470d0a1a0a';
        const hasPngSignature = header.startsWith(pngSignature);
        
        console.log(`是否包含PNG签名: ${hasPngSignature}`);
        
        if (hasPngSignature) {
            console.log('这是一个有效的PNG文件');
        } else {
            console.log('警告: 这可能不是一个有效的PNG文件');
            console.log(`期望的PNG签名前8字节: ${pngSignature}`);
            console.log(`实际的前8字节: ${header.slice(0, 16)}`);
        }
    });
}

// 从命令行参数获取文件名，默认为test_direct_fs.png
const fileName = process.argv[2] || 'test_direct_fs.png';
console.log(`检查命令行参数提供的文件: ${fileName}`);
checkFileHeader(path.join(__dirname, fileName));