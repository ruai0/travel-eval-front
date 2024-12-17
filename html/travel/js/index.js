const app = new Vue({
    el: "#app",
    data: {
        isReachBottom: false,
        types: [], // 类型列表
        blogs: [], // 博客列表
        current: 1,// blog的页码
        currentLocation: null, // 当前位置
        searchKeyword: '', // 搜索关键词
        locationService: null,
        searchTimer: null, // 用于防抖
    },
    async created() {
        // 初始化定位服务
        this.locationService = new LocationService();
        // 获取当前位置
        await this.updateLocation();
        // 查询类型
        this.queryTypes();
        // 查询博客列表
        this.queryHotBlogsScroll();
    },
    methods: {
        queryTypes() {
            axios.get("/shop-type/list")
                .then(({data}) => {
                    this.types = data;
                })
                .catch(err => {
                    this.$message.error(err)
                })
        },

        async updateLocation() {
            try {
                const location = await this.locationService.getCurrentLocation();
                this.currentLocation = location.district || location.city || location.province;
                
                this.current = 1;
                this.blogs = [];
                await this.queryHotBlogsScroll();
            } catch (error) {
                console.error('获取位置失败:', error);
                this.$message.warning('定位失败，将显示所有内容');
                this.currentLocation = '定位失败';
                // 即使定位失败也要加载内容
                this.current = 1;
                this.blogs = [];
                await this.queryHotBlogsScroll();
            }
        },

        showLocationSelect() {
            this.$confirm('是否重新获取当前位置？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'info'
            }).then(() => {
                this.updateLocation();
            }).catch(() => {});
        },

        handleSearch() {
            if (this.searchTimer) {
                clearTimeout(this.searchTimer);
            }
            this.searchTimer = setTimeout(() => {
                this.current = 1;
                this.blogs = [];
                this.queryHotBlogsScroll();
            }, 300);
        },

        async queryHotBlogsScroll() {
            try {
                const params = {
                    current: this.current
                };
                
                // if (this.locationService?.lastLocation?.city) {
                //     const city = this.locationService.lastLocation.city.replace(/市$/, '');
                //     params.location = city;
                // }

                if (this.searchKeyword) {
                    params.keyword = this.searchKeyword;
                }
                
                const {data} = await axios.get("/blog/hot", {
                    params: params
                });
                
                if (Array.isArray(data)) {
                    data.forEach(b => b.img = b.images.split(",")[0]);
                    this.blogs = this.current === 1 ? data : this.blogs.concat(data);
                } else {
                    console.error('Invalid response data:', data);
                    this.$message.error('数据格式错误');
                }
            } catch (err) {
                console.error('加载数据失败:', err);
                this.$message.error(err.response?.data?.message || '获取数据失败');
            }
        },

        addLike(b) {
            axios.put("/blog/like/" + b.id)
                .then(({data}) => {
                    this.queryBlogById(b)
                })
                .catch(err => {
                    this.$message.error(err)
                })
        },

        queryBlogById(b) {
            axios.get("/blog/" + b.id)
                .then(({data}) => {
                    b.liked = data.liked;
                    b.isLike = data.isLike;
                })
                .catch(() => {
                    this.$message.error('获取点赞信息失败');
                    b.liked++;
                })
        },

        onScroll(e) {
            let scrollTop = e.target.scrollTop;
            let offsetHeight = e.target.offsetHeight;
            let scrollHeight = e.target.scrollHeight;
            if (scrollTop + offsetHeight > scrollHeight - 50 && !this.isReachBottom) {
                this.isReachBottom = true;
                // 再次查询下一页数据
                this.current++;
                this.queryHotBlogsScroll();
            } else {
                this.isReachBottom = false;
            }
        },

        toShopList(id, name) {
            location.href = "/shop-list.html?type=" + id + "&name=" + name;
        },

        toBlogDetail(b) {
            location.href = "/blog-detail.html?id=" + b.id;
        },

        toPage(index) {
            // 处理页面跳转
            switch(index) {
                case 4:
                    location.href = '/login2.html';
                    break;
                default:
                    break;
            }
        }
    }
}); 