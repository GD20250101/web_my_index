// two_level_script.js - 两级序号功能

// 两级序号转换：一级（1）（2）...，二级①②...
function convert_two_level_numbers(text) {
    // process_numbered_list 是 script.js 中定义的公共函数
    // TWO_LEVEL_SPECIFIC_L1_INPUT_PATTERN 和 TWO_LEVEL_SPECIFIC_L2_INPUT_PATTERN 也是 script.js 中定义的公共常量
    return process_numbered_list(text, 'two-level-specific', true); 
}