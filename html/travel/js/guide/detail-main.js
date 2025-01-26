class GuideDetail {
    constructor() {
        this.guideId = this.getGuideId();
        this.routeMap = null;
        this.init();
        
        // 将实例绑定到window对象，使返回按钮可以访问
        window.guideDetail = this;
    }

    getGuideId() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) {
            layer.msg('未找到攻略信息');
            setTimeout(() => {
                window.location.href = './index.html';
            }, 1500);
        }
        return id;
    }

    async init() {
        try {
            // 显示加载动画
            const loadingIndex = layer.load(1, {
                shade: [0.3, '#fff']
            });

            // 先加载攻略详情
            await this.loadGuideDetail();
            await this.loadComments();
            
            // 等待地图API加载完成
            await this.waitForMapAPI();
            
            // 初始化地图
            this.routeMap = new RouteMap();
            
            // 加载路线数据
            await this.loadRouteData();

            // 关闭加载动画
            layer.close(loadingIndex);
        } catch (error) {
            console.error('初始化失败:', error);
            layer.msg('加载失败，请刷新重试');
        }
    }

    waitForMapAPI() {
        return new Promise((resolve, reject) => {
            if (window.TMap) {
                resolve();
                return;
            }

            let retryCount = 0;
            const maxRetries = 20;

            const checkInterval = setInterval(() => {
                if (window.TMap) {
                    clearInterval(checkInterval);
                    resolve();
                    return;
                }

                retryCount++;
                if (retryCount >= maxRetries) {
                    clearInterval(checkInterval);
                    reject(new Error('地图加载超时'));
                }
            }, 500);
        });
    }

    async loadRouteData() {
        try {
            const response = await axios.get(`/api/admin/user/travel-route/places/${this.guideId}`,{
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                }
            });
            if (response.data.code === 200 && response.data.data) {
                console.log('Route data:', response.data.data);
                // 确保地图实例存在
                if (this.routeMap) {
                    this.routeMap.displayRoute(response.data.data);
                } else {
                    console.error('Map instance not initialized');
                    layer.msg('地图初始化失败');
                }
            }
        } catch (error) {
            console.error('加载路线数据失败:', error);
            layer.msg('加载路线数据失败');
        }
    }

    async loadGuideDetail() {
        try {
            const response = await axios.get(`/api/admin/user/travel-guide/detail/${this.guideId}`,{
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                }
            });
            if (response.data.code === 200) {
                const detail = response.data.data;
                this.renderGuideDetail(detail);
                
                // 确保图片加载完成后再初始化轮播
                if (detail.imageUrls && detail.imageUrls.length > 0) {
                    alert(detail.imageUrls);
                    await this.preloadImages(detail.imageUrls);
                    this.initCarousel();
                }
            }
        } catch (error) {
            console.error('加载攻略详情失败:', error);
            layer.msg('加载攻略详情失败');
        }
    }

    preloadImages(imageUrls) {
        return Promise.all(imageUrls.map(url => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = url;
            });
        }));
    }

    renderGuideDetail(detail) {
        // 设置标题
        document.querySelector('.guide-title').textContent = detail.title || '无标题';
        
        // 设置作者信息
        const avatarEl = document.querySelector('.author-avatar');
        avatarEl.src = detail.authorAvatar || '/api/images/default-avatar.jpg';
        avatarEl.onerror = () => avatarEl.src = '/api/images/default-avatar.jpg';
        
        document.querySelector('.author-name').textContent = detail.authorName || '匿名用户';
        
        // 设置发布时间
        document.querySelector('.publish-time').textContent = 
            this.formatTime(detail.createTime);
        
        // 设置基本信息
        document.querySelector('.departure').textContent = detail.departure || '未设置';
        document.querySelector('.destination').textContent = detail.destination || '未设置';
        
        // 设置简介
        document.querySelector('.desc-content').textContent = detail.description || '暂无简介';
        
        // 设置图片
        this.renderImages(detail.imageUrls);
        
        // 显示阅读量
        const viewCount = detail.viewCount || 0;
        document.querySelector('.view-count').textContent = 
            this.formatViewCount(viewCount);
    }

    renderImages(imageUrls) {
        const imagesContainer = document.querySelector('.guide-images');
        
        if (!imageUrls || imageUrls.length === 0) {
            imagesContainer.style.display = 'none';
            return;
        }
        
        imagesContainer.style.display = 'block';
        const carouselContainer = document.querySelector('[carousel-item]');
        
        // 确保每个图片都包含在正确的容器中
        const imageHtml = imageUrls.map(url => `
            <div class="carousel-item">
                <img src="${url}" alt="旅行照片" onerror="this.src='/api/images/default-cover.jpg'">
            </div>
        `).join('');
        
        carouselContainer.innerHTML = imageHtml;
    }

    initCarousel() {
        // 确保在下一个事件循环中执行，给予DOM足够的时间更新
        alert('initCarousel');
        setTimeout(() => {
            layui.use(['carousel'], function(){
                const carousel = layui.carousel;
                carousel.render({
                    elem: '#imageCarousel',
                    width: '100%',
                    height: '400px',
                    interval: 3000,
                    anim: 'fade',
                    autoplay: true,
                    arrow: 'hover',  // 悬浮显示箭头
                    indicator: 'inside'  // 指示器位置
                });
            });
        }, 100);
    }

    formatTime(timestamp) {
        if (!timestamp) return '未知时间';
        const date = new Date(timestamp);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatViewCount(count) {
        if (count < 1000) {
            return count.toString();
        } else if (count < 10000) {
            return (count / 1000).toFixed(1) + 'K';
        } else {
            return (count / 10000).toFixed(1) + 'W';
        }
    }

    goBack() {
        if (document.referrer && document.referrer.includes('./index.html')) {
            history.back();
        } else {
            window.location.href = './index.html';
        }
    }

    async loadComments() {
        try {
            const response = await axios.get(`/api/admin/user/travel-guide/comment/list/${this.guideId}`,{
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                }
            });
            if (response.data.code === 200) {
                this.renderComments(response.data.data);
            }
        } catch (error) {
            console.error('加载评论失败:', error);
            layer.msg('加载评论失败');
        }
    }

    renderComments(comments) {
        const commentList = document.querySelector('.comment-list');
        commentList.innerHTML = comments.map(comment => this.renderCommentItem(comment)).join('');
    }

    renderCommentItem(comment) {
        const replyCount = comment.replies?.length || 0;
        const showReplyCount = 2; // 默认显示的回复数量
        
        return `
            <div class="comment-item" data-id="${comment.id}">
                <div class="comment-user">
                    <img src="${comment.userAvatar || '/api/images/default-avatar.jpg'}" 
                         alt="${comment.userName}"
                         onerror="this.src='/api/images/default-avatar.jpg'">
                    <div class="comment-user-info">
                        <div class="comment-user-name">${comment.userName}</div>
                        <div class="comment-time">${this.formatTime(comment.createTime)}</div>
                    </div>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    <span class="comment-action" onclick="window.guideDetail.showReplyInput(${comment.id}, ${comment.userId})">
                        <i class="layui-icon layui-icon-reply-fill"></i>回复
                    </span>
                </div>
                ${this.renderReplies(comment.replies, showReplyCount)}
                ${replyCount > showReplyCount ? `
                    <div class="reply-expand" onclick="window.guideDetail.toggleReplies(${comment.id})">
                        <span class="expand-text">展开${replyCount - showReplyCount}条回复</span>
                        <i class="layui-icon layui-icon-down"></i>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderReplies(replies, showCount = 2) {
        if (!replies?.length) return '';
        
        const visibleReplies = replies.slice(0, showCount);
        const hiddenReplies = replies.slice(showCount);
        
        return `
            <div class="reply-list">
                ${this.renderVisibleReplies(visibleReplies)}
                <div class="hidden-replies" style="display: none;">
                    ${this.renderVisibleReplies(hiddenReplies)}
                </div>
            </div>
        `;
    }

    renderVisibleReplies(replies) {
        return replies.map(reply => `
            <div class="reply-item" data-id="${reply.id}" data-parent-id="${reply.parentId}">
                <div class="comment-user">
                    <img src="${reply.userAvatar || '/api/images/default-avatar.jpg'}" 
                         alt="${reply.userName}">
                    <div class="comment-user-info">
                        <div class="comment-user-name">
                            ${reply.userName}
                            ${reply.replyUserName ? `
                                <span class="reply-to">
                                    回复 ${reply.replyUserName}
                                </span>
                            ` : ''}
                        </div>
                        <div class="comment-time">
                            ${this.formatTime(reply.createTime)}
                        </div>
                    </div>
                </div>
                <div class="comment-content">${reply.content}</div>
                <div class="comment-actions">
                    <span class="comment-action" 
                          onclick="window.guideDetail.showReplyInput(${reply.parentId}, ${reply.userId}, '${reply.userName}', ${reply.id})">
                        <i class="layui-icon layui-icon-reply-fill"></i>回复
                    </span>
                </div>
            </div>
        `).join('');
    }

    toggleReplies(commentId) {
        const commentItem = document.querySelector(`[data-id="${commentId}"]`);
        const hiddenReplies = commentItem.querySelector('.hidden-replies');
        const expandBtn = commentItem.querySelector('.reply-expand');
        const expandText = expandBtn.querySelector('.expand-text');
        const expandIcon = expandBtn.querySelector('.layui-icon');
        
        if (hiddenReplies.style.display === 'none') {
            hiddenReplies.style.display = 'block';
            expandText.textContent = '收起回复';
            expandIcon.classList.remove('layui-icon-down');
            expandIcon.classList.add('layui-icon-up');
        } else {
            hiddenReplies.style.display = 'none';
            const replyCount = hiddenReplies.querySelectorAll('.reply-item').length;
            expandText.textContent = `展开${replyCount}条回复`;
            expandIcon.classList.remove('layui-icon-up');
            expandIcon.classList.add('layui-icon-down');
        }
    }

    showReplyInput(parentId, replyUserId = null, replyUserName = null, replyId = null) {
        // 移除其他回复框
        document.querySelectorAll('.reply-input').forEach(el => el.remove());

        // 获取要插入回复框的位置
        let targetElement;
        let rootParentId = parentId;

        if (replyId) {
            // 如果是回复子评论，找到对应的子评论元素
            targetElement = document.querySelector(`[data-id="${replyId}"]`);
            // 获取根评论ID
            const rootComment = targetElement.closest('.comment-item[data-parent-id="null"]');
            if (rootComment) {
                rootParentId = rootComment.dataset.id;
            }
        } else {
            // 如果是回复主评论，找到主评论元素
            targetElement = document.querySelector(`[data-id="${parentId}"]`);
        }

        if (!targetElement) return;

        const replyInput = document.createElement('div');
        replyInput.className = 'reply-input';
        replyInput.id = `reply-input-${replyId || rootParentId}`;
        
        const placeholder = replyUserName ? 
            `回复 ${replyUserName}` : 
            '写下你的回复...';

        replyInput.innerHTML = `
            <div class="comment-input">
                <textarea placeholder="${placeholder}" class="layui-textarea"></textarea>
                <div class="reply-input-actions">
                    <span class="reply-to-info">${replyUserName ? `回复 ${replyUserName}` : ''}</span>
                    <button class="layui-btn" onclick="window.guideDetail.submitComment(${rootParentId}, ${replyUserId})">
                        发表回复
                    </button>
                </div>
            </div>
        `;

        targetElement.insertAdjacentElement('afterend', replyInput);
        replyInput.querySelector('textarea').focus();
    }

    async submitComment(parentId = null, replyUserId = null) {
        let textarea;
        if (parentId) {
            const replyInput = document.querySelector(`#reply-input-${parentId}`);
            if (!replyInput) return;
            textarea = replyInput.querySelector('textarea');
        } else {
            textarea = document.querySelector('.comment-input textarea');
        }

        if (!textarea) return;
        const content = textarea.value;

        if (!content?.trim()) {
            layer.msg('请输入评论内容');
            return;
        }

        try {
            await axios.post('/api/admin/user/travel-guide/comment/add', {
                guideId: this.guideId,
                content: content.trim(),
                parentId,
                replyUserId
            },{
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                }
            });

            layer.msg('评论成功');
            await this.loadComments();
            // 清空输入框
            document.querySelectorAll('.reply-input').forEach(el => el.remove());
            if (!parentId) {
                document.querySelector('.comment-input textarea').value = '';
            }
        } catch (error) {
            console.error('提交评论失败:', error);
            layer.msg(error.response?.data?.message || '评论失败');
        }
    }
}

// 确保 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 创建全局实例
    window.guideDetail = new GuideDetail();
}); 