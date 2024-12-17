const app = new Vue({
    el: "#app",
    data: {
        util,
        shop: {},
        vouchers: [],
        // 评论相关数据
        comments: [],
        currentPage: 1,
        pageSize: 10,
        total: 0,
        avgScore: 0,
        token: localStorage.getItem("token")
    },
    created() {
        // 获取参数
        let shopId = util.getUrlParam("id");
        // 查询酒店信息
        this.queryShopById(shopId);
        // 查询优惠券信息
        this.queryVoucher(shopId);
        // 加载评论列表
        this.loadComments();
    },
    methods: {
        goBack() {
            history.back();
        },
        queryShopById(shopId) {
            axios.get("/shop/" + shopId)
                .then((response) => {
                    // 正确解构返回的数据
                    const res = response.data;
                    if (res.shop.images) {
                        res.shop.images = res.shop.images.split(",");
                    }
                    this.shop = res.shop;  // 使用返回数据中的shop对象
                })
                .catch(error => {
                    console.error('获取商铺信息失败:', error);
                    this.$message.error('获取商铺信息失败');
                });
        },
        queryVoucher(shopId) {
            axios.get("/voucher/list/" + shopId)
                .then((response) => {
                    this.vouchers = response.data;
                })
                .catch(this.$message.error)
        },
        formatTime(v){
            let b = new Date(v.beginTime);
            let e = new Date(v.endTime);
            return b.getMonth() + 1 + "月" + b.getDate() + "日 "
                +  b.getHours() + ":" + this.formatMinutes(b.getMinutes())
                + " ~ "
                +  e.getHours() + ":" + this.formatMinutes(e.getMinutes());
        },
        formatMinutes(m){
            if(m < 10) m = "0" + m
            return m;
        },
        isNotBegin(v){
            return new Date(v.beginTime).getTime() > new Date().getTime();
        },
        isEnd(v){
            return new Date(v.endTime).getTime() < new Date().getTime();
        },
        seckill(v) {
            // 检查抢购时间
            if (this.isNotBegin(v)) {
                this.$message.error("优惠券抢购尚未开始！");
                return;
            }
            if (this.isEnd(v)) {
                this.$message.error("优惠券抢购已经结束！");
                return;
            }
            if (v.stock < 1) {
                this.$message.error("库存不足，请刷新再试试！");
                return;
            }

            // 发起抢购请求
            const loading = this.$loading({
                lock: true,
                text: '抢购中...',
                spinner: 'el-icon-loading',
                background: 'rgba(0, 0, 0, 0.7)'
            });
                
            axios.post(`/voucher-order/seckill/${v.id}`, null)
            .then((response) => {
                if (response.code === 200) {
                    this.$message.success("抢购成功！");
                    // 刷新优惠券列表
                    this.queryVoucher(this.shop.id);
                } else {
                    this.$message.error(data.message || "抢购失败，请稍后重试");
                }
            })
            .catch(error => {
                console.error('抢购失败:', error);
                this.$message.error(error.response?.data?.errorMsg || "抢购失败，请稍后重试");
            })
            .finally(() => {
                loading.close();
            });
        },

        // 加载评论列表
        async loadComments() {
            try {
                const shopId = util.getUrlParam("id");
                const response = await axios.get(`/shop/${shopId}/comments`, {
                    params: {
                        page: this.currentPage,
                        size: this.pageSize
                    }
                });
                
                if (response.code === 200) {
                
                    const data = response.data;
                    this.comments = data.records;
                    this.total = data.total;
                    this.avgScore = data.avgScore;
                }
            } catch (error) {
                console.error('获取评论失败:', error);
                this.$message.error('获取评论失败');
            }
        },

        // 处理页码变化
        handlePageChange(page) {
            this.currentPage = page;
            this.loadComments();
        },

        // 格式化日期
        formatDate(date) {
            if (!date) return '';
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hour = String(d.getHours()).padStart(2, '0');
            const minute = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hour}:${minute}`;
        },

        // 获取优惠券按钮文本
        getVoucherBtnText(voucher) {
            if(this.isEnd(voucher)) {
                return '已结束';
            }
            if(voucher.stock < 1) {
                return '已抢完';
            }
            if(this.isNotBegin(voucher)) {
                return '未开始';
            }
            return '限时抢购';
        },

        // 检查优惠券是否结束
        isEnd(voucher) {
            if(!voucher.endTime) return false;
            return new Date(voucher.endTime) < new Date();
        },

        // 检查优惠券是否未开始
        isNotBegin(voucher) {
            if(!voucher.beginTime) return false;
            return new Date(voucher.beginTime) > new Date();
        }
    }
}); 