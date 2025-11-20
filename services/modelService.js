/**
 * 模型服务模块
 * 
 * 该模块管理AI模型的相关信息和服务，包括模型列表、操作类型、配额成本等。
 * 提供模型信息的查询和管理功能，支持动态模型配置和操作类型获取。
 * 
 * 主要功能：
 * - 模型信息管理
 * - 操作类型查询
 * - 配额成本计算
 * - 模型列表获取
 * - 模型详情查询
 * 
 * @module services/model
 * @class ModelService
 * @property {Object} models - 模型信息映射
 * @property {Object} operations - 操作类型映射
 * @method getModels - 获取模型列表
 * @method getModelOperations - 获取模型支持的操作
 * @method getOperationCost - 获取操作成本
 * @method getModelInfo - 获取模型信息
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ModelService {
    /**
     * 创建模型服务实例
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = {
            configPath: path.join(__dirname, '../models.json'),
            ...options
        };
        
        // 加载模型配置
        this.models = this._loadModels();
        
        // 计算配置版本
        this.configVersion = this._calculateConfigVersion();
    }

    /**
     * 加载模型配置
     * @returns {Object} 模型配置对象
     */
    _loadModels() {
        try {
            const configData = fs.readFileSync(this.options.configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.error('加载模型配置失败:', error);
            return {};
        }
    }

    /**
     * 计算配置版本（基于文件内容的哈希值）
     * @returns {string} 配置版本哈希
     */
    _calculateConfigVersion() {
        try {
            const configData = fs.readFileSync(this.options.configPath, 'utf8');
            return crypto.createHash('md5').update(configData).digest('hex');
        } catch (error) {
            console.error('计算配置版本失败:', error);
            return 'unknown';
        }
    }

    /**
     * 获取配置版本
     * @returns {string} 配置版本
     */
    getConfigVersion() {
        return this.configVersion;
    }

    /**
     * 获取所有可用模型
     * @returns {Array} 模型列表
     */
    list() {
        return Object.values(this.models);
    }

    /**
     * 获取特定模型配置
     * @param {string} modelId - 模型ID
     * @returns {Object|null} 模型配置或null
     */
    get(modelId) {
        return this.models[modelId] || null;
    }

    /**
     * 验证模型和操作是否匹配
     * @param {string} modelId - 模型ID
     * @param {string} operation - 操作类型
     * @returns {boolean} 是否匹配
     */
    validate(modelId, operation) {
        const model = this.get(modelId);
        if (!model) {
            return false;
        }
        
        return model.supportedOperations.includes(operation);
    }

    /**
     * 获取模型支持的操作列表
     * @param {string} modelId - 模型ID
     * @returns {Array} 支持的操作列表
     */
    getOperations(modelId) {
        const model = this.get(modelId);
        if (!model) {
            return [];
        }
        
        return model.supportedOperations || [];
    }

    /**
     * 根据成本获取模型
     * @param {number} cost - 成本
     * @returns {Array} 匹配的模型列表
     */
    getByCost(cost) {
        return Object.values(this.models).filter(model => model.cost === cost);
    }

    /**
     * 获取模型参数Schema
     * @param {string} modelId - 模型ID
     * @returns {Object} 参数Schema
     */
    getParamsSchema(modelId) {
        const model = this.get(modelId);
        if (!model) {
            return {};
        }
        
        return model.paramsSchema || {};
    }

    /**
     * 验证参数是否符合模型要求
     * @param {string} modelId - 模型ID
     * @param {Object} params - 参数对象
     * @returns {Object} 验证结果 {valid: boolean, errors: Array}
     */
    validateParams(modelId, params) {
        const schema = this.getParamsSchema(modelId);
        const errors = [];
        
        // 如果没有Schema，直接返回成功
        if (!schema || Object.keys(schema).length === 0) {
            return { valid: true, errors: [] };
        }
        
        // 验证每个参数
        Object.keys(schema).forEach(paramName => {
            const paramSchema = schema[paramName];
            const paramValue = params[paramName];
            
            // 检查必填参数
            if (paramSchema.required && (paramValue === undefined || paramValue === null)) {
                errors.push(`缺少必填参数: ${paramName}`);
                return;
            }
            
            // 如果参数为空且非必填，跳过验证
            if (paramValue === undefined || paramValue === null) {
                return;
            }
            
            // 类型检查
            if (paramSchema.type) {
                const valueType = typeof paramValue;
                if (valueType !== paramSchema.type) {
                    errors.push(`参数 ${paramName} 类型不匹配，期望 ${paramSchema.type}，实际 ${valueType}`);
                }
            }
            
            // 数值范围检查
            if (typeof paramValue === 'number') {
                if (paramSchema.min !== undefined && paramValue < paramSchema.min) {
                    errors.push(`参数 ${paramName} 值过小，最小值 ${paramSchema.min}`);
                }
                if (paramSchema.max !== undefined && paramValue > paramSchema.max) {
                    errors.push(`参数 ${paramName} 值过大，最大值 ${paramSchema.max}`);
                }
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

module.exports = ModelService;