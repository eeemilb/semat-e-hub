// Telegram Web App initialization with error handling
console.log('[SEMAT E-HUB] Initializing...');
console.log('[SEMAT E-HUB] Telegram WebApp available:', typeof window.Telegram !== 'undefined');
console.log('[SEMAT E-HUB] window.Telegram:', window.Telegram);

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

if (tg) {
    console.log('[SEMAT E-HUB] Telegram WebApp found, expanding...');
    tg.expand();
    tg.ready();
    console.log('[SEMAT E-HUB] Telegram WebApp ready');
} else {
    console.warn('[SEMAT E-HUB] Telegram WebApp not available - running in demo mode');
}

// Admin configuration
let ADMIN_USERNAMES = ['eee_h1']; // Will be loaded from Google Sheets Admin sheet

// Google Sheets configuration (HARDCODED - from user)
let googleSheetsConfig = {
    apiUrl: 'https://script.google.com/macros/s/AKfycbwuPmPJVrdxrGkh5kMwRNDPjDZiX5o9wNRON3sjMPRx1CZyelDrs82CogWTpd8-CyJXWg/exec',
    sheetId: '1-aHLLs29YAM0CzuVZUXDKcj0sJp5O9Nrwojv-G-LGfI',
    connected: false,
    lastSync: null
};

console.log('[SEMAT E-HUB] Configuration loaded:');
console.log('[SEMAT E-HUB] API URL:', googleSheetsConfig.apiUrl);
console.log('[SEMAT E-HUB] Sheet ID:', googleSheetsConfig.sheetId);

// Apps Script code template
const APPS_SCRIPT_TEMPLATE = `// Google Apps Script для интеграции с Telegram Mini App
const SHEET_ID = "1-aHLLs29YAM0CzuVZUXDKcj0sJp5O9Nrwojv-G-LGfI";

function doGet(e) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const result = {
    boards: [],
    schemas: [],
    messages: [],
    admins: []
  };
  
  try {
    // Получить Платы
    const boardsSheet = spreadsheet.getSheetByName("Платы");
    if (boardsSheet) {
      const data = boardsSheet.getDataRange().getValues();
      result.boards = data.slice(1).filter(function(row) { return row[0]; }).map(function(row) {
        return {
          id: row[0],
          title: row[1],
          url: row[2],
          description: row[3] || '',
          emoji: row[4] || '🔌'
        };
      });
    }
    
    // Получить Схемы
    const schemasSheet = spreadsheet.getSheetByName("Схемы");
    if (schemasSheet) {
      const data = schemasSheet.getDataRange().getValues();
      result.schemas = data.slice(1).filter(function(row) { return row[0]; }).map(function(row) {
        return {
          id: row[0],
          title: row[1],
          url: row[2],
          description: row[3] || '',
          emoji: row[4] || '📊'
        };
      });
    }
    
    // Получить Сообщения
    const messagesSheet = spreadsheet.getSheetByName("Сообщения");
    if (messagesSheet) {
      const data = messagesSheet.getDataRange().getValues();
      result.messages = data.slice(1).filter(function(row) { return row[0]; }).map(function(row) {
        return {
          id: row[0],
          timestamp: row[1],
          username: row[2],
          displayName: row[3],
          message: row[4],
          avatarUrl: row[5] || '',
          isAdmin: row[6] === 'true'
        };
      });
    }
    
    // Получить Admin
    const adminSheet = spreadsheet.getSheetByName("Admin");
    if (adminSheet) {
      const data = adminSheet.getDataRange().getValues();
      result.admins = data.slice(1).filter(function(row) { return row[0] && row[2] === true; }).map(function(row) {
        return {
          username: row[0],
          permissions: row[1] || 'full',
          active: row[2] === true,
          notes: row[3] || ''
        };
      });
    }
  } catch (e) {
    Logger.log("Error: " + e);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    
    if (data.action === "addLink") {
      const sheetName = data.category === "boards" ? "Платы" : "Схемы";
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error("Лист '" + sheetName + "' не найден");
      }
      sheet.appendRow([
        data.item.id,
        data.item.title,
        data.item.url,
        data.item.description || "",
        data.item.emoji || "📌"
      ]);
    } 
    else if (data.action === "updateLink") {
      const sheetName = data.category === "boards" ? "Платы" : "Схемы";
      const sheet = spreadsheet.getSheetByName(sheetName);
      const range = sheet.getDataRange();
      const values = range.getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] == data.item.id) {
          sheet.getRange(i + 1, 2, 1, 4).setValues([[
            data.item.title,
            data.item.url,
            data.item.description || "",
            data.item.emoji || "📌"
          ]]);
          break;
        }
      }
    }
    else if (data.action === "deleteLink") {
      const sheetName = data.category === "boards" ? "Платы" : "Схемы";
      const sheet = spreadsheet.getSheetByName(sheetName);
      const range = sheet.getDataRange();
      const values = range.getValues();
      for (let i = values.length - 1; i > 0; i--) {
        if (values[i][0] == data.itemId) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
    }
    else if (data.action === "addMessage") {
      const sheet = spreadsheet.getSheetByName("Сообщения");
      if (!sheet) {
        throw new Error("Лист 'Сообщения' не найден");
      }
      sheet.appendRow([
        data.message.id,
        data.message.timestamp,
        data.message.username,
        data.message.displayName,
        data.message.message,
        data.message.avatarUrl || "",
        data.message.isAdmin ? 'true' : 'false'
      ]);
    }
    else if (data.action === "deleteMessage") {
      const sheet = spreadsheet.getSheetByName("Сообщения");
      const range = sheet.getDataRange();
      const values = range.getValues();
      for (let i = values.length - 1; i > 0; i--) {
        if (values[i][0] == data.messageId) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
    }
    else if (data.action === "clearMessages") {
      const sheet = spreadsheet.getSheetByName("Сообщения");
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
    }
    else if (data.action === "addAdmin") {
      const sheet = spreadsheet.getSheetByName("Admin");
      if (!sheet) {
        throw new Error("Лист 'Admin' не найден");
      }
      sheet.appendRow([
        data.admin.username,
        data.admin.permissions || 'full',
        true,
        data.admin.notes || ''
      ]);
    }
    else if (data.action === "removeAdmin") {
      const sheet = spreadsheet.getSheetByName("Admin");
      const range = sheet.getDataRange();
      const values = range.getValues();
      for (let i = values.length - 1; i > 0; i--) {
        if (values[i][0] === data.username) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: e.toString() 
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

// Current user state
let currentUser = {
    username: '',
    firstName: '',
    photoUrl: '',
    isAdmin: false
};

// Admin list (loaded from Google Sheets)
let adminList = [];

// Default data structure
const defaultData = {
    categories: [
        {
            id: 'boards',
            name: '🔌 Платы',
            emoji: '🔌',
            type: 'links',
            description: 'Ссылки на платы и PCB ресурсы'
        },
        {
            id: 'schemas',
            name: '📊 Схемы',
            emoji: '📊',
            type: 'links',
            description: 'Ссылки на электрические схемы'
        },
        {
            id: 'communication',
            name: '💬 Коммуникация',
            emoji: '💬',
            type: 'chat',
            description: 'Общий чат для обсуждения'
        }
    ],
    links: [
        {
            id: 1,
            title: 'STM32H7 Discovery Kit',
            url: 'https://www.st.com/en/evaluation-tools/h735i-dk.html',
            description: 'Отладочная плата с мощным микроконтроллером',
            emoji: '🔧',
            category: 'boards'
        },
        {
            id: 2,
            title: 'Arduino Mega 2560',
            url: 'https://www.arduino.cc/',
            description: 'Популярная платформа для прототипирования',
            emoji: '⚙️',
            category: 'boards'
        },
        {
            id: 3,
            title: 'Raspberry Pi 4',
            url: 'https://www.raspberrypi.org/',
            description: 'Мини-компьютер для сложных проектов',
            emoji: '💻',
            category: 'boards'
        },
        {
            id: 4,
            title: 'Модуль детектирования пробоя',
            url: 'https://eeemilb.github.io/webp/',
            description: 'Контролирует напряжение пробоя между электродом и деталью, когда напряжение пробоя падает до установленного нами уровня на микроконтроллер платы генератора подаётся логический сигнал, после чего открываются рабочие ключи. По факту измеряет значение тока на шунте, когда оно появляется на вход микроконтроллера подаётся логический сигнал (0 или 1).',
            emoji: '⚡',
            category: 'boards'
        },
        {
            id: 5,
            title: 'Блок питания EDM',
            url: 'https://example.com/edm-psu',
            description: 'Высоковольтный источник питания для электроэрозии',
            emoji: '⚡',
            category: 'schemas'
        },
        {
            id: 6,
            title: 'Высокочастотный генератор',
            url: 'https://example.com/hfo',
            description: 'Генератор импульсов 100-200 кГц',
            emoji: '🌊',
            category: 'schemas'
        },
        {
            id: 7,
            title: 'Схема генератора импульсов',
            url: 'https://example.com/pulse',
            description: 'Полная схема с описанием компонентов',
            emoji: '📋',
            category: 'schemas'
        }
    ],
    messages: [
        {
            id: 1,
            username: 'eee_h1',
            displayName: 'Emil',
            avatarUrl: '',
            message: 'Добро пожаловать в канал! Здесь мы обсуждаем проекты EDM и электроэрозионную обработку',
            timestamp: Date.now(),
            isAdmin: true
        }
    ]
};

// App data (loaded from localStorage or default)
let appData = JSON.parse(JSON.stringify(defaultData));

// State management
let state = {
    currentCategory: 'boards',
    editMode: false,
    editingLinkId: null
};

// Load Google Sheets config
function loadConfig() {
    const saved = appData.config || {};
    googleSheetsConfig.apiUrl = saved.apiUrl || '';
    googleSheetsConfig.sheetId = saved.sheetId || '';
    googleSheetsConfig.connected = saved.connected || false;
    googleSheetsConfig.lastSync = saved.lastSync || null;
}

// Save Google Sheets config
function saveConfig() {
    appData.config = {
        apiUrl: googleSheetsConfig.apiUrl,
        sheetId: googleSheetsConfig.sheetId,
        connected: googleSheetsConfig.connected,
        lastSync: googleSheetsConfig.lastSync
    };
    console.log('Config saved');
}

// Update connection status UI
function updateConnectionStatus(status, message) {
    const statusEl = document.getElementById('connectionStatus');
    const iconEl = document.getElementById('connectionIcon');
    const textEl = document.getElementById('connectionText');
    
    if (!statusEl) return;
    
    statusEl.className = 'connection-status ' + status;
    statusEl.style.display = 'flex';
    
    if (status === 'connected') {
        iconEl.textContent = '✅';
        textEl.textContent = message || 'Подключено';
    } else if (status === 'syncing') {
        iconEl.textContent = '🔄';
        textEl.textContent = message || 'Синхронизация...';
    } else {
        iconEl.textContent = '⚠️';
        textEl.textContent = message || 'Не подключено';
    }
}

// Test Google Sheets connection
async function testConnection() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const sheetId = document.getElementById('sheetId').value.trim();
    const statusEl = document.getElementById('connectionStatusIndicator');
    const statusText = document.getElementById('connectionStatusText');
    
    if (!apiUrl || !sheetId) {
        statusEl.className = 'status-indicator error';
        statusText.textContent = '❌ Заполните оба поля';
        return false;
    }
    
    statusEl.className = 'status-indicator info';
    statusText.textContent = '🔄 Проверка подключения...';
    
    try {
        const response = await fetch(apiUrl + '?test=1', {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        
        const data = await response.json();
        
        statusEl.className = 'status-indicator success';
        statusText.textContent = '✅ Подключение успешно! Найдено: ' + 
            (data.boards ? data.boards.length : 0) + ' плат, ' + 
            (data.schemas ? data.schemas.length : 0) + ' схем, ' + 
            (data.messages ? data.messages.length : 0) + ' сообщений';
        
        return true;
    } catch (error) {
        console.error('Connection test failed:', error);
        statusEl.className = 'status-indicator error';
        statusText.textContent = '❌ Ошибка подключения: ' + error.message + 
            '\n\nПроверьте:\n1. URL Apps Script правильный\n2. Приложение опубликовано как веб-приложение\n3. Доступ установлен на "Все"';
        return false;
    }
}

// Load data from Google Sheets
async function loadDataFromSheets() {
    console.log('[SEMAT E-HUB] Loading data from Google Sheets...');
    console.log('[SEMAT E-HUB] API URL:', googleSheetsConfig.apiUrl);
    
    if (!googleSheetsConfig.apiUrl) {
        console.error('[SEMAT E-HUB] ERROR: Google Sheets not configured');
        updateConnectionStatus('disconnected', '❌ Нет настроек подключения');
        return false;
    }
    
    updateConnectionStatus('syncing', '🔄 Подключение к Google Sheets...');
    
    try {
        console.log('[SEMAT E-HUB] Fetching data from:', googleSheetsConfig.apiUrl);
        console.log('[SEMAT E-HUB] Making GET request...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(function() { controller.abort(); }, 15000); // 15 second timeout
        
        const response = await fetch(googleSheetsConfig.apiUrl, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('[SEMAT E-HUB] Response received!');
        console.log('[SEMAT E-HUB] Response status:', response.status, response.statusText);
        console.log('[SEMAT E-HUB] Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SEMAT E-HUB] Error response body:', errorText);
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        
        const data = await response.json();
        
        console.log('[SEMAT E-HUB] API Response:', data);
        console.log('[SEMAT E-HUB] Boards:', data.boards ? data.boards.length : 0);
        console.log('[SEMAT E-HUB] Schemas:', data.schemas ? data.schemas.length : 0);
        console.log('[SEMAT E-HUB] Messages:', data.messages ? data.messages.length : 0);
        console.log('[SEMAT E-HUB] Admins:', data.admins ? data.admins.length : 0);
        
        // Update links
        if (data.boards) {
            appData.links = appData.links.filter(function(l) { return l.category !== 'boards'; });
            data.boards.forEach(function(board) {
                appData.links.push({
                    id: board.id,
                    title: board.title,
                    url: board.url,
                    description: board.description || '',
                    emoji: board.emoji || '🔌',
                    category: 'boards'
                });
            });
        }
        
        if (data.schemas) {
            appData.links = appData.links.filter(function(l) { return l.category !== 'schemas'; });
            data.schemas.forEach(function(schema) {
                appData.links.push({
                    id: schema.id,
                    title: schema.title,
                    url: schema.url,
                    description: schema.description || '',
                    emoji: schema.emoji || '📊',
                    category: 'schemas'
                });
            });
        }
        
        // Update messages
        if (data.messages) {
            appData.messages = data.messages.map(function(msg) {
                return {
                    id: msg.id,
                    timestamp: msg.timestamp,
                    username: msg.username,
                    displayName: msg.displayName,
                    message: msg.message,
                    avatarUrl: msg.avatarUrl || '',
                    isAdmin: msg.isAdmin
                };
            });
        }
        
        // Update admin list
        if (data.admins) {
            adminList = data.admins.map(function(admin) {
                return admin.username;
            });
            ADMIN_USERNAMES = adminList.length > 0 ? adminList : ['eee_h1'];
            
            // Re-check if current user is admin
            if (currentUser.username) {
                currentUser.isAdmin = ADMIN_USERNAMES.includes(currentUser.username);
            }
        }
        
        googleSheetsConfig.connected = true;
        googleSheetsConfig.lastSync = Date.now();
        saveConfig();
        
        console.log('[SEMAT E-HUB] ✅ Data loaded successfully!');
        console.log('[SEMAT E-HUB] Total links:', appData.links.length);
        console.log('[SEMAT E-HUB] Total messages:', appData.messages.length);
        console.log('[SEMAT E-HUB] Admin list:', ADMIN_USERNAMES);
        
        updateConnectionStatus('connected', '✅ Подключено');
        renderContent();
        updateDebugInfo();
        
        setTimeout(function() {
            updateConnectionStatus('connected', 'Подключено к Google Sheets');
        }, 2000);
        
        return true;
    } catch (error) {
        console.error('[SEMAT E-HUB] ❌ ERROR loading from Google Sheets:', error);
        console.error('[SEMAT E-HUB] Error type:', error.name);
        console.error('[SEMAT E-HUB] Error details:', error.message);
        console.error('[SEMAT E-HUB] Error stack:', error.stack);
        
        let userMessage = 'Ошибка загрузки';
        
        if (error.name === 'AbortError') {
            userMessage = 'Таймаут подключения';
            console.error('[SEMAT E-HUB] Request timed out after 15 seconds');
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            userMessage = 'Ошибка сети';
            console.error('[SEMAT E-HUB] Network error - check internet connection');
        } else if (error.message.includes('CORS')) {
            userMessage = 'Ошибка CORS';
            console.error('[SEMAT E-HUB] CORS error - check Apps Script deployment');
        } else {
            userMessage = error.message;
        }
        
        googleSheetsConfig.connected = false;
        saveConfig();
        
        const errorMsg = '❌ ' + userMessage;
        updateConnectionStatus('disconnected', errorMsg);
        
        console.log('[SEMAT E-HUB] ----------------------------------------');
        console.log('[SEMAT E-HUB] Troubleshooting tips:');
        console.log('[SEMAT E-HUB] 1. Check API URL:', googleSheetsConfig.apiUrl);
        console.log('[SEMAT E-HUB] 2. Verify Apps Script is deployed as web app');
        console.log('[SEMAT E-HUB] 3. Ensure "Execute as" is set to your account');
        console.log('[SEMAT E-HUB] 4. Check "Who has access" is set to "Anyone"');
        console.log('[SEMAT E-HUB] 5. Sheet ID:', googleSheetsConfig.sheetId);
        console.log('[SEMAT E-HUB] ----------------------------------------');
        
        // Show retry button
        showRetryButton();
        
        // Still render content with default data
        console.log('[SEMAT E-HUB] Rendering with default data...');
        renderContent();
        updateDebugInfo();
        
        return false;
    }
}

// Save to Google Sheets
async function saveToSheets(action, category, data) {
    if (!googleSheetsConfig.apiUrl) {
        console.log('Google Sheets not configured, data saved locally only');
        return false;
    }
    
    updateConnectionStatus('syncing', 'Сохранение...');
    
    try {
        const payload = {
            action: action,
            category: category
        };
        
        if (action === 'addLink' || action === 'updateLink') {
            payload.item = data;
        } else if (action === 'deleteLink') {
            payload.itemId = data;
        } else if (action === 'addMessage') {
            payload.message = data;
        } else if (action === 'deleteMessage') {
            payload.messageId = data;
        }
        
        const response = await fetch(googleSheetsConfig.apiUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error');
        }
        
        // Reload data to ensure sync
        await loadDataFromSheets();
        
        return true;
    } catch (error) {
        console.error('Failed to save to Google Sheets:', error);
        updateConnectionStatus('disconnected', 'Ошибка сохранения');
        return false;
    }
}

// Save data to memory (and Google Sheets if configured)
async function saveData() {
    console.log('Data saved to memory');
}

// Open settings modal
function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const apiUrlInput = document.getElementById('apiUrl');
    const sheetIdInput = document.getElementById('sheetId');
    const statusEl = document.getElementById('connectionStatusIndicator');
    const statusText = document.getElementById('connectionStatusText');
    
    apiUrlInput.value = googleSheetsConfig.apiUrl || '';
    sheetIdInput.value = googleSheetsConfig.sheetId || '';
    
    if (googleSheetsConfig.connected) {
        statusEl.className = 'status-indicator success';
        const lastSync = googleSheetsConfig.lastSync ? new Date(googleSheetsConfig.lastSync).toLocaleString('ru-RU') : 'никогда';
        statusText.textContent = '✅ Подключено к Google Sheets\nПоследняя синхронизация: ' + lastSync;
    } else {
        statusEl.className = 'status-indicator info';
        statusText.textContent = 'Введите данные подключения';
    }
    
    modal.classList.add('active');
}

// Close settings modal
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('active');
}

// Save settings
async function saveSettings() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const sheetId = document.getElementById('sheetId').value.trim();
    
    if (!apiUrl || !sheetId) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    googleSheetsConfig.apiUrl = apiUrl;
    googleSheetsConfig.sheetId = sheetId;
    saveConfig();
    
    const success = await testConnection();
    if (success) {
        await loadDataFromSheets();
        setTimeout(closeSettingsModal, 1500);
    }
}

// Force sync
async function forceSync() {
    if (!googleSheetsConfig.apiUrl) {
        alert('Сначала настройте подключение к Google Sheets');
        return;
    }
    
    const success = await loadDataFromSheets();
    if (success) {
        alert('✅ Синхронизация завершена!');
    } else {
        alert('❌ Ошибка синхронизации. Проверьте настройки подключения.');
    }
}

// Copy Apps Script code
function copyAppsScript() {
    const code = APPS_SCRIPT_TEMPLATE.replace('PASTE_YOUR_SHEET_ID_HERE', googleSheetsConfig.sheetId || 'YOUR_SHEET_ID');
    
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        alert('✅ Код скопирован в буфер обмена!\n\nТеперь:\n1. Откройте вашу Google Таблицу\n2. Расширения → Apps Script\n3. Вставьте скопированный код\n4. Нажмите "Развернуть" → "Новое развертывание"\n5. Тип: Веб-приложение\n6. Доступ: Все\n7. Скопируйте URL развертывания');
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Не удалось скопировать. Код выведен в консоль.');
        console.log(code);
    }
    
    document.body.removeChild(textarea);
}

// Initialize Telegram user profile
function initTelegramUser() {
    console.log('[SEMAT E-HUB] Initializing Telegram user...');
    
    const user = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
    console.log('[SEMAT E-HUB] Telegram user data:', user);
    
    if (user) {
        currentUser.username = user.username || '';
        currentUser.firstName = user.first_name || 'Пользователь';
        currentUser.photoUrl = user.photo_url || '';
        currentUser.isAdmin = ADMIN_USERNAMES.includes(currentUser.username);
        
        const userName = document.getElementById('userName');
        const userUsername = document.getElementById('userUsername');
        const userAvatar = document.getElementById('userAvatar');
        const userInfo = document.querySelector('.user-info');
        
        userName.textContent = currentUser.firstName;
        userUsername.textContent = currentUser.username ? '@' + currentUser.username : '';
        
        if (currentUser.photoUrl) {
            userAvatar.innerHTML = '<img src="' + currentUser.photoUrl + '" alt="' + currentUser.firstName + '">';
        } else {
            userAvatar.textContent = currentUser.firstName.charAt(0).toUpperCase();
        }
        
        if (currentUser.isAdmin) {
            const badge = document.createElement('div');
            badge.className = 'admin-badge';
            badge.textContent = 'Администратор';
            userInfo.appendChild(badge);
            
            document.getElementById('actionBar').style.display = 'flex';
            document.getElementById('settingsBtn').style.display = 'flex';
            document.getElementById('connectionStatus').style.display = 'flex';
        }
    } else {
        console.warn('[SEMAT E-HUB] No Telegram user data available - using demo mode');
        currentUser.firstName = 'Демо режим';
        currentUser.username = 'demo_user';
        currentUser.isAdmin = true; // Enable admin for demo
        document.getElementById('userName').textContent = currentUser.firstName;
        document.getElementById('userUsername').textContent = '@demo';
        
        // Show demo mode indicator
        const userInfo = document.querySelector('.user-info');
        const badge = document.createElement('div');
        badge.className = 'admin-badge';
        badge.textContent = '📱 Демо';
        badge.style.background = 'rgba(255, 107, 53, 0.8)';
        userInfo.appendChild(badge);
        
        // Enable admin features for testing
        document.getElementById('actionBar').style.display = 'flex';
        document.getElementById('settingsBtn').style.display = 'flex';
        document.getElementById('connectionStatus').style.display = 'flex';
    }
    
    console.log('[SEMAT E-HUB] Current user:', currentUser);
}

// Render categories navigation
function renderCategories() {
    console.log('[SEMAT E-HUB] Rendering categories...');
    console.log('[SEMAT E-HUB] Categories count:', appData.categories.length);
    
    const categoriesNav = document.getElementById('categoriesNav');
    if (!categoriesNav) {
        console.error('[SEMAT E-HUB] ERROR: categoriesNav element not found!');
        return;
    }
    
    categoriesNav.innerHTML = appData.categories.map(function(cat) {
        const activeClass = state.currentCategory === cat.id ? 'active' : '';
        return '<button class="category-btn ' + activeClass + '" data-category="' + cat.id + '"><span>' + cat.emoji + '</span><span>' + cat.name + '</span></button>';
    }).join('');
    
    categoriesNav.querySelectorAll('.category-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            state.currentCategory = btn.dataset.category;
            state.editMode = false;
            renderContent();
        });
    });
}

// Render content based on category type
function renderContent() {
    console.log('[SEMAT E-HUB] Rendering content for category:', state.currentCategory);
    console.log('[SEMAT E-HUB] Total categories:', appData.categories.length);
    console.log('[SEMAT E-HUB] Total links:', appData.links.length);
    
    const category = appData.categories.find(function(cat) { return cat.id === state.currentCategory; });
    if (!category) {
        console.error('[SEMAT E-HUB] ERROR: Category not found:', state.currentCategory);
        console.error('[SEMAT E-HUB] Available categories:', appData.categories.map(function(c) { return c.id; }));
        return;
    }
    
    console.log('[SEMAT E-HUB] Rendering category:', category.name, '(type:', category.type, ')');
    const linksSection = document.getElementById('linksSection');
    const chatSection = document.getElementById('chatSection');
    const addBtn = document.getElementById('addLinkBtn');
    const manageBtn = document.getElementById('manageBtn');
    
    if (category.type === 'chat') {
        linksSection.style.display = 'none';
        chatSection.style.display = 'flex';
        if (currentUser.isAdmin) {
            addBtn.style.display = 'none';
            manageBtn.innerHTML = '<span>🗑️</span><span>Очистить чат</span>';
        }
        renderChat();
    } else {
        linksSection.style.display = 'block';
        chatSection.style.display = 'none';
        if (currentUser.isAdmin) {
            addBtn.style.display = 'flex';
            const btnText = state.editMode ? 'Готово' : 'Редактировать';
            manageBtn.innerHTML = '<span>✏️</span><span id="manageBtnText">' + btnText + '</span>';
        }
        renderSectionHeader();
        renderLinks();
    }
    
    renderCategories();
}

// Render section header
function renderSectionHeader() {
    console.log('[SEMAT E-HUB] Rendering section header for:', state.currentCategory);
    
    const sectionHeader = document.getElementById('sectionHeader');
    if (!sectionHeader) {
        console.error('[SEMAT E-HUB] ERROR: sectionHeader element not found!');
        return;
    }
    
    const category = appData.categories.find(function(cat) { return cat.id === state.currentCategory; });
    if (!category) {
        console.error('[SEMAT E-HUB] ERROR: Category not found:', state.currentCategory);
        return;
    }
    const links = getFilteredLinks();
    const linkText = links.length === 1 ? 'ссылка' : 'ссылок';
    
    sectionHeader.innerHTML = '<span class="section-icon">' + category.emoji + '</span><h2 class="section-title">' + category.name + '</h2><span class="section-count">' + links.length + ' ' + linkText + '</span>';
}

// Get filtered links
function getFilteredLinks() {
    return appData.links.filter(function(link) { return link.category === state.currentCategory; });
}

// Render links
function renderLinks() {
    console.log('[SEMAT E-HUB] Rendering links for category:', state.currentCategory);
    
    const linksGrid = document.getElementById('linksGrid');
    if (!linksGrid) {
        console.error('[SEMAT E-HUB] ERROR: linksGrid element not found!');
        return;
    }
    
    const links = getFilteredLinks();
    console.log('[SEMAT E-HUB] Links to render:', links.length);
    
    if (links.length === 0) {
        linksGrid.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">В этой категории пока нет ссылок</div></div>';
        return;
    }
    
    linksGrid.innerHTML = links.map(function(link) {
        const actionsVisible = state.editMode && currentUser.isAdmin ? 'visible' : '';
        return '<div class="link-card" data-link-id="' + link.id + '"><div class="link-header"><div class="link-emoji">' + link.emoji + '</div><div class="link-info"><div class="link-title">' + link.title + '</div><div class="link-description">' + link.description + '</div><div class="link-url">' + link.url + '</div></div></div><div class="link-actions ' + actionsVisible + '"><button class="link-action-btn link-edit-btn" data-action="edit">✏️ Изменить</button><button class="link-action-btn link-delete-btn" data-action="delete">🗑️ Удалить</button></div></div>';
    }).join('');
    
    linksGrid.querySelectorAll('.link-card').forEach(function(card) {
        const linkId = parseInt(card.dataset.linkId);
        const link = appData.links.find(function(l) { return l.id === linkId; });
        
        card.addEventListener('click', function(e) {
            if (e.target.closest('.link-action-btn')) return;
            if (!state.editMode) {
                window.open(link.url, '_blank');
            }
        });
        
        const editBtn = card.querySelector('[data-action="edit"]');
        if (editBtn) {
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                openEditModal(linkId);
            });
        }
        
        const deleteBtn = card.querySelector('[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteLink(linkId);
            });
        }
    });
}

// Render chat messages
function renderChat() {
    const chatMessages = document.getElementById('chatMessages');
    
    if (appData.messages.length === 0) {
        chatMessages.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-text">Сообщений пока нет. Напишите первым!</div></div>';
        return;
    }
    
    chatMessages.innerHTML = appData.messages.map(function(msg) {
        const date = new Date(msg.timestamp);
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        const avatarContent = msg.avatarUrl ? '<img src="' + msg.avatarUrl + '" alt="' + msg.displayName + '">' : (msg.displayName ? msg.displayName.charAt(0).toUpperCase() : '👤');
        const deleteBtn = (currentUser.isAdmin || msg.username === currentUser.username) ? '<button class="chat-delete-btn" data-msg-id="' + msg.id + '">Удалить</button>' : '';
        
        return '<div class="chat-message"><div class="chat-avatar">' + avatarContent + '</div><div class="chat-content"><div class="chat-header"><span class="chat-username">' + (msg.displayName || msg.username) + '</span><span class="chat-timestamp">' + dateStr + ' ' + timeStr + '</span>' + deleteBtn + '</div><div class="chat-text">' + escapeHtml(msg.message) + '</div></div></div>';
    }).join('');
    
    chatMessages.querySelectorAll('.chat-delete-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const msgId = parseInt(btn.dataset.msgId);
            deleteMessage(msgId);
        });
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send chat message
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const newMessage = {
        id: Date.now(),
        username: currentUser.username || 'guest',
        displayName: currentUser.firstName,
        avatarUrl: currentUser.photoUrl,
        message: message,
        timestamp: Date.now(),
        isAdmin: currentUser.isAdmin
    };
    
    appData.messages.push(newMessage);
    input.value = '';
    renderChat();
    
    await saveToSheets('addMessage', 'communication', newMessage);
}

// Delete message
async function deleteMessage(msgId) {
    if (confirm('Удалить это сообщение?')) {
        const index = appData.messages.findIndex(function(m) { return m.id === msgId; });
        if (index > -1) {
            appData.messages.splice(index, 1);
            renderChat();
            await saveToSheets('deleteMessage', 'communication', msgId);
        }
    }
}

// Clear all chat messages
async function clearChat() {
    if (confirm('Удалить все сообщения в чате? Это действие нельзя отменить.')) {
        appData.messages = [];
        renderChat();
        await saveToSheets('clearMessages', 'communication', null);
    }
}

// Toggle edit mode
function toggleEditMode() {
    if (!currentUser.isAdmin) return;
    
    const category = appData.categories.find(function(cat) { return cat.id === state.currentCategory; });
    
    if (category.type === 'chat') {
        clearChat();
    } else {
        state.editMode = !state.editMode;
        const manageBtnText = document.getElementById('manageBtnText');
        if (manageBtnText) {
            manageBtnText.textContent = state.editMode ? 'Готово' : 'Редактировать';
        }
        renderLinks();
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Open add link modal
function openAddModal() {
    if (!currentUser.isAdmin) return;
    
    state.editingLinkId = null;
    const modal = document.getElementById('linkModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('linkForm');
    
    modalTitle.textContent = 'Добавить ссылку';
    form.reset();
    
    // Set default emoji
    document.getElementById('linkEmoji').value = '🔗';
    
    const categorySelect = document.getElementById('linkCategory');
    categorySelect.innerHTML = appData.categories.filter(function(cat) { return cat.type === 'links'; }).map(function(cat) {
        const selected = cat.id === state.currentCategory ? 'selected' : '';
        return '<option value="' + cat.id + '" ' + selected + '>' + cat.emoji + ' ' + cat.name + '</option>';
    }).join('');
    
    setupEmojiPicker();
    modal.classList.add('active');
}

// Open edit link modal
function openEditModal(linkId) {
    if (!currentUser.isAdmin) return;
    
    state.editingLinkId = linkId;
    const link = appData.links.find(function(l) { return l.id === linkId; });
    if (!link) return;
    
    const modal = document.getElementById('linkModal');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Редактировать ссылку';
    
    document.getElementById('linkTitle').value = link.title;
    document.getElementById('linkUrl').value = link.url;
    document.getElementById('linkEmoji').value = link.emoji;
    document.getElementById('linkDescription').value = link.description || '';
    
    const categorySelect = document.getElementById('linkCategory');
    categorySelect.innerHTML = appData.categories.filter(function(cat) { return cat.type === 'links'; }).map(function(cat) {
        const selected = cat.id === link.category ? 'selected' : '';
        return '<option value="' + cat.id + '" ' + selected + '>' + cat.emoji + ' ' + cat.name + '</option>';
    }).join('');
    
    setupEmojiPicker();
    modal.classList.add('active');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('linkModal');
    modal.classList.remove('active');
    state.editingLinkId = null;
}

// Setup emoji picker
function setupEmojiPicker() {
    const emojiInput = document.getElementById('linkEmoji');
    const emojiPicker = document.getElementById('emojiPicker');
    
    // Clear previous selections
    emojiPicker.querySelectorAll('.emoji-option').forEach(function(opt) {
        opt.classList.remove('selected');
        if (opt.dataset.emoji === emojiInput.value) {
            opt.classList.add('selected');
        }
    });
    
    // Add click handlers
    emojiPicker.querySelectorAll('.emoji-option').forEach(function(option) {
        option.addEventListener('click', function() {
            const emoji = option.dataset.emoji;
            emojiInput.value = emoji;
            
            // Update selection
            emojiPicker.querySelectorAll('.emoji-option').forEach(function(opt) {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
        });
    });
}

// Save link
async function saveLink(e) {
    e.preventDefault();
    
    const title = document.getElementById('linkTitle').value;
    const url = document.getElementById('linkUrl').value;
    const category = document.getElementById('linkCategory').value;
    const emoji = document.getElementById('linkEmoji').value || '🔗';
    const description = document.getElementById('linkDescription').value;
    
    let linkData;
    let action;
    
    if (state.editingLinkId) {
        const link = appData.links.find(function(l) { return l.id === state.editingLinkId; });
        if (link) {
            link.title = title;
            link.url = url;
            link.category = category;
            link.emoji = emoji;
            link.description = description;
            linkData = link;
            action = 'updateLink';
        }
    } else {
        const newLink = {
            id: Date.now(),
            title: title,
            url: url,
            category: category,
            emoji: emoji,
            description: description
        };
        appData.links.push(newLink);
        linkData = newLink;
        action = 'addLink';
    }
    
    closeModal();
    renderContent();
    
    await saveToSheets(action, category, linkData);
}

// Delete link
async function deleteLink(linkId) {
    if (!currentUser.isAdmin) return;
    
    if (confirm('Вы уверены, что хотите удалить эту ссылку?')) {
        const link = appData.links.find(function(l) { return l.id === linkId; });
        if (!link) return;
        
        const category = link.category;
        const index = appData.links.findIndex(function(l) { return l.id === linkId; });
        if (index > -1) {
            appData.links.splice(index, 1);
            renderContent();
            await saveToSheets('deleteLink', category, linkId);
        }
    }
}

// Export data
function exportData() {
    if (!currentUser.isAdmin) return;
    
    const dataStr = JSON.stringify(appData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'edm_data_' + Date.now() + '.json';
    link.click();
    URL.revokeObjectURL(url);
    
    alert('Данные экспортированы!\n\nИнтеграция с Google Sheets:\n1. Создайте Google Таблицу\n2. Apps Script -> doPost(e)\n3. Добавьте URL в код');
}

// Show retry button on error
function showRetryButton() {
    console.log('[SEMAT E-HUB] Showing retry button...');
    
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) {
        console.error('[SEMAT E-HUB] ERROR: connectionStatus element not found!');
        return;
    }
    
    const existingBtn = statusEl.querySelector('.retry-btn');
    if (existingBtn) {
        console.log('[SEMAT E-HUB] Retry button already exists');
        return;
    }
    
    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn btn-primary retry-btn';
    retryBtn.style.marginLeft = '12px';
    retryBtn.style.padding = '6px 12px';
    retryBtn.style.fontSize = '12px';
    retryBtn.innerHTML = '🔄 Повторить';
    retryBtn.onclick = async function() {
        console.log('[SEMAT E-HUB] Retry button clicked!');
        retryBtn.remove();
        console.log('[SEMAT E-HUB] Retrying connection...');
        updateConnectionStatus('syncing', '🔄 Повторное подключение...');
        await loadDataFromSheets();
    };
    
    statusEl.appendChild(retryBtn);
    console.log('[SEMAT E-HUB] Retry button added');
}

// Initialize app
async function init() {
    console.log('[SEMAT E-HUB] Starting initialization...');
    
    initTelegramUser();
    loadConfig();
    
    // Auto-connect to Google Sheets (HARDCODED credentials)
    console.log('[SEMAT E-HUB] Testing connection to Google Sheets...');
    updateConnectionStatus('syncing', '🔄 Подключение к Google Sheets...');
    
    const success = await loadDataFromSheets();
    
    if (success) {
        console.log('[SEMAT E-HUB] ✅ Connection successful!');
        updateConnectionStatus('connected', '✅ Подключено к Google Sheets');
    } else {
        console.error('[SEMAT E-HUB] ❌ Connection failed!');
        updateConnectionStatus('disconnected', '⚠️ Ошибка подключения');
        // Still render content with default data
    }
    
    console.log('[SEMAT E-HUB] Rendering initial content...');
    renderContent();
    
    console.log('[SEMAT E-HUB] Initialization complete!');
    console.log('[SEMAT E-HUB] ========================================');
    console.log('[SEMAT E-HUB] App State Summary:');
    console.log('[SEMAT E-HUB] - Telegram:', tg ? 'Available' : 'Not available');
    console.log('[SEMAT E-HUB] - User:', currentUser.username || 'Demo');
    console.log('[SEMAT E-HUB] - Admin:', currentUser.isAdmin);
    console.log('[SEMAT E-HUB] - Connected:', googleSheetsConfig.connected);
    console.log('[SEMAT E-HUB] - Categories:', appData.categories.length);
    console.log('[SEMAT E-HUB] - Links:', appData.links.length);
    console.log('[SEMAT E-HUB] - Messages:', appData.messages.length);
    console.log('[SEMAT E-HUB] ========================================');
    
    // Show debug info for 5 seconds
    const debugInfo = document.getElementById('debugInfo');
    if (debugInfo) {
        updateDebugInfo();
        debugInfo.classList.add('visible');
        setTimeout(function() {
            debugInfo.classList.remove('visible');
        }, 5000);
    }
    
    document.getElementById('addLinkBtn').addEventListener('click', openAddModal);
    document.getElementById('manageBtn').addEventListener('click', toggleEditMode);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('linkForm').addEventListener('submit', saveLink);
    
    document.getElementById('chatSendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    document.getElementById('helpBtn').addEventListener('click', function() {
        alert('EDM Resources\n\nЭто приложение для управления ресурсами по электроэрозионной обработке.\n\n📚 Просматривайте ссылки на платы и схемы\n💬 Общайтесь в чате\n\nАдминистратор может:\n• Добавлять и редактировать ссылки\n• Управлять чатом\n• Экспортировать данные');
    });
    
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
    
    document.getElementById('settingsModalClose').addEventListener('click', closeSettingsModal);
    document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('forceSyncBtn').addEventListener('click', forceSync);
    document.getElementById('copyScriptBtn').addEventListener('click', copyAppsScript);
    
    document.getElementById('settingsModal').addEventListener('click', function(e) {
        if (e.target.id === 'settingsModal') {
            closeSettingsModal();
        }
    });
    
    document.getElementById('backBtn').addEventListener('click', function() {
        if (tg && tg.close) {
            tg.close();
        } else {
            console.log('[SEMAT E-HUB] Back button clicked - no Telegram close available');
            alert('Используйте кнопку назад в Telegram или закройте приложение');
        }
    });
    
    // Admin management
    document.getElementById('adminManageBtn').addEventListener('click', openAdminModal);
    document.getElementById('adminModalClose').addEventListener('click', closeAdminModal);
    document.getElementById('addAdminBtn').addEventListener('click', addAdmin);
    
    document.getElementById('adminModal').addEventListener('click', function(e) {
        if (e.target.id === 'adminModal') {
            closeAdminModal();
        }
    });
    
    document.getElementById('linkModal').addEventListener('click', function(e) {
        if (e.target.id === 'linkModal') {
            closeModal();
        }
    });
}

// Admin management functions
function openAdminModal() {
    if (!currentUser.isAdmin) return;
    
    const modal = document.getElementById('adminModal');
    renderAdminList();
    modal.classList.add('active');
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    modal.classList.remove('active');
}

function renderAdminList() {
    const adminListEl = document.getElementById('adminList');
    
    if (ADMIN_USERNAMES.length === 0) {
        adminListEl.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Администраторов пока нет</div></div>';
        return;
    }
    
    adminListEl.innerHTML = ADMIN_USERNAMES.map(function(username) {
        const isFounder = username === 'eee_h1';
        const canDelete = !isFounder;
        const deleteBtn = canDelete ? '<button class="link-action-btn link-delete-btn" data-username="' + username + '" style="margin-left: auto;">🗑️ Удалить</button>' : '<span style="margin-left: auto; font-size: 11px; color: var(--text-secondary);">Основатель</span>';
        
        return '<div class="link-card" style="display: flex; align-items: center; gap: 12px;"><div style="flex: 1;"><div class="link-title">@' + username + '</div><div class="link-description">' + (isFounder ? 'Основатель, полные права' : 'Администратор') + '</div></div>' + deleteBtn + '</div>';
    }).join('');
    
    adminListEl.querySelectorAll('.link-delete-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const username = btn.dataset.username;
            removeAdmin(username);
        });
    });
}

async function addAdmin() {
    const input = document.getElementById('newAdminUsername');
    const username = input.value.trim().replace('@', '');
    
    if (!username) {
        alert('Введите username');
        return;
    }
    
    if (ADMIN_USERNAMES.includes(username)) {
        alert('Этот пользователь уже администратор');
        return;
    }
    
    ADMIN_USERNAMES.push(username);
    input.value = '';
    renderAdminList();
    
    // Sync to Google Sheets
    await saveToSheets('addAdmin', 'admin', {
        username: username,
        permissions: 'full',
        notes: 'Добавлен через приложение'
    });
}

async function removeAdmin(username) {
    if (username === 'eee_h1') {
        alert('Нельзя удалить основателя');
        return;
    }
    
    if (confirm('Удалить @' + username + ' из администраторов?')) {
        const index = ADMIN_USERNAMES.indexOf(username);
        if (index > -1) {
            ADMIN_USERNAMES.splice(index, 1);
            renderAdminList();
            
            // Sync to Google Sheets
            await saveToSheets('removeAdmin', 'admin', username);
        }
    }
}

// Update debug display
function updateDebugInfo() {
    const debugContent = document.getElementById('debugContent');
    if (!debugContent) return;
    
    const info = {
        'Telegram Available': typeof window.Telegram !== 'undefined',
        'User': currentUser.username || 'N/A',
        'Admin': currentUser.isAdmin,
        'API URL': googleSheetsConfig.apiUrl ? 'Set' : 'Not set',
        'Sheet ID': googleSheetsConfig.sheetId ? 'Set' : 'Not set',
        'Connected': googleSheetsConfig.connected,
        'Categories': appData.categories.length,
        'Links': appData.links.length,
        'Messages': appData.messages.length,
        'Last Sync': googleSheetsConfig.lastSync ? new Date(googleSheetsConfig.lastSync).toLocaleTimeString() : 'Never'
    };
    
    debugContent.textContent = JSON.stringify(info, null, 2);
}

// Log app state periodically
setInterval(function() {
    console.log('[SEMAT E-HUB] Status check:');
    console.log('  - Connected:', googleSheetsConfig.connected);
    console.log('  - Current category:', state.currentCategory);
    console.log('  - Categories:', appData.categories.length);
    console.log('  - Links:', appData.links.length);
    console.log('  - User:', currentUser.username);
    updateDebugInfo();
}, 10000); // Every 10 seconds

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}