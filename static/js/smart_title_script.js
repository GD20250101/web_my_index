// smart_title_script.js - 智能标题生成功能

// --- Global Variables ---
const defaultFundingVerbs = ['支持', '奖励', '扶持', '征集', '入库', '奖补', '申报', '遴选', '补贴', '评选']; 
let currentVerbIndex = 0;
let originalCoreText = ''; 
let originalDateLocationSuffix = ''; 
let isDefaultSupportUsed = false; 

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
 * 处理核心文本并确定资助方式
 */
function processCoreText(originalInput, detectedYear, detectedRawLocation) {
    let text = originalInput; 
    let fundingSuffix = ''; 
    let defaultSupportNeeded = false; 

    if (originalInput.includes("市级引导区县科技发展专项资金")) {
        return {
            coreText: "市级引导区县科技发展专项资金项目", 
            fundingSuffix: "", 
            isDefaultSupport: false 
        };
    }
    
    const bookTitleMatch = text.match(/《([\s\S]+?)》/);
    if (bookTitleMatch && bookTitleMatch[1]) {
        text = bookTitleMatch[1].trim();
    } else {
        const contentStartMarkers = ['关于', '组织申报', '开展', '受理', '申报', '征集', '印发', '通知', '通告', '方案'];
        let earliestMarkerIndex = -1;
        
        for (const marker of contentStartMarkers) {
            const index = text.indexOf(marker);
            if (index !== -1) {
                if (earliestMarkerIndex === -1 || index < earliestMarkerIndex) {
                    if (index === 0 || (text[index - 1] && /\s|[局厅委办府会心]\s*$/.test(text.substring(0, index)))) { 
                        earliestMarkerIndex = index;
                    }
                }
            }
        }
        
        if (earliestMarkerIndex !== -1) {
            text = text.substring(earliestMarkerIndex).trim();
        }

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

    const redundantActionPhrases = [
        '申报工作', '遴选工作', '评选工作', '兑现申请', '申请工作', '实施工作', '开展工作', '进行工作', '举办工作',
        '入选项目库', '入选库', '资金', '若干政策申报' 
    ];
    redundantActionPhrases.sort((a,b) => b.length - a.length); 

    let removedRedundantPhrase;
    do {
        removedRedundantPhrase = false;
        for (const phrase of redundantActionPhrases) {
            const regex = new RegExp(phrase, 'g'); 
            const prevLength = mainPart.length;
            mainPart = mainPart.replace(regex, '').trim();
            if (mainPart.length < prevLength) {
                removedRedundantPhrase = true;
            }
        }
    } while (removedRedundantPhrase);


    const recognitionKeywords = ['基地', '合作区','园区', '车间', '研究中心', '实验室', '工厂', '标杆', '孵化器', '载体', '企业', '品牌', '技能大师', '工作室', '工作站', '案例', '家庭农场', '合作社', '技能大师工作室', '概念中心','机构']; 

    const strongNonSwitchableVerbs = ['补助', '资助']; 

    let foundSpecificSuffixRule = false; 

    if (originalInput.includes('贴息')) {
        fundingSuffix = '贴息支持'; 
        foundSpecificSuffixRule = true; 
        defaultSupportNeeded = false; 
    }
    
    if (!foundSpecificSuffixRule) { 
        let isRecognitionType = false;
        for (const keyword of recognitionKeywords) {
            if (originalInput.includes(keyword)) { 
                isRecognitionType = true;
                break;
            }
        }
        if (isRecognitionType) {
            fundingSuffix = '认定';
            foundSpecificSuffixRule = true; 
            defaultSupportNeeded = false; 
        }
    }

    if (!foundSpecificSuffixRule && originalInput.includes('申报') && 
        (originalInput.includes('项目') || originalInput.includes('资金') || originalInput.includes('案例'))) {
        defaultSupportNeeded = true; 
        fundingSuffix = defaultFundingVerbs[currentVerbIndex]; 
        foundSpecificSuffixRule = true; 
    }

    if (!foundSpecificSuffixRule && originalInput.includes('入库')) {
        const relevantPartBeforeClosing = originalInput.split(/(?:的通知|工作|指南|指引|方案|通告|公告)/)[0];
        
        if ((relevantPartBeforeClosing.endsWith('入库') || originalInput.includes('项目入库') || originalInput.includes('资金入库')) && 
            !originalInput.includes('申报')) { 
            fundingSuffix = '入库';
            foundSpecificSuffixRule = true;
            defaultSupportNeeded = false; 
        }
    }

    if (!foundSpecificSuffixRule) { 
        for (const verb of strongNonSwitchableVerbs) {
            if (originalInput.includes(verb)) { 
                fundingSuffix = verb; 
                foundSpecificSuffixRule = true;
                defaultSupportNeeded = false; 
                break;
            }
        }
    }

    if (!foundSpecificSuffixRule && 
        (originalInput.includes('申报指南') && originalInput.includes('项目') || originalInput.includes('申请指南') && originalInput.includes('项目'))) { 
        fundingSuffix = ''; 
        foundSpecificSuffixRule = true; 
        defaultSupportNeeded = false;
    }
    
    if (!foundSpecificSuffixRule && 
        (originalInput.includes('项目') || originalInput.includes('资金') || originalInput.includes('案例') || defaultFundingVerbs.some(verb => originalInput.includes(verb)))
       ) {
        defaultSupportNeeded = true;
        fundingSuffix = defaultFundingVerbs[currentVerbIndex]; 
    }
    
    let cleanedMainPart = mainPart;

    const allVerbsAndRedundantWordsToCleanFromMainPart = new Set([
        ...defaultFundingVerbs,        
        ...strongNonSwitchableVerbs,   
        '贴息', '认定', '兑现',                
        '发放', '实施', '开展', '进行', '举办',
        '申报' 
    ]);

    let verbCleanedSomething;
    do {
        verbCleanedSomething = false;
        const sortedWordsToClean = Array.from(allVerbsAndRedundantWordsToCleanFromMainPart).sort((a, b) => b.length - a.length);
        
        for (const word of sortedWordsToClean) {
            let shouldPreserveWord = false;
            for (const rk of recognitionKeywords) {
                if (rk === word || (rk.includes(word) && word.length < rk.length)) { 
                    shouldPreserveWord = true;
                    break;
                }
            }
            if (shouldPreserveWord) {
                continue; 
            }

            const regex = new RegExp(word, 'g'); 
            const prevLength = cleanedMainPart.length;
            cleanedMainPart = cleanedMainPart.replace(regex, '').trim();
            if (cleanedMainPart.length < prevLength) {
                verbCleanedSomething = true;
            }
        }
    } while (verbCleanedSomething);
    mainPart = cleanedMainPart; 

    const finalVerb = fundingSuffix;
    if (finalVerb && (defaultFundingVerbs.includes(finalVerb) || strongNonSwitchableVerbs.includes(finalVerb) || finalVerb === '贴息' || finalVerb === '认定')) {
        mainPart = mainPart.replace(new RegExp(finalVerb, 'g'), '').trim();
        mainPart = mainPart.replace(/[\(（]\s*[\)）]/g, '').trim();
        mainPart = mainPart.replace(/\s+/g, ' ').trim(); 
    }

    mainPart = mainPart.replace(/\s+/g, ' ').trim();

    return { coreText: mainPart, fundingSuffix: fundingSuffix, isDefaultSupport: defaultSupportNeeded };
}

// --- Main Control Function ---

function generateTitle() {
    const inputTextArea = document.getElementById('inputTitle');
    const outputTitleSpan = document.getElementById('outputTitle');
    const convertButton = document.getElementById('convertVerbButton');

    let input = '';
    if (inputTextArea && inputTextArea.classList.contains('placeholder-active')) {
        input = ''; 
    } else if (inputTextArea) {
        input = inputTextArea.value.trim();
    }
    
    if (!input) {
        outputTitleSpan.textContent = '请输入原始标题！';
        convertButton.style.display = 'none';
        isDefaultSupportUsed = false;
        if (typeof showNotification === 'function') {
            showNotification('请输入原始标题！');
        }
        return;
    }

    const detectedYear = extractYear(input);
    const detectedRawLocation = extractRawLocation(input); 
    const detectedBatchInfo = extractBatchInfo(input);

    const { coreText, fundingSuffix, isDefaultSupport } = processCoreText(input, detectedYear, detectedRawLocation);

    const formattedLocation = formatLocationForOutput(detectedRawLocation);
    const yearPart = detectedYear || '2025'; 

    let locationAndBatchPart = formattedLocation;
    if (detectedBatchInfo) {
        locationAndBatchPart += (locationAndBatchPart ? '丨' : '') + detectedBatchInfo;
    }
    
    originalCoreText = coreText;
    originalDateLocationSuffix = `（${yearPart}${locationAndBatchPart}）`;

    let finalTitle;
    if (isDefaultSupport) { 
        isDefaultSupportUsed = true;
        currentVerbIndex = 0; 
        finalTitle = `${originalCoreText}${defaultFundingVerbs[currentVerbIndex]}${originalDateLocationSuffix}`;
        convertButton.style.display = 'inline-block'; 
    } else { 
        isDefaultSupportUsed = false;
        convertButton.style.display = 'none'; 
        finalTitle = `${coreText}${fundingSuffix}${originalDateLocationSuffix}`;
    }
    
    outputTitleSpan.textContent = finalTitle;

    if (typeof showNotification === 'function') {
        showNotification('标题生成成功！');
    }
}

// --- Convert Button Logic ---
function cycleFundingVerb() {
    const outputTitleSpan = document.getElementById('outputTitle');
    const convertButton = document.getElementById('convertVerbButton');

    if (!isDefaultSupportUsed) {
        if (typeof showNotification === 'function') {
            showNotification('当前标题不适用资助方式切换功能。');
        } else {
            alert('当前标题不适用资助方式切换功能。');
        }
        return;
    }

    currentVerbIndex++;
    if (currentVerbIndex < defaultFundingVerbs.length) {
        const newVerb = defaultFundingVerbs[currentVerbIndex];
        outputTitleSpan.textContent = `${originalCoreText}${newVerb}${originalDateLocationSuffix}`;
        if (typeof showNotification === 'function') {
            showNotification(`资助方式已切换为：“${newVerb}”`);
        }
    } else {
        currentVerbIndex = 0; 
        if (typeof showNotification === 'function') {
            showNotification('已尝试所有备选资助方式。如果您不满意，请手动复制结果并自行修改。');
        } else {
            alert('已尝试所有备选资助方式。如果您不满意，请手动复制结果并自行修改。');
        }
        convertButton.style.display = 'none'; 
    }
}

// 清空智能标题生成功能区的输入和输出
function clearInputSmartTitle() {
    const inputTextArea = document.getElementById('inputTitle');
    const outputTitleSpan = document.getElementById('outputTitle');
    const convertButton = document.getElementById('convertVerbButton');

    if (inputTextArea) {
        inputTextArea.value = inputTextArea.getAttribute('placeholder') || '';
        inputTextArea.classList.add('placeholder-active');
    }
    if (outputTitleSpan) {
        outputTitleSpan.textContent = '等待输入...';
    }
    if (convertButton) {
        convertButton.style.display = 'none';
    }
    isDefaultSupportUsed = false;
    currentVerbIndex = 0;
    originalCoreText = '';
    originalDateLocationSuffix = '';
    
    if (typeof showNotification === 'function') {
        showNotification('内容已清空！');
    }
}

// 复制智能标题生成功能区的输出结果
function copyOutputSmartTitle() {
    const outputTitleSpan = document.getElementById('outputTitle');
    if (!outputTitleSpan) {
        console.error('Error: outputTitleSpan not found!'); 
        if (typeof showNotification === 'function') { 
            showNotification('复制功能错误：输出元素未找到！');
        }
        return;
    }

    const textToCopy = outputTitleSpan.textContent;

    if (!textToCopy || textToCopy === '等待输入...' || textToCopy === '请输入原始标题！' || textToCopy === '生成的标题将显示在这里...') {
        if (typeof showNotification === 'function') {
            showNotification('输出结果为空，无法复制！');
        } else {
            alert('输出结果为空，无法复制！');
        }
        return;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        if (typeof showNotification === 'function') {
            showNotification('标题已复制');
        }
    }).catch(err => {
        console.error('复制失败:', err); 
        if (typeof showNotification === 'function') {
            showNotification('复制失败，请手动复制！');
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const convertButton = document.getElementById('convertVerbButton');
    if (convertButton) { 
        convertButton.style.display = 'none';
    }
});
