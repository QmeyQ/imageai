/**
 * 时间管理器模块 - 提供可靠的时间管理和定时器功能
 * 
 * 该模块提供了一个增强型时间管理器，能够抵抗系统时间篡改，
 * 支持网络时间同步和精确的定时器功能。
 * 
 * 调用示例:
 * const timeManager = new TimeManager();
 * 
 * // 开始计时
 * const timerLabel = timeManager.startTimer('myTimer');
 * 
 * // 获取经过时间
 * const elapsed = timeManager.getElapsed(timerLabel);
 * 
 * // 使用增强型定时器
 * const timeoutId = timeManager.setTimeout(1000, () => {
 *   console.log('1秒后执行');
 * });
 * 
 * // 使用增强型间隔器
 * const intervalId = timeManager.setInterval(1000, () => {
 *   console.log('每秒执行');
 * });
 * 
 * // 清除定时器
 * timeManager.clearTimer(timeoutId);
 * 
 * // 获取当前可靠时间
 * const currentTime = timeManager.getCurrentTime();
 * 
 * // 销毁时间管理器
 * timeManager.destroy();
 * 
 * 属性说明:
 * - coreTime: 核心时间基准（不受本地时间篡改影响）
 * - timeOffset: 本地时间与网络时间的偏移量
 * - timeDrift: 时间漂移补偿值
 * - lastCheckTime: 上次时间检查的时间戳
 * - intervalId: 定期校准计时器ID
 * - minimalUpdateInterval: 最小更新间隔(ms)
 * - maxAllowedJump: 最大允许时间跳变(ms)
 * 
 * 方法列表:
 * - startTimer(label): 开始计时
 * - getElapsed(label): 获取计时 elapsed 时间
 * - setTimeout(ms, func): 增强型定时器
 * - setInterval(ms, func): 增强型间隔器
 * - clearTimer(id): 清除定时器
 * - calibrate(): 校准时间（与网络时间同步）
 * - getCurrentTime(): 获取当前可靠时间
 * - destroy(): 销毁时间管理器
 */

class TimeManager {
    constructor() {
        // 核心时间管理属性
        this.coreTime = Date.now(); // 内部时间基准，不受系统时间篡改影响
        this.timeOffset = 0; // 本地时间与网络时间的偏移量
        this.timeDrift = 0; // 时间漂移补偿值
        this.lastSystemTime = Date.now(); // 上次记录的系统时间
        this.lastCheckTime = 0; // 上次时间检查的时间戳
        
        // 定时器管理
        this.activeTimers = new Map(); // 存储活跃的定时器
        this.timerIdCounter = 0; // 定时器ID生成器
        
        // 配置参数
        this.minimalUpdateInterval = 100; // 最小更新间隔(ms)
        this.maxAllowedJump = 5000; // 最大允许时间跳变(ms)，超过此值视为异常
        this.calibrationInterval = 300000; // 定期校准间隔(5分钟)
        this.calibrationAttempts = 3; // 校准尝试次数
        this.calibrationSources = [
       // 国际标准时间源
    'https://worldtimeapi.org/api/timezone/Etc/UTC',          // UTC标准时间
    'https://time.jsontest.com/',                             // 简单JSON时间服务
    'http://worldclockapi.com/api/json/utc/now',              // UTC时间（HTTP）
    'https://worldclockapi.com/api/json/utc/now',             // UTC时间（HTTPS）
    'https://time.akamai.com/?iso',                           // Akamai时间服务
        ]; // 多源时间校准
        
        // 初始化时间跟踪
        this.startTimeTracking();
        
        // 启动定期校准
        this.startPeriodicCalibration();
    }

    // ======================== 核心时间维护 ========================
    /**
     * 启动时间跟踪，持续更新核心时间基准
     */
    startTimeTracking() {
        const updateCoreTime = () => {
            const currentSystemTime = Date.now();
            const systemDelta = currentSystemTime - this.lastSystemTime;
            
            // 检测时间跳变（向前或向后）
            if (Math.abs(systemDelta) > this.maxAllowedJump) {
                // 时间异常跳变，使用平均漂移补偿而不是直接跟随系统时间
                this.coreTime += Math.sign(systemDelta) * Math.min(
                    Math.abs(systemDelta), 
                    this.maxAllowedJump + this.timeDrift
                );
                console.warn(`检测到时间异常跳变: ${systemDelta}ms，已进行补偿`);
            } else {
                // 正常情况下，核心时间跟随系统时间，但加入漂移补偿
                this.coreTime += systemDelta + this.timeDrift;
            }
            
            this.lastSystemTime = currentSystemTime;
            setTimeout(updateCoreTime, this.minimalUpdateInterval);
        };
        
        updateCoreTime();
    }

    /**
     * 获取当前可靠时间（不受本地时间篡改影响）
     * @returns {number} 毫秒级时间戳
     */
    getCurrentTime() {
        // 返回核心时间 + 网络校准偏移
        return this.coreTime + this.timeOffset;
    }

    // ======================== 计时功能 ========================
    /**
     * 开始计时
     * @param {string|number} label 计时标签（可选）
     * @returns {string|number} 计时标签
     */
    startTimer(label) {
        if (label === undefined) {
            // 自动生成标签
            label = `timer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
        
        this.activeTimers.set(label, {
            type: 'stopwatch',
            startTime: this.getCurrentTime(),
            callback: null
        });
        
        return label;
    }

    /**
     * 获取计时已过去的时间
     * @param {string|number} label 计时标签
     * @returns {number} 已过去的毫秒数
     */
    getElapsed(label) {
        if (!this.activeTimers.has(label)) {
            console.warn(`计时标签不存在: ${label}`);
            return 0;
        }
        
        const timer = this.activeTimers.get(label);
        return this.getCurrentTime() - timer.startTime;
    }

    // ======================== 定时器功能 ========================
    /**
     * 增强型setTimeout，抵抗时间篡改
     * @param {number} ms 延迟毫秒数
     * @param {Function} func 回调函数
     * @returns {string} 定时器ID
     */
    setTimeout(ms, func) {
        const timerId = `timeout-${this.timerIdCounter++}`;
        const targetTime = this.getCurrentTime() + ms;
        
        const checkTimeout = () => {
            if (!this.activeTimers.has(timerId)) return;
            
            if (this.getCurrentTime() >= targetTime) {
                this.activeTimers.delete(timerId);
                func();
            } else {
                // 计算下次检查的时间（最多100ms，避免长时间阻塞）
                const nextCheck = Math.min(
                    100, 
                    targetTime - this.getCurrentTime()
                );
                this.activeTimers.get(timerId).timeoutId = setTimeout(checkTimeout, nextCheck);
            }
        };
        
        this.activeTimers.set(timerId, {
            type: 'timeout',
            targetTime,
            callback: func,
            timeoutId: setTimeout(checkTimeout, Math.min(ms, 100))
        });
        
        return timerId;
    }

    /**
     * 增强型setInterval，抵抗时间篡改
     * @param {number} ms 间隔毫秒数
     * @param {Function} func 回调函数
     * @returns {string} 定时器ID
     */
    setInterval(ms, func) {
        const timerId = `interval-${this.timerIdCounter++}`;
        let targetTime = this.getCurrentTime() + ms;
        
        const checkInterval = () => {
            if (!this.activeTimers.has(timerId)) return;
            
            if (this.getCurrentTime() >= targetTime) {
                func();
                // 计算下一次目标时间（基于当前时间，避免累积误差）
                targetTime = this.getCurrentTime() + ms;
                this.activeTimers.get(timerId).targetTime = targetTime;
            }
            
            // 安排下一次检查
            const nextCheck = Math.min(
                100, 
                targetTime - this.getCurrentTime()
            );
            this.activeTimers.get(timerId).timeoutId = setTimeout(checkInterval, nextCheck);
        };
        
        this.activeTimers.set(timerId, {
            type: 'interval',
            targetTime,
            interval: ms,
            callback: func,
            timeoutId: setTimeout(checkInterval, Math.min(ms, 100))
        });
        
        return timerId;
    }

    /**
     * 清除定时器
     * @param {string} id 定时器ID
     */
    clearTimer(id) {
        if (this.activeTimers.has(id)) {
            clearTimeout(this.activeTimers.get(id).timeoutId);
            this.activeTimers.delete(id);
        }
    }

    // ======================== 时间校准 ========================
    /**
     * 启动定期时间校准
     */
    startPeriodicCalibration() {
        this.intervalId = setInterval(() => {
            this.calibrate();
        }, this.calibrationInterval);
        
        // 立即进行首次校准
        this.calibrate();
    }

    /**
     * 校准时间（与多个网络时间源同步）
     * @returns {Promise<number>} 校准后的时间偏移量
     */
    async calibrate() {
        const currentAttempt = 0;
        const results = [];
        
        // 尝试多个时间源
        for (const source of this.calibrationSources) {
            try {
                const response = await this.fetchNetworkTime(source);
                if (response !== null) {
                    results.push(response);
                }
            } catch (error) {
                console.warn(`时间校准源 ${source} 失败:`, error);
            }
        }
        
        if (results.length === 0) {
            console.error('所有时间校准源均失败，无法校准时间');
            return this.timeOffset;
        }
        
        // 计算多个源的平均时间，排除异常值
        const sorted = results.sort((a, b) => a - b);
        const filtered = sorted.slice(1, -1); // 去除最高和最低值
        const reliableResults = filtered.length > 0 ? filtered : sorted;
        
        // 计算新的时间偏移
        const networkTimeAvg = reliableResults.reduce((sum, time) => sum + time, 0) / reliableResults.length;
        const newOffset = networkTimeAvg - this.coreTime;
        
        // 平滑过渡到新的偏移值（避免突变）
        const offsetDiff = newOffset - this.timeOffset;
        if (Math.abs(offsetDiff) > this.maxAllowedJump) {
            // 偏移过大，可能是网络错误，仅部分应用
            this.timeOffset += offsetDiff * 0.2;
            console.warn(`时间偏移过大(${offsetDiff}ms)，已部分调整`);
        } else {
            // 正常偏移，平滑应用
            this.timeOffset = newOffset;
        }
        
        // 计算时间漂移（长期系统时钟偏差）
        const now = Date.now();
        if (this.lastCheckTime > 0) {
            const elapsed = now - this.lastCheckTime;
            const systemDrift = (now - this.lastSystemTime) - elapsed;
            this.timeDrift = (this.timeDrift * 0.7 + systemDrift * 0.3) / 1000;
        }
        this.lastCheckTime = now;
        
        console.log(`时间校准完成，偏移量: ${this.timeOffset.toFixed(2)}ms，漂移补偿: ${this.timeDrift.toFixed(6)}ms/ms`);
        return this.timeOffset;
    }

    /**
     * 从网络获取时间
     * @param {string} url 时间API地址
     * @returns {Promise<number|null>} 网络时间戳（毫秒）
     */
    async fetchNetworkTime(url) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
            
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            let dateTime;
            
            // 处理不同API的返回格式
            if (data.dateTime) {
                dateTime = new Date(data.dateTime).getTime();
            } else if (data.utc_datetime) {
                dateTime = new Date(data.utc_datetime).getTime();
            } else if (data.timestamp) {
                dateTime = data.timestamp * 1000;
            } else {
                throw new Error('无法解析时间数据');
            }
            
            // 计算往返延迟并补偿
            const roundTripTime = Date.now() - this.lastSystemTime;
            return dateTime + roundTripTime / 2; // 假设延迟均匀分布
            
        } catch (error) {
            console.error(`获取网络时间失败: ${error.message}`);
            return null;
        }
    }

    // ======================== 销毁方法 ========================
    /**
     * 销毁时间管理器，清理所有定时器
     */
    destroy() {
        // 清除所有活跃定时器
        this.activeTimers.forEach(timer => {
            clearTimeout(timer.timeoutId);
        });
        this.activeTimers.clear();
        
        // 清除定期校准
        clearInterval(this.intervalId);
        
        console.log('时间管理器已销毁');
    }
}
    