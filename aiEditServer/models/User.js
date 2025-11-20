/**
 * 用户模型模块
 * 
 * 该模块定义了用户数据模型，包括用户的基本信息、配额信息和认证信息。
 * 提供用户数据的验证、存储和检索功能，确保用户数据的一致性和安全性。
 * 
 * 主要功能：
 * - 用户数据模型定义
 * - 用户信息验证
 * - 配额管理
 * - 认证信息处理
 * - 用户数据持久化
 * 
 * @module models/User
 * @class User
 * @property {string} id - 用户ID
 * @property {string} username - 用户名
 * @property {string} password - 密码（加密存储）
 * @property {string} email - 邮箱
 * @property {number} quotaTotal - 总配额
 * @property {number} quotaUsed - 已使用配额
 * @property {number} quotaRemaining - 剩余配额
 * @property {number} reserved - 预留配额
 * @property {string} publicKey - 公钥
 * @property {string} privateKey - 私钥
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 * @method validate - 验证用户数据
 * @method toJSON - 转换为JSON对象
 * @method fromJSON - 从JSON对象创建用户
 */

/**
 * 用户模型 - 定义用户数据结构
 */

class User {
    /**
     * 创建用户实例
     * @param {Object} data - 用户数据
     */
    constructor(data = {}) {
        this.id = data.id || this._generateId();
        this.username = data.username || '';
        this.password = data.password || ''; // 添加密码字段
        this.role = data.role || 'user'; // user, admin
        this.publicKey = data.publicKey || '';
        this.quotaTotal = data.quotaTotal || 0;
        this.quotaUsed = data.quotaUsed || 0;
        this.quotaRemaining = data.quotaRemaining || 0;
        this.reserved = data.reserved || 0;
        this.active = data.active !== undefined ? data.active : true;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * 生成用户ID
     * @returns {string} 用户ID
     */
    _generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 检查是否有足够的配额
     * @returns {boolean} 是否有足够配额
     */
    hasQuota() {
        return this.quotaRemaining > 0;
    }

    /**
     * 扣除配额
     * @param {number} amount - 扣除数量
     * @returns {boolean} 是否成功扣除
     */
    deductQuota(amount = 1) {
        if (this.quotaRemaining >= amount) {
            this.quotaRemaining -= amount;
            this.reserved += amount;
            this.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    /**
     * 返还配额
     * @param {number} amount - 返还数量
     */
    refundQuota(amount = 1) {
        this.reserved -= amount;
        this.quotaRemaining += amount;
        
        // 确保不超过总额度
        const maxQuota = this.quotaTotal - this.quotaUsed;
        if (this.quotaRemaining > maxQuota) {
            this.quotaRemaining = maxQuota;
        }
        
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 增加已使用配额
     * @param {number} amount - 增加数量
     */
    increaseUsedQuota(amount = 1) {
        this.reserved -= amount;
        this.quotaUsed += amount;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 转换为JSON对象
     * @returns {Object} 用户数据对象
     */
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            password: this.password, // 包含密码字段
            role: this.role,
            publicKey: this.publicKey,
            quotaTotal: this.quotaTotal,
            quotaUsed: this.quotaUsed,
            quotaRemaining: this.quotaRemaining,
            reserved: this.reserved,
            active: this.active,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * 从JSON对象创建用户实例
     * @param {Object} data - 用户数据
     * @returns {User} 用户实例
     */
    static fromJSON(data) {
        return new User(data);
    }
}

module.exports = User;