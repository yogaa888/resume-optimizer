/* ============================================
 * resume-optimizer.js - 简历优化引擎
 * 动词替换 | STAR重构 | 技能重排 | 教育筛选 | 自评定制
 * ============================================ */

const ResumeOptimizer = {

    /* ---- 主优化入口 ---- */
    optimize(originalText, jdAnalysis, settings) {
        // 1. 解析简历分段
        const sections = this.parseSections(originalText);

        // 2. JD关键词优先级列表
        const jdKeywords = jdAnalysis.keywords.map(k => k.keyword);

        // 3. 逐段优化
        const optimized = {};
        const changes = [];

        for (const [key, content] of Object.entries(sections)) {
            if (!settings.sections.includes(key)) {
                optimized[key] = content;
                continue;
            }

            const result = this.optimizeSection(key, content, jdAnalysis, settings, jdKeywords);
            optimized[key] = result.text;
            if (result.changes.length > 0) {
                changes.push(...result.changes.map(c => ({ ...c, section: key })));
            }
        }

        // 4. 按JD需求重排板块顺序
        const orderedKeys = this.reorderSections(Object.keys(optimized), jdAnalysis);

        // 5. 组装最终文本 + 变更追踪
        const finalText = orderedKeys.map(key => {
            const name = AppData.sectionNames[key] || key;
            return `【${name}】\n${optimized[key]}`;
        }).join('\n\n');

        // 6. 生成带高亮的HTML版本
        const optimizedHTML = this.generateHighlightedHTML(optimized, orderedKeys, changes);

        return {
            text: finalText,
            html: optimizedHTML,
            changes: changes,
            sections: optimized,
            sectionOrder: orderedKeys
        };
    },

    /* ---- 解析简历分段 ---- */
    parseSections(text) {
        const sections = {};
        let currentSection = 'summary';
        let currentContent = [];

        // 先尝试按【】或常见标题分段
        const lines = text.split('\n');
        let foundAnyHeader = false;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                currentContent.push('');
                return;
            }

            // 检测板块标题
            let matched = false;
            for (const [key, patterns] of Object.entries(AppData.sectionPatterns)) {
                if (patterns.some(p => p.test(trimmed)) && trimmed.length < 30) {
                    // 保存上一段
                    if (currentContent.length > 0) {
                        sections[currentSection] = currentContent.join('\n').trim();
                    }
                    currentSection = key;
                    currentContent = [];
                    foundAnyHeader = true;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                currentContent.push(line);
            }
        });

        // 保存最后一段
        if (currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim();
        }

        // 如果没有识别到任何标题，将全文放入summary
        if (!foundAnyHeader && Object.keys(sections).length === 0) {
            sections.summary = text.trim();
        }

        // 确保所有板块都存在（空字符串）
        Object.keys(AppData.sectionNames).forEach(key => {
            if (!sections[key]) sections[key] = '';
        });

        return sections;
    },

    /* ---- 单段优化 ---- */
    optimizeSection(sectionKey, content, jdAnalysis, settings, jdKeywords) {
        if (!content.trim()) return { text: '', changes: [] };

        const intensity = settings.intensity;
        let optimizedText = content;
        const changes = [];

        // === 通用：弱动词替换（所有级别都执行） ===
        const verbResult = this.replaceWeakVerbs(optimizedText, intensity);
        optimizedText = verbResult.text;
        changes.push(...verbResult.changes);

        // === 中度优化以上：语句重组、数据量化 ===
        if (intensity === 'medium' || intensity === 'deep') {
            // 量化数据挖掘
            const quantResult = this.enhanceQuantification(optimizedText);
            optimizedText = quantResult.text;
            changes.push(...quantResult.changes);

            // 语句逻辑重组
            const logicResult = this.restructureLogic(optimizedText);
            optimizedText = logicResult.text;
            changes.push(...logicResult.changes);
        }

        // === 深度优化：STAR重构、成果补充 ===
        if (intensity === 'deep') {
            const starResult = this.applySTAR(optimizedText, sectionKey, jdAnalysis);
            optimizedText = starResult.text;
            changes.push(...starResult.changes);
        }

        // === 板块特定优化 ===
        switch (sectionKey) {
            case 'skills':
                const skillResult = this.reorderSkills(optimizedText, jdKeywords);
                optimizedText = skillResult.text;
                changes.push(...skillResult.changes);
                break;

            case 'education':
                const eduResult = this.optimizeEducation(optimizedText, jdAnalysis);
                optimizedText = eduResult.text;
                changes.push(...eduResult.changes);
                break;

            case 'evaluation':
                const evalResult = this.customizeEvaluation(optimizedText, jdAnalysis);
                optimizedText = evalResult.text;
                changes.push(...evalResult.changes);
                break;

            case 'summary':
                const sumResult = this.optimizeSummary(optimizedText, jdAnalysis);
                optimizedText = sumResult.text;
                changes.push(...sumResult.changes);
                break;
        }

        // 去除空泛词汇
        const cleanResult = this.removeFillerWords(optimizedText);
        optimizedText = cleanResult.text;
        changes.push(...cleanResult.changes);

        return { text: optimizedText.trim(), changes };
    },

    /* ---- 弱动词替换 ---- */
    replaceWeakVerbs(text, intensity) {
        const changes = [];
        let result = text;

        Object.entries(AppData.weakVerbMap).forEach(([weak, strongList]) => {
            const regex = new RegExp(this.escapeRegex(weak), 'g');
            let match;
            while ((match = regex.exec(result)) !== null) {
                const strong = strongList[Math.floor(Math.random() * strongList.length)];
                // 轻度优化只替换最弱的几个动词
                if (intensity === 'light' && !['负责', '参与', '协助', '做', '做了'].includes(weak)) {
                    continue;
                }
                changes.push({
                    type: 'modify',
                    original: weak,
                    replacement: strong,
                    message: `动词升级：「${weak}」→「${strong}」`
                });
            }
            result = result.replace(regex, () => {
                const strong = strongList[Math.floor(Math.random() * strongList.length)];
                return strong;
            });
        });

        return { text: result, changes };
    },

    /* ---- 数据量化增强 ---- */
    enhanceQuantification(text) {
        const changes = [];
        let result = text;

        // 识别缺乏数据的描述句
        const lines = result.split('\n');
        const enhancedLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('【')) return line;

            // 如果句子已经包含量化数据（数字、百分比），跳过
            if (/\d+[%％]|约\d+|超过\d+|\d+次|\d+个|\d+人|\d+万|\d+.\d+/.test(trimmed)) {
                return line;
            }

            // 识别描述性句子，添加数据占位提示
            const descPatterns = [
                { pattern: /(提高|提升|增加|增长|扩大)(了)?(.+?)(效率|效果|产出|规模|量|率)/, suffix: '约X%' },
                { pattern: /(减少|降低|缩短|节约|节省)(了)?(.+?)(成本|时间|周期|延迟|错误)/, suffix: '约X%' },
                { pattern: /(覆盖|服务|触达)(了)?(.+)/, suffix: 'X余人/次' },
                { pattern: /(完成|交付)(了)?(.+?)(项目|任务|需求|功能)/, suffix: 'X项' },
            ];

            let modified = trimmed;
            let hasChange = false;

            descPatterns.forEach(({ pattern, suffix }) => {
                if (pattern.test(modified) && !modified.includes(suffix.replace('X', ''))) {
                    modified = modified.replace(pattern, (match, verb, le, rest, noun) => {
                        hasChange = true;
                        return `${verb}${le || ''}${rest}${noun}（${suffix}）`;
                    });
                }
            });

            if (hasChange) {
                changes.push({
                    type: 'add',
                    message: `补充量化数据提示：建议在「${trimmed.substring(0, 20)}...」处补充具体数据`
                });
                return line.replace(trimmed, modified);
            }

            return line;
        });

        return { text: enhancedLines.join('\n'), changes };
    },

    /* ---- 语句逻辑重组 ---- */
    restructureLogic(text) {
        const changes = [];
        let result = text;

        // 按JD权重调整内容排序（将含JD关键词的行提前）
        const lines = result.split('\n');
        if (lines.length <= 2) return { text: result, changes };

        // 检测是否有列表项（以-、•、·开头）
        const listItems = lines.filter(l => /^[\s]*[-•·▪◦]/.test(l));
        if (listItems.length >= 2) {
            // 对列表项按JD关键词匹配度排序
            const jdKeywords = window._currentJDKeys || [];
            if (jdKeywords.length > 0) {
                const scored = listItems.map(item => {
                    let score = 0;
                    jdKeywords.forEach(kw => {
                        if (item.toLowerCase().includes(kw.toLowerCase())) score++;
                    });
                    return { item, score, originalIndex: lines.indexOf(item) };
                });

                scored.sort((a, b) => b.score - a.score);

                // 检查顺序是否变化
                const reordered = scored.some((item, idx) => item.originalIndex !== listItems[idx].originalIndex);
                if (reordered) {
                    changes.push({
                        type: 'reorder',
                        message: '按JD关键词优先级重新排序列表项'
                    });

                    // 替换回去
                    let scoreIdx = 0;
                    const newLines = lines.map(line => {
                        if (/^[\s]*[-•·▪◦]/.test(line)) {
                            return scored[scoreIdx++].item;
                        }
                        return line;
                    });
                    result = newLines.join('\n');
                }
            }
        }

        return { text: result, changes };
    },

    /* ---- STAR法则重构 ---- */
    applySTAR(text, sectionKey, jdAnalysis) {
        const changes = [];
        let result = text;

        // 仅对经历类板块执行STAR重构
        if (!['internship', 'coursework', 'club', 'awards'].includes(sectionKey)) {
            return { text: result, changes };
        }

        const lines = result.split('\n');
        const enhancedLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('【') || trimmed.startsWith('-')) return line;

            // 如果已经类似STAR格式（含"最终"、"实现"、"达成"等），跳过
            if (/最终|实现|达成|从而|使得|结果/.test(trimmed)) {
                return line;
            }

            // 检查是否为经历描述句
            if (trimmed.length > 15 && /了|负责|参与|完成|开发|设计|组织/.test(trimmed)) {
                // 尝试重构为STAR格式
                let starText = trimmed;

                // 如果末尾没有结果描述，添加结果引导
                if (!/[。.！!]$/.test(starText)) {
                    starText += '，';
                } else {
                    starText = starText.replace(/[。.！!]$/, '，');
                }

                starText += '最终达成预期目标';

                // 检查是否已包含量化
                if (!/\d/.test(trimmed)) {
                    starText += '（建议补充量化数据）';
                }

                changes.push({
                    type: 'modify',
                    message: `STAR重构：补充结果描述`
                });

                return line.replace(trimmed, starText);
            }

            return line;
        });

        return { text: enhancedLines.join('\n'), changes };
    },

    /* ---- 技能按JD优先级重排 ---- */
    reorderSkills(text, jdKeywords) {
        const changes = [];
        const lines = text.split('\n');

        // 识别技能列表项
        const skillLines = lines.filter(l => /^[\s]*[-•·▪◦*]/.test(l) || /^[\s]*\d+[.、]/.test(l));

        if (skillLines.length < 2) return { text, changes };

        // 按JD关键词匹配度排序
        const scored = skillLines.map(item => {
            let score = 0;
            jdKeywords.forEach(kw => {
                if (item.toLowerCase().includes(kw.toLowerCase())) score += 5;
            });
            return { item, score };
        });

        scored.sort((a, b) => b.score - a.score);

        // 检查是否需要重排
        const needsReorder = scored.some((item, idx) => item.item !== skillLines[idx]);
        if (!needsReorder) return { text, changes };

        changes.push({
            type: 'reorder',
            message: '技能按JD需求优先级重新排序，岗位刚需技能前置'
        });

        // 构建新文本
        let scoreIdx = 0;
        const newLines = lines.map(line => {
            if (/^[\s]*[-•·▪◦*]/.test(line) || /^[\s]*\d+[.、]/.test(line)) {
                return scored[scoreIdx++].item;
            }
            return line;
        });

        return { text: newLines.join('\n'), changes };
    },

    /* ---- 教育背景优化 ---- */
    optimizeEducation(text, jdAnalysis) {
        const changes = [];
        let result = text;

        // 提取JD中提及的专业要求
        const majorReqs = jdAnalysis.hardRequirements
            .filter(r => r.type === 'major')
            .map(r => r.match);

        if (majorReqs.length > 0) {
            // 高亮匹配的专业课
            const eduKeywords = majorReqs.join('|');
            if (eduKeywords && new RegExp(eduKeywords).test(result)) {
                changes.push({
                    type: 'modify',
                    message: '筛选凸显与JD相关的专业课/绩点/奖学金信息'
                });
            }
        }

        // 如果有GPA/排名信息，强调
        if (/GPA|绩点|排名/.test(result) && !result.includes('（重点）')) {
            result = result.replace(/(GPA[：:]?\s*[\d.\/]+|绩点[：:]?\s*[\d.\/]+|排名[：:]?\s*[\d\/]+)/g, '$1（重点）');
            changes.push({
                type: 'modify',
                message: '突出GPA/排名信息'
            });
        }

        // 如果有奖学金，强调
        if (/奖学金/.test(result) && !result.includes('（重点）')) {
            result = result.replace(/(奖学金[^\n]*)/g, '★ $1');
            changes.push({
                type: 'modify',
                message: '奖学金信息加注重点标记'
            });
        }

        return { text: result, changes };
    },

    /* ---- 自我评价定制 ---- */
    customizeEvaluation(text, jdAnalysis) {
        const changes = [];

        // 提取JD核心能力要求
        const topKeywords = jdAnalysis.keywords
            .filter(k => k.importance === 'high' || k.importance === 'medium')
            .slice(0, 5)
            .map(k => k.keyword);

        const coreComps = jdAnalysis.coreCompetencies.slice(0, 5);

        // 构建定制自评
        let customized = '';

        if (topKeywords.length > 0 || coreComps.length > 0) {
            customized = `结合岗位需求，本人具备以下特质：\n`;
            customized += `1. ${topKeywords.slice(0, 3).join('、') ? '在' + topKeywords.slice(0, 3).join('、') + '方面有扎实基础，' : ''}能快速上手岗位核心工作；\n`;
            customized += `2. 具备${coreComps.slice(0, 2).join('、') || '良好的学习与执行能力'}，善于在实战中持续迭代提升；\n`;
            customized += `3. 注重数据驱动与结果导向，追求用可量化的产出证明价值；\n`;
            customized += `4. 保持对新技术的敏感度，具备较强的自我驱动与跨团队协作意识。`;

            changes.push({
                type: 'add',
                message: '自我评价按JD需求定制，摒弃万能模板'
            });

            return { text: customized, changes };
        }

        return { text, changes };
    },

    /* ---- 个人简介优化 ---- */
    optimizeSummary(text, jdAnalysis) {
        const changes = [];
        let result = text;

        // 提取JD高频关键词，融入简介
        const topTech = jdAnalysis.keywords
            .filter(k => k.type === 'tech' && (k.importance === 'high' || k.importance === 'medium'))
            .slice(0, 4)
            .map(k => k.keyword);

        if (topTech.length > 0 && !result.includes(topTech[0])) {
            // 在简介末尾补充岗位关键词
            const appendText = `\n求职方向：${topTech.slice(0, 3).join(' / ')}相关岗位`;
            result = result + appendText;
            changes.push({
                type: 'add',
                message: '个人简介补充JD关键词对齐求职方向'
            });
        }

        return { text: result, changes };
    },

    /* ---- 去除空泛词汇 ---- */
    removeFillerWords(text) {
        const changes = [];
        let result = text;

        const fillerWords = ['很好的', '非常好的', '比较', '大概', '一些', '很多', '之类的', '等等', '什么的', '有关的'];
        fillerWords.forEach(word => {
            if (result.includes(word)) {
                result = result.replace(new RegExp(this.escapeRegex(word), 'g'), '');
                changes.push({
                    type: 'modify',
                    message: `精简空泛词汇：「${word}」`
                });
            }
        });

        // 去除连续的逗号和空格
        result = result.replace(/[，,\s]{2,}/g, '，');
        result = result.replace(/，。/g, '。');

        return { text: result, changes };
    },

    /* ---- 板块顺序按JD重排 ---- */
    reorderSections(sectionKeys, jdAnalysis) {
        // JD中技术关键词多的 → skills、education前置
        // 有实习要求 → internship前置
        const order = [];

        // 个人简介永远第一
        if (sectionKeys.includes('summary')) order.push('summary');

        // 教育背景（校招重点）
        if (sectionKeys.includes('education')) order.push('education');

        // 如果JD有实习要求，实习经历靠前
        const hasInternReq = jdAnalysis.hardRequirements.some(r => r.type === 'experience');
        if (hasInternReq && sectionKeys.includes('internship')) {
            order.push('internship');
        }

        // 技能
        if (sectionKeys.includes('skills')) order.push('skills');

        // 课程设计
        if (sectionKeys.includes('coursework')) order.push('coursework');

        // 在校奖项/科研
        if (sectionKeys.includes('awards')) order.push('awards');

        // 社团
        if (sectionKeys.includes('club')) order.push('club');

        // 如果没有实习要求但简历有，放在这里
        if (!hasInternReq && sectionKeys.includes('internship')) {
            order.push('internship');
        }

        // 自评最后
        if (sectionKeys.includes('evaluation')) order.push('evaluation');

        // 补充未覆盖的板块
        sectionKeys.forEach(key => {
            if (!order.includes(key) && AppData.sectionNames[key]) {
                order.push(key);
            }
        });

        return order;
    },

    /* ---- 生成带高亮的HTML ---- */
    generateHighlightedHTML(sections, order, changes) {
        let html = '';
        const changesBySection = {};

        changes.forEach(c => {
            if (!changesBySection[c.section]) changesBySection[c.section] = [];
            changesBySection[c.section].push(c);
        });

        order.forEach(key => {
            const name = AppData.sectionNames[key] || key;
            const content = sections[key] || '';
            if (!content.trim()) return;

            const sectionChanges = changesBySection[key] || [];

            // 如果有修改，在高亮版本中标注
            let displayContent = this.escapeHTML(content);

            // 标注变更
            if (sectionChanges.length > 0) {
                sectionChanges.forEach(change => {
                    if (change.type === 'modify' && change.original && change.replacement) {
                        const escapedOrig = this.escapeHTML(change.original);
                        const escapedNew = this.escapeHTML(change.replacement);
                        const regex = new RegExp(this.escapeRegex(escapedOrig), 'g');
                        displayContent = displayContent.replace(regex, `<span class="hl-modify" title="${this.escapeHTML(change.message)}">${escapedNew}</span>`);
                    }
                });

                // 添加板块级别的标注
                const hasReorder = sectionChanges.some(c => c.type === 'reorder');
                const hasAdd = sectionChanges.some(c => c.type === 'add');

                let badge = '';
                if (hasReorder) badge += '<span class="hl-reorder" title="内容位置已调整">⟲重排</span> ';
                if (hasAdd) badge += '<span class="hl-add" title="补充了新内容">+补充</span> ';

                html += `<div class="opt-section"><div class="opt-section-title">${badge}【${name}】</div><div class="opt-section-body">${displayContent}</div></div>`;
            } else {
                html += `<div class="opt-section"><div class="opt-section-title">【${name}】</div><div class="opt-section-body">${displayContent}</div></div>`;
            }
        });

        return html;
    },

    /* ---- 按JD重排板块顺序（返回变更信息） ---- */
    reorderSectionsWithChanges(originalKeys, jdAnalysis) {
        const newOrder = this.reorderSections(originalKeys, jdAnalysis);
        const changes = [];

        // 检测顺序变化
        const originalFiltered = originalKeys.filter(k => AppData.sectionNames[k]);
        if (JSON.stringify(originalFiltered) !== JSON.stringify(newOrder.filter(k => originalFiltered.includes(k)))) {
            changes.push({
                type: 'reorder',
                message: '板块顺序按JD需求重新调整'
            });
        }

        return { order: newOrder, changes };
    },

    /* ---- 工具方法 ---- */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};
