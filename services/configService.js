/**
 * 配置服务模块
 * 
 * 该模块管理应用程序的配置信息，包括服务器设置、目录路径、外部服务配置等。
 * 支持从环境变量、配置文件和默认值多种方式加载配置，并提供配置验证功能。
 * 
 * 主要功能：
 * - 配置加载和管理
 * - 环境变量集成
 * - 配置验证
 * - 默认值设置
 * - 配置更新
 * 
 * @module services/config
 * @class ConfigService
 * @property {Object} config - 配置对象
 * @property {number} config.port - 服务器端口
 * @property {string} config.host - 服务器主机
 * @property {string} config.uploadDir - 上传目录路径
 * @property {string} config.externalUrl - 外部URL
 * @property {number} config.maxFileSize - 最大文件大小
 * @property {number} config.resultExpiryDays - 结果过期天数
 * @method loadFromEnv - 从环境变量加载配置
 * @method validate - 验证配置
 * @method get - 获取配置项
 * @method getAll - 获取所有配置
 * @method set - 设置配置项
 */

class ConfigService {
    /**
     * 创建配置服务实例
     * @param {Object} defaultConfig - 默认配置
     */
    constructor(defaultConfig = {}) {
        this.config = {
            // 服务器配置
            port: 3000,
            host: '0.0.0.0',
            
            // 文件上传配置
            uploadDir: './360house-master/uploads',
            maxFileSize: 10 * 1024 * 1024, // 10MB
            
            // 外部URL配置
            externalUrl: 'http://normalgame.cn/uploads/',
            externalBaseUrl: 'http://normalgame.cn',
            
            // 结果过期配置
            resultExpiryDays: 3,
            
            // 清理配置
            unprocessedImageExpiryHours: 1,
            
            // API配置
            apiExpiryDays: 3,
            
            // DashScope配置
            dashScopeModel: 'wanx2.1-imageedit',
            
            ...defaultConfig
        };
    }

    /**
     * 获取配置值
     * @param {string} key - 配置键
     * @param {*} defaultValue - 默认值
     * @returns {*} 配置值
     */
    get(key, defaultValue = null) {
        return this.config[key] !== undefined ? this.config[key] : defaultValue;
    }

    /**
     * 设置配置值
     * @param {string} key - 配置键
     * @param {*} value - 配置值
     */
    set(key, value) {
        this.config[key] = value;
    }

    /**
     * 获取所有配置
     * @returns {Object} 配置对象
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * 更新配置
     * @param {Object} newConfig - 新配置
     */
    update(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 验证配置
     * @returns {Object} 验证结果 {valid: boolean, errors: Array}
     */
    validate() {
        const errors = [];
        
        // 验证必需的配置项
        if (!this.config.uploadDir) {
            errors.push('uploadDir 配置项不能为空');
        }
        
        if (!this.config.externalBaseUrl) {
            errors.push('externalBaseUrl 配置项不能为空');
        }
        
        if (this.config.maxFileSize <= 0) {
            errors.push('maxFileSize 配置项必须大于0');
        }
        
        if (this.config.resultExpiryDays <= 0) {
            errors.push('resultExpiryDays 配置项必须大于0');
        }
        
        if (this.config.apiExpiryDays <= 0) {
            errors.push('apiExpiryDays 配置项必须大于0');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 从环境变量加载配置
     */
    loadFromEnv() {
        const envMappings = {
            'PORT': 'port',
            'HOST': 'host',
            'UPLOAD_DIR': 'uploadDir',
            'MAX_FILE_SIZE': 'maxFileSize',
            'EXTERNAL_URL': 'externalUrl',
            'EXTERNAL_BASE_URL': 'externalBaseUrl',
            'RESULT_EXPIRY_DAYS': 'resultExpiryDays',
            'API_EXPIRY_DAYS': 'apiExpiryDays',
            'DASHSCOPE_MODEL': 'dashScopeModel'
        };
        
        for (const [envKey, configKey] of Object.entries(envMappings)) {
            if (process.env[envKey] !== undefined) {
                let value = process.env[envKey];
                
                // 对数字类型的配置进行转换
                if (['port', 'maxFileSize', 'resultExpiryDays', 'apiExpiryDays'].includes(configKey)) {
                    value = parseInt(value, 10);
                }
                
                this.config[configKey] = value;
            }
        }
    }
}

module.exports = ConfigService;