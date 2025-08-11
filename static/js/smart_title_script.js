// smart_title_script.js - 智能标题生成功能

// --- Global Variables ---
// defaultFundingVerbs 是原始的通用可切换列表
const defaultFundingVerbs = ['支持', '奖励', '扶持', '征集', '入库', '奖补', '遴选', '补贴', '评选','认定', '贴息支持', '补助', '资助'];
// 特定识别关键词对应的资助方式，这些是优先匹配的初始资助方式
const specificRecognitionVerbs = ['认定', '贴息支持', '补助', '资助'];

// 所有可循环的动词列表，用于初始化和循环
// 确保更具体、更长的词汇排在前面，以便在检测 initialVerb 时优先匹配
const ALL_CYCLABLE_VERBS = [...new Set([...specificRecognitionVerbs, ...defaultFundingVerbs])];
ALL_CYCLABLE_VERBS.sort((a, b) => b.length - a.length); // 按长度降序排序，确保长词优先匹配

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
    const yearLocationMatch = text.match(/\d{4}年([\u4e00-\u9fa5]+?(?:区|县|镇|市|省|经济技术开发区|高新技术产业开发区|开发区|科技园))/);
    if (yearLocationMatch) {
        return yearLocationMatch[1];
    }

    const splitByAbout = text.split(/(?:局|厅|委|办|府|管委会|委员会|中心)\s*关于|关于/);
    let effectiveText = splitByAbout.length > 1 ? splitByAbout[0].trim() : text.trim(); 
    
    const multiLevelCityDistrictMatch = effectiveText.match(/([\u4e00-\u9fa5]+市)([\u4e00-\u9fa5]+(?:区|县|镇))/);
    if (multiLevelCityDistrictMatch) {
        return multiLevelCityDistrictMatch[2];
    }
    
    const districtTownMatch = effectiveText.match(/([\u4e00-\u9fa5]+(?:区|镇))/);
    if (districtTownMatch) {
        return districtTownMatch[1];
    }

    const countyMatch = effectiveText.match(/([\u4e00-\u9fa5]+县)/);
    if (countyMatch) {
        return countyMatch[1];
    }

    const devZoneMatch = effectiveText.match(/([\u4e00-\u9fa5]+?(?:经济技术开发区|高新技术产业开发区|开发区|科技园))/);
    if (devZoneMatch) {
        return devZoneMatch[1];
    }

    const directControlledCities = ['北京市', '上海市', '天津市', '重庆市'];
    for (const city of directControlledCities) {
        if (effectiveText.includes(city)) {
            return city;
        }
    }

    const cityMatch = effectiveText.match(/([\u4e00-\u9fa5]+?市)/);
    if (cityMatch) {
        return cityMatch[1];
    }

    const provinceMatch = effectiveText.match(/([\u4e00-\u9fa5]+?省)/);
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

    for (const city of directControlledCities) {
        if (rawLocation.startsWith(city) && (rawLocation.endsWith('区') || rawLocation.endsWith('县') || rawLocation.endsWith('镇'))) {
            return rawLocation.substring(city.length); 
        }
    }

    if (rawLocation.endsWith('区') || rawLocation.endsWith('镇') || rawLocation.endsWith('县') || rawLocation.includes('开发区') || rawLocation.includes('科技园') || rawLocation.includes('高新区')) {
        return rawLocation;
    }
    if (directControlledCities.includes(rawLocation)) {
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
    const match = text.match(/(第[\u4e00-\u9fa5\d]+(?:批|届))/);
    return match ? match[1] : null;
}

/**
 * 处理核心文本并确定初始动词
 * 此函数现在负责提取项目核心名称和最佳匹配的初始动词
 */
function processCoreText(originalInput, detectedYear, detectedRawLocation) {
    let text = originalInput; 
    let initialVerb = ''; // 用于存储识别到的初始动词

    // 0. 特殊处理“市级引导区县科技发展专项资金”
    if (originalInput.includes("市级引导区县科技发展专项资金")) {
        // 固定标题，不涉及资助方式切换，因此 initialVerb 留空
        return { coreText: "市级引导区县科技发展专项资金项目", initialVerb: "" }; 
    }
    
    // 1. 尝试从《》中提取核心文本
    const bookTitleMatch = text.match(/《([\s\S]+?)》/);
    if (bookTitleMatch && bookTitleMatch[1]) {
        text = bookTitleMatch[1].trim();
    } else {
        // 2. 尝试根据常见开头标记截取文本
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

        // 3. 移除前导冗余短语
        const leadingPrefixes = [
            '关于组织申报', '关于开展', '关于受理', '关于申报', '组织申报', '组织开展', '受理', '开展', '申报', '征集', '印发', '通知', '通告', '方案', '关于', '做好', '组织' 
        ];
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

    // 4. 从原始输入中识别并存储最佳匹配的初始动词/后缀
    // 遍历 ALL_CYCLABLE_VERBS (已按长度降序排序) 寻找最佳匹配作为 initialVerb
    for (const verb of ALL_CYCLABLE_VERBS) {
        if (originalInput.includes(verb)) { 
            initialVerb = verb;
            break; // 找到最具体的匹配就停止
        }
    }
    // 如果没有检测到任何动词，设置一个默认值（例如 defaultFundingVerbs 的第一个）
    if (!initialVerb) {
        initialVerb = defaultFundingVerbs[0]; 
    }


    let mainPart = text; 
    const allClosingMarkersForTruncation = [
        '政策的通知', '工作的通知', '的通知', '的通告', '的方案', '申报指南', '实施方案', 
        '遴选工作', '申报工作', '的公告', '申请指南' 
    ];
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
    } else {
        mainPart = text; 
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
        
        const regexParts = [
            locationPattern, 
            shortLocationName 
        ].filter(s => s && s.length > 0) 
         .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) 
         .sort((a,b) => b.length - a.length) 
         .join('|'); 

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

    // 移除所有可能作为动词或冗余的词汇，确保核心文本干净
    // 注意：ALL_CYCLABLE_VERBS 包含所有资助动词，也需要从 mainPart 中移除
    const allWordsToCleanFromMainPart = new Set([
        ...ALL_CYCLABLE_VERBS,        
        '申报工作', '遴选工作', '评选工作', '兑现申请', '申请工作', '实施工作', '开展工作', '进行工作', '举办工作',
        '入选项目库', '入选库', '资金', '若干政策申报' 
    ]);
    const recognitionKeywords = ['基地', '合作区','园区', '车间', '研究中心', '实验室', '工厂', '标杆', '孵化器', '载体', '企业', '品牌', '技能大师', '工作室', '工作站', '案例', '家庭农场', '合作社', '技能大师工作室', '概念中心','机构']; 

    let removedRedundantPhrase;
    do {
        removedRedundantPhrase = false;
        const sortedWordsToClean = Array.from(allWordsToCleanFromMainPart).sort((a, b) => b.length - a.length);
        
        for (const word of sortedWordsToClean) {
            let shouldPreserveWord = false;
            for (const rk of recognitionKeywords) {
                // 如果当前词是识别关键词的一部分，且不是 ALL_CYCLABLE_VERBS 中的动词，则保留
                if (rk === word || (rk.includes(word) && word.length < rk.length && !ALL_CYCLABLE_VERBS.includes(word))) { 
                    shouldPreserveWord = true;
                    break;
                }
            }
            if (shouldPreserveWord) {
                continue; 
            }

            const regex = new RegExp(word, 'g'); 
            const prevLength = mainPart.length;
            mainPart = mainPart.replace(regex, '').trim();
            if (mainPart.length < prevLength) {
                removedRedundantPhrase = true;
            }
        }
    } while (removedRedundantPhrase);

    mainPart = mainPart.replace(/[\(（]\s*[\)）]/g, '').trim(); 
    mainPart = mainPart.replace(/\s+/g, ' ').trim(); 

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
        if (typeof showNotification === 'function') {
            showNotification('请输入原始标题');
        }
        return;
    }

    const detectedYear = extractYear(input);
    const detectedRawLocation = extractRawLocation(input); 
    const detectedBatchInfo = extractBatchInfo(input);

    const { coreText, initialVerb } = processCoreText(input, detectedYear, detectedRawLocation);

    const formattedLocation = formatLocationForOutput(detectedRawLocation);
    const yearPart = detectedYear || '2025'; 

    let locationAndBatchPart = formattedLocation;
    if (detectedBatchInfo) {
        locationAndBatchPart += (locationAndBatchPart ? '丨' : '') + detectedBatchInfo;
    }
    
    originalCoreText = coreText;
    originalDateLocationSuffix = `（${yearPart}${locationAndBatchPart}）`;

    // 根据检测到的 initialVerb 设置 currentVerbIndex 的起始位置
    const initialIndex = ALL_CYCLABLE_VERBS.indexOf(initialVerb);
    currentVerbIndex = initialIndex !== -1 ? initialIndex : 0; // 如果没找到，默认从 ALL_CYCLABLE_VERBS 的第一个开始

    // 如果 initialVerb 为空（例如“市级引导区县科技发展专项资金项目”这类固定标题），则不添加资助方式
    const finalVerb = initialVerb === "" ? "" : ALL_CYCLABLE_VERBS[currentVerbIndex];
    const finalTitle = `${originalCoreText}${finalVerb}${originalDateLocationSuffix}`;
    
    outputTitleSpan.textContent = finalTitle;

    if (typeof showNotification === 'function') {
        showNotification('标题生成成功');
    }
}

// --- Convert Button Logic ---
function cycleFundingVerb() {
    const outputTitleSpan = document.getElementById('outputTitle');

    // 如果 currentVerbIndex 是空字符串对应的索引（即初始标题是固定类型），则不循环，或者跳过固定类型
    if (originalCoreText === "市级引导区县科技发展专项资金项目") {
        if (typeof showNotification === 'function') {
            showNotification('当前标题为固定格式无需切换');
        }
        return;
    }

    // 循环资助方式，当到达数组末尾时，回到第一个
    currentVerbIndex = (currentVerbIndex + 1) % ALL_CYCLABLE_VERBS.length;
    
    const newVerb = ALL_CYCLABLE_VERBS[currentVerbIndex];
    outputTitleSpan.textContent = `${originalCoreText}${newVerb}${originalDateLocationSuffix}`;
    
    if (typeof showNotification === 'function') {
        if (currentVerbIndex === 0) { // 如果循环回到了第一个
            showNotification('已尝试所有资助方式如果无您想要的结果请复制结果并自行修改');
        } else {
            showNotification('标题已重新生成');
        }
    }
}

// 清空智能标题生成功能区的输入和输出
function clearInputSmartTitle() {
    const inputTextArea = document.getElementById('inputTitle');
    const outputTitleSpan = document.getElementById('outputTitle');

    if (inputTextArea) {
        inputTextArea.value = inputTextArea.getAttribute('placeholder') || '';
        inputTextArea.classList.add('placeholder-active');
    }
    if (outputTitleSpan) {
        outputTitleSpan.textContent = '等待输入...';
    }
    currentVerbIndex = 0; // 清空时重置索引
    originalCoreText = '';
    originalDateLocationSuffix = '';
    
    if (typeof showNotification === 'function') {
        showNotification('已清空');
    }
}

// 复制智能标题生成功能区的输出结果
function copyOutputSmartTitle() {
    const outputTitleSpan = document.getElementById('outputTitle');
    if (!outputTitleSpan) {
        console.error('Error outputTitleSpan not found'); 
        if (typeof showNotification === 'function') { 
            showNotification('复制功能错误输出元素未找到');
        }
        return;
    }

    const textToCopy = outputTitleSpan.textContent;

    if (!textToCopy || textToCopy === '等待输入...' || textToCopy === '请输入原始标题' || textToCopy === '生成的标题将显示在这里...') {
        if (typeof showNotification === 'function') {
            showNotification('输出结果为空无法复制');
        } else {
            alert('输出结果为空无法复制');
        }
        return;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        if (typeof showNotification === 'function') {
            showNotification('复制成功'); // 统一提示语
        }
    }).catch(err => {
        console.error('复制失败', err); 
        if (typeof showNotification === 'function') {
            showNotification('复制失败请手动复制');
        }
    });
}