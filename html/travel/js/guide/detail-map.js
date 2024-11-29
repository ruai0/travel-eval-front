class RouteMap {
    constructor() {
        this.map = null;
        this.markers = null;
        this.polyline = null;
        this.labels = null;
        this.init();
    }

    async init() {
        try {
            // 等待地图 API 加载完成
            await this.waitForMapAPI();
            
            // 初始化地图，禁用统计功能
            this.map = new TMap.Map(document.getElementById('mapContainer'), {
                center: new TMap.LatLng(39.984104, 116.307503),
                zoom: 11,
                pitch: 30,
                rotation: 0,
                showControl: true,  // 显示地图控件
                baseMap: {
                    type: 'vector',
                    features: ['base', 'building3d'],
                    theme: 'style1'
                },
                // 禁用统计功能
                mapStatistics: {
                    enabled: false
                }
            });

            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Map initialization failed:', error);
            layer.msg('地图加载失败，请刷新重试');
        }
    }

    displayRoute(routeData) {
        if (!routeData?.places?.length) {
            console.warn('No route data available');
            return;
        }

        const places = routeData.places;
        
        // 清除现有标记
        this.clear();

        // 创建新的标记点图层
        this.markers = new TMap.MultiMarker({
            map: this.map,
            styles: {
                'start': new TMap.MarkerStyle({
                    width: 25,
                    height: 35,
                    anchor: { x: 12.5, y: 35 },
                    src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/start.png'
                }),
                'end': new TMap.MarkerStyle({
                    width: 25,
                    height: 35,
                    anchor: { x: 12.5, y: 35 },
                    src: 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/end.png'
                })
            },
            geometries: places.map((place, index) => ({
                id: `marker-${index}`,
                styleId: index === 0 ? 'start' : 
                        index === places.length - 1 ? 'end' : 'start',
                position: new TMap.LatLng(place.latitude, place.longitude),
                properties: {
                    title: place.name
                }
            }))
        });

        // 创建新的标签图层
        this.labels = new TMap.MultiLabel({
            map: this.map,
            styles: {
                'label': new TMap.LabelStyle({
                    color: '#333',
                    size: 14,
                    offset: { x: 0, y: -35 },
                    padding: { top: 4, right: 8, bottom: 4, left: 8 },
                    backgroundColor: '#fff',
                    borderRadius: 2,
                    borderWidth: 1,
                    borderColor: '#ddd'
                })
            },
            geometries: places.map((place, index) => ({
                id: `label-${index}`,
                styleId: 'label',
                position: new TMap.LatLng(place.latitude, place.longitude),
                content: `${index + 1}. ${place.name}`
            }))
        });

        // 创建新的路线图层
        if (places.length > 1) {
            const path = places.map(place => 
                new TMap.LatLng(place.latitude, place.longitude)
            );

            this.polyline = new TMap.MultiPolyline({
                map: this.map,
                styles: {
                    'route': new TMap.PolylineStyle({
                        color: '#3777FF',
                        width: 6,
                        borderWidth: 2,
                        borderColor: '#FFF',
                        lineCap: 'round',
                        lineJoin: 'round',
                        showArrow: true
                    })
                },
                geometries: [{
                    id: 'route-line',
                    styleId: 'route',
                    paths: [path]
                }]
            });
        }

        // 调整视野
        this.fitBounds(places);

        // 添加点击事件
        this.markers.on('click', (evt) => {
            const place = places.find(p => 
                p.latitude === evt.geometry.position.lat && 
                p.longitude === evt.geometry.position.lng
            );
            if (place) {
                layer.msg(`${place.name}<br>${place.address || '暂无地址'}`, {
                    time: 3000
                });
            }
        });
    }

    fitBounds(places) {
        if (!places?.length) return;

        const bounds = new TMap.LatLngBounds();
        places.forEach(place => {
            bounds.extend(new TMap.LatLng(place.latitude, place.longitude));
        });

        this.map.fitBounds(bounds, {
            padding: 100
        });
    }

    clear() {
        // 移除现有图层
        if (this.markers) {
            this.markers.setMap(null);
            this.markers = null;
        }
        if (this.polyline) {
            this.polyline.setMap(null);
            this.polyline = null;
        }
        if (this.labels) {
            this.labels.setMap(null);
            this.labels = null;
        }
    }

    waitForMapAPI() {
        return new Promise((resolve, reject) => {
            if (window.TMap) {
                resolve();
                return;
            }

            const maxWaitTime = 10000;
            const startTime = Date.now();

            const checkInterval = setInterval(() => {
                if (window.TMap) {
                    clearInterval(checkInterval);
                    resolve();
                    return;
                }

                if (Date.now() - startTime > maxWaitTime) {
                    clearInterval(checkInterval);
                    reject(new Error('地图 API 加载超时'));
                }
            }, 100);
        });
    }
} 