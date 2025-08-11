// delete_addbr_script.js - 删除序号和加换行符功能

// 删除序号：移除所有序号和行首空格，并确保每段之间空一行
function delete_numbers(text) {
    // remove_all_internal_whitespace, remove_leading_patterns_and_compact_content, 
    // replaceEnglishPunctuationToChinese, standardize_end_punctuation_for_numbered_items
    // 都是 script.js 中定义的公共函数
    let lines = text.split('\n');
    const processed_lines = [];
    for (let line of lines) {
        let stripped_line = remove_all_internal_whitespace(line);
        if (stripped_line) { 
            let cleaned_line_content = remove_leading_patterns_and_compact_content(stripped_line);
            cleaned_line_content = replaceEnglishPunctuationToChinese(cleaned_line_content);
            cleaned_line_content = standardize_end_punctuation_for_numbered_items(cleaned_line_content);
            processed_lines.push(cleaned_line_content); 
        }
    }
    return processed_lines.join('\n\n');
}

// 加换行符：在每句话末尾添加<br>标签，并保持原有行结构，不处理序号
function add_br_tags(text) {
    // remove_all_internal_whitespace 是 script.js 中定义的公共函数
    const lines = text.split('\n'); 
    const result_lines = [];
    for (let line of lines) {
        let processed_line = remove_all_internal_whitespace(line);
        if (!processed_line) { 
            continue; 
        }
        result_lines.push(processed_line + '<br>');
    }
    return result_lines.join('\n');
}