class TravelMap {
    constructor() {
        this.selectedPlaces = [];
        this.polyline = null;
        this.markers = [];
        this.map = null;
        this.init();
    }

    async init() {
        try {
            // 先获取用户位置
            const position = await this.getUserLocation();
            
            // 初始化地图选点器，设置初始位置
            const mapUrl = new URL('https://apis.map.qq.com/tools/locpicker');
            mapUrl.searchParams.set('key', 'NMIBZ-JAQLZ-WGYX7-ZYKXV-K5IX3-LGFKM');
            mapUrl.searchParams.set('referer', 'travel');
            mapUrl.searchParams.set('coord', `${position.lat},${position.lng}`); // 设置初始位置
            mapUrl.searchParams.set('search', '1');  // 启用搜索功能
            mapUrl.searchParams.set('type', '1');    // 支持周边搜索
            mapUrl.searchParams.set('policy', '1');  // 本地城市优先
            mapUrl.searchParams.set('zoom', '15');   // 初始缩放级别

            // 更新iframe的src
            document.getElementById('mapPicker').src = mapUrl.toString();

            // 监听选点消息
            window.addEventListener('message', (event) => {
                const loc = event.data;
                if (loc && loc.module === 'locationPicker') {
                    this.handlePlaceSelection(loc);
                }
            }, false);

        } catch (error) {
            console.error('初始化失败:', error);
            layer.msg('定位失败，使用默认位置');
        }
    }

    // 获取用户位置
    async getUserLocation() {
        return new Promise((resolve, reject) => {
            const geolocation = new qq.maps.Geolocation(
                "NMIBZ-JAQLZ-WGYX7-ZYKXV-K5IX3-LGFKM",
                "travel"
            );

            geolocation.getLocation(
                (pos) => {
                    resolve({
                        lat: pos.lat,
                        lng: pos.lng
                    });
                },
                (error) => {
                    console.error('定位失败:', error);
                    // 默认北京位置
                    resolve({
                        lat: 39.916527,
                        lng: 116.397128
                    });
                },
                { timeout: 8000 }
            );
        });
    }

    // 处理地点选择
    handlePlaceSelection(location) {
        if (this.selectedPlaces.length >= 15) {
            layer.msg('最多只能选择15个地点');
            return;
        }
        // 构建地点数据结构
        const place = {
            id: Date.now(),
            name: location.poiname || '未命名地点',
            address: location.poiaddress,
            location: {
                lat: location.latlng.lat,
                lng: location.latlng.lng
            },
            order: this.selectedPlaces.length + 1,
            // 保存额外信息以便发送给后端
            detail: {
                cityname: location.cityname || '',
                district: location.district || '',
                province: location.province || '',
                category: location.category || '',
                type: location.type || 0
            }
        };

        this.selectedPlaces.push(place);
        this.updatePlacesList();
        this.updateMapMarkers();
        this.updateRoutePath();
 
        // 隐藏搜索结果列表
        const mapFrame = document.getElementById('mapPicker');
        if (mapFrame.contentWindow.document.querySelector('.searchresults')) {
            mapFrame.contentWindow.document.querySelector('.searchresults').style.display = 'none';
        }

        // 打印当前已选地点数据（后续可用于发送给后端）
       // console.log('当前已选地点:', this.getPlacesData());
    }

    // 获取整理后的地点数据（用于发送给后端）
    getPlacesData() {
        return this.selectedPlaces.map(place => ({
            name: place.name,
            address: place.address,
            location: place.location,
            order: place.order,
            detail: place.detail
        }));
    }

    // 发送地点数据到后端
    async savePlaces() {
        if (this.selectedPlaces.length === 0) {
            layer.msg('请至少选择一个地点');
            return;
        }

        try {
            const response = await axios.post('/api/travel-route/places' ,{
                id: Date.now(),
                length: this.selectedPlaces.length,
                places: this.selectedPlaces
            });

            if (response.data.code === 200) {
                layer.msg('保存成功');
                return response.data.data;
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('保存失败:', error);
            layer.msg('保存失败：' + error.message);
            throw error;
        }
    }

    // 更新已选地点列表
    updatePlacesList() {
        const placesList = document.getElementById('placesList');
        const placesCount = document.querySelector('.places-count');
        
        placesCount.textContent = `${this.selectedPlaces.length}/15`;
        placesList.innerHTML = '';

        this.selectedPlaces.forEach((place, index) => {
            const item = document.createElement('div');
            item.className = 'place-item';
            item.innerHTML = `
                <div class="place-order">${index + 1}</div>
                <div class="place-info">
                    <div class="place-name">${place.name}</div>
                    <div class="place-address">${place.address}</div>
                </div>
                <button class="delete-btn" data-id="${place.id}">×</button>
            `;

            item.querySelector('.delete-btn').addEventListener('click', () => {
                this.removePlace(place.id);
            });

            placesList.appendChild(item);
        });
    }

    // 更新地图标记
    updateMapMarkers() {
        // 获取iframe中的地图实例
        const mapFrame = document.getElementById('mapPicker');
        const mapWindow = mapFrame.contentWindow;
        
        // 清除现有标记
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];

        // 添加新标记
        this.selectedPlaces.forEach((place, index) => {
            const marker = new mapWindow.qq.maps.Marker({
                map: mapWindow.map,
                position: new mapWindow.qq.maps.LatLng(place.latlng.lat, place.latlng.lng),
                label: {
                    text: (index + 1).toString(),
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 'bold'
                }
            });
            this.markers.push(marker);
        });
    }

    // 更新路线路径
    updateRoutePath() {
        const mapFrame = document.getElementById('mapPicker');
        const mapWindow = mapFrame.contentWindow;

        // 清除现有路径
        if (this.polyline) {
            this.polyline.setMap(null);
        }

        if (this.selectedPlaces.length < 2) return;

        // 创建路径点数组
        const path = this.selectedPlaces.map(place => 
            new mapWindow.qq.maps.LatLng(place.latlng.lat, place.latlng.lng)
        );

        // 绘制新路径
        this.polyline = new mapWindow.qq.maps.Polyline({
            map: mapWindow.map,
            path: path,
            strokeColor: '#1890FF',
            strokeWeight: 3,
            strokeStyle: 'solid'
        });
    }

    // 移除地点
    removePlace(id) {
        const index = this.selectedPlaces.findIndex(place => place.id === id);
        if (index > -1) {
            this.selectedPlaces.splice(index, 1);
            // 更新序号
            this.selectedPlaces.forEach((place, i) => {
                place.order = i + 1;
            });
            this.updatePlacesList();
            this.updateMapMarkers();
            this.updateRoutePath();
            layer.msg('已移除该地点');
        }
    }
}

// 初始化地图
document.addEventListener('DOMContentLoaded', () => {
    window.travelMap = new TravelMap();
}); 