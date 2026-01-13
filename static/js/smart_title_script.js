// smart_title_script.js - 智能标题生成功能

// 1. 定义固定的循环顺序，确保“资助”在最后
const ALL_CYCLABLE_VERBS = [
    '支持', '奖励', '扶持', '征集', '入库', '奖补', '遴选', 
    '补贴', '评选', '认定', '贴息支持', '补助', '资助'
];

let currentVerbIndex = 0;
let originalCoreText = '';
let originalDateLocationSuffix = '';

// --- Utility Functions (Extraction and Formatting) ---

/**
 * 提取年份
 */
function extractYear(text) {
    const multiYearMatch = text.match(/(\d{4}-\d{4})(?:年|年度)/);
    if (multiYearMatch) {
        return multiYearMatch[1];
    }
    const singleYearMatch = text.match(/(\d{4})(?:年|年度)/);
    return singleYearMatch ? singleYearMatch[1] : null;
}

/**
 * 提取原始地点
 */
function extractRawLocation(text) {
    const directControlledCities = ['北京市', '上海市', '天津市', '重庆市'];

    // 优先级1: 优先处理直辖市及其可能携带的区/县/镇后缀
    for (const city of directControlledCities) {
        if (text.includes(city)) {
            const cityDistrictTownMatch = text.match(new RegExp(`${city}([\u4e00-\u9fa5]+(?:区|县|镇))`));
            if (cityDistrictTownMatch) {
                return cityDistrictTownMatch[1]; 
            }
            return city; 
        }
    }

    // 优先级2: 尝试匹配“市+区/县/镇”组合
    const multiLevelCityDistrictMatch = text.match(/([\u4e00-\u9fa5]+市)([\u4e00-\u9fa5]+(?:区|县|镇))/);
    if (multiLevelCityDistrictMatch) {
        return multiLevelCityDistrictMatch[2]; 
    }

    // 优先级3: 尝试匹配“年份 + 完整的行政区划”
    const yearLocationMatch = text.match(/\d{4}(?:年|年度)([\u4e00-\u9fa5]+?(?:经济技术开发区|高新技术产业开发区|开发区|科技园|区|县|镇|市|省))/);
    if (yearLocationMatch) {
        return yearLocationMatch[1]; 
    }
    
    // 优先级4: 尝试匹配独立的区/镇/县/开发区
    const districtTownDevMatch = text.match(/([\u4e00-\u9fa5]+?(?:区|镇|县|经济技术开发区|高新技术产业开发区|开发区|科技园))/);
    if (districtTownDevMatch) {
        return districtTownDevMatch[1];
    }

    // 优先级5: 尝试匹配独立的市
    const cityMatch = text.match(/([\u4e00-\u9fa5]+?市)/);
    if (cityMatch) {
        return cityMatch[1];
    }

    // 优先级6: 尝试匹配独立的省
    const provinceMatch = text.match(/([\u4e00-\u9fa5]+?省)/);
    if (provinceMatch) {
        return provinceMatch[1];
    }

    return null; 
}

/**
 * 格式化地点用于输出
 */
function formatLocationForOutput(rawLocation) {
    if (!rawLocation) return '市级'; 

    const directControlledCities = ['北京市', '上海市', '天津市', '重庆市'];

    if (directControlledCities.includes(rawLocation)) {
        return rawLocation;
    }

    if (rawLocation.endsWith('区') || rawLocation.endsWith('镇') || rawLocation.endsWith('县') || rawLocation.includes('开发区') || rawLocation.includes('科技园') || rawLocation.includes('高新区')) {
        return rawLocation;
    }
    
    if (rawLocation.endsWith('市')) {
        return '市级';
    }
    
    if (rawLocation.endsWith('省')) {
        return '省级';
    }
    return ''; 
}

/**
 * 提取批次信息
 */
function extractBatchInfo(text) {
    const match = text.match(/(第[\u4e00-\u9fa5\d]+(?:批|届|季度))/);
    return match ? match[1] : null;
}

/**
 * 处理核心文本
 */
function processCoreText(originalInput, detectedYear, detectedRawLocation) {
    let text = originalInput; 
    let initialVerb = ''; 

    if (originalInput.includes("市级引导区县科技发展专项资金项目")) {
        return { coreText: "市级引导区县科技发展专项资金项目", initialVerb: "" }; 
    }
    
    // 识别书名号核心
    const bookTitleMatch = text.match(/《([\s\S]+?)》/);
    if (bookTitleMatch && bookTitleMatch[1]) {
        text = bookTitleMatch[1].trim();
    } else {
        const contentStartMarkers = ['关于', '组织申报', '开展', '受理', '申报', '征集', '印发', '通知', '通告', '方案'];
        let earliestMarkerIndex = -1;
        
        for (const marker of contentStartMarkers) {
            const index = text.indexOf(marker);
            if (index !== -1) {
                if (index === 0 || (text[index - 1] && /\s|[局厅委办府会心]\s*$/.test(text.substring(0, index)))) { 
                    if (earliestMarkerIndex === -1 || index < earliestMarkerIndex) {
                        earliestMarkerIndex = index;
                    }
                }
            }
        }
        
        if (earliestMarkerIndex !== -1) {
            text = text.substring(earliestMarkerIndex).trim();
        }

        const leadingPrefixes = ['关于组织申报', '关于开展', '关于受理', '关于申报', '组织申报', '组织开展', '受理', '开展', '申报', '征集', '印发', '通知', '通告', '方案', '关于', '做好', '组织' ];
        let removedSomething;
        do {
            removedSomething = false;
            leadingPrefixes.sort((a, b) => b.length - a.length); 
            for (const prefix of leadingPrefixes) {
                if (text.startsWith(prefix)) {
                    text = text.substring(prefix.length).trim();
                    removedSomething = true;
                    break;
                }
            }
        } while (removedSomething);
    }

    // 识别初始动词：使用副本进行长词优先匹配，确保不误判（如：贴息支持 优先于 支持）
    const detectionVerbs = [...ALL_CYCLABLE_VERBS].sort((a, b) => b.length - a.length);
    for (const verb of detectionVerbs) {
        if (originalInput.includes(verb)) { 
            initialVerb = verb;
            break;
        }
    }
    
    if (!initialVerb) {
        initialVerb = ALL_CYCLABLE_VERBS[0]; // 默认第一个：支持
    }

    let mainPart = text; 
    const allClosingMarkersForTruncation = ['政策的通知', '工作的通知', '的通知', '的通告', '的方案', '申报指南', '实施方案', '遴选工作', '申报工作', '的公告', '申请指南' ];
    allClosingMarkersForTruncation.sort((a,b) => b.length - a.length); 

    let earliestClosingMarkerIndex = text.length; 
    let matchedMarkerForTruncation = null;

    for (const marker of allClosingMarkersForTruncation) {
        const index = text.indexOf(marker); 
        if (index !== -1 && index < earliestClosingMarkerIndex) {
            earliestClosingMarkerIndex = index;
            matchedMarkerForTruncation = marker;
        }
    }

    if (matchedMarkerForTruncation) {
        mainPart = text.substring(0, earliestClosingMarkerIndex).trim();
    }

    if (detectedYear) {
        mainPart = mainPart.replace(new RegExp(`${detectedYear}(?:年|年度)?`, 'g'), '').trim(); 
    }
    mainPart = mainPart.replace(/(?:年|度)\s*/g, '').trim();

    if (detectedRawLocation) { 
        let locationPattern = detectedRawLocation;
        let shortLocationName = locationPattern; 
        if (locationPattern.endsWith('市') || locationPattern.endsWith('省') || locationPattern.endsWith('区') || locationPattern.endsWith('县') || locationPattern.endsWith('镇')) {
            shortLocationName = locationPattern.substring(0, locationPattern.length - 1); 
        }
        
        const regexParts = [locationPattern, shortLocationName].filter(s => s && s.length > 0) .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) .sort((a,b) => b.length - a.length) .join('|'); 

        if (regexParts) {
            mainPart = mainPart.replace(new RegExp(`${regexParts}`, 'g'), '').trim();
        }
    }
    
    const batchInfo = extractBatchInfo(originalInput);
    if (batchInfo) {
        const batchRegexPattern = `[\\s\\(（]*${batchInfo}[\\s\\)）]*`;
        mainPart = mainPart.replace(new RegExp(batchRegexPattern, 'g'), '').trim();
    }
    mainPart = mainPart.replace(/[\(（]\s*[\)）]/g, '').trim();

    let shouldSkipLeadingLocationCleanup = false;
    const levelKeywordsToPreserveAtStart = ['市级', '区级', '省级'];
    for (const keyword of levelKeywordsToPreserveAtStart) {
        if (mainPart.startsWith(keyword)) { 
            shouldSkipLeadingLocationCleanup = true;
            break;
        }
    }

    if (!shouldSkipLeadingLocationCleanup) {
        const leadingLocationMatch = mainPart.match(/^([\u4e00-\u9fa5]+?(?:市|省|区|县|镇|经济技术开发区|高新技术产业开发区|开发区|科技园))/);
        if (leadingLocationMatch) {
           mainPart = mainPart.substring(leadingLocationMatch[1].length).trim();
        }
    }

    const projectKeyword = '项目';
    if (mainPart.includes(projectKeyword)) {
        let firstProjectIndex = mainPart.indexOf(projectKeyword);
        mainPart = mainPart.substring(0, firstProjectIndex + projectKeyword.length).trim();
    }

    const allWordsToCleanFromMainPart = new Set([...ALL_CYCLABLE_VERBS, '申报工作', '遴选工作', '评选工作', '兑现申请', '申请工作', '实施工作', '开展工作', '进行工作', '举办工作', '入选项目库', '入选库', '资金', '若干政策申报', '开展']);
    const recognitionKeywords = ['基地', '合作区','园区', '车间', '研究中心', '实验室', '工厂', '标杆', '孵化器', '载体', '企业', '品牌', '技能大师', '工作室', '工作站', '案例', '家庭农场', '合作社', '技能大师工作室', '概念中心','机构']; 

    let removedRedundantPhrase;
    do {
        removedRedundantPhrase = false;
        const sortedWordsToClean = Array.from(allWordsToCleanFromMainPart).sort((a, b) => b.length - a.length); 
        
        for (const word of sortedWordsToClean) {
            let shouldPreserveWord = false;
            for (const rk of recognitionKeywords) {
                if (rk === word || (rk.includes(word) && word.length < rk.length && !ALL_CYCLABLE_VERBS.includes(word))) { 
                    shouldPreserveWord = true;
                    break;
                }
            }
            if (shouldPreserveWord) continue;

            const regex = new RegExp(word, 'g');
            const prevLength = mainPart.length;
            mainPart = mainPart.replace(regex, '').trim();
            if (mainPart.length < prevLength) removedRedundantPhrase = true;
        }
    } while (removedRedundantPhrase);

    return { coreText: mainPart, initialVerb: initialVerb };
}

// --- Main Control Function ---

function generateTitle() {
    const inputTextArea = document.getElementById('inputTitle');
    const outputTitleSpan = document.getElementById('outputTitle');
    
    let input = '';
    if (inputTextArea && inputTextArea.classList.contains('placeholder-active')) {
        input = ''; 
    } else if (inputTextArea) {
        input = inputTextArea.value.trim();
    }
    
    if (!input) {
        outputTitleSpan.textContent = '请输入原始标题';
        if (typeof showNotification === 'function') showNotification('请输入原始标题');
        return;
    }

    const detectedYear = extractYear(input);
    const detectedRawLocation = extractRawLocation(input); 
    const detectedBatchInfo = extractBatchInfo(input);

    const { coreText, initialVerb } = processCoreText(input, detectedYear, detectedRawLocation);

    const formattedLocation = formatLocationForOutput(detectedRawLocation);
    
    // --- 默认年份修改：由 2025 修改为 2026 ---
    const yearPart = detectedYear || '2026'; 

    let locationAndBatchPart = formattedLocation;
    if (detectedBatchInfo) {
        locationAndBatchPart += (locationAndBatchPart ? '丨' : '') + detectedBatchInfo;
    }
    
    originalCoreText = coreText;
    originalDateLocationSuffix = `（${yearPart}${locationAndBatchPart}）`;

    const initialIndex = ALL_CYCLABLE_VERBS.indexOf(initialVerb);
    currentVerbIndex = initialIndex !== -1 ? initialIndex : 0; 

    const finalVerb = initialVerb === "" ? "" : ALL_CYCLABLE_VERBS[currentVerbIndex];
    const finalTitle = `${originalCoreText}${finalVerb}${originalDateLocationSuffix}`;
    
    outputTitleSpan.textContent = finalTitle;

    if (typeof showNotification === 'function') showNotification('标题生成成功');
}

/**
 * 复制简称
 */
function copyShortOutputSmartTitle() {
    if (!originalDateLocationSuffix || originalDateLocationSuffix === '') {
        if (typeof showNotification === 'function') showNotification('无简称内容可复制');
        return;
    }

    const shortText = originalDateLocationSuffix;
    navigator.clipboard.writeText(shortText).then(() => {
        if (typeof showNotification === 'function') showNotification('简称复制成功');
    }).catch(err => {
        const textarea = document.createElement('textarea');
        textarea.value = shortText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            if (typeof showNotification === 'function') showNotification('简称复制成功');
        } catch (execErr) {
            if (typeof showNotification === 'function') showNotification('复制失败请手动复制');
        } finally {
            document.body.removeChild(textarea);
        }
    });
}

/**
 * 循环切换资助方式
 */
function cycleFundingVerb() {
    const outputTitleSpan = document.getElementById('outputTitle');
    if (originalCoreText === "市级引导区县科技发展专项资金项目") {
        if (typeof showNotification === 'function') showNotification('当前标题为固定格式无需切换');
        return;
    }
    
    // 计算下一个索引
    const nextVerbIndex = (currentVerbIndex + 1) % ALL_CYCLABLE_VERBS.length;
    currentVerbIndex = nextVerbIndex; 
    
    const newVerb = ALL_CYCLABLE_VERBS[currentVerbIndex];
    outputTitleSpan.textContent = `${originalCoreText}${newVerb}${originalDateLocationSuffix}`;
    
    if (typeof showNotification === 'function') {
        // 当索引切回到 0（意味着刚刚从资助切到了支持）时弹出提示
        if (currentVerbIndex === 0) {
            if (typeof showKeywordAlertModal === 'function') {
                showKeywordAlertModal('已尝试所有资助方式，如果无您想要的结果，请复制结果并自行修改。');
            }
        } else {
            showNotification('标题已重新生成');
        }
    }
}

function clearInputSmartTitle() {
    const inputTextArea = document.getElementById('inputTitle');
    const outputTitleSpan = document.getElementById('outputTitle');
    if (inputTextArea) {
        inputTextArea.value = inputTextArea.getAttribute('placeholder') || '';
        inputTextArea.classList.add('placeholder-active');
    }
    if (outputTitleSpan) outputTitleSpan.textContent = '等待输入...';
    currentVerbIndex = 0;
    originalCoreText = '';
    originalDateLocationSuffix = '';
    if (typeof showNotification === 'function') showNotification('已清空');
}

function copyOutputSmartTitle() {
    const outputTitleSpan = document.getElementById('outputTitle');
    if (!outputTitleSpan) return;
    const textToCopy = outputTitleSpan.textContent;
    if (!textToCopy || textToCopy === '等待输入...' || textToCopy === '请输入原始标题') {
        if (typeof showNotification === 'function') showNotification('输出结果为空，无法复制');
        return;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
        if (typeof showNotification === 'function') showNotification('复制成功');
    }).catch(err => {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            if (typeof showNotification === 'function') showNotification('复制成功');
        } finally {
            document.body.removeChild(textarea);
        }
    });
}
