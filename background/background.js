// 后台脚本，用于处理扩展的后台任务
chrome.runtime.onInstalled.addListener(() => {
  console.log('DeepShare 扩展已安装');
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 检查是否在DeepSeek AI页面
  if (tab.url.includes('chat.deepseek.com')) {
    // 向内容脚本发送消息
    chrome.tabs.sendMessage(tab.id, { action: "showShareOptions" });
  } else {
    // 如果不在DeepSeek AI页面，打开DeepSeek AI
    chrome.tabs.create({ url: "https://chat.deepseek.com/" });
  }
}); 