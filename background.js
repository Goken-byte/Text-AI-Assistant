console.log('Background script loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, creating context menus...');
  
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'textAIAssistant',
      title: 'Text AI Assistant',
      contexts: ['selection']
    });

    const menuItems = [
      { id: 'summarize', title: '📝 Summarize' },
      { id: 'rewrite', title: '✏️ Rewrite' },
      { id: 'proofread', title: '🔍 Proofread' }
    ];

    menuItems.forEach(item => {
      chrome.contextMenus.create({
        id: item.id,
        parentId: 'textAIAssistant',
        title: item.title,
        contexts: ['selection']
      });
    });

    chrome.contextMenus.create({
      id: 'translate',
      parentId: 'textAIAssistant',
      title: '🌍 Translate to...',
      contexts: ['selection']
    });

    const languages = [
      { id: 'arabic', title: 'العربية (Arabic)' },
      { id: 'spanish', title: 'Español (Spanish)' },
      { id: 'french', title: 'Français (French)' },
      { id: 'german', title: 'Deutsch (German)' },
      { id: 'chinese', title: '中文 (Chinese)' },
      { id: 'japanese', title: '日本語 (Japanese)' },
      { id: 'russian', title: 'Русский (Russian)' },
      { id: 'portuguese', title: 'Português (Portuguese)' },
      { id: 'hindi', title: 'हिन्दी (Hindi)' },
      { id: 'italian', title: 'Italiano (Italian)' }
    ];

    languages.forEach(lang => {
      chrome.contextMenus.create({
        id: `translate_${lang.id}`,
        parentId: 'translate',
        title: lang.title,
        contexts: ['selection']
      });
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;
  
  if (!selectedText || selectedText.trim().length === 0) {
    return;
  }

  let action = info.menuItemId;
  let language = null;

  if (action.startsWith('translate_')) {
    language = action.replace('translate_', '');
    action = 'translate';
  }

  chrome.storage.local.set({
    pendingAction: {
      text: selectedText,
      action: action,
      language: language
    }
  }, () => {
    chrome.action.openPopup();
  });
});