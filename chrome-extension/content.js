// IXR Audio Studio - Google Drive Content Script
// Injects direct audio editing integration into drive.google.com

(function() {
  'use strict';

  console.log('[IXR Studio] Google Drive audio integration loaded.');

  const AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.wma', '.webm', '.opus', '.aif', '.aiff'];

  function isAudioFilename(name) {
    if (!name || typeof name !== 'string') return false;
    const lower = name.toLowerCase().trim();
    return AUDIO_EXTS.some(ext => lower.endsWith(ext));
  }

  function getFileIdFromUrl(url = window.location.href) {
    const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }

  // ─────────────────────────────────────────────────────────────────
  // DETECT CURRENT PREVIEW AUDIO
  // ─────────────────────────────────────────────────────────────────
  function detectPreviewAudio() {
    const fileId = getFileIdFromUrl();
    
    // Look for file title in Google Drive's top bar or dialog header
    let fileName = '';
    const titleCandidates = [
      document.querySelector('[data-tooltip*=".mp3"], [data-tooltip*=".wav"], [data-tooltip*=".m4a"]'),
      document.querySelector('div[role="heading"]'),
      document.querySelector('.a-b-c-title'),
      ...document.querySelectorAll('span, div')
    ];

    for (const el of titleCandidates) {
      if (!el) continue;
      const text = (el.getAttribute('data-tooltip') || el.getAttribute('aria-label') || el.textContent || '').trim();
      if (isAudioFilename(text)) {
        fileName = text;
        break;
      }
    }

    if (!fileName) {
      // Check document.title (e.g. "my_song.mp3 - Google Drive")
      const docTitle = document.title.replace(/ - Google Drive$/, '').trim();
      if (isAudioFilename(docTitle)) {
        fileName = docTitle;
      }
    }

    // Check if an audio player element is present in preview
    const audioEl = document.querySelector('audio');
    const hasAudioTag = !!audioEl;

    if (fileId || hasAudioTag || isAudioFilename(fileName)) {
      return {
        fileId: fileId || '',
        fileName: fileName || (fileId ? `Drive_Audio_${fileId.substring(0, 6)}.mp3` : 'Google_Drive_Audio.mp3')
      };
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // INJECT PREVIEW TOOLBAR BUTTON
  // ─────────────────────────────────────────────────────────────────
  function injectPreviewToolbarButton(audioInfo) {
    if (document.getElementById('ixr-preview-edit-btn')) return;

    // Look for Google Drive's preview action bar
    const toolbars = [
      document.querySelector('[role="toolbar"]'),
      document.querySelector('div[aria-label="Download"]')?.parentElement,
      document.querySelector('button[aria-label*="Download"]')?.parentElement,
      document.querySelector('div[aria-label="More actions"]')?.parentElement,
      document.querySelector('.drive-preview-toolbar')
    ];

    let targetParent = null;
    for (const tb of toolbars) {
      if (tb) { targetParent = tb; break; }
    }

    if (!targetParent) return;

    const btn = document.createElement('button');
    btn.id = 'ixr-preview-edit-btn';
    btn.className = 'ixr-drive-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('title', 'Edit this audio directly in IXR Studio (Phonics, Speed, Vowel Prolongation & dB Gain)');
    btn.innerHTML = `
      <span class="ixr-btn-icon">🎛️</span>
      <span class="ixr-btn-text">Edit in IXR Studio</span>
    `;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      triggerStudioEdit(audioInfo, btn);
    });

    // Insert before download or first button
    targetParent.insertBefore(btn, targetParent.firstChild);
  }

  // ─────────────────────────────────────────────────────────────────
  // FLOATING QUICK-ACTION WIDGET
  // Persistent helper on Google Drive that appears whenever audio is active
  // ─────────────────────────────────────────────────────────────────
  let floatingWidget = null;

  function ensureFloatingWidget() {
    if (document.getElementById('ixr-floating-widget')) {
      floatingWidget = document.getElementById('ixr-floating-widget');
      return;
    }

    floatingWidget = document.createElement('div');
    floatingWidget.id = 'ixr-floating-widget';
    floatingWidget.className = 'ixr-floating-container';
    floatingWidget.innerHTML = `
      <div class="ixr-floating-pill" id="ixr-pill-main" title="IXR Audio Studio: Click to edit audio or open studio">
        <div class="ixr-pill-pulse"></div>
        <span class="ixr-pill-icon">🎛️</span>
        <div class="ixr-pill-content">
          <span class="ixr-pill-title">IXR Audio Studio</span>
          <span class="ixr-pill-sub" id="ixr-pill-status">Ready for Google Drive audio</span>
        </div>
        <button class="ixr-pill-action-btn" id="ixr-pill-edit-btn" title="Open and edit in Studio">Edit Audio ⚡</button>
      </div>
    `;

    document.body.appendChild(floatingWidget);

    const editBtn = floatingWidget.querySelector('#ixr-pill-edit-btn');
    const pillMain = floatingWidget.querySelector('#ixr-pill-main');

    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      const current = detectPreviewAudio() || selectedDriveAudio;
      if (current && current.fileId) {
        triggerStudioEdit(current, editBtn);
      } else {
        // Open empty studio
        chrome.runtime.sendMessage({ action: 'OPEN_STUDIO' });
      }
    });

    pillMain.addEventListener('click', e => {
      if (e.target.closest('#ixr-pill-edit-btn')) return;
      const current = detectPreviewAudio() || selectedDriveAudio;
      if (current && current.fileId) {
        triggerStudioEdit(current, editBtn);
      } else {
        chrome.runtime.sendMessage({ action: 'OPEN_STUDIO' });
      }
    });
  }

  function updateFloatingWidget(audioInfo) {
    ensureFloatingWidget();
    const statusEl = document.getElementById('ixr-pill-status');
    const editBtn  = document.getElementById('ixr-pill-edit-btn');

    if (audioInfo && audioInfo.fileId) {
      if (statusEl) statusEl.textContent = `Detected: ${audioInfo.fileName}`;
      if (editBtn) {
        editBtn.textContent = 'Edit Audio ⚡';
        editBtn.style.display = 'inline-flex';
      }
      floatingWidget.classList.add('has-audio');
    } else {
      if (statusEl) statusEl.textContent = 'Open or select an audio file';
      if (editBtn) {
        editBtn.textContent = 'Open Studio';
        editBtn.style.display = 'inline-flex';
      }
      floatingWidget.classList.remove('has-audio');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // TRIGGER STUDIO EDIT
  // ─────────────────────────────────────────────────────────────────
  let selectedDriveAudio = null;

  function triggerStudioEdit(audioInfo, btnEl) {
    if (!audioInfo || !audioInfo.fileId) {
      alert('Could not determine Google Drive file ID. Please open the audio preview first or right-click the file.');
      return;
    }

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = `<span class="ixr-spinner"></span> Loading into Studio…`;
    }

    chrome.runtime.sendMessage({
      action: 'EDIT_DRIVE_AUDIO',
      fileId: audioInfo.fileId,
      fileName: audioInfo.fileName
    }, response => {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = `<span class="ixr-btn-icon">🎛️</span><span class="ixr-btn-text">Edit in IXR Studio</span>`;
      }

      if (response && response.error) {
        console.warn('[IXR Studio] Notice on Drive fetch:', response.error);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // DETECT SELECTED AUDIO IN FOLDER LIST / GRID
  // ─────────────────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    // When user clicks a row or card in Google Drive
    const row = e.target.closest('[data-id], [role="row"], [role="option"]');
    if (!row) return;

    setTimeout(() => {
      const dataId = row.getAttribute('data-id') || row.querySelector('[data-id]')?.getAttribute('data-id');
      const text = row.textContent || '';
      
      // Look for audio filename in row text
      const words = text.split(/\s+/);
      let foundName = '';
      for (const w of words) {
        if (isAudioFilename(w)) {
          foundName = w;
          break;
        }
      }

      if (dataId && foundName) {
        selectedDriveAudio = { fileId: dataId, fileName: foundName };
        updateFloatingWidget(selectedDriveAudio);
      }
    }, 150);
  });

  // ─────────────────────────────────────────────────────────────────
  // MUTATION OBSERVER TO REACT TO DRIVE DOM UPDATES
  // ─────────────────────────────────────────────────────────────────
  const observer = new MutationObserver(() => {
    const preview = detectPreviewAudio();
    if (preview && preview.fileId) {
      injectPreviewToolbarButton(preview);
      updateFloatingWidget(preview);
    } else {
      updateFloatingWidget(selectedDriveAudio);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check
  ensureFloatingWidget();
  const initAudio = detectPreviewAudio();
  if (initAudio) {
    injectPreviewToolbarButton(initAudio);
    updateFloatingWidget(initAudio);
  }
})();
