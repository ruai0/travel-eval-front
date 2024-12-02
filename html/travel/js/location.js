class LocationService {
    constructor() {
        this.key = 'NMIBZ-JAQLZ-WGYX7-ZYKXV-K5IX3-LGFKM';
        this.lastLocation = null;
        this.init();
    }

    async init() {
        try {
            this.lastLocation = await this.getIpLocation();
            if (this.lastLocation) {
                // 获取到位置信息后立即上报
                await this.reportLocationInfo(this.lastLocation);
            }
        } catch (error) {
            console.error('Location service initialization failed:', error);
        }
    }

    getIpLocation() {
        return new Promise((resolve, reject) => {
            // 创建一个唯一的回调函数名
            const callbackName = 'qq_ip_location_' + Date.now();
            
            // 创建script标签
            const script = document.createElement('script');
            
            // 设置全局回调函数
            window[callbackName] = (response) => {
                document.body.removeChild(script);
                delete window[callbackName];
                
                if (response.status === 0) {
                    const result = response.result;
                    const location = {
                        latitude: result.location.lat,
                        longitude: result.location.lng,
                        nation: result.ad_info.nation,
                        province: result.ad_info.province,
                        city: result.ad_info.city,
                        district: result.ad_info.district,
                        adcode: result.ad_info.adcode
                    };
                    this.lastLocation = location;
                    resolve(location);
                } else {
                    reject(new Error(response.message || 'IP定位失败'));
                }
            };

            // 处理加载失败的情况
            script.onerror = () => {
                document.body.removeChild(script);
                delete window[callbackName];
                reject(new Error('IP定位服务加载失败'));
            };

            // 设置script的src，注意使用JSONP方式
            script.src = `https://apis.map.qq.com/ws/location/v1/ip?key=${this.key}&output=jsonp&callback=${callbackName}`;
            
            // 将script标签添加到页面
            document.body.appendChild(script);
        });
    }

    async reportLocationInfo(location) {
        try {
            // 构建访问记录DTO
            const visitRecord = {
                ...location,
                timestamp: new Date().getTime(),
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };

            // 发送到后端接口
            const response = await axios.post('/visit/record', visitRecord);
            
            // 检查响应是否成功，不再依赖特定的code字段
            if (response.data && response.data.success) {
                console.log('Location info reported successfully');
            } else {
                console.warn('Failed to report location info:', response.data?.msg || 'Unknown error');
            }
        } catch (error) {
            console.error('Failed to report location info:', error);
        }
    }

    getCurrentLocation() {
        return this.getIpLocation();
    }
}