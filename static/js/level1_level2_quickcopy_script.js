// level1_level2_quickcopy_script.js - 一级序号、二级序号、快捷复制功能

// 一级序号转换：转换为（1）（2）…格式
function convert_level1_numbers(text) {
    // process_numbered_list 是 script.js 中定义的公共函数
    return process_numbered_list(text, 'level1', false); 
}

// 二级序号转换：转换为①②③…格式
function convert_level2_numbers(text) {
    // process_numbered_list 是 script.js 中定义的公共函数
    return process_numbered_list(text, 'level2', false); 
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
	"详见相关文件《附件材料》。",
	"详见本通知附件。", // 解决冲突：保留远程的更简洁版本
    "按要求提供。",
    "加盖公章。",
    "具体包含以下材料：",
    "〔2025〕"
];

function renderQuickCopyArea(texts) {
    const quickCopyArea = document.getElementById('quick_copy_area');
    if (!quickCopyArea) {
        console.error("错误未找到快捷复制区域元素");
        return;
    }
    quickCopyArea.innerHTML = ''; 

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
            p.style.whiteSpace = 'pre-wrap'; 

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
        quickCopyArea.innerHTML = '<p class="text-muted text-center py-4">暂无快捷复制内容</p>';
    }
}

function copyToClipboard(text) {
    // showNotification 是 script.js 中定义的公共函数
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('复制成功');
        }).catch(err => {
            console.error('复制到剪贴板失败', err);
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed'; 
            textarea.style.opacity = '0'; 
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showNotification('复制成功');
            } catch (execErr) {
                console.error('execCommand 复制失败', execErr);
                showNotification('复制失败请手动复制');
            } finally {
                document.body.removeChild(textarea);
            }
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showNotification('复制成功');
        } catch (execErr) {
            console.error('execCommand 复制失败', execErr);
            showNotification('复制失败请手动复制');
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

// 加载快捷复制文本在 DOMContentLoaded 后 (此处的DOMContentLoaded只负责快速复制的渲染)
document.addEventListener('DOMContentLoaded', () => {
    // 渲染快捷复制文本，PRESET_QUICK_COPY_TEXTS 和 renderQuickCopyArea 定义在此文件
    renderQuickCopyArea(PRESET_QUICK_COPY_TEXTS); 
});