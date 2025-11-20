/**
 * 用户服务模块 - 提供用户数据管理功能
 * 
 * 调用示例:
 * const UserService = require('./services/userService.js');
 * const userService = new UserService();
 * 
 * // 查找用户
 * userService.findByUsername('username', (err, user) => {
 *   if (!err && user) console.log('找到用户:', user);
 * });
 * 
 * // 创建用户
 * userService.create({ username: 'test', password: 'pass' }, (err, user) => {
 *   if (!err) console.log('用户创建成功:', user);
 * });
 * 
 * 属性说明:
 * - users: 用户数据存储（内存中）
 * 
 * 方法列表:
 * - constructor(): 创建用户服务实例
 * - findByUsername(username, callback): 根据用户名查找用户
 * - findById(userId, callback): 根据用户ID查找用户
 * - create(userData, callback): 创建新用户
 * - _generateId(): 生成用户ID
 */

const User = require('../models/User.js');
const fs = require('fs');
const path = require('path');

class UserService {
    /**
     * 创建用户服务实例
     */
    constructor() {
        // 用户数据存储文件路径
        this.usersFilePath = path.join(__dirname, '../data/users.json');
        // 确保数据目录存在
        this._ensureDataDir();
        // 加载用户数据
        this.users = this._loadUsers();
    }

    /**
     * 确保数据目录存在
     */
    _ensureDataDir() {
        const dataDir = path.dirname(this.usersFilePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    /**
     * 加载用户数据
     * @returns {Object} 用户数据映射
     */
    _loadUsers() {
        try {
            if (fs.existsSync(this.usersFilePath)) {
                const data = fs.readFileSync(this.usersFilePath, 'utf8');
                const usersData = JSON.parse(data);
                const users = {};
                for (const [key, value] of Object.entries(usersData)) {
                    users[key] = User.fromJSON(value);
                }
                return users;
            }
        } catch (error) {
            console.error('加载用户数据失败:', error);
        }
        return {};
    }

    /**
     * 保存用户数据
     */
    _saveUsers() {
        try {
            const usersData = {};
            for (const [key, value] of Object.entries(this.users)) {
                usersData[key] = value.toJSON();
            }
            fs.writeFileSync(this.usersFilePath, JSON.stringify(usersData, null, 2));
            console.log('用户数据已保存:', usersData); // 添加调试日志
        } catch (error) {
            console.error('保存用户数据失败:', error);
        }
    }

    /**
     * 创建新用户
     * @param {Object} userData - 用户数据
     * @param {Function} callback - 回调函数 (error, user)
     */
    create(userData, callback) {
        // 检查用户是否已存在
        if (this.users[userData.username]) {
            callback(new Error('用户已存在'));
            return;
        }

        // 创建新用户
        const user = new User({
            username: userData.username,
            password: userData.password // 在实际实现中，应该哈希存储密码
        });

        // 保存用户
        this.users[userData.username] = user;
        this._saveUsers();

        callback(null, user);
    }

    /**
     * 根据用户名查找用户
     * @param {string} username - 用户名
     * @param {Function} callback - 回调函数 (error, user)
     */
    findByUsername(username, callback) {
        const user = this.users[username];
        callback(null, user || null);
    }

    /**
     * 根据用户ID查找用户
     * @param {string} userId - 用户ID
     * @param {Function} callback - 回调函数 (error, user)
     */
    findById(userId, callback) {
        // 在用户数据中查找匹配ID的用户
        for (const user of Object.values(this.users)) {
            if (user.id === userId) {
                callback(null, user);
                return;
            }
        }
        callback(null, null);
    }

    /**
     * 生成用户ID
     * @returns {string} 用户ID
     */
    _generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

module.exports = UserService;