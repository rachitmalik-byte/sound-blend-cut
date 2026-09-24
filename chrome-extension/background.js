// IXR Audio Studio - Background Service Worker (Manifest V3)

// ─────────────────────────────────────────────────────────────────
// INDEXEDDB STORAGE BRIDGE
// Stores downloaded Google Drive audio buffers so studio.html can load them
// ─────────────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('IXR_Extension_DB', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('drive_audios')) {
        db.createObjectStore('drive_audios', { keyPath: 'fileId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDriveAudio(fileId, fileName, arrayBuffer, mimeType = 'audio/mpeg') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drive_audios', 'readwrite');
    const store = tx.objectStore('drive_audios');
    store.put({
      fileId,
      name: fileName,
      buffer: arrayBuffer,
      mimeType,
      timestamp: Date.now()
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getDriveAudio(fileId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drive_audios', 'readonly');
    const store = tx.objectStore('drive_audios');
    const req = store.get(fileId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────
// GOOGLE DRIVE AUDIO DOWNLOADER
// Fetches the audio file using active Google session credentials
// ─────────────────────────────────────────────────────────────────
async function fetchGoogleDriveAudio(fileId) {
  const primaryUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  let res = await fetch(primaryUrl, {
    credentials: 'include',
    headers: {
      'Accept': '*/*'
    }
  });

  let contentType = res.headers.get('content-type') || '';

  // If Google Drive shows the large-file virus-scan confirmation HTML page, parse the confirm link
  if (contentType.includes('text/html')) {
    const htmlText = await res.text();
    // Look for confirm token or link
    const confirmMatch = htmlText.match(/confirm=([0-9a-zA-Z_-]+)/) || htmlText.match(/id="uc-download-link"[^>]*href="([^"]+)"/);
    if (confirmMatch) {
      const confirmToken = confirmMatch[1];
      const secondUrl = confirmToken.startsWith('http') 
        ? confirmToken 
        : `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
      res = await fetch(secondUrl, { credentials: 'include' });
      contentType = res.headers.get('content-type') || '';
    } else {
      // Direct stream link fallback
      const altUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
      res = await fetch(altUrl, { credentials: 'include' });
      contentType = res.headers.get('content-type') || '';
    }
  }

  if (!res.ok) {
    throw new Error(`Google Drive download failed with HTTP status ${res.status}`);
  }

  const ab = await res.arrayBuffer();
  return { arrayBuffer: ab, mimeType: contentType || 'audio/mpeg' };
}

// ─────────────────────────────────────────────────────────────────
// OPEN AUDIO IN IXR STUDIO
// ─────────────────────────────────────────────────────────────────
async function openAudioInStudio(fileId, fileName) {
  try {
    const { arrayBuffer, mimeType } = await fetchGoogleDriveAudio(fileId);
    await saveDriveAudio(fileId, fileName, arrayBuffer, mimeType);
    
    const studioUrl = chrome.runtime.getURL(`studio.html?fileId=${encodeURIComponent(fileId)}&name=${encodeURIComponent(fileName)}`);
    chrome.tabs.create({ url: studioUrl });
    return { success: true };
  } catch (err) {
    console.error('[IXR Background] Failed to fetch Drive audio:', err);
    // Fallback: open studio and let studio attempt direct fetch or show instructions
    const fallbackUrl = chrome.runtime.getURL(`studio.html?fileId=${encodeURIComponent(fileId)}&name=${encodeURIComponent(fileName)}&error=${encodeURIComponent(err.message)}`);
    chrome.tabs.create({ url: fallbackUrl });
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// CONTEXT MENUS SETUP
// ─────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ixr-open-studio',
    title: '🎛️ Open IXR Audio Studio',
    contexts: ['action', 'page']
  });

  chrome.contextMenus.create({
    id: 'ixr-edit-link',
    title: '🎛️ Edit in IXR Audio Studio',
    contexts: ['link'],
    targetUrlPatterns: [
      '*://drive.google.com/file/d/*',
      '*://docs.google.com/file/d/*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ixr-open-studio') {
    chrome.tabs.create({ url: chrome.runtime.getURL('studio.html') });
  } else if (info.menuItemId === 'ixr-edit-link' && info.linkUrl) {
    const match = info.linkUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      openAudioInStudio(match[1], 'Drive_Audio');
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// MESSAGE LISTENER
// ─────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'EDIT_DRIVE_AUDIO') {
    openAudioInStudio(msg.fileId, msg.fileName || 'Google_Drive_Audio')
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (msg.action === 'GET_AUDIO_BUFFER') {
    getDriveAudio(msg.fileId)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.action === 'OPEN_STUDIO') {
    const url = chrome.runtime.getURL('studio.html');
    chrome.tabs.create({ url });
    sendResponse({ success: true });
  }
});
