document.addEventListener('DOMContentLoaded', async function() {
  // Initialize the application
  await initApp();
});

async function initApp() {
  // Initialize all components
  await initApiKey();
  initActionCards();
  initEventListeners();
  initSettings();
  await checkPendingActions();
  
  console.log('Text AI Assistant initialized');
}

// API Key Management
async function initApiKey() {
  const apiKey = await getApiKey();
  const apiKeySetup = document.getElementById('apiKeySetup');
  const mainInterface = document.getElementById('mainInterface');
  
  if (!apiKey) {
    apiKeySetup.style.display = 'block';
    mainInterface.style.display = 'none';
  } else {
    apiKeySetup.style.display = 'none';
    mainInterface.style.display = 'block';
    document.getElementById('apiKeyDisplay').value = apiKey;
  }
}

// Action Cards
function initActionCards() {
  const actionCards = document.querySelectorAll('.action-card');
  const languageSection = document.getElementById('languageSection');
  
  actionCards.forEach(card => {
    card.addEventListener('click', () => {
      // Remove active class from all cards
      actionCards.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked card
      card.classList.add('active');
      
      // Show/hide language section
      const action = card.dataset.action;
      if (action === 'translate') {
        languageSection.style.display = 'block';
      } else {
        languageSection.style.display = 'none';
      }
      
      // Update process button text
      updateProcessButtonText(action);
    });
  });
  
  // Set default active card
  document.querySelector('[data-action="summarize"]').classList.add('active');
}

function updateProcessButtonText(action) {
  const btnText = document.querySelector('.btn-text');
  const actionTexts = {
    summarize: 'Summarize Text',
    rewrite: 'Rewrite Text',
    translate: 'Translate Text',
    proofread: 'Proofread Text'
  };
  
  btnText.textContent = actionTexts[action] || 'Process Text';
}

// Event Listeners
function initEventListeners() {
  // API Key setup
  document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
  document.getElementById('updateApiKey').addEventListener('click', updateApiKey);
  
  // Text actions
  document.getElementById('getSelectedText').addEventListener('click', getSelectedText);
  document.getElementById('clearText').addEventListener('click', clearText);
  document.getElementById('inputText').addEventListener('input', updateCharCount);
  
  // Process text
  document.getElementById('processText').addEventListener('click', processText);
  
  // Result actions
  document.getElementById('copyResult').addEventListener('click', copyResult);
  
  // Settings
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('clearAllData').addEventListener('click', clearAllData);
  document.querySelector('.close-modal').addEventListener('click', closeSettings);
  
  // Close modal when clicking outside
  document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') closeSettings();
  });
}

// Settings Management
function initSettings() {
  // Load saved settings
  loadSettings();
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get(['aiModel']);
  document.getElementById('modelSelect').value = settings.aiModel || 'deepseek/deepseek-chat-v3.1:free';
}

async function saveSettings() {
  const model = document.getElementById('modelSelect').value;
  await chrome.storage.sync.set({ aiModel: model });
}

// API Functions
async function getApiKey() {
  const result = await chrome.storage.sync.get(['openRouterApiKey']);
  return result.openRouterApiKey;
}

async function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (key) {
    await chrome.storage.sync.set({ openRouterApiKey: key });
    await initApiKey();
    showNotification('API key saved successfully!', 'success');
  } else {
    showNotification('Please enter an API key', 'error');
  }
}

async function updateApiKey() {
  const key = document.getElementById('apiKeyDisplay').value.trim();
  if (key) {
    await chrome.storage.sync.set({ openRouterApiKey: key });
    showNotification('API key updated successfully!', 'success');
  }
}

// Text Processing
async function processText() {
  const inputText = document.getElementById('inputText').value.trim();
  if (!inputText) {
    showNotification('Please enter some text to process', 'error');
    return;
  }

  const activeCard = document.querySelector('.action-card.active');
  if (!activeCard) {
    showNotification('Please select an action', 'error');
    return;
  }

  const action = activeCard.dataset.action;
  const language = action === 'translate' ? document.getElementById('targetLanguage').value : null;

  // Show loading state
  setLoadingState(true);

  try {
    const result = await processTextWithAI(inputText, action, language);
    showResult(result, inputText);
    showNotification('Text processed successfully!', 'success');
  } catch (error) {
    showResult(`Error: ${error.message}`, null, 'error');
    showNotification(`Error: ${error.message}`, 'error');
  } finally {
    setLoadingState(false);
  }
}

async function processTextWithAI(text, action, language) {
  const apiKey = await getApiKey();
  const model = document.getElementById('modelSelect').value;

  if (!apiKey) {
    throw new Error('API key not set');
  }

  const prompts = {
    summarize: `Please provide a concise and well-structured summary of the following text. Focus on the main points, key arguments, and essential information. Format the summary with clear paragraphs:\n\n"${text}"`,
    rewrite: `Please rewrite the following text to improve clarity, flow, readability, and overall quality while maintaining the original meaning and tone. Enhance the structure and make it more engaging:\n\n"${text}"`,
    translate: `Translate the following text to ${getLanguageName(language)}. Provide only the translation without any additional text, notes, or explanations. Maintain the original formatting and meaning:\n\n"${text}"`,
    proofread: `Please proofread and correct the following text. Fix all grammatical errors, spelling mistakes, punctuation issues, and improve sentence structure where needed. Provide only the corrected version:\n\n"${text}"`
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Text AI Assistant'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompts[action] }],
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

function getLanguageName(code) {
  const languages = {
    arabic: 'Arabic',
    spanish: 'Spanish',
    french: 'French',
    german: 'German',
    chinese: 'Chinese (Simplified)',
    japanese: 'Japanese',
    russian: 'Russian',
    portuguese: 'Portuguese',
    hindi: 'Hindi',
    italian: 'Italian'
  };
  return languages[code] || code;
}

// UI Functions
function setLoadingState(loading) {
  const btn = document.getElementById('processText');
  const btnText = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.loading-spinner');
  
  btn.disabled = loading;
  if (loading) {
    btnText.textContent = 'Processing...';
    spinner.style.display = 'block';
  } else {
    const activeCard = document.querySelector('.action-card.active');
    updateProcessButtonText(activeCard?.dataset.action);
    spinner.style.display = 'none';
  }
}

function showResult(content, originalText = null, type = 'success') {
  const resultSection = document.getElementById('resultSection');
  const resultDiv = document.getElementById('result');
  const statsDiv = document.getElementById('resultStats');
  
  resultDiv.textContent = content;
  resultDiv.className = `result-content ${type}`;
  
  // Calculate statistics
  if (originalText) {
    const originalChars = originalText.length;
    const resultChars = content.length;
    const reduction = originalChars > 0 ? Math.round((1 - resultChars / originalChars) * 100) : 0;
    
    statsDiv.innerHTML = `
      <span>Original: ${originalChars} chars</span>
      <span>Result: ${resultChars} chars</span>
      ${reduction > 0 ? `<span class="success">Reduced by ${reduction}%</span>` : ''}
    `;
  }
  
  resultSection.style.display = 'block';
  resultSection.scrollIntoView({ behavior: 'smooth' });
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${getNotificationIcon(type)}"></i>
    <span>${message}</span>
  `;
  
  // Add styles
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: getNotificationColor(type),
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: 'var(--shadow)',
    zIndex: '10000',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500'
  });
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function getNotificationIcon(type) {
  const icons = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };
  return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#64748b'
  };
  return colors[type] || '#64748b';
}

// Text Management
async function getSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
      if (chrome.runtime.lastError) {
        showNotification('Error: Could not get selected text', 'error');
        return;
      }
      
      if (response && response.text) {
        document.getElementById('inputText').value = response.text;
        updateCharCount();
        showNotification('Selected text loaded!', 'success');
      } else {
        showNotification('No text selected on the page', 'warning');
      }
    });
  } catch (error) {
    showNotification('Error getting selected text', 'error');
  }
}

function clearText() {
  document.getElementById('inputText').value = '';
  updateCharCount();
}

function updateCharCount() {
  const text = document.getElementById('inputText').value;
  const count = text.length;
  document.getElementById('charCount').textContent = `${count} characters`;
  
  // Update color based on length
  const charCount = document.getElementById('charCount');
  charCount.className = '';
  if (count > 1000) charCount.classList.add('success');
  if (count > 2000) charCount.classList.add('warning');
  if (count > 3000) charCount.classList.add('error');
}

// Result Management
async function copyResult() {
  const result = document.getElementById('result').textContent;
  try {
    await navigator.clipboard.writeText(result);
    showNotification('Result copied to clipboard!', 'success');
  } catch (error) {
    showNotification('Failed to copy result', 'error');
  }
}

// Settings Management
function openSettings() {
  document.getElementById('settingsModal').style.display = 'block';
}

function closeSettings() {
  document.getElementById('settingsModal').style.display = 'none';
  saveSettings();
}

async function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This will remove your API key and settings.')) {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    showNotification('All data cleared successfully', 'success');
    setTimeout(() => window.close(), 1000);
  }
}

// Pending Actions (from context menu)
async function checkPendingActions() {
  const result = await chrome.storage.local.get(['pendingAction']);
  if (result.pendingAction) {
    const { text, action, language } = result.pendingAction;
    
    // Set the input text
    document.getElementById('inputText').value = text;
    updateCharCount();
    
    // Activate the corresponding action card
    const actionCard = document.querySelector(`[data-action="${action}"]`);
    if (actionCard) {
      document.querySelectorAll('.action-card').forEach(card => card.classList.remove('active'));
      actionCard.classList.add('active');
      updateProcessButtonText(action);
      
      if (action === 'translate' && language) {
        document.getElementById('languageSection').style.display = 'block';
        document.getElementById('targetLanguage').value = language;
      }
    }
    
    // Clear the pending action
    await chrome.storage.local.remove(['pendingAction']);
    
    // Auto-process if text is available
    if (text.trim()) {
      setTimeout(() => processText(), 500);
    }
  }
}