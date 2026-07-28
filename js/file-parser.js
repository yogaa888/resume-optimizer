/* ============================================
 * file-parser.js - 文件上传、格式校验、PDF/DOCX解析
 * ============================================ */

const FileParser = {

    currentFile: null,
    currentText: '',

    /* ---- 初始化上传区域 ---- */
    init() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const btnRemove = document.getElementById('btnRemoveFile');

        // 点击上传
        uploadZone.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove')) return;
            fileInput.click();
        });

        // 文件选择
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleFile(e.target.files[0]);
        });

        // 拖拽上传
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files[0]) this.handleFile(e.dataTransfer.files[0]);
        });

        // 移除文件
        btnRemove.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearFile();
        });
    },

    /* ---- 处理上传文件 ---- */
    async handleFile(file) {
        // 格式校验
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'pdf' && ext !== 'docx') {
            App.showToast('仅支持PDF、Word文档上传', 'error');
            return;
        }

        this.currentFile = file;
        this.showFileInfo(file);

        try {
            App.showLoading('正在解析简历文件...');
            let text = '';

            if (ext === 'pdf') {
                text = await this.parsePDF(file);
            } else if (ext === 'docx') {
                text = await this.parseDOCX(file);
            }

            if (!text || text.trim().length < 10) {
                throw new Error('文件内容为空或无法识别');
            }

            this.currentText = text;
            this.showPreview(text);
            App.hideLoading();
            App.showToast('简历解析成功', 'success');
        } catch (err) {
            console.error('文件解析失败:', err);
            App.hideLoading();
            App.showToast('文件读取失败，请更换简历文件重新上传', 'error');
            this.clearFile();
        }
    },

    /* ---- 解析PDF ---- */
    async parsePDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText.trim();
    },

    /* ---- 解析DOCX ---- */
    async parseDOCX(file) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value.trim();
    },

    /* ---- 显示文件信息 ---- */
    showFileInfo(file) {
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('uploadFileInfo').style.display = 'flex';
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatSize(file.size);
    },

    /* ---- 显示预览 ---- */
    showPreview(text) {
        const container = document.getElementById('previewContainer');
        const content = document.getElementById('previewContent');
        const count = document.getElementById('previewCount');

        container.style.display = 'block';
        content.textContent = text;
        count.textContent = `${text.length} 字`;
    },

    /* ---- 清除文件 ---- */
    clearFile() {
        this.currentFile = null;
        this.currentText = '';
        document.getElementById('fileInput').value = '';
        document.getElementById('uploadPlaceholder').style.display = 'flex';
        document.getElementById('uploadFileInfo').style.display = 'none';
        document.getElementById('previewContainer').style.display = 'none';
    },

    /* ---- 格式化文件大小 ---- */
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    /* ---- 获取当前简历文本 ---- */
    getText() {
        return this.currentText;
    },

    /* ---- 是否已上传简历 ---- */
    hasFile() {
        return this.currentFile !== null && this.currentText.trim().length > 0;
    }
};
