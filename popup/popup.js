document.addEventListener('DOMContentLoaded', function() {
  const captureBtn = document.getElementById('captureBtn');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const copyTextBtn = document.getElementById('copyTextBtn');
  const statusDiv = document.getElementById('status');
  
  // 截图对话
  captureBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "captureConversation"}, function(response) {
        if (response && response.success) {
          showStatus('截图已保存到剪贴板！', 'success');
        } else {
          showStatus('截图失败，请确保你在 DeepSeek AI 对话页面。', 'error');
        }
      });
    });
  });
  
  // 复制链接
  copyLinkBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "copyConversationLink"}, function(response) {
        if (response && response.success) {
          showStatus('对话链接已复制到剪贴板！', 'success');
        } else {
          showStatus('复制链接失败，请确保你在 DeepSeek AI 对话页面。', 'error');
        }
      });
    });
  });
  
  // 复制文本
  copyTextBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "copyConversationText"}, function(response) {
        if (response && response.success) {
          showStatus('对话文本已复制到剪贴板！', 'success');
        } else {
          showStatus('复制文本失败，请确保你在 DeepSeek AI 对话页面。', 'error');
        }
      });
    });
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
}); 