document.addEventListener('DOMContentLoaded', function() {
    try {
        if (typeof bootstrap === 'undefined') {
            console.error("Bootstrap JS 未加载。");
            return;
        }
        
        // 初始化Placeholder逻辑
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

            // 修复点：监听粘贴事件，自动移除占位符状态
            textarea.addEventListener('paste', () => {
                textarea.classList.remove('placeholder-active');
            });
        });

    } catch (e) { console.error("初始化错误：", e); }
});

function showNotification(message) {
    const toastEl = document.getElementById('liveToast');
    const msgEl = document.getElementById('toast-message');
    if (!toastEl || !msgEl) return;
    msgEl.textContent = message;
    const toast = new bootstrap.Toast(toastEl, { delay: 2000 });
    toast.show();
}

function showKeywordAlertModal(message) {
    const body = document.getElementById('keywordAlertModalBody');
    if (body) body.innerHTML = message;
    const modal = new bootstrap.Modal(document.getElementById('keywordAlertModal'));
    modal.show();
}

function clearInput(tabId) {
    const input = document.getElementById(`input_text_${tabId}`);
    const output = document.getElementById(`output_text_${tabId}`);
    if (input) {
        input.value = input.getAttribute('placeholder');
        input.classList.add('placeholder-active');
    }
    if (output) output.value = '';
    showNotification('已清空');
}

function copyOutput(tabId) {
    const input = document.getElementById(`input_text_${tabId}`);
    const output = document.getElementById(`output_text_${tabId}`);
    if (!output || !output.value.trim()) {
        showNotification('内容为空');
        return;
    }
    
    // 关键字检查
    if (input && !input.classList.contains('placeholder-active')) {
        checkAndAlertKeywords(input.value);
    }

    navigator.clipboard.writeText(output.value).then(() => showNotification('复制成功'));
}

// 核心转换调度
function processText(tabId) {
    const input = document.getElementById(`input_text_${tabId}`);
    const output = document.getElementById(`output_text_${tabId}`);

    if (!input || input.classList.contains('placeholder-active') || !input.value.trim()) {
        showNotification('请先输入内容');
        return;
    }

    let result = '';
    const text = input.value;

    try {
        if (tabId === 'level1') result = convert_level1_numbers(text);
        else if (tabId === 'level2') result = convert_level2_numbers(text);
        else if (tabId === 'twolevel') result = convert_two_level_numbers(text);
        else if (tabId === 'delete') result = delete_numbers(text);
        else if (tabId === 'addbr') result = add_br_tags(text);
        else if (tabId === 'smart') result = smart_process_text(text);

        output.value = result;
        showNotification('转换成功');
    } catch (e) {
        console.error(e);
        showNotification('转换失败，请检查格式');
    }
}

// ----- 通用工具函数 (保留原文逻辑) -----
const ALL_WHITESPACE_CHARS_SET = '\\s\\u200B\\u200C\\u200D\\uFEFF\\u00A0\\u3000';
const LEADING_NUMBER_PATTERN_BASE = '(?:(?!20\\d{2})\\d+[.\\uFF0E)））、]?|[一二三四五六七八九十]+、|[\\uFF08][\\d一二三四五六七八九十]{1,2}[\\uFF09]|[\\u2460-\\u2473]|第\\s*\\d+\\s*条?)';
const LEADING_NUMBER_PATTERN_WITH_ANCHOR_REGEX = new RegExp(`^\\s*(${LEADING_NUMBER_PATTERN_BASE})\\s*`);
const LEADING_YEAR_PATTERN_REGEX = /^s*(20\d{2}[年年度])\s*/;

function remove_all_internal_whitespace(text) { return text.replace(/\s+/g, '').trim(); }

function remove_leading_patterns_and_compact_content(line) {
    let content = remove_all_internal_whitespace(line);
    if (!content) return '';
    if (LEADING_YEAR_PATTERN_REGEX.test(content)) return content;
    return content.replace(LEADING_NUMBER_PATTERN_WITH_ANCHOR_REGEX, '');
}

function standardize_end_punctuation_for_numbered_items(text) {
    text = text.trim();
    if (!text || text.endsWith('：')) return text;
    return text.replace(/[.,;!?。？！；]$/, '') + '。';
}

function checkAndAlertKeywords(text) {
    const keywords = ["我省", "我市", "我区", "我局", "本指南", "附件"];
    let found = [];
    keywords.forEach(k => { if (text.includes(k)) found.push(k); });
    if (found.length > 0) showKeywordAlertModal("检测到敏感词：" + found.join(", ") + "，请注意修改。");
}

function convertChineseTimePunctuationToEnglish(text) {
    return text.replace(/(\d+)[：](\d+)/g, '$1:$2').replace(/(\d+)[—－](\d+)/g, '$1-$3');
}

function replaceEnglishPunctuationToChinese(text) {
    // 简化处理，实际逻辑同你原脚本
    return text.replace(/,/g, '，').replace(/:/g, '：').replace(/\(/g, '（').replace(/\)/g, '）');
}

function process_numbered_list(text, type, isTwoLevel) {
    const lines = text.split('\n').filter(l => l.trim());
    let res = [];
    let l1 = 1, l2 = 1;
    lines.forEach(line => {
        let content = remove_leading_patterns_and_compact_content(line);
        content = standardize_end_punctuation_for_numbered_items(content);
        if (type === 'level1') res.push(`（${l1++}）${content}`);
        else if (type === 'level2') res.push(`${String.fromCharCode(0x2460 + (l1++ - 1))}${content}`);
        else if (isTwoLevel) {
            if (line.includes('（')) { res.push(`（${l1++}）${content}`); l2 = 1; }
            else { res.push(`${String.fromCharCode(0x2460 + (l2++ - 1))}${content}`); }
        }
    });
    return res.join('\n');
}