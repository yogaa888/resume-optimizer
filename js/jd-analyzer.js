/* ============================================
 * jd-analyzer.js - JD关键词提取、核心能力识别、缺口分析
 * ============================================ */

const JDAnalyzer = {

    /* ---- 主分析入口 ---- */
    analyze(jdText, resumeText) {
        const keywords = this.extractKeywords(jdText);
        const hardReqs = this.extractHardRequirements(jdText);
        const coreComps = this.identifyCoreCompetencies(jdText);
        const gaps = this.identifyGaps(keywords, hardReqs, resumeText);

        return {
            keywords,
            hardRequirements: hardReqs,
            coreCompetencies: coreComps,
            gaps,
            jdLength: jdText.length
        };
    },

    /* ---- 提取关键词 ---- */
    extractKeywords(jdText) {
        const matched = [];
        const seen = new Set();

        // 技术关键词匹配
        AppData.techKeywords.forEach(kw => {
            const regex = new RegExp(this.escapeRegex(kw), 'gi');
            if (regex.test(jdText) && !seen.has(kw.toLowerCase())) {
                seen.add(kw.toLowerCase());
                matched.push({ keyword: kw, type: 'tech', importance: 'normal' });
            }
        });

        // 软技能关键词匹配
        AppData.softKeywords.forEach(kw => {
            const regex = new RegExp(this.escapeRegex(kw), 'gi');
            if (regex.test(jdText) && !seen.has(kw.toLowerCase())) {
                seen.add(kw.toLowerCase());
                matched.push({ keyword: kw, type: 'soft', importance: 'normal' });
            }
        });

        // 计算出现次数确定重要性
        matched.forEach(item => {
            const count = (jdText.match(new RegExp(this.escapeRegex(item.keyword), 'gi')) || []).length;
            item.count = count;
            item.importance = count >= 3 ? 'high' : (count >= 2 ? 'medium' : 'normal');
        });

        // 按出现次数排序
        matched.sort((a, b) => (b.count || 1) - (a.count || 1));

        return matched;
    },

    /* ---- 提取硬性门槛 ---- */
    extractHardRequirements(jdText) {
        const reqs = [];

        AppData.hardRequirementPatterns.forEach(({ pattern, label, type }) => {
            const matches = jdText.match(pattern);
            if (matches) {
                // 去重
                const unique = [...new Set(matches.map(m => m.trim()))];
                unique.forEach(m => {
                    reqs.push({ label: label, match: m, type: type });
                });
            }
        });

        return reqs;
    },

    /* ---- 识别核心能力要求 ---- */
    identifyCoreCompetencies(jdText) {
        const competencies = [];

        // 从职责描述中提取能力要求（匹配直到句末标点的内容）
        const lines = jdText.split(/[\n\r;；。]/);
        const capabilityPatterns = [
            /能够([^\n，,。;；]+)/g,
            /具备([^\n，,。;；]+)/g,
            /熟练([^\n，,。;；]+)/g,
            /精通([^\n，,。;；]+)/g,
            /熟悉([^\n，,。;；]+)/g,
            /掌握([^\n，,。;；]+)/g,
            /擅长([^\n，,。;；]+)/g,
            /了解([^\n，,。;；]+)/g,
        ];

        const seen = new Set();
        lines.forEach(line => {
            capabilityPatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    let cap = match[1].trim();
                    // 截取到合理长度
                    cap = cap.split(/，|,|。|;|；|的|等|、/)[0].trim();
                    if (cap.length >= 2 && cap.length <= 20 && !seen.has(cap)) {
                        seen.add(cap);
                        competencies.push(cap);
                    }
                }
            });
        });

        return competencies.slice(0, 15);
    },

    /* ---- 识别缺口（简历中缺失的匹配能力点） ---- */
    identifyGaps(keywords, hardReqs, resumeText) {
        const gaps = [];
        const resumeLower = resumeText.toLowerCase();

        // 技术关键词缺口
        keywords.forEach(item => {
            if (item.importance === 'high' || item.importance === 'medium') {
                const kwLower = item.keyword.toLowerCase();
                if (!resumeLower.includes(kwLower)) {
                    gaps.push({
                        type: 'skill',
                        keyword: item.keyword,
                        importance: item.importance,
                        message: `JD高频提及「${item.keyword}」(出现${item.count}次)，简历中未体现`
                    });
                }
            }
        });

        // 硬性门槛缺口
        hardReqs.forEach(req => {
            if (req.type === 'education') {
                if (req.label.includes('硕士') && !resumeText.match(/硕士|研究生/)) {
                    gaps.push({ type: 'education', message: `岗位要求${req.label}，简历学历可能不匹配` });
                }
                if (req.label.includes('985') && !resumeText.match(/985|211|双一流/)) {
                    gaps.push({ type: 'education', message: '岗位偏好985/211/双一流院校' });
                }
            }
            if (req.type === 'language') {
                if (!resumeText.match(/CET|英语|四级|六级|雅思|托福|专四|专八/i)) {
                    gaps.push({ type: 'language', message: `岗位要求${req.match}，简历未体现英语水平` });
                }
            }
            if (req.type === 'experience' && req.label.includes('实习')) {
                if (!resumeText.match(/实习/gi)) {
                    gaps.push({ type: 'experience', message: '岗位要求实习经历，简历中未发现实习记录' });
                }
            }
        });

        return gaps;
    },

    /* ---- 转义正则特殊字符 ---- */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /* ---- 渲染JD解析报告到页面 ---- */
    renderReport(analysis, container) {
        let html = '';

        // 核心关键词
        if (analysis.keywords.length > 0) {
            html += '<div class="report-section">';
            html += '<div class="report-section-title">岗位刚需关键词</div>';
            html += '<div class="keyword-tags">';
            analysis.keywords.slice(0, 25).forEach(item => {
                let cls = item.importance === 'high' ? 'hard' : (item.importance === 'medium' ? 'missing' : 'matched');
                let badge = item.importance === 'high' ? ' ★' : '';
                html += `<span class="keyword-tag ${cls}">${item.keyword}${badge}</span>`;
            });
            html += '</div></div>';
        }

        // 硬性门槛
        if (analysis.hardRequirements.length > 0) {
            html += '<div class="report-section">';
            html += '<div class="report-section-title">硬性门槛</div>';
            html += '<div class="keyword-tags">';
            // 去重显示
            const seen = new Set();
            analysis.hardRequirements.forEach(req => {
                if (!seen.has(req.label)) {
                    seen.add(req.label);
                    html += `<span class="keyword-tag hard">${req.label}</span>`;
                }
            });
            html += '</div></div>';
        }

        // 核心能力要求
        if (analysis.coreCompetencies.length > 0) {
            html += '<div class="report-section">';
            html += '<div class="report-section-title">核心能力要求</div>';
            html += '<div class="keyword-tags">';
            analysis.coreCompetencies.forEach(cap => {
                html += `<span class="keyword-tag matched">${cap}</span>`;
            });
            html += '</div></div>';
        }

        // 缺失能力点
        if (analysis.gaps.length > 0) {
            html += '<div class="report-section">';
            html += '<div class="report-section-title">你的简历缺少的匹配能力点</div>';
            html += '<ul class="gap-list">';
            analysis.gaps.forEach(gap => {
                html += `<li>${gap.message}</li>`;
            });
            html += '</ul></div>';
        }

        if (!html) {
            html = '<div class="placeholder-text">未提取到有效信息，请检查JD内容是否完整</div>';
        }

        container.innerHTML = html;
    }
};
