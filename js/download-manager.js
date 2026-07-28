/* ============================================
 * download-manager.js - DOCX/PDF下载、复制、模板下载
 * ============================================ */

const DownloadManager = {

    /* ---- 下载空白简历模板 ---- */
    downloadTemplate() {
        const content = AppData.blankTemplate;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, '应届生通用简历模板.txt');
        App.showToast('简历模板已下载', 'success');
    },

    /* ---- 下载DOCX（使用Word兼容HTML格式） ---- */
    downloadDocx(text) {
        // 构建 Word 兼容的 HTML
        const html = this.buildWordHTML(text);
        const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
        saveAs(blob, '优化后简历.doc');
        App.showToast('DOCX文件已下载', 'success');
    },

    /* ---- 下载PDF（使用html2canvas + jsPDF） ---- */
    async downloadPDF(text) {
        try {
            App.showLoading('正在生成PDF文件...');

            // 创建临时容器渲染简历内容
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `
                position: absolute;
                left: -9999px;
                top: 0;
                width: 800px;
                padding: 40px;
                background: #fff;
                font-family: "Microsoft YaHei", "SimHei", sans-serif;
                font-size: 14px;
                line-height: 1.8;
                color: #1a202c;
                white-space: pre-wrap;
                word-break: break-word;
            `;
            tempDiv.textContent = text;
            document.body.appendChild(tempDiv);

            // 使用 html2canvas 截图
            const canvas = await html2canvas(tempDiv, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });

            document.body.removeChild(tempDiv);

            // 使用 jsPDF 生成 PDF
            const { jsPDF } = window.jspdf;
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgWidth = 210; // A4 宽度 mm
            const pageHeight = 297; // A4 高度 mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            const pdf = new jsPDF('p', 'mm', 'a4');
            let position = 0;
            let heightLeft = imgHeight;

            // 第一页
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // 多页处理
            while (heightLeft > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save('优化后简历.pdf');
            App.hideLoading();
            App.showToast('PDF文件已下载', 'success');
        } catch (err) {
            console.error('PDF生成失败:', err);
            App.hideLoading();
            App.showToast('PDF生成失败，请尝试下载DOCX', 'error');
        }
    },

    /* ---- 复制全文到剪贴板 ---- */
    async copyAll(text) {
        try {
            await navigator.clipboard.writeText(text);
            App.showToast('全文已复制到剪贴板', 'success');
        } catch (err) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                App.showToast('全文已复制到剪贴板', 'success');
            } catch (e) {
                App.showToast('复制失败，请手动选择文本复制', 'error');
            }
            document.body.removeChild(textarea);
        }
    },

    /* ---- 构建 Word 兼容 HTML ---- */
    buildWordHTML(text) {
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>');

        return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>优化后简历</title>
<style>
body { font-family: "Microsoft YaHei", "SimHei", sans-serif; font-size: 12pt; line-height: 1.8; color: #1a202c; }
br { mso-data-placement: same-cell; }
</style>
</head>
<body>
${escaped}
</body>
</html>`;
    }
};
