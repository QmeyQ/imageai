/**
 * 鉴权服务模块（客户端版本） - 处理客户端用户认证和安全验证相关功能
 * 
 * 调用示例:
 * const authService = new AuthService();
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
 * authService.sign({ data: 'request-data' }).then((signature) => {
 *   console.log('签名生成成功:', signature);
 * });
 * 
 * // 检查nonce是否存在
 * const exists = authService.nonceHas('nonce-value');
 * 
 * // 添加nonce
 * authService.nonceAdd('nonce-value');
 * 
 * 属性说明:
 * - user: 当前用户信息
 * - publicKey: 用户公钥
 * - nonceStore: Nonce存储集合
 * 
 * 方法列表:
 * - constructor(): 创建鉴权服务实例
 * - reg(user, callback): 用户注册
 * - login(user, callback): 用户登录
 * - sign(data): 前端签名生成
 * - _generateNonce(): 生成随机nonce
 * - _calculateBodyDigest(body): 计算请求体摘要
 * - _simpleSHA256(str): 简单的SHA256哈希实现
 * - _generateSignature(data): 生成签名
 * - nonceHas(nonce): 检查nonce是否存在
 * - nonceAdd(nonce): 添加nonce
 */

class AuthService {
    /**
     * 创建鉴权服务实例
     */
    constructor() {
        this.user = null;
        this.publicKey = null;
        this.nonceStore = new Set();
    }

    /**
     * 用户注册
     * @param {Object} user - 用户信息
     * @param {Function} callback - 回调函数
     */
    reg(user, callback) {
        // 发送注册请求到服务器
        window.Net.post('/auth/register', user, (error, result) => {
            if (error) {
                callback(error);
                return;
            }
            
            if (result.success) {
                this.user = result.data.user;
                this.publicKey = result.data.publicKey;
                callback(null, result);
            } else {
                callback(new Error(result.message || '注册失败'));
            }
        });
    }

    /**
     * 用户登录
     * @param {Object} user - 用户信息
     * @param {Function} callback - 回调函数
     */
    login(user, callback) {
        // 发送登录请求到服务器
        window.Net.post('/auth/login', user, (error, result) => {
            if (error) {
                callback(error);
                return;
            }
            
            if (result.success) {
                this.user = result.data.user;
                this.publicKey = result.data.publicKey;
                callback(null, result);
            } else {
                callback(new Error(result.message || '登录失败'));
            }
        });
    }

    /**
     * 前端签名
     * @param {Object} data - 签名数据
     * @returns {Promise<Object>} 签名信息Promise
     */
    sign(data) {
        // 检查用户是否已登录
        if (!this.user) {
            console.warn('用户未登录，无法生成签名');
            return Promise.resolve({});
        }
        
        // 生成时间戳
        const timestamp = Date.now();
        
        // 生成随机nonce
        const nonce = this._generateNonce();
        
        // 返回一个Promise，处理异步签名生成
        return new Promise((resolve) => {
            // 计算body摘要
            this._calculateBodyDigest(data).then((bodyDigest) => {
                // 生成签名（这里简化处理，实际应该使用WebCrypto API）
                const signature = this._generateSignature({
                    userId: this.user.id,
                    timestamp: timestamp,
                    nonce: nonce,
                    bodyDigest: bodyDigest
                });
                
                // 存储nonce防止重放
                this.nonceStore.add(nonce);
                
                // 清理过期的nonce（15分钟后过期）
                setTimeout(() => {
                    this.nonceStore.delete(nonce);
                }, 15 * 60 * 1000);
                
                resolve({
                    'x-user-id': this.user.id,
                    'x-timestamp': timestamp,
                    'x-nonce': nonce,
                    'x-body-digest': bodyDigest,
                    'x-signature': signature
                });
            }).catch((error) => {
                console.warn('签名生成失败:', error);
                resolve({});
            });
        });
    }

    /**
     * 生成随机nonce
     * @returns {string} nonce值
     */
    _generateNonce() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    /**
     * 计算body摘要
     * @param {Object} body - 请求体
     * @returns {Promise<string>} 摘要值Promise
     */
    _calculateBodyDigest(body) {
        // 处理不同类型的body
        if (body === null || body === undefined) {
            return Promise.resolve('');
        }
        
        if (typeof body === 'string' && body === '') {
            return Promise.resolve('');
        }
        
        if (typeof body === 'object' && Object.keys(body).length === 0) {
            return Promise.resolve('');
        }
        
        // 将body转换为字符串
        let bodyStr;
        if (typeof body === 'string') {
            bodyStr = body;
        } else {
            try {
                bodyStr = JSON.stringify(body);
            } catch (error) {
                console.warn('JSON序列化失败:', error);
                bodyStr = String(body);
            }
        }
        
        // 使用同步方式计算SHA256哈希，与服务端保持一致
        try {
            // 创建一个简单的SHA256哈希函数（简化版，仅用于演示）
            // 在实际项目中，应该使用Web Crypto API或其他加密库
            return Promise.resolve(this._simpleSHA256(bodyStr));
        } catch (error) {
            console.warn('摘要计算失败，使用备用方法:', error);
            return Promise.resolve(btoa(bodyStr).substring(0, 64)); // 使用Base64作为备用
        }
    }

    /**
     * 简单的SHA256哈希实现（仅用于演示，实际项目中应使用标准库）
     * @param {string} str - 输入字符串
     * @returns {string} 哈希值
     */
    _simpleSHA256(str) {
        // 这是一个非常简化的实现，仅用于演示
        // 实际项目中应该使用Web Crypto API
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        // 将数字转换为十六进制字符串
        return Math.abs(hash).toString(16);
    }

    /**
     * 生成签名
     * @param {Object} data - 签名数据
     * @returns {string} 签名值
     */
    _generateSignature(data) {
        // 简化处理，实际应该使用WebCrypto API进行签名
        const dataStr = JSON.stringify(data);
        return btoa(dataStr).substring(0, 64);
    }

    /**
     * 检查nonce是否存在
     * @param {string} nonce - nonce值
     * @returns {boolean} 是否存在
     */
    nonceHas(nonce) {
        return this.nonceStore.has(nonce);
    }

    /**
     * 添加nonce
     * @param {string} nonce - nonce值
     */
    nonceAdd(nonce) {
        this.nonceStore.add(nonce);
    }
}

// 全局实例
window.AuthService = AuthService;