/**
 * 配额服务模块（客户端版本） - 处理客户端用户配额管理
 * 
 * 调用示例:
 * const quotaService = new QuotaService();
 * 
 * // 提交即扣配额
 * const success = quotaService.deduct(user, 1);
 * 
 * // 失败返还配额
 * quotaService.refund(user, 1);
 * 
 * // 增加已使用配额
 * quotaService.increaseUsedQuota(user, 1);
 * 
 * // 检查是否达到配额封顶
 * const isCapped = quotaService.cap(user);
 * 
 * // 检查幂等键是否存在
 * const exists = quotaService.idemHas('key');
 * 
 * // 设置幂等键
 * quotaService.idemSet('key');
 * 
 * 属性说明:
 * - idempotencyStore: 幂等键存储集合
 * 
 * 方法列表:
 * - constructor(): 创建配额服务实例
 * - deduct(user, cost): 提交即扣配额
 * - refund(user, cost): 失败返还配额
 * - increaseUsedQuota(user, cost): 增加已使用配额
 * - cap(user): 检查是否达到配额封顶
 * - idemHas(key): 检查幂等键是否存在
 * - idemSet(key): 设置幂等键
 */

class QuotaService {
    /**
     * 创建配额服务实例
     */
    constructor() {
        this.idempotencyStore = new Set();
    }

    /**
     * 提交即扣
     * @param {Object} user - 用户对象
     * @param {number} cost - 成本（可选，默认为1）
     * @returns {boolean} 是否成功扣费
     */
    deduct(user, cost = 1) {
        // 检查用户是否存在
        if (!user) {
            return false;
        }
        
        // 检查是否有足够的配额
        if (user.quotaRemaining < cost) {
            return false;
        }
        
        // 扣除配额
        user.reserved += cost;
        user.quotaRemaining -= cost;
        
        return true;
    }

    /**
     * 失败返还
     * @param {Object} user - 用户对象
     * @param {number} cost - 成本（可选，默认为1）
     */
    refund(user, cost = 1) {
        if (!user) {
            return;
        }
        
        // 返还配额
        user.reserved -= cost;
        user.quotaRemaining += cost;
        
        // 确保不超过总额度
        const maxQuota = user.quotaTotal - user.quotaUsed;
        if (user.quotaRemaining > maxQuota) {
            user.quotaRemaining = maxQuota;
        }
    }

    /**
     * 增加已使用配额
     * @param {Object} user - 用户对象
     * @param {number} cost - 成本（可选，默认为1）
     */
    increaseUsedQuota(user, cost = 1) {
        if (!user) {
            return;
        }
        
        // 增加已使用配额
        user.quotaUsed += cost;
        user.reserved -= cost;
    }

    /**
     * 封顶不超额
     * @param {Object} user - 用户对象
     * @returns {boolean} 是否达到封顶
     */
    cap(user) {
        if (!user) {
            return true; // 如果没有用户信息，则认为达到封顶
        }
        
        // 检查是否达到封顶
        return user.quotaRemaining <= 0;
    }

    /**
     * 检查幂等键是否存在
     * @param {string} key - 幂等键
     * @returns {boolean} 是否存在
     */
    idemHas(key) {
        return this.idempotencyStore.has(key);
    }

    /**
     * 设置幂等键
     * @param {string} key - 幂等键
     */
    idemSet(key) {
        // 存储幂等键，设置过期时间(24小时)
        this.idempotencyStore.add(key);
        
        // 设置24小时后自动清理
        setTimeout(() => {
            this.idempotencyStore.delete(key);
        }, 24 * 60 * 60 * 1000);
    }
}

// 全局实例
window.QuotaService = QuotaService;