// smart_process_script.js - 智能处理功能

// 智能处理：根据文本特征自动清理和格式化
function smart_process_text(text) {
    // convertChineseTimePunctuationToEnglish, replaceEnglishPunctuationToChinese,
    // LEADING_NUMBER_PATTERN_WITH_ANCHOR_REGEX, LEADING_YEAR_PATTERN_REGEX,
    // remove_all_internal_whitespace, OPTIONAL_WHITESPACE_STR, LEADING_NUMBER_PATTERN_BASE
    // 都是 script.js 中定义的公共函数或常量
    
    // 0. 删除 <br> 标签
    text = text.replace(/<br\s*\/?>/gi, '');

    // 1. 将中文时间冒号和连字符转换为英文
    text = convertChineseTimePunctuationToEnglish(text);

    // 2. 将英文标点符号转换为中文标点符号 (URL和时间除外)
    text = replaceEnglishPunctuationToChinese(text);

    const original_lines = text.split('\n');
    const has_prefixes = original_lines.some(line => line.trim() && (LEADING_NUMBER_PATTERN_WITH_ANCHOR_REGEX.test(line) || LEADING_YEAR_PATTERN_REGEX.test(line)));

    if (has_prefixes) {
        let flattened_text_all_whitespace_removed = remove_all_internal_whitespace(
            original_lines.filter(line => line.trim()).map(line => line.trim()).join('')
        );

        const smart_segment_split_regex = new RegExp(
            `(?<=[。？！；：])${OPTIONAL_WHITESPACE_STR}(?=${LEADING_NUMBER_PATTERN_BASE}|20\\d{2}[年年度])`, 'g'
        );

        let segments = flattened_text_all_whitespace_removed.split(smart_segment_split_regex);
        
        const result_segments = [];
        for (let segment of segments) {
            segment = segment.trim();
            if (segment) {
                result_segments.push(segment);
            }
        }
        return result_segments.join('\n');
    } else {
        let full_text_single_line = remove_all_internal_whitespace(original_lines.filter(line => line.trim()).map(line => line.trim()).join(''));
        let final_text = remove_all_internal_whitespace(full_text_single_line);
        return final_text; 
    }
}