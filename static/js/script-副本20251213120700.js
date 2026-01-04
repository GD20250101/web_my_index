// script.js - 核心公共文件：包含通用初始化、UI交互和共享辅助函数

document.addEventListener('DOMContentLoaded', function() {
    try {
        // 关键检查：确保 Bootstrap JavaScript 已经加载并可用
        if (typeof bootstrap === 'undefined' || typeof bootstrap.Tab === 'undefined' || typeof bootstrap.Toast === 'undefined' || typeof bootstrap.Modal === 'undefined') {
            console.error("错误：Bootstrap JavaScript 未加载或初始化成功。请检查 './static/js/bootstrap.bundle.min.js' 路径是否正确且文件未损坏。");
            showNotification("初始化失败核心组件缺失请检查浏览器控制台F12获取详情");
            return; // 如果 Bootstrap 未正确加载，则停止进一步的脚本执行
        }
        
        // 初始化第一个Tab为激活状态
        var firstTabEl = document.querySelector('#v-pills-tab button:first-child')
        if (firstTabEl) {
            var firstTab = new bootstrap.Tab(firstTabEl)
            firstTab.show()
        } else {
            console.warn('警告未找到第一个导航Tab按钮可能导致页面初始化异常');
        }

        // 初始化所有 Bootstrap Tooltip
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        tooltipTriggerList.map(function (tooltipTriggerEl) {
          return new bootstrap.Tooltip(tooltipTriggerEl)
        })

        // 初始化PlaceholderText
        document.querySelectorAll('.placeholder-text').forEach(textarea => {
            const placeholder = textarea.getAttribute('placeholder');
            if (!textarea.value.trim()) {
                textarea.value = placeholder;
                textarea.classList.add('placeholder-active');
            }
            textarea.addEventListener('focus', () => {
                if (textarea.classList.contains('placeholder-active')) {
                    textarea.value = '';
                    textarea.classList.remove('placeholder-active');
                }
            });
            textarea.addEventListener('blur', () => {
                if (!textarea.value.trim()) {
                    textarea.value = placeholder;
                    textarea.classList.add('placeholder-active');
                }
            });
        });

    } catch (e) {
        console.error("JavaScript初始化过程中发生未捕获的错误：", e);
        showNotification("页面初始化检测到问题请查看浏览器控制台F12获取详情");
    }
});

// 显示 Toast 通知 (用于一般性短暂提示)
function showNotification(message) {
    const toastLiveExample = document.getElementById('liveToast');
    if (!toastLiveExample) {
        console.error("错误未找到Toast元素请检查indexhtml中是否存在id为'liveToast'的元素"); 
        return;
    }
    const toastMessageElement = document.getElementById('toast-message');
    if (!toastMessageElement) {
        console.error("错误未找到Toast消息元素请检查indexhtml中是否存在id为'toast-message'的元素"); 
        return;
    }
    toastMessageElement.textContent = message;
    
    // 销毁旧实例并创建新实例，以确保每次都能显示
    const existingToast = bootstrap.Toast.getInstance(toastLiveExample);
    if (existingToast) {
        existingToast.dispose();
    }

    const toast = new bootstrap.Toast(toastLiveExample, {
        delay: 3000 // 延迟3秒自动隐藏
    });
    // 重置 Toast 状态，确保每次都能弹出
    toastLiveExample.classList.remove('hide', 'showing', 'show'); // 移除旧状态
    toastLiveExample.classList.add('fade'); // 添加淡入效果
    toast.show();
}

// 显示关键字提示模态对话框 (用于重要提示，需用户手动关闭)
function showKeywordAlertModal(message) {
    const modalBody = document.getElementById('keywordAlertModalBody');
    if (modalBody) {
        modalBody.innerHTML = message; // 使用 innerHTML 允许消息中包含 HTML（如 <br>）
    } else {
        console.error("错误未找到关键字模态对话框的body元素请检查indexhtml中是否存在id为'keywordAlertModalBody'的元素");
        return;
    }
    // 确保每次都创建一个新的 Modal 实例
    const keywordAlertModalElement = document.getElementById('keywordAlertModal');
    const keywordAlertModal = new bootstrap.Modal(keywordAlertModalElement);
    keywordAlertModal.show();
}


// 清空输入和输出框 (通用功能，保留在核心文件)
function clearInput(tabId) {
    const inputTextarea = document.getElementById(`input_text_${tabId}`);
    const outputTextarea = document.getElementById(`output_text_${tabId}`);

    if (inputTextarea) {
        inputTextarea.value = '';
        const placeholder = inputTextarea.getAttribute('placeholder');
        inputTextarea.value = placeholder;
        inputTextarea.classList.add('placeholder-active');
    } else {
        console.warn(`清空操作未找到id为input_text_${tabId}的输入框`);
    }

    if (outputTextarea) {
        outputTextarea.value = '';
    } else {
        console.warn(`清空操作未找到id为output_text_${tabId}的输出框`);
    }

    showNotification('已清空');
}

// 粘贴文本到输入框 (通用功能，保留在核心文件)
async function pasteInput(tabId) {
    const inputTextarea = document.getElementById(`input_text_${tabId}`);
    if (!inputTextarea) {
        console.error(`粘贴失败未找到id为input_text_${tabId}的输入框`);
        showNotification('粘贴失败目标输入框不存在');
        return;
    }
    try {
        const text = await navigator.clipboard.readText();
        inputTextarea.value = text;
        inputTextarea.classList.remove('placeholder-active'); // 移除placeholder样式
        showNotification('粘贴成功');
    } catch (err) {
        console.error('粘贴失败', err);
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
             showNotification('粘贴失败浏览器安全设置阻止了自动粘贴请手动CtrlVCmdV粘贴');
        } else {
            showNotification('粘贴失败请手动粘贴');
        }
    }
}


// 复制输出结果 (通用功能) - 关键字检查逻辑在此处触发
function copyOutput(tabId) {
    const inputTextarea = document.getElementById(`input_text_${tabId}`);
    const outputTextarea = document.getElementById(`output_text_${tabId}`);
    
    if (!outputTextarea) {
        console.error(`复制失败未找到id为output_text_${tabId}的输出框`);
        showNotification('复制失败目标输出框不存在');
        return;
    }

    let inputText = inputTextarea ? inputTextarea.value : ''; 
    if (inputTextarea && inputTextarea.classList.contains('placeholder-active')) {
        inputText = ''; 
    }

    // 在复制前检查原始输入文本是否含有关键字并给出提示
    if (inputText.trim() !== '') { 
        checkAndAlertKeywords(inputText);
    }
    
    if (outputTextarea.value.trim() === '') {
        showNotification('输出内容为空无法复制');
        return;
    }
    outputTextarea.select();
    outputTextarea.setSelectionRange(0, 99999); // For mobile devices

    try {
        document.execCommand('copy');
        showNotification('复制成功');
    } catch (err) {
        console.error('复制失败', err);
        showNotification('复制失败请手动复制');
    } finally {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        } else if (document.selection) {
            document.selection.empty();
        }
    }
}

// ---- 文本处理辅助函数和常量 (被所有功能模块共享，保留在核心文件) ----

// 全局定义更全面的空白字符集（用于字符类）
const ALL_WHITESPACE_CHARS_SET = '\\s\\u200B\\u200C\\u200D\\uFEFF\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000'; 

// 定义匹配零个或多个这类空白字符的字符串（用于构建正则表达式）
const OPTIONAL_WHITESPACE_STR = `[${ALL_WHITESPACE_CHARS_SET}]*`;
// 定义匹配一个或多个这类空白字符的字符串（用于构建正则表达式）
const MANDATORY_WHITESPACE_STR = `[${ALL_WHITESPACE_CHARS_SET}]+`;

// 全局正则表达式：用于替换一个或多个空白字符为单个空格
const WHITESPACE_TO_SINGLE_SPACE_REGEX = new RegExp(MANDATORY_WHITESPACE_STR, 'g');
// 全局正则表达式：用于彻底移除所有空白字符
const WHITESPACE_TO_REMOVE_REGEX_ALL = new RegExp(MANDATORY_WHITESPACE_STR, 'g');


// 全局定义用于识别行首序号的基础正则表达式（无锚点，方便在Lookahead中使用）
const LEADING_NUMBER_PATTERN_BASE = '(?:' +
    '(?!20\\d{2}[年年度])\\d+[.\uFF0E)））、]?|' + 
    '[一二三四五六七八九十]+、|' + 
    '[\uFF08][\\d一二三四五六七八九十]{1,2}[\uFF09]、?|' + 
    '[\u2460-\u2473\u24EB-\u24F4]|' + 
    '[a-zA-Z][.\uFF0E)）]?|' + 
    '第\\s*\\d+\\s*条?' + 
')';
// 全局定义用于匹配行首序号的完整正则表达式（带行首锚点和可选空白），用于删除或判断
const LEADING_NUMBER_PATTERN_WITH_ANCHOR_REGEX = new RegExp(`^${OPTIONAL_WHITESPACE_STR}(${LEADING_NUMBER_PATTERN_BASE})${OPTIONAL_WHITESPACE_STR}`);

// 全局定义用于识别行首年份的正则表达式 (20XX年/年度)
const LEADING_YEAR_PATTERN_REGEX = new RegExp(`^${OPTIONAL_WHITESPACE_STR}(20\\d{2}[年年度])${OPTIONAL_WHITESPACE_STR}`);

// 特殊用于两级序号功能，精确匹配（数字）和 ① 的正则表达式 (需要暴露给 two_level_script.js)
const TWO_LEVEL_SPECIFIC_L1_INPUT_PATTERN = /^\s*[\(（]\d+[\)）]/; // 匹配 (1), （1）
const TWO_LEVEL_SPECIFIC_L2_INPUT_PATTERN = /^\s*[\u2460-\u2473\u24EB-\u24F4]/; // 匹配 ①


// 辅助函数：标准化文本中的所有空白字符为单个空格，并移除首尾空格
function standardize_internal_whitespace_to_single(text) {
    if (!text) return '';
    return text.replace(WHITESPACE_TO_SINGLE_SPACE_REGEX, ' ').trim();
}

// 辅助函数：移除所有空白字符（包括各种Unicode空白和单词间的空格），使其紧密排列
function remove_all_internal_whitespace(text) {
    if (!text) return '';
    return text.replace(WHITESPACE_TO_REMOVE_REGEX_ALL, '').trim();
}

// 辅助函数：移除行开头可能存在的旧序号和多余空格，并确保内容完全紧凑（无空格）。
// 特殊处理年份，不移除年份。
function remove_leading_patterns_and_compact_content(line) {
    let currentCompactedLine = remove_all_internal_whitespace(line); 
    if (!currentCompactedLine) return '';

    const year_match = currentCompactedLine.match(LEADING_YEAR_PATTERN_REGEX); 
    if (year_match) {
        let content_after_year = remove_all_internal_whitespace(currentCompactedLine.substring(year_match[0].length));
        return `${year_match[1]}` + (content_after_year ? `${content_after_year}` : '');
    }

    let cleaned_line = currentCompactedLine.replace(LEADING_NUMBER_PATTERN_WITH_ANCHOR_REGEX, '');
    return remove_all_internal_whitespace(cleaned_line); 
}

// 辅助函数：确保字符串以中文句号“。”结尾，并移除已存在的常见句末标点（包括分号）。
// 但如果原始文本以冒号“：”结尾，则保留冒号，不加句号。
function standardize_end_punctuation_for_numbered_items(text) {
    text = text.trim(); 
    if (!text) return '';
    if (text.endsWith('：')) {
        return text;
    }
    text = text.replace(/[.,;!?。？！；]$/, ''); 
    return text + '。';
}


// 检查文本中是否含有特定关键字并弹框提示
function checkAndAlertKeywords(text) {
    const keywords = ["我省", "我市", "我区", "我局", "我县", "本指南", "本通知", "本指引"];
    const attachmentPattern = /附件[一二三四五六七八九十\d]+/g; 
    const lines = text.split('\n');
    let foundMessages = [];

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let lineContent = line; 

        keywords.forEach(keyword => {
            if (lineContent.includes(keyword)) {
                foundMessages.push(`第${lineNumber}行含有“${keyword}”`);
            }
        });

        let match;
        attachmentPattern.lastIndex = 0; 
        while ((match = attachmentPattern.exec(lineContent)) !== null) {
            foundMessages.push(`第${lineNumber}行含有“${match[0]}”`);
        }
    });

    if (foundMessages.length > 0) {
        const uniqueMessages = [...new Set(foundMessages)];
        const alertMessage = "您提供的文本中<br>" + uniqueMessages.join("<br>") + "<br>请留意做项目时是否需要修改";
        showKeywordAlertModal(alertMessage); 
        return true; 
    }
    return false; 
}

// 辅助函数：将中文时间冒号和连字符转换为英文
function convertChineseTimePunctuationToEnglish(text) {
    if (!text) return '';
    text = text.replace(/(\d+)[：](\d+)/g, '$1:$2');
    text = text.replace(/(\d+)([—－])(\d+)/g, '$1-$3');
    return text;
}


// 英文标点符号转换为中文标点符号函数 (已优化，防止URL/时间/比号/句号被破坏，不再转换 '/')
function replaceEnglishPunctuationToChinese(text) {
    // 豁免模式：URL、FTP、域名、时间格式、以及数字比号格式 (如 1:1, 10:5:2)
    const exempt_pattern = /(https?:\/\/[^\s]+|ftp:\/\/[^\s]+|\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}(?:\/[^\s]*)?(?:[?#][^\s]*)?\b|\b\d{1,2}:\d{2}(?::\d{2})?\b|\b\d+:\d+(?::\d+)*\b)/gi;

    let result_parts = [];
    let lastIndex = 0;
    let match;

    while ((match = exempt_pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            let non_exempt_text = text.substring(lastIndex, match.index);
            let converted_segment = non_exempt_text;

            converted_segment = converted_segment.replace(/---/g, '——'); 
            converted_segment = converted_segment.replace(/--/g, '——'); 
            converted_segment = converted_segment.replace(/\.{3,}/g, '…'); 

            let tempInDoubleQuote = false; 
            converted_segment = converted_segment.replace(/"/g, () => {
                tempInDoubleQuote = !tempInDoubleQuote; 
                return tempInDoubleQuote ? '“' : '”';
            });
            let tempInSingleQuote = false; 
            converted_segment = converted_segment.replace(/'/g, () => {
                tempInSingleQuote = !tempInSingleQuote; 
                return tempInSingleQuote ? '‘' : '’';
            });

            // 移除 .replace(/\./g, '。')，使英文句号不被转换
            converted_segment = converted_segment
                .replace(/,/g, '，')             
                .replace(/;/g, '；') .replace(/\?/g, '？') .replace(/!/g, '！') 
                .replace(/\(/g, '（') .replace(/\)/g, '）')             
                .replace(/\[/g, '〔') .replace(/\]/g, '〕')             
                .replace(/\{/g, '｛') .replace(/\}/g, '｝')             
                .replace(/%/g, '％') .replace(/~/g, '～') .replace(/\$/g, '＄') .replace(/#/g, '＃')
                .replace(/@/g, '＠') .replace(/\\/g, '＼')              
                .replace(/\^/g, '＾') .replace(/_/g, '＿') .replace(/-/g, '－'); 

            // 确保冒号在非豁免情况下仍然转换为中文冒号，此行应放在豁免处理之后
            converted_segment = converted_segment.replace(/:/g, '：'); 
            
            result_parts.push(converted_segment);
        }
        result_parts.push(match[0]); // 将豁免的部分原样添加
        lastIndex = exempt_pattern.lastIndex;
    }
    // 处理文本剩余部分（在最后一个豁免匹配之后）
    if (lastIndex < text.length) {
        let non_exempt_text = text.substring(lastIndex);
        let converted_segment = non_exempt_text;
        
        converted_segment = converted_segment.replace(/---/g, '——');
        converted_segment = converted_segment.replace(/--/g, '——');
        converted_segment = converted_segment.replace(/\.{3,}/g, '…');
        let tempInDoubleQuote = false;
        converted_segment = converted_segment.replace(/"/g, () => { tempInDoubleQuote = !tempInDoubleQuote; return tempInDoubleQuote ? '“' : '”'; });
        let tempInSingleQuote = false;
        converted_segment = converted_segment.replace(/'/g, () => { tempInSingleQuote = !tempInSingleQuote; return tempInSingleQuote ? '‘' : '’'; });
        // 移除 .replace(/\./g, '。')，使英文句号不被转换
        converted_segment = converted_segment
            .replace(/,/g, '，')
            .replace(/;/g, '；').replace(/\?/g, '？').replace(/!/g, '！')
            .replace(/[\(（]/g, '（').replace(/[\)）]/g, '）')
            .replace(/\[/g, '〔').replace(/\]/g, '〕').replace(/\{/g, '｛').replace(/\}/g, '｝')
            .replace(/%/g, '％').replace(/~/g, '～').replace(/\$/g, '＄').replace(/#/g, '＃')
            .replace(/@/g, '＠').replace(/\\/g, '＼')
            .replace(/\^/g, '＾').replace(/\_/g, '＿').replace(/-/g, '－'); 
        
        // 确保冒号在非豁免情况下仍然转换为中文冒号
        converted_segment = converted_segment.replace(/:/g, '：');
        
        result_parts.push(converted_segment);
    }

    return result_parts.join('');
}

// 统一处理带序号列表的辅助函数 (被多个功能模块共享，保留在核心文件)
function process_numbered_list(text, number_format_type, is_two_level_requested = false) {
    const lines = text.split('\n');
    const result_lines = [];
    let current_num_level1 = 1;
    let current_num_level2 = 1;

    let single_level_first_line_title_exception_applied_for_this_call = false; 

    for (let i = 0; i < lines.length; i++) {
        const original_line = lines[i];
        let processed_line_content_compacted = remove_all_internal_whitespace(original_line);
        if (!processed_line_content_compacted) {
            continue; 
        }

        let content_after_leading_pattern_removal = remove_leading_patterns_and_compact_content(original_line);
        const final_content_with_punctuation = standardize_end_punctuation_for_numbered_items(content_after_leading_pattern_removal);
        const ends_with_colon = processed_line_content_compacted.endsWith('：');


        if (is_two_level_requested) { 
            const is_explicit_l1_input = TWO_LEVEL_SPECIFIC_L1_INPUT_PATTERN.test(original_line); 
            const is_explicit_l2_input = TWO_LEVEL_SPECIFIC_L2_INPUT_PATTERN.test(original_line); 

            const should_be_l1 = is_explicit_l1_input || 
                                 (ends_with_colon && !is_explicit_l2_input) || 
                                 (!is_explicit_l1_input && !is_explicit_l2_input && !ends_with_colon);

            if (should_be_l1) {
                let content_to_use = remove_leading_patterns_and_compact_content(original_line);
                result_lines.push(`（${current_num_level1}）${standardize_end_punctuation_for_numbered_items(content_to_use)}`);
                current_num_level1++;
                current_num_level2 = 1; 
            } else if (is_explicit_l2_input) {
                let content_to_use = remove_leading_patterns_and_compact_content(original_line);
                const circled_num = current_num_level2 <= 20 ? String.fromCharCode(0x2460 + current_num_level2 - 1) : `[${current_num_level2}]`;
                result_lines.push(`${circled_num}${standardize_end_punctuation_for_numbered_items(content_to_use)}`); 
                current_num_level2++;
            }
        } else { 
            const is_current_line_numbered_any_format = LEADING_NUMBER_PATTERN_WITH_ANCHOR_REGEX.test(original_line) || LEADING_YEAR_PATTERN_REGEX.test(original_line); 
            
            const is_this_line_a_single_level_title_exception = ends_with_colon && !is_current_line_numbered_any_format;
            if (!single_level_first_line_title_exception_applied_for_this_call && is_this_line_a_single_level_title_exception) {
                result_lines.push(processed_line_content_compacted); 
                single_level_first_line_title_exception_applied_for_this_call = true;
            } else {
                if (number_format_type === 'level1') {
                    result_lines.push(`（${current_num_level1}）${final_content_with_punctuation}`);
                    current_num_level1 += 1;
                } else if (number_format_type === 'level2') {
                    const circled_num = current_num_level1 <= 20 ? String.fromCharCode(0x2460 + current_num_level1 - 1) : `[${current_num_level1}]`;
                    result_lines.push(`${circled_num}${final_content_with_punctuation}`);
                    current_num_level1 += 1;
                } else { 
                    console.warn(`Unexpected number_format_type or unhandled path in single-level mode ${number_format_type} Line ${i+1} added as plain ${original_line}`);
                    result_lines.push(processed_line_content_compacted);
                }
            }
            if (!single_level_first_line_title_exception_applied_for_this_call) {
                single_level_first_line_title_exception_applied_for_this_call = true;
            }
        }
    }
    return result_lines.join('\n');
}

// 处理文本转换的通用调度函数
function processText(tabId) {
    const inputTextarea = document.getElementById(`input_text_${tabId}`);
    const outputTextarea = document.getElementById(`output_text_${tabId}`);

    if (!inputTextarea || !outputTextarea) {
        console.error(`处理失败未找到id为input_text_${tabId}或output_text_${tabId}的文本区域`);
        showNotification('处理失败输入输出框缺失');
        return;
    }

    let inputText = inputTextarea.value;

    if (inputTextarea.classList.contains('placeholder-active')) {
        inputText = ''; 
    } else if (!inputText.trim()) {
        showNotification('输入内容为空无需转换');
        outputTextarea.value = ''; 
        return;
    }

    let result = '';
    try {
        switch (tabId) {
            case 'level1':
                if (typeof convert_level1_numbers === 'function') {
                    result = convert_level1_numbers(inputText);
                } else {
                    console.error("Error convert_level1_numbers function not loaded");
                    showNotification("功能未加载一级序号");
                    return;
                }
                break;
            case 'level2':
                if (typeof convert_level2_numbers === 'function') {
                    result = convert_level2_numbers(inputText);
                } else {
                    console.error("Error convert_level2_numbers function not loaded");
                    showNotification("功能未加载二级序号");
                    return;
                }
                break;
            case 'twolevel':
                if (typeof convert_two_level_numbers === 'function') {
                    result = convert_two_level_numbers(inputText);
                } else {
                    console.error("Error convert_two_level_numbers function not loaded");
                    showNotification("功能未加载两级序号");
                    return;
                }
                break;
            case 'delete':
                if (typeof delete_numbers === 'function') {
                    result = delete_numbers(inputText);
                } else {
                    console.error("Error delete_numbers function not loaded");
                    showNotification("功能未加载删除序号");
                    return;
                }
                break;
            case 'addbr':
                if (typeof add_br_tags === 'function') {
                    result = add_br_tags(inputText);
                } else {
                    console.error("Error add_br_tags function not loaded");
                    showNotification("功能未加载加换行符");
                    return;
                }
                break;
            case 'smart':
                if (typeof smart_process_text === 'function') {
                    result = smart_process_text(inputText);
                } else {
                    console.error("Error smart_process_text function not loaded");
                    showNotification("功能未加载智能处理");
                    return;
                }
                break;
            default:
                result = '未知功能';
                showNotification(result);
                return;
        }
        outputTextarea.value = result;
        showNotification('转换成功'); 
    } catch (error) {
        console.error('处理失败', error); 
        showNotification('处理失败请检查输入格式或联系开发者详情请查看控制台');
    }
}