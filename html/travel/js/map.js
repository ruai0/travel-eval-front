new Vue({
    el: '#app',
    data: {
        map: null,
        markerLayer: null,
        infoWindow: null,
        geolocation: null,
        currentLocation: null,
        isLocating: false
    },
    async created() {
        await this.loadGeolocationScript();
        // 先获取位置，再初始化地图
        try {
            const position = await this.getCurrentPosition();
            await this.initMap(position);
        } catch (error) {
            console.error('获取初始位置失败:', error);
            // 如果获取位置失败，使用默认位置初始化地图
            await this.initMap();
        }
    },
    methods: {
        loadGeolocationScript() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.charset = 'utf-8';
                script.src = 'https://apis.map.qq.com/tools/geolocation/min?key=NMIBZ-JAQLZ-WGYX7-ZYKXV-K5IX3-LGFKM&referer=travel';
                script.onload = () => {
                    this.geolocation = new qq.maps.Geolocation(
                        "NMIBZ-JAQLZ-WGYX7-ZYKXV-K5IX3-LGFKM",
                        "travel",
                        {
                            useIPLocation: true,
                            enableHighAccuracy: true,
                            timeout: 8000,
                            maximumAge: 5000,
                            failTipFlag: true
                        }
                    );
                    resolve();
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },

        // 新增方法：获取当前位置
        getCurrentPosition() {
            return new Promise((resolve, reject) => {
                if (!this.geolocation) {
                    reject(new Error('定位服务未初始化'));
                    return;
                }

                this.geolocation.getLocation(
                    (pos) => {
                        if (pos.lat && pos.lng) {
                            resolve({
                                position: new TMap.LatLng(pos.lat, pos.lng),
                                address: pos.addr || `${pos.province || ''}${pos.city || ''}${pos.district || ''}`
                            });
                        } else {
                            reject(new Error('未获取到有效的位置信息'));
                        }
                    },
                    (err) => {
                        reject(err);
                    },
                    { timeout: 8000, failTipFlag: true }
                );
            });
        },

        async initMap(initialPosition) {
            try {
                const container = document.getElementById('map-container');
                if (!container) {
                    throw new Error('地图容器不存在');
                }

                // 初始化地图
                this.map = new TMap.Map(container, {
                    zoom: 16,
                    pitch: 0,
                    rotation: 0,
                    viewMode: '2D',
                    baseMap: {
                        type: 'vector',
                        features: ['base', 'building2d', 'building3d', 'point', 'label']
                    },
                    control: {
                        zoom: true,
                        scale: true,
                        mapType: true
                    },
                    // 如果有初始位置就使用，否则使用默认位置
                    center: initialPosition?.position || new TMap.LatLng(39.908802, 116.397502)
                });
                // 初始化标记图层和信息窗
                this.initMarkerLayer();
                this.initInfoWindow();

                // 如果有初始位置，添加标记和信息窗
                if (initialPosition) {
                    this.updateLocationMarker(initialPosition.position, initialPosition.address);
                }
                // 等待地图加载完成
                await new Promise(resolve => {
                    this.map.on('load', resolve);
                });
              

            } catch (error) {
                console.error('地图初始化失败:', error);
                this.$message.error('地图加载失败，请刷新页面重试');
            }
        },

        // 新增方法：更新位置标记和信息窗
        updateLocationMarker(position, address) {
            try {
                // 更新标记
                if (this.markerLayer) {
                    const currentMarker = this.markerLayer.getGeometries().find(g => g.id === 'current-location');
                    if (currentMarker) {
                        this.markerLayer.remove('current-location');
                    }
                    
                    this.markerLayer.add([{
                        id: 'current-location',
                        styleId: 'current',
                        position: position
                    }]);
                }

                // 更新信息窗
                if (this.infoWindow) {
                    const content = `
                        <div class="map-info-window">
                            <div class="map-info-title">当前位置</div>
                            <div class="map-info-address">${address}</div>
                        </div>
                    `;

                    this.infoWindow.close();
                    this.infoWindow.setPosition(position);
                    this.infoWindow.setContent(content);
                    this.infoWindow.open();
                }
            } catch (error) {
                console.error('更新位置标记失败:', error);
            }
        },

        async locateMe() {
            if (this.isLocating || !this.geolocation) {
                console.log('定位中或定位服务未初始化');
                return;
            }

            try {
                this.isLocating = true;

                const locationInfo = await this.getCurrentPosition();
                
                // 平滑移动到新位置
                this.map.easeTo({
                    center: locationInfo.position,
                    zoom: 16,
                    duration: 1000,
                    complete: () => {
                        this.updateLocationMarker(locationInfo.position, locationInfo.address);
                    }
                });

                     // 初始化标记图层和信息窗
                     this.initMarkerLayer();
                     this.initInfoWindow();
     
                this.$message({
                    message: '定位成功',
                    type: 'success',
                    duration: 2000
                });

            } catch (error) {
                console.error('定位失败:', error);
                this.$message({
                    message: '获取位置失败，请检查定位权限',
                    type: 'error',
                    duration: 3000
                });
            } finally {
                this.isLocating = false;
            }
        },

        // 初始化标记图层
        initMarkerLayer() {
            if (!this.map) return;
            
            try {
                this.markerLayer = new TMap.MultiMarker({
                    map: this.map,
                    styles: {
                        'current': new TMap.MarkerStyle({
                            width: 32,
                            height: 20,
                            anchor: { x: 16, y: 16 },
                            src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/center.png'
                        })
                    },
                    geometries: []
                });
                console.log('标记图层初始化完成');
            } catch (error) {
                console.error('标记图层初始化失败:', error);
            }
        },

        // 初始化信息窗
        initInfoWindow() {
            if (!this.map) return;
            
            try {
                this.infoWindow = new TMap.InfoWindow({
                    map: this.map,
                    position: new TMap.LatLng(39.908802, 116.397502),
                    content: '',
                    offset: { x: 0, y: -32 }
                });
                this.infoWindow.close();
                console.log('信息窗初始化完成');
            } catch (error) {
                console.error('信息窗初始化失败:', error);
            }
        }
    },
    beforeDestroy() {
        if (this.map) {
            this.map.destroy();
        }
    }
});