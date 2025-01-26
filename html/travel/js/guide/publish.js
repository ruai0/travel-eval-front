class PublishGuide {
    constructor() {
        this.initElements();
        this.initState();
        this.bindEvents();
        this.travelMap = window.travelMap;
    }

    initElements() {
        // 获取所有需要的元素
        this.titleInput = document.querySelector('.title-input');
        this.introInput = document.getElementById('briefIntro');
        this.currentCount = document.getElementById('currentCount');
        this.departureInput = document.querySelector('.location-input:first-of-type');
        this.destinationInput = document.querySelector('.location-input:last-of-type');
        this.publishBtn = document.getElementById('publishBtn');

        // 验证元素是否找到
        if (!this.publishBtn) {
            console.error('发布按钮未找到');
        }
    }

    initState() {
        this.isPublishing = false;
        this.maxTitle = 50;
        this.maxIntro = 300; // 修改为300字限制
        this.minDays = 1;
        this.maxDays = 30;
    }

    bindEvents() {
        // 发布按钮事件
        this.publishBtn?.addEventListener('click', () => {
            this.handlerPublish();
        });

        // 简介输入事件
        if (this.introInput && this.currentCount) {
            ['input', 'keyup', 'keydown', 'change'].forEach(eventType => {
                this.introInput.addEventListener(eventType, () => {
                    this.updateWordCount();
                });
            });

            // 特殊处理粘贴事件
            this.introInput.addEventListener('paste', () => {
                setTimeout(() => this.updateWordCount(), 10);
            });
        }
    }

    updateWordCount() {
        if (!this.introInput || !this.currentCount) return;

        const currentLength = this.introInput.value.length;
        this.currentCount.textContent = currentLength;

        const wordCountDiv = this.currentCount.parentElement;
        if (currentLength > this.maxIntro) {
            wordCountDiv.classList.add('exceed');
            // 截断超出的文字
            this.introInput.value = this.introInput.value.slice(0, this.maxIntro);
            this.currentCount.textContent = this.maxIntro;
        } else {
            wordCountDiv.classList.remove('exceed');
        }
    }

    // 处理返回
    handleBack() {
        if (this.hasUnsavedChanges()) {
            if (confirm('内容尚未保存，确定要离开吗？')) {
                this.navigateBack();
            }
        } else {
            this.navigateBack();
        }
    }

    // 检查是否有未保存的更改
    hasUnsavedChanges() {
        return !!(
            this.titleInput.value.trim() ||
            this.introInput.value.trim() ||
            this.departureInput.value.trim() ||
            this.destinationInput.value.trim() ||
            (this.daysInput.value !== '1') 
        );
    }

    // 返回上一页
    navigateBack() {
        window.location.href = './index.html';
    }

    // 处理标题输入
    handleTitleInput() {
        const text = this.titleInput.value;
        const count = text.length;
        this.titleCount.textContent = `${count}/${this.maxTitle}`;
        
        if (count > this.maxTitle) {
            this.titleInput.value = text.slice(0, this.maxTitle);
            this.titleCount.textContent = `${this.maxTitle}/${this.maxTitle}`;
        }
    }

    // 处理简介输入
    handleIntroInput() {
        const text = this.introInput.value;
        const count = text.length;
        this.introCount.textContent = `${count}/${this.maxIntro}`;
        
        if (count > this.maxIntro) {
            this.introInput.value = text.slice(0, this.maxIntro);
            this.introCount.textContent = `${this.maxIntro}/${this.maxIntro}`;
        }
    }

    // 调整天数
    adjustDays(delta) {
        let value = parseInt(this.daysInput.value) || 0;
        value = Math.max(this.minDays, Math.min(this.maxDays, value + delta));
        this.daysInput.value = value;
    }

    // 处理天数输入
    handleDaysInput() {
        let value = this.daysInput.value.replace(/[^\d]/g, '');
        if (value) {
            value = Math.max(this.minDays, Math.min(this.maxDays, parseInt(value)));
        }
        this.daysInput.value = value;
    }

    // 验证天数
    validateDays() {
        if (!this.daysInput.value || parseInt(this.daysInput.value) < this.minDays) {
            this.daysInput.value = this.minDays;
        }
    }

    // 修改验证表单方法
    validateForm() {
        const requiredFields = [
            { value: this.titleInput?.value.trim(), message: '请输入标题' },
            { value: this.introInput?.value.trim(), message: '请输入简介' },
        ];

        for (const field of requiredFields) {
            if (!field.value) {
                layer.msg(field.message);
                return false;
            }
        }

        // 验证标题长度
        if (this.titleInput.value.length < 2) {
            layer.msg('标题至少需要2个字符');
            return false;
        }

        // 验证简介长度
        if (this.introInput.value.length < 10) {
            layer.msg('简介至少需要10个字符');
            return false;
        }

        return true;
    }

    // 修改发布处理方法
    async handlerPublish() {
        
        if (this.isPublishing) {
            layer.msg('正在发布中，请勿重复操作');
            return;
        }

        try {
            // 表单验证
            if (!this.validateForm()) {
                return;
            }

            // 检查地图选点
            if (!this.travelMap?.selectedPlaces?.length) {
                layer.msg('请至少选择一个地点');
                return;
            }

            // 检查图片上传
            const uploadedImages = document.querySelectorAll('.image-item[data-url]');
            if (uploadedImages.length === 0) {
                layer.msg('请至少上传一张图片');
                return;
            }

            this.isPublishing = true;
            this.updatePublishButtonState(true);

            // 1. 保存路线
            const routeId = await this.travelMap.savePlaces();
            if (!routeId) {
                throw new Error('路线保存失败');
            }

            // 2. 收集图片URL
            const imageUrls = Array.from(uploadedImages).map(img => img.getAttribute('data-url'));

            // 3. 发布攻略
            const guideData = {
                title: this.titleInput.value.trim(),
                description: this.introInput.value.trim(),
                departure: this.departureInput.value.trim(),
                destination: this.destinationInput.value.trim(),
                imageUrls: imageUrls,
                routeId: routeId
            };

            const response = await axios.post('/api/admin/user/travel-guide/publish', guideData,{
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                }
            });
            
            if (response.data.code === 200) {
                layer.msg('发布成功！');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1500);
            } else {
                throw new Error(response.data.message || '发布失败');
            }

        } catch (error) {
            console.error('发布失败:', error);
            layer.msg('发布失败：' + (error.message || '请稍后重试'));
        } finally {
            this.isPublishing = false;
            this.updatePublishButtonState(false);
        }
    }

    // 更新发布按钮状态
    updatePublishButtonState(isLoading) {
        if (!this.publishBtn) return;
        
        this.publishBtn.disabled = isLoading;
        const loadingHtml = '<i class="layui-icon layui-icon-loading layui-anim layui-anim-rotate layui-anim-loop"></i> 发布中...';
        this.publishBtn.innerHTML = isLoading ? loadingHtml : '发布攻略';
    }
}

// 初始化实例
let publishGuide;
window.addEventListener('load', () => {
    publishGuide = new PublishGuide();
    window.publishGuide = publishGuide;
});



