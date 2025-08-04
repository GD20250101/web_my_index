/*
 * script.js - 前端逻辑文件
 * 所有后端文本处理逻辑已迁移至此
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化第一个Tab为激活状态
    var firstTabEl = document.querySelector('#v-pills-tab button:first-child')
    var firstTab = new bootstrap.Tab(firstTabEl)
    firstTab.show()

    // 加载快捷复制文本
    renderQuickCopyArea(PRESET_QUICK_COPY_TEXTS);

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
});

// 显示 Toast 通知
function showNotification(message) {
    const toastLiveExample = document.getElementById('liveToast');
    const toastMessageElement = document.getElementById('toast-message');
    toastMessageElement.textContent = message;
    const toast = new bootstrap.Toast(toastLiveExample);
    toast.show();
}

// 清空输入和输出框
function clearInput(tabId) {
    const inputTextarea = document.getElementById(`input_text_${tabId}`);
    const outputTextarea = document.getElementById(`output_text_${tabId}`);

    inputTextarea.value = '';
    outputTextarea.value = '';
    
    // 重新设置 placeholder 样式
    const placeholder = inputTextarea.getAttribute('placeholder');
    inputTextarea.value = placeholder;
    inputTextarea.classList.add('placeholder-active');

    showNotification('已清空');
}

// 复制输出结果
function copyOutput(tabId) {
    const outputTextarea = document.getElementById(`output_text_${tabId}`);
    if (outputTextarea.value.trim() === '') {
        showNotification('输出内容为空，无法复制。');
        return;
    }
    outputTextarea.select();
    outputTextarea.setSelectionRange(0, 99999); // For mobile devices

    try {
        document.execCommand('copy');
        showNotification('已复制到剪贴板！');
    } catch (err) {
        console.error('复制失败:', err);
        showNotification('复制失败，请手动复制。');
    } finally {
        // 取消选区，避免复制后文本仍高亮
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        } else if (document.selection) {
            document.selection.empty();
        }
    }
}

// 快捷复制相关功能
const PRESET_QUICK_COPY_TEXTS = [
    "符合条件的申报主体认定为XXX。",
    "符合条件的专家纳入专家库。",
    "按有关规定给予补助。",
    "申报主体应为",
    "申报主体需符合以下条件：",
    "申报主体需符合以下条件之一：",
    "详见相关文件《》。",
    "按要求提供。",
    "加盖公章。",
    "具体包含以下材料：",
    "（2025中央）",
    "（2025市级）",
    "（2025省级丨第X批）",
    "（2025市级丨第X批）",
    "〔〕"
];

function renderQuickCopyArea(texts) {
    const quickCopyArea = document.getElementById('quick_copy_area');
    quickCopyArea.innerHTML = ''; // 清空现有内容

    if (texts && texts.length > 0) {
        texts.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'd-flex justify-content-between align-items-center py-2';
            if (index < texts.length - 1) {
                div.style.borderBottom = '1px dashed #e9ecef';
            }

            const p = document.createElement('p');
            p.className = 'flex-grow-1 mb-0 text-break';
            p.textContent = item;
            p.style.whiteSpace = 'pre-wrap'; // 保持换行符

            const button = document.createElement('button');
            button.className = 'btn btn-outline-secondary btn-sm ms-3';
            button.textContent = '复制';
            button.onclick = () => {
                copyToClipboard(item);
            };

            div.appendChild(p);
            div.appendChild(button);
            quickCopyArea.appendChild(div);
        });
    } else {
        quickCopyArea.innerHTML = '<p class="text-muted text-center py-4">暂无快捷复制内容。</p>';
    }
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showNotification('文本已复制！');
}

// ---- 文本处理功能函数 (从 app.py 移植到 JavaScript) ----

// 辅助函数：标准化中文/英文标点符号
function standardize_punctuation(text) {
    text = text.replace(/，/g, ',').replace(/。/g, '.').replace(/！/g, '!').replace(/？/g, '?').replace(/；/g, ';').replace(/：/g, ':');
    text = text.replace(/“/g, '"').replace(/”/g, '"').replace(/‘/g, "'").replace(/’/g, "'");
    text = text.replace(/（/g, '(').replace(/）/g, ')');
    text = text.replace(/【/g, '[').replace(/】/g, ']');
    return text;
}

// 辅助函数：移除所有空白字符，包括换行符
function remove_all_whitespace(text) {
    return text.replace(/\s+/g, '');
}

function convert_level1_numbers(text) {
    const lines = text.split('\n');
    const result_lines = [];
    let current_num = 1;
    for (let line of lines) {
        const stripped_line = line.trim();
        if (stripped_line) {
            result_lines.push(`（${current_num}）${stripped_line}`);
            current_num += 1;
        }
    }
    return result_lines.join('\n');
}

function convert_level2_numbers(text) {
    const lines = text.split('\n');
    const result_lines = [];
    let current_num = 1;
    for (let line of lines) {
        const stripped_line = line.trim();
        if (stripped_line) {
            // 使用 Unicode 编码的带圈数字
            const circled_num = current_num <= 20 ? String.fromCharCode(0x2460 + current_num - 1) : `[${current_num}]`;
            result_lines.push(`${circled_num}${stripped_line}`);
            current_num += 1;
        }
    }
    return result_lines.join('\n');
}

function convert_two_level_numbers(text) {
    const lines = text.split('\n');
    const result_lines = [];
    let level1_num = 1;
    let level2_num = 1;
    let last_indent = 0;

    for (let line of lines) {
        // 获取行前的空格数来判断缩进
        const current_indent_match = line.match(/^\s*/);
        const current_indent = current_indent_match ? current_indent_match[0].length : 0;
        const stripped_line = line.trim();

        if (!stripped_line) {
            continue;
        }

        if (current_indent === 0) { // 一级标题
            result_lines.push(`（${level1_num}）${stripped_line}`);
            level1_num += 1;
            level2_num = 1; // 重置二级序号
        } else if (current_indent > last_indent) { // 二级标题（假定是比上一行更深的缩进）
             const circled_num = level2_num <= 20 ? String.fromCharCode(0x2460 + level2_num - 1) : `[${level2_num}]`;
             result_lines.push(`${' '.repeat(current_indent)}${circled_num}${stripped_line}`);
             level2_num += 1;
        } else { // 同级或回退
            // 简单处理，如果缩进相同或减少，但不是0，则认为是二级序号
            const circled_num = level2_num <= 20 ? String.fromCharCode(0x2460 + level2_num - 1) : `[${level2_num}]`;
            result_lines.push(`${' '.repeat(current_indent)}${circled_num}${stripped_line}`);
            level2_num += 1;
        }

        last_indent = current_indent;
    }
    return result_lines.join('\n');
}

function delete_numbers(text) {
    // 删除数字、带括号数字、带圈数字、字母序号等
    text = text.replace(/^\s*[\(\（]?\d+[\)\）]?\.?\s*/gm, ''); // 1. 1) (1)
    text = text.replace(/^\s*[\u2460-\u2473\u24EB-\u24F4]\s*/gm, ''); // ① ②
    text = text.replace(/^\s*[a-zA-Z]\.?\s*/gm, ''); // a. a
    text = text.replace(/^\s*第\s*\d+\s*条?\s*/gm, ''); // 第1条
    // 删除行首的空格
    let lines = text.split('\n');
    lines = lines.map(line => line.trimStart());
    // 移除空行
    lines = lines.filter(line => line.trim()); // 使用trim()确保移除只包含空格的行
    return lines.join('\n');
}

function add_br_tags(text) {
    // 使用lookbehind断言，确保标点符号保留在句子中
    const sentences = text.split(/(?<=[。？！；])\s*/g);
    const processed_sentences = [];
    for (let i = 0; i < sentences.length; i++) {
        let sentence = sentences[i];
        const stripped_sentence = sentence.trim();
        if (stripped_sentence) {
            // 确保句末有标点符号再加<br>
            if (/[。？！；]$/.test(stripped_sentence)) {
                processed_sentences.push(stripped_sentence + '<br>');
            } else {
                // 如果没有标点，且不是最后一个非空句子，则加句号和<br>
                // 找到下一个非空句子，如果当前不是最后一个且不是空串，则加句号
                const isLastUsefulSentence = i === sentences.length - 1 || sentences.slice(i + 1).every(s => s.trim() === '');
                if (!isLastUsefulSentence || stripped_sentence) { // 确保不是末尾的空字符串，或者本身有内容
                    processed_sentences.push(stripped_sentence + '。<br>');
                }
            }
        }
    }
    return processed_sentences.join('');
}

function segment_text(text) {
    // 智能分段：根据序号或段落结构分段，确保每段末尾是句号
    
    // 1. 尝试识别和处理序号
    const lines = text.split('\n');
    const processed_lines = [];
    for (let line of lines) {
        const clean_line = line.trim();
        if (!clean_line) {
            continue;
        }
        
        // 匹配常见的序号模式（如 1.、(1)、①、a. 等）
        // 如果行首有序号，则将其保留并作为新段落
        if (clean_line.match(/^\s*(\d+\.?|\(\d+\)|\[\d+\]|[a-zA-Z]\.?|[\u2460-\u2473\u24EB-\u24F4])/)) {
            processed_lines.push(clean_line);
        } else {
            // 没有序号的行，如果上一行不是空行，则追加到上一行，否则作为新段落
            if (processed_lines.length > 0 && processed_lines[processed_lines.length - 1].trim() !== '') {
                // 如果上一行不是空行，则追加到上一行
                processed_lines[processed_lines[processed_lines.length - 1].length - 1] += clean_line; // 修正索引
            } else {
                // 否则作为新段落
                processed_lines.push(clean_line);
            }
        }
    }

    // 2. 确保每段末尾是句号
    const final_segments = [];
    for (let segment of processed_lines) {
        segment = segment.trim();
        if (segment) {
            // 移除行内多余的空格，但保留一个空格分隔单词
            segment = segment.replace(/\s+/g, ' ');
            
            // 检查末尾标点
            if (!/[。？！；]$/.test(segment)) {
                segment += '。'; // 添加句号
            }
            final_segments.push(segment);
            
        }
    }
    return final_segments.join('\n');
}


function smart_process_text(text) {
    const lines = text.split('\n');
    const processed_lines = [];
    
    // 检查文本中是否包含序号
    const has_numbers = lines.some(line => line.trim() && line.match(/^\s*[\(\（]?\d+[\)\）]?\.?\s*/)) ||
                        lines.some(line => line.trim() && line.match(/^\s*[\u2460-\u2473\u24EB-\u24F4]\s*/)) ||
                        lines.some(line => line.trim() && line.match(/^\s*[a-zA-Z]\.?\s*/));

    if (has_numbers) {
        // 包含序号：行内彻底去空格，标准化序号，并确保每行末尾是句号
        let current_num = 1; // 用于生成标准化序号
        for (let line of lines) {
            const stripped_line = line.trim();
            if (!stripped_line) {
                continue;
            }

            // 移除所有空白字符
            const cleaned_line = remove_all_whitespace(stripped_line);
            
            // 尝试标准化序号 (只识别数字序号，因为这是最常见且需要重新编排的)
            const match = cleaned_line.match(/^[\(\（]?(\d+)[\)\）]?\.?(.*)/);
            let standardized_line;
            if (match) {
                const text_part = match[2]; // 提取序号后的文本部分
                standardized_line = `（${current_num}）${text_part}`;
                current_num += 1;
            } else {
                // 如果没有匹配到数字序号，保持原样（但已经彻底去空格）
                standardized_line = cleaned_line;
            }

            // 确保行末是句号
            if (!/[。？！；]$/.test(standardized_line)) {
                standardized_line += '。';
            }
            processed_lines.push(standardized_line);
        }
    } else {
        // 不包含序号：全局去空格，标准化标点，确保每行末尾是句号
        
        // 将所有行合并成一个字符串，并移除多余空格
        let full_text = lines.filter(line => line.trim()).map(line => line.trim()).join(' ');
        full_text = full_text.replace(/\s+/g, ' ').trim();

        // 标准化标点
        full_text = standardize_punctuation(full_text);
        
        // 按句号分割，确保每句话末尾是句号
        const sentences = full_text.split(/(?<=[。？！；])/g);
        const cleaned_sentences = [];
        for (let sentence of sentences) {
            sentence = sentence.trim();
            if (sentence) {
                if (!/[。？！；]$/.test(sentence)) {
                    sentence += '。';
                }
                cleaned_sentences.push(sentence);
            }
        }
        processed_lines.push(...cleaned_sentences); // 使用 spread operator 添加所有句子
        
    }
    return processed_lines.join('\n');
}


// 处理文本转换的通用函数 (现在直接调用本地JS函数，不再发送网络请求)
function processText(tabId) { 
    const inputTextarea = document.getElementById(`input_text_${tabId}`);
    const outputTextarea = document.getElementById(`output_text_${tabId}`);
    let inputText = inputTextarea.value;

    // 如果当前显示的是 placeholder 文本，则不提交
    if (inputTextarea.classList.contains('placeholder-active')) {
        inputText = ''; // 清空placeholder内容，避免处理
    }

    let result = '';
    let success = true;
    try {
        switch (tabId) {
            case 'level1':
                result = convert_level1_numbers(inputText);
                break;
            case 'level2':
                result = convert_level2_numbers(inputText);
                break;
            case 'twolevel':
                result = convert_two_level_numbers(inputText);
                break;
            case 'delete':
                result = delete_numbers(inputText);
                break;
            case 'addbr':
                result = add_br_tags(inputText);
                break;
            case 'segment':
                result = segment_text(inputText);
                break;
            case 'smart':
                result = smart_process_text(inputText);
                break;
            default:
                result = '未知功能。';
                success = false;
                break;
        }
        if (success) {
            outputTextarea.value = result;
            showNotification('转换成功！');
        } else {
            showNotification(result); // 显示未知功能提示
        }
    } catch (error) {
        console.error('处理失败:', error);
        showNotification('处理失败，请检查输入格式。');
        success = false;
    }
}