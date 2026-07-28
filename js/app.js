/* ============================================
 * app.js - 主控制器：UI交互、流程编排
 * ============================================ */

const App = {

    optimizedResult: null,

    /* ---- 初始化 ---- */
    init() {
        // 设置 PDF.js worker
        if (window.pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        // 初始化各模块
        FileParser.init();

        // 绑定事件
        this.bindEvents();

        // 渲染辅助素材
        this.renderMaterials();

        // JD字数统计
        this.bindJDCharCount();
    },

    /* ---- 绑定事件 ---- */
    bindEvents() {
        // 下载模板
        document.getElementById('btn-download-template').addEventListener('click', () => {
            DownloadManager.downloadTemplate();
        });

        // 生成优化简历
        document.getElementById('btnGenerate').addEventListener('click', () => {
            this.handleGenerate();
        });

        // 下载DOCX
        document.getElementById('btnDownloadDocx').addEventListener('click', () => {
            if (this.optimizedResult) {
                DownloadManager.downloadDocx(this.optimizedResult.text);
            }
        });

        // 下载PDF
        document.getElementById('btnDownloadPdf').addEventListener('click', () => {
            if (this.optimizedResult) {
                DownloadManager.downloadPDF(this.optimizedResult.text);
            }
        });

        // 复制全文
        document.getElementById('btnCopyAll').addEventListener('click', () => {
            if (this.optimizedResult) {
                DownloadManager.copyAll(this.optimizedResult.text);
            }
        });

        // 一键清空
        document.getElementById('btnReset').addEventListener('click', () => {
            this.handleReset();
        });

        // 展开/收起辅助素材
        document.getElementById('btnToggleMaterial').addEventListener('click', () => {
            const content = document.getElementById('materialContent');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });

        // 辅助素材点击复制
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('material-tag')) {
                this.copyToClipboard(e.target.textContent);
            }
            if (e.target.classList.contains('sentence-template')) {
                this.copyToClipboard(e.target.textContent.trim());
            }
        });
    },

    /* ---- JD字数统计 ---- */
    bindJDCharCount() {
        const jdInput = document.getElementById('jdInput');
        const jdCharCount = document.getElementById('jdCharCount');
        jdInput.addEventListener('input', () => {
            jdCharCount.textContent = jdInput.value.length;
        });
    },

    /* ---- 处理生成 ---- */
    async handleGenerate() {
        // 校验
        if (!FileParser.hasFile()) {
            this.showToast('请上传简历文件并粘贴完整岗位JD', 'error');
            return;
        }

        const jdText = document.getElementById('jdInput').value.trim();
        if (!jdText || jdText.length < 20) {
            this.showToast('请上传简历文件并粘贴完整岗位JD', 'error');
            return;
        }

        // 获取设置
        const settings = this.getSettings();
        if (!settings.intensity) {
            this.showToast('请选择优化强度', 'error');
            return;
        }

        // 执行
        this.showLoading('正在分析JD并生成优化简历...');

        // 模拟异步处理（让UI有时间渲染loading）
        await this.sleep(300);

        try {
            const resumeText = FileParser.getText();

            // 1. JD分析
            const jdAnalysis = JDAnalyzer.analyze(jdText, resumeText);

            // 设置全局JD关键词供优化模块使用
            window._currentJDKeys = jdAnalysis.keywords.map(k => k.keyword);

            // 2. 简历优化
            const optimizationResult = ResumeOptimizer.optimize(resumeText, jdAnalysis, settings);

            // 3. 匹配度评分
            const scoreResult = ScoreCalculator.calculate(resumeText, jdAnalysis);

            // 4. 渲染结果
            this.renderResults(jdAnalysis, optimizationResult, scoreResult, resumeText);

            this.optimizedResult = optimizationResult;

            this.hideLoading();
            this.showToast(`简历优化完成！匹配度得分：${scoreResult.score}分`, 'success');

            // 滚动到结果区
            document.getElementById('jdReportCard').scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            console.error('优化失败:', err);
            this.hideLoading();
            this.showToast('优化处理失败，请重试', 'error');
        }
    },

    /* ---- 渲染所有结果 ---- */
    renderResults(jdAnalysis, optimizationResult, scoreResult, originalText) {
        // 1. JD解析报告
        const jdReportContent = document.getElementById('jdReportContent');
        JDAnalyzer.renderReport(jdAnalysis, jdReportContent);

        // 2. 匹配度得分
        const scoreCard = document.getElementById('scoreCard');
        ScoreCalculator.renderScore(
            scoreResult,
            scoreCard,
            document.getElementById('scoreRing'),
            document.getElementById('scoreNumber'),
            document.getElementById('scoreLabel'),
            document.getElementById('scoreBreakdown')
        );

        // 3. 双栏对照
        this.renderComparison(originalText, optimizationResult);

        // 4. 显示操作按钮
        document.getElementById('actionBar').style.display = 'flex';
    },

    /* ---- 渲染双栏对照 ---- */
    renderComparison(originalText, optimizationResult) {
        const compareCard = document.getElementById('compareCard');
        const originalContent = document.getElementById('originalContent');
        const optimizedContent = document.getElementById('optimizedContent');

        compareCard.style.display = 'block';

        // 原始简历（转义HTML）
        originalContent.innerHTML = this.escapeHTML(originalText);

        // 优化后简历（带高亮的HTML）
        optimizedContent.innerHTML = optimizationResult.html;

        // 添加优化版的CSS样式
        if (!document.getElementById('opt-section-style')) {
            const style = document.createElement('style');
            style.id = 'opt-section-style';
            style.textContent = `
                .opt-section { margin-bottom: 16px; }
                .opt-section-title { font-weight: 700; font-size: 14px; margin-bottom: 6px; color: #1a202c; }
                .opt-section-body { padding-left: 8px; }
            `;
            document.head.appendChild(style);
        }
    },

    /* ---- 获取设置 ---- */
    getSettings() {
        const intensityInput = document.querySelector('input[name="intensity"]:checked');
        const sections = Array.from(document.querySelectorAll('#sectionGroup input:checked')).map(i => i.value);

        return {
            intensity: intensityInput ? intensityInput.value : null,
            sections: sections
        };
    },

    /* ---- 处理重置 ---- */
    handleReset() {
        // 清除文件
        FileParser.clearFile();

        // 清除JD
        document.getElementById('jdInput').value = '';
        document.getElementById('jdCharCount').textContent = '0';

        // 重置设置
        document.querySelector('input[name="intensity"][value="medium"]').checked = true;
        document.querySelectorAll('#sectionGroup input').forEach(i => i.checked = true);

        // 隐藏结果
        document.getElementById('jdReportContent').innerHTML = '<div class="placeholder-text">上传简历并粘贴JD后，点击「生成优化简历」即可查看解析报告</div>';
        document.getElementById('scoreCard').style.display = 'none';
        document.getElementById('compareCard').style.display = 'none';
        document.getElementById('actionBar').style.display = 'none';

        // 清除数据
        this.optimizedResult = null;
        window._currentJDKeys = [];

        this.showToast('已清空所有内容', 'info');
    },

    /* ---- 渲染辅助素材 ---- */
    renderMaterials() {
        // 行为动词库
        const verbTags = document.getElementById('verbTags');
        verbTags.innerHTML = AppData.actionVerbLibrary
            .map(verb => `<span class="material-tag">${verb}</span>`).join('');

        // 句式模板
        const sentenceTemplates = document.getElementById('sentenceTemplates');
        sentenceTemplates.innerHTML = AppData.sentenceTemplates
            .map(item => `<div class="sentence-template"><strong>[${item.category}]</strong> ${item.template}</div>`).join('');
    },

    /* ---- Toast 提示 ---- */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'all 0.3s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    /* ---- 显示加载 ---- */
    showLoading(text) {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = text || '正在处理...';
        overlay.style.display = 'flex';
    },

    /* ---- 隐藏加载 ---- */
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    },

    /* ---- 复制到剪贴板 ---- */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast(`已复制：${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`, 'success');
        } catch (err) {
            this.showToast('复制失败', 'error');
        }
    },

    /* ---- 工具方法 ---- */
    escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

/* ---- 页面加载完成后初始化 ---- */
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
