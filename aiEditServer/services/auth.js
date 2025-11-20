/**
 * 鉴权与安全服务模块 - 处理用户认证和安全验证相关功能
 * 
 * 调用示例:
 * const AuthService = require('./services/auth.js');
 * const authService = new AuthService({
 *   nonceTTL: 15 * 60 * 1000, // 15分钟
 *   timeWindow: 300 // 5分钟时间窗口
 * });
 * 
 * // 用户注册
 * authService.reg({ id: 'user1', password: 'pass123' }, (error, result) => {
 *   if (!error) console.log('注册成功:', result);
 * });
 * 
 * // 用户登录
 * authService.login({ id: 'user1', password: 'pass123' }, (error, result) => {
 *   if (!error) console.log('登录成功:', result);
 * });
 * 
 * // 前端签名
 * const signature = authService.sign(req);
 * 
 * // 后端验签
 * const verification = authService.verify(req);
 * 
 * 属性说明:
 * - options: 配置选项
 * - options.nonceTTL: Nonce生存时间（毫秒）
 * - options.timeWindow: 时间窗口（秒）
 * - nonceStore: Nonce存储映射表
 * 
 * 方法列表:
 * - constructor(options): 创建鉴权服务实例
 * - reg(user, callback): 用户注册
 * - login(user, callback): 用户登录
 * - sign(req): 前端签名生成
 * - verify(req): 后端签名验证
 * - nonceAdd(userId, nonce): 添加nonce到存储
 * - nonceHas(userId, nonce): 检查nonce是否存在
 * - _calculateBodyDigest(body): 计算请求体摘要
 * - _generateSignature(data): 生成签名
 * - _verifySignature(data): 验证签名
 */

const crypto = require('crypto');

class AuthService {
    /**
     * 创建鉴权服务实例
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = {
            nonceTTL: 15 * 60 * 1000, // 15分钟
            timeWindow: 300, // 5分钟时间窗口
            ...options
        };
        
        // Nonce存储 (使用LRU策略)
        this.nonceStore = new Map();
    }

    /**
     * 用户注册
     * @param {Object} user - 用户信息
     * @param {Function} callback - 回调函数
     */
    reg(user, callback) {
        // 实现用户注册逻辑
        // 这里应该与数据库交互
        callback(new Error('未实现'));
    }

    /**
     * 用户登录
     * @param {Object} user - 用户信息
     * @param {Function} callback - 回调函数
     */
    login(user, callback) {
        // 实现用户登录逻辑
        // 这里应该与数据库交互并验证凭证
        callback(new Error('未实现'));
    }

    /**
     * 前端签名
     * @param {Object} req - 请求对象
     * @returns {Object} 签名信息
     */
    sign(req) {
        // 实现前端签名逻辑
        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16).toString('hex');
        const bodyDigest = this._calculateBodyDigest(req.body);
        
        // 这里应该使用用户的私钥进行签名
        const signature = this._generateSignature({
            userId: req.headers['x-user-id'],
            timestamp: timestamp,
            nonce: nonce,
            bodyDigest: bodyDigest
        });
        
        return {
            timestamp: timestamp,
            nonce: nonce,
            bodyDigest: bodyDigest,
            signature: signature
        };
    }

    /**
     * 后端验签
     * @param {Object} req - 请求对象
     * @returns {boolean} 验证结果
     */
    verify(req) {
        const userId = req.headers['x-user-id'];
        const timestamp = parseInt(req.headers['x-timestamp']);
        const nonce = req.headers['x-nonce'];
        const bodyDigest = req.headers['x-body-digest'];
        const signature = req.headers['x-signature'];
        
        // 检查时间窗口
        const now = Date.now();
        if (Math.abs(now - timestamp) > this.options.timeWindow * 1000) {
            return { valid: false, error: '请求时间超出允许范围' };
        }
        
        // 检查nonce一次性
        if (this.nonceHas(userId, nonce)) {
            return { valid: false, error: '重复的nonce' };
        }
        
        // 验证body摘要
        const calculatedDigest = this._calculateBodyDigest(req.body);
        
        if (calculatedDigest !== bodyDigest) {
            return { valid: false, error: 'body摘要不匹配' };
        }
        
        // 验证签名
        const isValid = this._verifySignature({
            userId: userId,
            timestamp: timestamp,
            nonce: nonce,
            bodyDigest: bodyDigest,
            signature: signature
        });
        
        if (isValid) {
            // 添加nonce到存储中
            this.nonceAdd(userId, nonce);
            return { valid: true };
        } else {
            return { valid: false, error: '签名验证失败' };
        }
    }

    /**
     * 添加nonce
     * @param {string} userId - 用户ID
     * @param {string} nonce - nonce值
     */
    nonceAdd(userId, nonce) {
        if (!this.nonceStore.has(userId)) {
            this.nonceStore.set(userId, new Set());
        }
        
        const userNonces = this.nonceStore.get(userId);
        userNonces.add(nonce);
        
        // 设置过期时间
        setTimeout(() => {
            userNonces.delete(nonce);
            if (userNonces.size === 0) {
                this.nonceStore.delete(userId);
            }
        }, this.options.nonceTTL);
    }

    /**
     * 检查nonce是否存在
     * @param {string} userId - 用户ID
     * @param {string} nonce - nonce值
     * @returns {boolean} 是否存在
     */
    nonceHas(userId, nonce) {
        if (!this.nonceStore.has(userId)) {
            return false;
        }
        
        return this.nonceStore.get(userId).has(nonce);
    }

    /**
     * 计算body摘要
     * @param {Object} body - 请求体
     * @returns {string} 摘要值
     */
    _calculateBodyDigest(body) {
        // 处理不同类型的body
        if (body === null || body === undefined) {
            return '';
        }
        
        if (typeof body === 'string' && body === '') {
            return '';
        }
        
        if (typeof body === 'object' && Object.keys(body).length === 0) {
            return '';
        }
        
        // 将body转换为字符串
        let bodyStr;
        if (typeof body === 'string') {
            bodyStr = body;
        } else {
            try {
                bodyStr = JSON.stringify(body);
            } catch (error) {
                bodyStr = String(body);
            }
        }
        
        // 使用简化的方法计算摘要，与客户端保持一致
        try {
            // 创建一个简单的哈希函数（与客户端保持一致）
            let hash = 0;
            for (let i = 0; i < bodyStr.length; i++) {
                const char = bodyStr.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // 转换为32位整数
            }
            // 将数字转换为十六进制字符串
            return Math.abs(hash).toString(16);
        } catch (error) {
            // 确保在所有情况下都返回一个字符串
            return '0';
        }
    }

    /**
     * 生成签名
     * @param {Object} data - 签名数据
     * @returns {string} 签名值
     */
    _generateSignature(data) {
        // 这里应该使用用户的私钥进行签名
        // 暂时返回模拟值
        return 'mock_signature';
    }

    /**
     * 验证签名
     * @param {Object} data - 签名数据
     * @returns {boolean} 验证结果
     */
    _verifySignature(data) {
        // 这里应该使用用户的公钥进行签名验证
        // 暂时返回模拟值
        return true;
    }
}

module.exports = AuthService;