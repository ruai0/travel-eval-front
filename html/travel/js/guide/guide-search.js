document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const guideCards = document.querySelectorAll('.guide-card');
    
    // 搜索功能
    function handleSearch() {
        const keyword = searchInput.value.trim();
        if (keyword) {
            // TODO: 实现搜索逻辑
            console.log('搜索关键词:', keyword);
        }
    }

    // 绑定搜索按钮点击事件
    searchBtn.addEventListener('click', handleSearch);

    // 绑定输入框回车事件
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 攻略卡片点击事件
    guideCards.forEach(card => {
        card.addEventListener('click', function() {
            const guideId = this.dataset.id; // 假设每个卡片都有一个data-id属性
            // TODO: 跳转到详情页面
            console.log('跳转到攻略详情页:', guideId);
            // window.location.href = `/guide-detail/${guideId}`;
        });
    });
});

class SearchHistory {
    constructor() {
        this.MAX_ITEMS = 5;        // 最大存储数量
        this.VISIBLE_ITEMS = 3;    // 最大显示数量
        this.STORAGE_KEY = 'searchHistory';
        
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.historyContainer = document.getElementById('searchHistory');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderHistory();
    }

    bindEvents() {
        // 搜索框焦点事件
        this.searchInput.addEventListener('focus', () => {
            if (this.getHistory().length > 0) {
                this.showHistory();
            }
        });

        // 搜索按钮点击事件
        this.searchBtn.addEventListener('click', () => {
            this.handleSearch();
        });

        // 回车搜索
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // 点击其他区域隐藏历史记录
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideHistory();
            }
        });
    }

    // 获取历史记录
    getHistory() {
        try {
            const history = localStorage.getItem(this.STORAGE_KEY);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('读取历史记录失败:', error);
            return [];
        }
    }

    // 保存历史记录
    saveHistory(keyword) {
        if (!keyword.trim()) return;

        try {
            let history = this.getHistory();
            
            // 删除已存在的相同关键词
            history = history.filter(item => item !== keyword);
            
            // 添加到开头
            history.unshift(keyword);
            
            // 限制数量
            if (history.length > this.MAX_ITEMS) {
                history = history.slice(0, this.MAX_ITEMS);
            }
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
            this.renderHistory();
            
        } catch (error) {
            console.error('保存历史记录失败:', error);
        }
    }

    // 渲染历史记录
    renderHistory() {
        const history = this.getHistory();
        const historyList = this.historyContainer.querySelector('.history-list');
        
        if (history.length === 0) {
            this.hideHistory();
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <span class="history-text">${this.escapeHtml(item)}</span>
                <span class="delete-btn" data-keyword="${this.escapeHtml(item)}">×</span>
            </div>
        `).join('');

        // 绑定历史记录点击事件
        historyList.querySelectorAll('.history-item').forEach(item => {
            // 历史记录点击事件
            item.addEventListener('click', () => {
                const keyword = item.querySelector('.history-text').textContent;
                this.searchInput.value = keyword;
                this.handleSearch();
            });

            // 删除按钮点击事件
            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                const keyword = deleteBtn.dataset.keyword;
                this.deleteHistoryItem(keyword, e);
            });
        });

        // 设置容器高度
        const itemHeight = 30;
        const containerHeight = Math.min(history.length, this.VISIBLE_ITEMS) * itemHeight;
        this.historyContainer.style.maxHeight = `${containerHeight}px`;
    }

    // HTML转义，防止XSS攻击
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 处理搜索
    handleSearch() {
        const keyword = this.searchInput.value.trim();
        if (keyword) {
            this.saveHistory(keyword);
            // TODO: 实现搜索逻辑
            console.log('搜索关键词:', keyword);
            this.hideHistory();
        }
    }

    showHistory() {
        this.historyContainer.classList.add('active');
    }

    hideHistory() {
        this.historyContainer.classList.remove('active');
    }

    // 删除单条历史记录
    deleteHistoryItem(keyword, event) {
        // 阻止事件冒泡，避免触发历史记录的点击事件
        event.stopPropagation();
        
        try {
            let history = this.getHistory();
            history = history.filter(item => item !== keyword);
            
            if (history.length === 0) {
                // 如果没有记录了，隐藏历史记录容器
                this.hideHistory();
            }
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
            this.renderHistory();
        } catch (error) {
            console.error('删除历史记录失败:', error);
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new SearchHistory();
});