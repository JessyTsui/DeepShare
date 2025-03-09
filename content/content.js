// 监听来自弹出窗口的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "captureConversation") {
    captureConversation().then(success => {
      sendResponse({success: success});
    }).catch(error => {
      console.error('截图错误:', error);
      sendResponse({success: false, error: error.message});
    });
    return true; // 保持消息通道开放，以便异步响应
  } 
  else if (request.action === "copyConversationLink") {
    copyConversationLink().then(success => {
      sendResponse({success: success});
    }).catch(error => {
      console.error('复制链接错误:', error);
      sendResponse({success: false, error: error.message});
    });
    return true;
  }
  else if (request.action === "copyConversationText") {
    copyConversationText().then(success => {
      sendResponse({success: success});
    }).catch(error => {
      console.error('复制文本错误:', error);
      sendResponse({success: false, error: error.message});
    });
    return true;
  }
});

// 使用节流函数来限制函数调用频率
function throttle(func, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return func(...args);
  };
}

// 显示通知
function showNotification(message) {
  // 移除已有的通知
  const existingNotification = document.querySelector('.deepshare-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = 'deepshare-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 10000;
    font-size: 14px;
  `;
  notification.textContent = message;
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// 添加直接分享为图片的按钮到对话框
function addDirectShareButton() {
  // 查找消息容器
  const messageContainers = document.querySelectorAll('.ds-markdown.ds-markdown--block, .edb250b1');
  
  messageContainers.forEach(container => {
    // 获取消息所在的父容器（用于寻找按钮区域）
    const messageWrapper = container.closest('.dad65929, .message.flex');
    if (!messageWrapper) return;
    
    // 查找按钮容器 - 适配DeepSeek的按钮布局
    const buttonsContainer = messageWrapper.querySelector('.ds-flex.abe97156, .flex.gap-1, .flex.gap-2');
    
    // 如果已经有分享按钮，则不再添加
    if (buttonsContainer && !buttonsContainer.querySelector('.direct-share-button')) {
      // 创建一个与原有按钮相似的容器
      const shareButton = document.createElement('div');
      shareButton.className = 'ds-icon-button direct-share-button';
      shareButton.setAttribute('tabindex', '0');
      shareButton.style.cssText = '--ds-icon-button-text-color: #909090; --ds-icon-button-size: 20px;';
      
      // 添加按钮图标
      const iconContainer = document.createElement('div');
      iconContainer.className = 'ds-icon';
      iconContainer.style.cssText = 'font-size: 20px; width: 20px; height: 20px;';
      
      // 分享图标SVG
      iconContainer.innerHTML = `
        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
          <polyline points="16 6 12 2 8 6"></polyline>
          <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
      `;
      
      shareButton.appendChild(iconContainer);
      shareButton.title = "直接分享为图片";
      
      // 添加点击事件
      shareButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // 准备要分享的内容
        // 这里我们需要找到整个对话（用户问题和AI回答）
        const conversation = [];
        
        // 寻找当前消息的上下文
        const currentConversation = messageWrapper.closest('.f6004764, .conversation');
        if (currentConversation) {
          // 用户问题 - 查找用户的问题消息
          const userQuestion = currentConversation.querySelector('.fbb737a4, .user-message');
          if (userQuestion) {
            conversation.push(userQuestion.closest('.dad65929, .message.flex'));
          }
          
          // AI回答 - 查找AI的回答消息
          const aiAnswer = currentConversation.querySelector('.edb250b1, .ds-markdown.ds-markdown--block');
          if (aiAnswer) {
            const aiMessageWrapper = aiAnswer.closest('.dad65929, .message.flex');
            if (aiMessageWrapper && !conversation.includes(aiMessageWrapper)) {
              conversation.push(aiMessageWrapper);
            }
          }
        }
        
        // 如果未找到完整对话，则使用当前消息
        if (conversation.length === 0) {
          conversation.push(messageWrapper);
        }
        
        // 调用分享预览
        renderSharePreview(conversation);
      });
      
      // 添加按钮到按钮组
      buttonsContainer.appendChild(shareButton);
    }
  });
}

// 找到完整对话（从用户问题到AI回答）
function findConversation(currentIndex, allMessages) {
  const conversation = [];
  const currentMessage = allMessages[currentIndex];
  
  // 如果是用户消息，则包括该消息和下一条AI消息
  // 如果是AI消息，则包括该消息和前一条用户消息
  if (currentMessage.classList.contains('dark:bg-gray-800')) { // 用户消息
    conversation.push(currentMessage);
    if (currentIndex + 1 < allMessages.length) {
      conversation.push(allMessages[currentIndex + 1]);
    }
  } else { // AI消息
    if (currentIndex - 1 >= 0) {
      conversation.push(allMessages[currentIndex - 1]);
    }
    conversation.push(currentMessage);
  }
  
  return conversation;
}

// 修改MutationObserver以适配DeepSeek页面结构
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length || 
        (mutation.type === 'attributes' && 
         (mutation.target.classList.contains('ds-markdown') || 
          mutation.target.classList.contains('edb250b1')))) {
      setTimeout(addDirectShareButton, 100);
      break;
            }
          }
        });
        
// 启动观察器 - 观察更广泛的选择器
observer.observe(document.body, { 
  childList: true, 
  subtree: true, 
  attributes: true,
  attributeFilter: ['class']
});

// 页面加载时也添加按钮
window.addEventListener('load', () => {
  setTimeout(addDirectShareButton, 1000); // 延迟添加，确保DOM已完全加载
});

// 渲染分享预览
function renderSharePreview(conversation) {
  // 创建分享预览容器
  const sharePreviewContainer = document.createElement('div');
  sharePreviewContainer.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 share-preview-container';
  sharePreviewContainer.style.cssText = 'backdrop-filter: blur(5px); z-index: 10000;';
  
  // 创建预览卡片容器 - 这是最外层的容器，包含控制按钮和预览内容
  const sharePreviewCard = document.createElement('div');
  sharePreviewCard.className = 'bg-white rounded-lg overflow-hidden shadow-xl share-preview-card';
  sharePreviewCard.style.cssText = 'width: 500px; max-width: 95%; max-height: 96vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1); position: relative; margin: 0 auto;';
  
  // 添加顶部控制栏 - 包含主题选择和关闭按钮
  const topBar = document.createElement('div');
  topBar.className = 'w-full flex items-center justify-between p-3 border-b border-gray-200';
  topBar.style.cssText = 'background-color: #F9FAFB; flex-shrink: 0;';
  
  // 创建主题选择区域
  const themeSelector = document.createElement('div');
  themeSelector.className = 'flex items-center gap-2';
  
  // 添加主题选择标签
  const themeLabel = document.createElement('span');
  themeLabel.className = 'text-sm text-gray-500';
  themeLabel.textContent = '选择主题:';
  themeSelector.appendChild(themeLabel);
  
  // 定义主题
  const themes = [
    { id: 'blue', name: '蓝色', color: '#4AABD5' },
    { id: 'green', name: '绿色', color: '#4AD5A3' },
    { id: 'purple', name: '紫色', color: '#9D4AD5' },
    { id: 'orange', name: '橙色', color: '#D5884A' },
    { id: 'pink', name: '粉色', color: '#D54A8B' },
    { id: 'gray', name: '灰色', color: '#A0AEC0' }
  ];
  
  // 存储当前选中的主题
  let activeTheme = themes[0];
  
  // 创建主题按钮
  themes.forEach(theme => {
    const themeButton = document.createElement('button');
    themeButton.className = 'theme-color-btn rounded-full w-5 h-5 flex items-center justify-center border';
    themeButton.title = theme.name;
    themeButton.style.cssText = `background-color: ${theme.color}; border-color: ${theme.color === activeTheme.color ? '#2D3748' : 'transparent'}; border-width: 2px;`;
    
    themeButton.addEventListener('click', () => {
      // 更新所有主题按钮的边框
      document.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.style.borderColor = 'transparent';
      });
      
      // 设置当前选中主题的边框
      themeButton.style.borderColor = '#2D3748';
      
      // 更新当前主题
      activeTheme = theme;
      
      // 应用主题
      applyTheme(theme);
    });
    
    themeSelector.appendChild(themeButton);
  });
  
  // 创建关闭按钮
  const closeButton = document.createElement('button');
  closeButton.className = 'close-btn flex items-center justify-center rounded-md';
  closeButton.style.cssText = 'width: 28px; height: 28px; background: #F3F4F6; color: #6B7280; border: none;';
  closeButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        
  closeButton.addEventListener('click', () => {
    document.body.removeChild(sharePreviewContainer);
  });
  
  // 组装顶部栏
  topBar.appendChild(themeSelector);
  topBar.appendChild(closeButton);
  
  // 创建内容区域 - 可滚动
  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 overflow-auto p-4';
  contentArea.style.cssText = 'overflow-y: auto; max-height: calc(96vh - 120px);';
  
  // 创建预览卡片 - 这是将被截图的部分
  const previewCard = document.createElement('div');
  previewCard.id = 'preview-image-area';
  previewCard.className = 'rounded-lg overflow-hidden mx-auto';
  previewCard.style.cssText = `
    width: 100%;
    background-color: ${activeTheme.color};
    padding: 12px;
    transition: background-color 0.3s ease;
  `;
  
  // 创建内容容器 - 白色背景
  const contentContainer = document.createElement('div');
  contentContainer.className = 'bg-white rounded-lg overflow-hidden';
  contentContainer.style.cssText = 'background-color: #fff;';
  
  // 创建头部信息
  const cardHeader = document.createElement('div');
  cardHeader.className = 'flex items-center justify-between p-4 border-b border-gray-100';
  
  // 添加图标和日期
  const iconContainer = document.createElement('div');
  iconContainer.className = 'flex items-center';
  
  // 使用自行车图标作为示例
  iconContainer.innerHTML = `
    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5"/>
        <circle cx="18.5" cy="17.5" r="3.5"/>
        <path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
      </svg>
    </div>
  `;
  
  const dateDisplay = document.createElement('div');
  dateDisplay.className = 'text-gray-500 text-sm';
  
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;
  dateDisplay.textContent = formattedDate;
  
  cardHeader.appendChild(iconContainer);
  cardHeader.appendChild(dateDisplay);
  
  // 创建对话内容区域
  const conversationContainer = document.createElement('div');
  conversationContainer.className = 'p-4';
  
  // 添加对话内容
  conversation.forEach((message, index) => {
    const messageClone = message.cloneNode(true);
    
    // 移除不需要的按钮和交互元素
    const elementsToRemove = messageClone.querySelectorAll('button, .ds-icon-button, .direct-share-button, .copy-button, .regenerate-button');
    elementsToRemove.forEach(el => el.remove());
    
    // 为用户消息添加样式
    if (index === 0 || messageClone.classList.contains('dark:bg-gray-800')) {
      messageClone.style.cssText = 'background-color: #F7F7F8; padding: 12px; border-radius: 8px; margin-bottom: 12px;';
    }
    
    conversationContainer.appendChild(messageClone);
  });
  
  // 添加底部信息
  const cardFooter = document.createElement('div');
  cardFooter.className = 'flex justify-between items-center p-4 border-t border-gray-100';
  
  // 添加品牌信息
  const brandInfo = document.createElement('div');
  brandInfo.className = 'text-gray-500 text-xs';
  brandInfo.textContent = '流光卡片';
  
  // 添加二维码区域
  const qrCodeArea = document.createElement('div');
  qrCodeArea.className = 'flex items-center';
  
  const qrCodeText = document.createElement('div');
  qrCodeText.className = 'text-gray-500 text-xs mr-2';
  qrCodeText.textContent = '扫描二维码';
  
  // 添加二维码图片占位符
  const qrCodeImage = document.createElement('div');
  qrCodeImage.className = 'w-16 h-16 bg-gray-100 rounded flex items-center justify-center';
  qrCodeImage.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h7v7h-7z" />
    </svg>
  `;
  
  qrCodeArea.appendChild(qrCodeText);
  qrCodeArea.appendChild(qrCodeImage);
  
  cardFooter.appendChild(brandInfo);
  cardFooter.appendChild(qrCodeArea);
  
  // 组装内容容器
  contentContainer.appendChild(cardHeader);
  contentContainer.appendChild(conversationContainer);
  contentContainer.appendChild(cardFooter);
  
  // 将内容容器添加到预览卡片
  previewCard.appendChild(contentContainer);
  
  // 添加底部保存按钮
  const bottomBar = document.createElement('div');
  bottomBar.className = 'flex justify-center mt-4';
  
  const saveButton = document.createElement('button');
  saveButton.className = 'save-button flex items-center gap-2 px-5 py-2 rounded-md';
  saveButton.style.cssText = 'background: #3B82F6; color: white; border: none; font-weight: 500; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);';
  saveButton.innerHTML = `
    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    保存为图片
  `;
  
  // 应用主题函数
  function applyTheme(theme) {
    previewCard.style.backgroundColor = theme.color;
  }
  
  // 添加保存按钮点击事件
  saveButton.addEventListener('click', () => {
    // 添加加载状态
    saveButton.disabled = true;
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = `
      <svg class="animate-spin" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
      </svg>
      正在生成...
    `;
    
    // 使用html2canvas将内容转换为图片
    html2canvas(previewCard, {
      allowTaint: true,
      useCORS: true,
      scale: 2, // 提高分辨率
      backgroundColor: null // 允许透明背景
    }).then(canvas => {
    const link = document.createElement('a');
      link.download = 'deepshare-conversation-' + new Date().toISOString().replace(/:/g, '-') + '.png';
      link.href = canvas.toDataURL('image/png');
    link.click();
      
      // 恢复按钮状态
      saveButton.disabled = false;
      saveButton.innerHTML = originalText;
      
      showNotification('图片已保存');
    }).catch(error => {
      console.error('生成图片失败:', error);
      
      // 恢复按钮状态
      saveButton.disabled = false;
      saveButton.innerHTML = originalText;
      
      showNotification('生成图片失败，请重试');
    });
  });
  
  bottomBar.appendChild(saveButton);
  
  // 组装内容区域
  contentArea.appendChild(previewCard);
  contentArea.appendChild(bottomBar);
  
  // 组装整个预览卡片
  sharePreviewCard.appendChild(topBar);
  sharePreviewCard.appendChild(contentArea);
  
  // 将卡片添加到容器
  sharePreviewContainer.appendChild(sharePreviewCard);
  
  // 将预览添加到页面
  document.body.appendChild(sharePreviewContainer);
  
  // 添加点击空白处关闭的功能
  sharePreviewContainer.addEventListener('click', (e) => {
    if (e.target === sharePreviewContainer) {
      document.body.removeChild(sharePreviewContainer);
    }
  });
  
  // 添加键盘ESC关闭
  const escKeyHandler = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(sharePreviewContainer);
      document.removeEventListener('keydown', escKeyHandler);
    }
  };
  document.addEventListener('keydown', escKeyHandler);
}

// 复制对话链接
async function copyConversationLink() {
  try {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    showNotification('链接已复制到剪贴板');
    return true;
  } catch (error) {
    console.error('复制链接失败:', error);
    showNotification('复制链接失败');
    return false;
  }
}

// 复制对话文本
async function copyConversationText() {
  try {
    // 找到当前对话容器
    const conversationContainer = document.querySelector('.edb250b1')?.closest('.dad65929') || 
                                 document.querySelector('.ds-markdown--block')?.closest('.dad65929');
    
    if (!conversationContainer) {
      throw new Error('无法找到对话容器');
    }
    
    const userQuestion = conversationContainer.querySelector('.fbb737a4')?.textContent || '未找到问题';
    
    // 获取思考过程
    const thinkingProcess = conversationContainer.querySelector('.a6d716f5')?.textContent || '';
    
    // 获取AI回答
    const aiResponse = conversationContainer.querySelector('.edb250b1')?.textContent || 
                      conversationContainer.querySelector('.ds-markdown--block')?.textContent || 
                      '未找到回答';
    
    let textToCopy = `问题：${userQuestion}\n\n`;
    
    if (thinkingProcess) {
      textToCopy += `思考过程：${thinkingProcess}\n\n`;
    }
    
    textToCopy += `回答：${aiResponse}\n\n`;
    textToCopy += `来自 DeepSeek AI - ${window.location.href}`;
    
    await navigator.clipboard.writeText(textToCopy);
    showNotification('文本已复制到剪贴板');
    return true;
  } catch (error) {
    console.error('复制文本失败:', error);
    showNotification('复制文本失败');
    return false;
  }
}

// 截图对话（为兼容性保留）
async function captureConversation() {
  try {
    // 查找对话容器
    const conversationContainer = document.querySelector('.edb250b1')?.closest('.dad65929') || 
                                 document.querySelector('.ds-markdown--block')?.closest('.dad65929');
    
    if (!conversationContainer) {
      throw new Error('无法找到对话容器');
    }
    
    // 将所有消息转换为数组
    const allMessages = Array.from(document.querySelectorAll('.message.flex'));
    // 找到包含当前容器的消息
    const currentMessageIndex = allMessages.findIndex(msg => conversationContainer.contains(msg));
    
    if (currentMessageIndex === -1) {
      throw new Error('无法确定当前消息位置');
    }
    
    // 找到相关对话
    const conversation = findConversation(currentMessageIndex, allMessages);
    
    // 显示预览
    renderSharePreview(conversation);
    return true;
  } catch (error) {
    console.error('截图失败:', error);
    showNotification('截图失败');
    return false;
  }
} 