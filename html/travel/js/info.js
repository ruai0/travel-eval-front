const app = new Vue({
    el: "#app",
    data: {
        user: "",
        activeName: "1",
        info: {},
        blogs: [],
        blogs2: [],
        params: {
            minTime: 0,
            offset: 0,
        },
        count: 5,
        isReachBottom: false,
        orders: [],
        lastId: null,
        pageSize: 10,
        orderStatus: "",
        loading: false,
        noMore: false,
        follows: [],
        fans: [],
        followCount: 0,
        fansCount: 0,
        guides: [],
        guidePage: 1,
        guideSize: 10,
        guideTotal: 0,
        guideTitle: '',
    },
    created() {
        console.log("Vue实例创建");
        this.queryUser();
        this.loadFollowInfo();
        this.queryOrders();
        this.queryBlogs();
    },
    methods: {
        // 基础方法
        queryUser() {
            axios.get("/user/me")
                .then(({data}) => {
                    this.user = {
                        ...data,
                        id: data.id.toString()
                    };
                    this.queryUserInfo();
                    this.queryBlogs();
                    this.loadGuides();
                })
                .catch(err => {
                    location.href = "login.html"
                })
        },
        queryBlogs() {
            axios.get("/blog/of/me")
                .then(({data}) => this.blogs = data)
                .catch(this.$message.error)
        },
        queryUserInfo() {
            axios.get(`/user/info/${this.user.id}`)
                .then(({data}) => {
                    if (!data) return;
                    this.info = {
                        ...data,
                        id: data.id?.toString()
                    };
                    sessionStorage.setItem("userInfo", JSON.stringify(this.info))
                })
                .catch(err => {
                    this.$message.error(err);
                })
        },
        goBack() {
            history.back();
        },
        toEdit() {
            location.href = 'info-edit.html'
        },
        logout() {
            axios.get("/user/logout")
                .then(() => {
                    sessionStorage.removeItem("token")
                    location.href = "/"
                })
                .catch(this.$message.error)
        },
        handleClick(tab) {
            console.log("标签切换到：", tab.name);
            if (tab.name === "6") {
                this.loadGuides();
            } else if (tab.name === "3" || tab.name === "4") {
                this.loadFollowInfo();
            } else if (tab.name === "5") {
                this.queryOrders();
            }
        },

        // 订单相关方法
        queryOrders(isRefresh = false) {
            if (this.loading || (!isRefresh && this.noMore)) return;
            this.loading = true;

            axios.get("/voucher-order/myList", {
                params: {
                    limit: this.pageSize,
                    status: this.orderStatus || null,
                    lastId: isRefresh ? null : (this.lastId ? this.lastId.toString() : null)
                },
                transformResponse: [(data) => {
                    const response = JSON.parse(data);
                    if (response.data && response.data.records) {
                        response.data.records = response.data.records.map(record => ({
                            ...record,
                            id: record.id.toString()
                        }));
                    }
                    return response;
                }]
            })
            .then((response) => {
                if(response.code === 200) {
                    const records = response.data.records || [];
                    
                    // 处理每个订单的数据，确保所有ID都是字符串类型
                    const newOrders = records.map(order => ({
                        id: order.id.toString(),
                        userId: order.userId?.toString(),
                        voucherId: order.voucherId?.toString(),
                        payType: order.payType,
                        status: order.status,
                        createTime: order.createTime,
                        updateTime: order.updateTime,
                        voucherTitle: order.voucherTitle,
                        payValue: order.payValue,
                        actualValue: order.actualValue,
                        shopName: order.shopName,
                        merchantId: order.merchantId?.toString()
                    }));

                    if (isRefresh) {
                        this.orders = newOrders;
                    } else {
                        this.orders = [...this.orders, ...newOrders];
                    }

                    // 更新lastId，使用字符串类型
                    this.lastId = records.length ? records[records.length - 1].id.toString() : null;
                    this.noMore = records.length < this.pageSize;
                } else {
                    this.$message.error(response.msg || '获取订单列表失败');
                }
            })
            .catch(error => {
                console.error('获取订单失败:', error);
                this.$message.error('获取订单列表失败');
            })
            .finally(() => {
                this.loading = false;
            });
        },
        getStatusText(status) {
            const statusMap = {
                1: '未支付',
                2: '待使用',
                3: '已使用',
                4: '已取消',
                5: '退款中',
                6: '已退款',
                7: '已完成'
            };
            return statusMap[status] || '未知状态';
        },
        getStatusClass(status) {
            const classMap = {
                1: 'status-unpaid',
                2: 'status-pending',
                3: 'status-used',
                4: 'status-cancelled',
                5: 'status-refunding',
                6: 'status-refunded'
            };
            return classMap[status] || '';
        },
        formatDate(dateStr) {
            if (!dateStr) return '';
            // 处理带T和时区的ISO格式日期
            const date = new Date(dateStr);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        },
        formatPrice(price) {
            if (!price) return '0.00';
            return (price / 100).toFixed(2);
        },
        formatRules(rules) {
            if (!rules) return '';
            return rules.split('\n').map(rule => `<div>${rule}</div>`).join('');
        },
        
        // 订单操作方法
        useVoucher(order) {
            this.$confirm('确认使用该优惠券?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                axios.put(`/voucher-order/verify/${order.id}`)
                    .then(({data}) => {
                        if(data.success) {
                            this.$message.success('核销成功');
                            this.queryOrders();
                        } else {
                            this.$message.error(data.errorMsg || '核销失败');
                        }
                    })
                    .catch(this.$message.error);
            });
        },
        writeComment(order) {
            location.href = `/write-comment.html?orderId=${order.id}&shopId=${order.merchantId}`;
        },
        refundOrder(order) {
            this.$confirm('确认申请退款?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                axios.put(`/voucher-order/refund/${order.id}`)
                    .then((response) => {
                        if(response.code === 200) {
                            this.$message.success('退款申请成功');
                            this.queryOrders(true);
                        } else {
                            this.$message.error(response.msg || '退款申请失败');
                        }
                    })
                    .catch(error => {
                        console.error('退款失败:', error);
                        this.$message.error('退款申请失败');
                    });
            });
        },
        viewOrderDetail(order) {
            axios.get(`/voucher-order/${order.id}`)
                .then((response) => {
                    
                    if(response.code === 200) {
                        const { voucher, order: orderDetail } = response.data;
                        const content = `
                            <div class="order-detail">
                                <p><strong>订单编号：</strong>${orderDetail.id}</p>
                                <p><strong>优惠券：</strong>${voucher.title}</p>
                                <p><strong>优惠券描述：</strong>${voucher.subTitle}</p>
                                <p><strong>使用规则：</strong>${voucher.rules==null?'':voucher.rules.replace('\n', '<br>')}</p>
                                <p><strong>支付金额：</strong>￥${this.formatPrice(voucher.payValue)}</p>
                                <p><strong>优惠券面值：</strong>￥${this.formatPrice(voucher.actualValue)}</p>
                                <p><strong>下单时间：</strong>${this.formatDate(orderDetail.createTime)}</p>
                                ${orderDetail.updateTime ? `<p><strong>更新时间：</strong>${this.formatDate(orderDetail.updateTime)}</p>` : ''}
                                <p><strong>订单状态：</strong>${this.getStatusText(orderDetail.status)}</p>
                                <p><strong>商家名称：</strong>${voucher.shopName}</p>
                            </div>
                        `;
                        this.$alert(content, '订单详情', {
                            dangerouslyUseHTMLString: true,
                            confirmButtonText: '确定',
                            customClass: 'order-detail-dialog'
                        });
                    } else {
                        this.$message.error(response.message || '获取订单详情失败');
                    }
                })
                .catch(error => {
                    console.error('获取订单详情失败:', error);
                    this.$message.error('获取订单详情失败');
                });
        },
        handleCurrentChange(val) {
            this.currentPage = val;
            this.queryOrders();
        },
        handleStatusChange(val) {
            this.lastId = null;
            this.noMore = false;
            this.queryOrders(true);
        },
        handleScroll(e) {
            const el = e.target;
            const { scrollHeight, scrollTop, clientHeight } = el;
            if (scrollHeight - scrollTop - clientHeight < 50 && !this.loading && !this.noMore) {
                this.queryOrders();
            }
        },
        // 支付订单
        payOrder(order) {
            this.$confirm('确认支付该订单?', '提示', {
                confirmButtonText: '确定支付',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                const loading = this.$loading({
                    lock: true,
                    text: '支付处理中...',
                    spinner: 'el-icon-loading',
                    background: 'rgba(0, 0, 0, 0.7)'
                });

                axios.post(`/voucher-order/pay/${order.id}`)
                    .then((response) => {
                        if(response.code === 200) {
                            this.$message.success('支付成功！');
                            this.queryOrders(true);
                        } else {
                            this.$message.error(response.msg || '支付失败，请重试');
                        }
                    })
                    .catch(error => {
                        console.error('支付失败:', error);
                        this.$message.error('支付失败，请重试');
                    })
                    .finally(() => {
                        loading.close();
                    });
            });
        },
        // 加载关注信息
        async loadFollowInfo() {
            try {
                // 获取关注列表
                const followRes = await axios.get('/follow/follows');
                if (followRes.code == 200) {
                    this.follows = followRes.data;
                    this.followCount = this.follows.length;
                }

                // 获取粉丝列表
                const fansRes = await axios.get('/follow/fans');
                if (fansRes.code === 200) {
                    this.fans = fansRes.data;
                    this.fansCount = this.fans.length;

                    // 检查是否已关注这些粉丝
                    for (let fan of this.fans) {
                        const checkRes = await axios.get(`/follow/or/not/${fan.id}`);
                        if (checkRes.code === 200) {
                            fan.isFollow = checkRes.data;
                        }
                    }
                }
            } catch (error) {
                console.error('获取关注信息失败:', error);
                this.$message.error('获取关注信息失败');
            }
        },

        // 处理关注/取消关注
        async handleFollow(user) {
            try {
                const res = await axios.put(`/follow/${user.id}/false`);
                if (res.code === 200) {
                    this.$message.success('已取消关注');
                    // 更新关注数和粉丝数
                    await this.loadFollowInfo();
                } else {
                    this.$message.error(res.data.msg || '操作失败');
                }
            } catch (error) {
                console.error('关注操作失败:', error);
                this.$message.error('操作失败，请重试');
            }
        },

        // 加载攻略列表
        async loadGuides() {
        
                const params = {
                    page: this.guidePage,
                    size: this.guideSize,
                    title: this.guideTitle,
                    userId: this.user.id
                };
          
               await axios.get('/admin/user/guide/list', { params }).then(res => {
                console.log(111);
                if (res.code === 200) {
                    
                    this.guides = res.data;
               
                    this.guideTotal = res.count;
                    // 可以保存总页数，如果需要的话
                    // this.guidePages = res.data.pages;
                } else {
                    this.$message.error(res.data.msg || '获取攻略列表失败');
                }
                });
        
               
           
        },

        // 处理攻略分页
        handleGuidePage(page) {
            this.guidePage = page;
            this.loadGuides();
        },

        // 获取攻略状态文本
        getGuideStatusText(status) {
            const statusMap = {
                0: '草稿',
                1: '已发布',
                2: '待审核'
            };
            return statusMap[status] || '未知状态';
        },

        // 获取攻略状态样式类
        getGuideStatusClass(status) {
            const classMap = {
                0: 'guide-status-draft',
                1: 'guide-status-published',
                2: 'guide-status-pending'
            };
            return classMap[status] || '';
        },
    },
    mounted() {
        const orderList = document.querySelector('.order-scroll-container');
        if (orderList) {
            orderList.addEventListener('scroll', this.handleScroll);
        }
    },
    beforeDestroy() {
        const orderList = document.querySelector('.order-scroll-container');
        if (orderList) {
            orderList.removeEventListener('scroll', this.handleScroll);
        }
    }
});
