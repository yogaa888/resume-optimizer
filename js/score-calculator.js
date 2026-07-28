/* ============================================
 * score-calculator.js - 匹配度评分（0-100）+ 扣分明细
 * ============================================ */

const ScoreCalculator = {

    /* ---- 评分维度配置 ---- */
    dimensions: [
        { key: 'keywords', name: '关键词匹配', weight: 25, max: 25 },
        { key: 'skills', name: '核心技能', weight: 25, max: 25 },
        { key: 'education', name: '学历/专业', weight: 15, max: 15 },
        { key: 'experience', name: '经历匹配', weight: 20, max: 20 },
        { key: 'evaluation', name: '自评相关度', weight: 15, max: 15 }
    ],

    /* ---- 主计算入口 ---- */
    calculate(resumeText, jdAnalysis) {
        const resumeLower = resumeText.toLowerCase();
        const results = [];
        let totalScore = 0;

        // 1. 关键词匹配
        const kwResult = this.scoreKeywords(jdAnalysis.keywords, resumeLower);
        results.push({ ...kwResult, name: '关键词匹配', max: 25 });
        totalScore += kwResult.score;

        // 2. 核心技能
        const skillResult = this.scoreSkills(jdAnalysis, resumeLower);
        results.push({ ...skillResult, name: '核心技能', max: 25 });
        totalScore += skillResult.score;

        // 3. 学历/专业
        const eduResult = this.scoreEducation(jdAnalysis.hardRequirements, resumeText);
        results.push({ ...eduResult, name: '学历/专业', max: 15 });
        totalScore += eduResult.score;

        // 4. 经历匹配
        const expResult = this.scoreExperience(jdAnalysis, resumeLower);
        results.push({ ...expResult, name: '经历匹配', max: 20 });
        totalScore += expResult.score;

        // 5. 自评相关度
        const evalResult = this.scoreEvaluation(jdAnalysis, resumeLower);
        results.push({ ...evalResult, name: '自评相关度', max: 15 });
        totalScore += evalResult.score;

        totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

        return {
            score: totalScore,
            label: this.getScoreLabel(totalScore),
            breakdown: results,
            color: this.getScoreColor(totalScore)
        };
    },

    /* ---- 关键词评分 ---- */
    scoreKeywords(keywords, resumeLower) {
        if (!keywords.length) return { score: 0, deductions: ['JD中未提取到关键词'] };

        const total = keywords.length;
        const matched = keywords.filter(k => resumeLower.includes(k.keyword.toLowerCase()));
        const matchRate = matched.length / total;

        let score = Math.round(25 * matchRate);
        const deductions = [];

        const missing = keywords.filter(k => !resumeLower.includes(k.keyword.toLowerCase()));
        if (missing.length > 0) {
            const highMissing = missing.filter(k => k.importance === 'high');
            const medMissing = missing.filter(k => k.importance === 'medium');

            if (highMissing.length > 0) {
                deductions.push(`缺失高频关键词：${highMissing.slice(0, 5).map(k => k.keyword).join('、')} (-${highMissing.length * 3}分)`);
            }
            if (medMissing.length > 0) {
                deductions.push(`缺失中频关键词：${medMissing.slice(0, 3).map(k => k.keyword).join('、')} (-${medMissing.length * 1}分)`);
            }
        }

        return { score, deductions, matched: matched.length, total };
    },

    /* ---- 核心技能评分 ---- */
    scoreSkills(jdAnalysis, resumeLower) {
        const techKws = jdAnalysis.keywords.filter(k => k.type === 'tech');
        if (!techKws.length) return { score: 20, deductions: [] };

        const matched = techKws.filter(k => resumeLower.includes(k.keyword.toLowerCase()));
        const matchRate = matched.length / techKws.length;

        let score = Math.round(25 * matchRate);
        const deductions = [];

        const highTech = techKws.filter(k => k.importance === 'high' && !resumeLower.includes(k.keyword.toLowerCase()));
        if (highTech.length > 0) {
            deductions.push(`未体现JD刚需技能：${highTech.slice(0, 5).map(k => k.keyword).join('、')} (-${highTech.length * 4}分)`);
        }

        return { score, deductions };
    },

    /* ---- 学历/专业评分 ---- */
    scoreEducation(hardReqs, resumeText) {
        let score = 15;
        const deductions = [];

        hardReqs.forEach(req => {
            if (req.type === 'education') {
                if (req.label.includes('硕士') && !resumeText.match(/硕士|研究生/)) {
                    score -= 5;
                    deductions.push('学历未达硕士要求 (-5分)');
                }
                if (req.label.includes('985') && !resumeText.match(/985|211|双一流/)) {
                    score -= 3;
                    deductions.push('非985/211/双一流院校 (-3分)');
                }
                if (req.label.includes('本科') && !resumeText.match(/本科|学士|大学|学院/)) {
                    score -= 8;
                    deductions.push('学历信息不明确 (-8分)');
                }
            }
            if (req.type === 'major' && !resumeText.match(new RegExp(req.match, 'i'))) {
                score -= 3;
                deductions.push(`专业可能不符：要求${req.match} (-3分)`);
            }
        });

        score = Math.max(0, score);
        return { score, deductions };
    },

    /* ---- 经历评分 ---- */
    scoreExperience(jdAnalysis, resumeLower) {
        let score = 20;
        const deductions = [];

        // 检查实习经历
        const hasInternReq = jdAnalysis.hardRequirements.some(r => r.type === 'experience');
        if (hasInternReq && !resumeLower.includes('实习')) {
            score -= 10;
            deductions.push('简历中未体现实习经历 (-10分)');
        } else if (!resumeLower.includes('实习') && !resumeLower.includes('项目')) {
            score -= 8;
            deductions.push('简历缺乏实习或项目经历描述 (-8分)');
        }

        // 检查经历描述深度（是否有量化数据）
        if (!/\d+[%％]|约\d+|超过\d+|\d+次|\d+个|\d+人|\d+万/.test(resumeLower)) {
            score -= 5;
            deductions.push('经历描述缺乏量化数据支撑 (-5分)');
        }

        // 检查是否使用了STAR格式
        if (!/最终|实现|达成|结果|从而/.test(resumeLower)) {
            score -= 3;
            deductions.push('经历描述未体现结果导向（STAR不完整）(-3分)');
        }

        score = Math.max(0, score);
        return { score, deductions };
    },

    /* ---- 自评相关度评分 ---- */
    scoreEvaluation(jdAnalysis, resumeLower) {
        let score = 15;
        const deductions = [];

        // 检查自评中是否包含万能模板词汇
        const templateWords = ['性格开朗', '工作认真', '责任心强', '团队精神', '积极向上', '乐于助人', '吃苦耐劳'];
        const templateCount = templateWords.filter(w => resumeLower.includes(w)).length;
        if (templateCount > 2) {
            score -= 5;
            deductions.push(`自评含${templateCount}处万能模板词汇 (-5分)`);
        }

        // 检查自评是否涉及JD关键词
        const topKws = jdAnalysis.keywords.filter(k => k.importance === 'high').slice(0, 5);
        if (topKws.length > 0) {
            const matchedInEval = topKws.filter(k => resumeLower.includes(k.keyword.toLowerCase())).length;
            if (matchedInEval === 0) {
                score -= 5;
                deductions.push('自评未关联JD核心关键词 (-5分)');
            } else {
                score -= (5 - matchedInEval);
            }
        }

        // 检查是否有数据驱动表述
        if (!/数据|量化|结果|产出|指标/.test(resumeLower)) {
            score -= 3;
            deductions.push('自评缺乏结果/数据导向表述 (-3分)');
        }

        score = Math.max(0, score);
        return { score, deductions };
    },

    /* ---- 获取分数等级标签 ---- */
    getScoreLabel(score) {
        if (score >= 85) return '高度匹配';
        if (score >= 70) return '较好匹配';
        if (score >= 50) return '一般匹配';
        if (score >= 30) return '匹配度较低';
        return '匹配度很低';
    },

    /* ---- 获取分数颜色 ---- */
    getScoreColor(score) {
        if (score >= 70) return '#48bb78';
        if (score >= 50) return '#4a90d9';
        if (score >= 30) return '#ed8936';
        return '#e53e3e';
    },

    /* ---- 渲染得分到页面 ---- */
    renderScore(result, scoreCard, scoreRing, scoreNumber, scoreLabel, scoreBreakdown) {
        scoreCard.style.display = 'block';

        // 圆环动画
        const circumference = 2 * Math.PI * 52;
        const offset = circumference - (result.score / 100) * circumference;
        const circle = document.getElementById('scoreCircle');
        circle.style.stroke = result.color;
        circle.style.strokeDashoffset = offset;

        // 数字
        scoreNumber.textContent = result.score;
        scoreNumber.style.color = result.color;
        scoreLabel.textContent = result.label;

        // 明细
        let html = '';
        result.breakdown.forEach(item => {
            const percent = (item.score / item.max) * 100;
            const barColor = percent >= 70 ? '#48bb78' : (percent >= 40 ? '#4a90d9' : '#ed8936');
            html += '<div class="breakdown-item">';
            html += `<span class="breakdown-name">${item.name}</span>`;
            html += `<div class="breakdown-bar"><div class="breakdown-bar-fill" style="width:${percent}%;background:${barColor}"></div></div>`;
            html += `<span class="breakdown-score">${item.score}/${item.max}</span>`;
            html += '</div>';

            if (item.deductions && item.deductions.length > 0) {
                item.deductions.forEach(d => {
                    html += `<div class="breakdown-item"><span class="breakdown-name"></span><span class="breakdown-deduct">${d}</span></div>`;
                });
            }
        });
        scoreBreakdown.innerHTML = html;
    }
};
