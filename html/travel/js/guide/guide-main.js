class GuideList {
    constructor() {
        this.page = 0;
        this.pageSize = 12;
        this.loading = false;
        this.hasMore = true;
        this.keyword = '';
        this.init();
    }

    async init() {
        try {
            await this.loadGuides();
            this.bindEvents();
        } catch (error) {
            console.error('初始化失败:', error);
        }
    }

    bindEvents() {
        
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        document.getElementById('searchInput')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        this.bindScrollEvent();
    }

    async handleSearch() {
        const input = document.getElementById('searchInput');
        const newKeyword = input?.value.trim() || '';
        
        if (this.keyword === newKeyword) return;
        
        this.keyword = newKeyword;
        this.page = 0;
        this.hasMore = true;
        await this.loadGuides(true);
    }

    async loadGuides(reset = false) {
        if (this.loading || (!this.hasMore && !reset)) {
            console.log('Skip loading:', { loading: this.loading, hasMore: this.hasMore });
            return;
        }
        
        try {
            console.log('Loading guides:', { page: this.page, keyword: this.keyword });
            this.loading = true;
            
            if (reset) {
                this.showLoading();
            }

            const response = await axios.get('/api/travel-guide/list', {
                params: {
                    page: this.page,
                    size: this.pageSize,
                    keyword: this.keyword || undefined
                }
            });


            if (response.data.code === 200) {
                const pageResult = response.data.data;
                this.renderGuides(pageResult, reset);
                
                this.hasMore = this.page < pageResult.totalPage - 1;
                if (this.hasMore) {
                    this.page++;
                }
            }
        } catch (error) {
            console.error('加载攻略失败:', error);
            layer.msg('加载失败，请重试');
        } finally {
            this.loading = false;
            this.hideLoading();
        }
    }

    showLoading() {
        const container = document.querySelector('.guide-list');
        if (container) {
            container.insertAdjacentHTML('beforeend', `
                <div class="loading-state">
                    <i class="layui-icon layui-icon-loading layui-anim layui-anim-rotate layui-anim-loop"></i>
                    <span>加载中...</span>
                </div>
            `);
        }
    }

    hideLoading() {
        const loading = document.querySelector('.loading-state');
        if (loading) {
            loading.remove();
        }
    }

    renderGuides(pageResult, reset = false) {
    
        const container = document.querySelector('.guide-list');
        if (!container) {
            console.error('Guide list container not found!');
            return;
        }

        const guides = Array.from(pageResult);
        const guideHtml = guides.map(guide => this.createGuideCard(guide)).join('');
        
        if (reset || this.page === 0) {
            container.innerHTML = guideHtml || this.createEmptyState();
        } else {
            container.insertAdjacentHTML('beforeend', guideHtml);
        }
    }

    createEmptyState() {
        return `
            <div class="empty-state">
                <i class="layui-icon layui-icon-search" style="font-size: 48px; color: #ccc;"></i>
                <p>没有找到相关攻略${this.keyword ? '：' + this.keyword : ''}</p>
            </div>
        `;
    }

    createGuideCard(guide) {
        return `
            <div class="guide-card" onclick="window.location.href='/guide/detail.html?id=${guide.id}'">
                <div class="guide-cover">
                    <img src="${guide.coverImage || '/api/images/default-cover.jpg'}" 
                         alt="${guide.title}" 
                         onerror="this.src='/api/images/default-cover.jpg'">
                    <div class="location-tag">
                        <i class="layui-icon layui-icon-location"></i>
                        ${guide.destination || '未知目的地'}
                    </div>
                </div>
                <div class="guide-content">
                    <h3 class="guide-title">${guide.title || '无标题'}</h3>
                    <p class="guide-desc">${guide.description || '暂无描述'}</p>
                    <div class="guide-footer">
                        <div class="author">
                            <img src="${guide.authorAvatar || '/api/images/default-avatar.jpg'}" 
                                 alt="作者头像" 
                                 class="avatar"
                                 onerror="this.src='/api/images/default-avatar.jpg'">
                            <span class="name">${guide.authorName || '匿名用户'}</span>
                        </div>
                        <div class="stats">
                            <span class="views">
                                <i class="layui-icon layui-icon-read"></i>
                                ${guide.viewCount || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderGuideItem(guide) {
        alert(guide.id);
        return `
            <div class="guide-item" onclick="window.location.href='/guide/detail.html?id=${guide.id}'">
                <div class="guide-cover">
                    <img src="${guide.coverImage || '/api/images/default-cover.jpg'}" 
                         alt="${guide.title}" 
                         onerror="this.src='/api/images/default-cover.jpg'">
                </div>
                <div class="guide-info">
                    <h3 class="guide-title">${guide.title}</h3>
                    <div class="guide-meta">
                        <span class="author">${guide.authorName}</span>
                        <span class="view-count">
                            <i class="layui-icon layui-icon-eye"></i>
                            ${this.formatViewCount(guide.viewCount)}
                        </span>
                    </div>
                    <div class="guide-route">
                        <span>${guide.departure}</span>
                        <i class="layui-icon layui-icon-next"></i>
                        <span>${guide.destination}</span>
                    </div>
                </div>
            </div>
        `;
    }

    formatViewCount(count) {
        if (!count) return '0';
        if (count < 1000) return count.toString();
        if (count < 10000) return (count / 1000).toFixed(1) + 'K';
        return (count / 10000).toFixed(1) + 'W';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.guideList = new GuideList();
});

new Vue({
    el: '#app'
}); 