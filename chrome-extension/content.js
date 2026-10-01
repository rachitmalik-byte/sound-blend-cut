// IXR Audio Studio - Ultra-Lightweight Google Drive Integration
// High-performance content script: Zero lag, zero DOM thrashing, zero freeze.

(function() {
  'use strict';

  console.log('[IXR Studio] Lightweight Google Drive integration active.');

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
  // ULTRA-FAST AUDIO PREVIEW DETECTOR (O(1) lookups only)
  // ─────────────────────────────────────────────────────────────────
  function detectAudioPreview() {
    // 1. Quick check: Is an audio element present on page?
    const audioEl = document.querySelector('audio');
    const fileId = getFileIdFromUrl();

    // 2. Quick check: document.title (Google Drive sets document.title to "filename.mp3 - Google Drive")
    const docTitle = document.title.replace(/ - Google Drive$/, '').trim();
    const hasAudioTitle = isAudioFilename(docTitle);

    // If there is no audio tag, no audio title, and no file preview URL, exit immediately
    if (!audioEl && !hasAudioTitle && !fileId) {
      return null;
    }

    // 3. Resolve filename safely without scanning DOM tree
    let fileName = hasAudioTitle ? docTitle : '';

    if (!fileName) {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        const heading = dialog.querySelector('[role="heading"]');
        if (heading && isAudioFilename(heading.textContent)) {
          fileName = heading.textContent.trim();
        }
      }
    }

    if (!fileName && fileId) {
      fileName = `Drive_Audio_${fileId.substring(0, 6)}.mp3`;
    }

    if (fileId && (audioEl || hasAudioTitle || isAudioFilename(fileName))) {
      return { fileId, fileName };
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // INJECT PREVIEW EDIT BUTTON
  // ─────────────────────────────────────────────────────────────────
  function injectPreviewButton(audioInfo) {
    if (!audioInfo || !audioInfo.fileId) return;
    if (document.getElementById('ixr-preview-edit-btn')) return;

    // Look for Drive's preview toolbar
    const toolbar = document.querySelector('[role="toolbar"]') ||
                    document.querySelector('div[aria-label="Download"]')?.parentElement ||
                    document.querySelector('button[aria-label*="Download"]')?.parentElement ||
                    document.querySelector('.drive-preview-toolbar');

    if (!toolbar) return;

    const btn = document.createElement('button');
    btn.id = 'ixr-preview-edit-btn';
    btn.className = 'ixr-drive-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('title', 'Edit this audio in IXR Studio (Noise Removal, Speed, Vowel Sustain, EQ)');
    btn.innerHTML = `
      <span class="ixr-btn-icon">🎛️</span>
      <span class="ixr-btn-text">Edit in IXR Studio</span>
    `;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      btn.disabled = true;
      btn.innerHTML = `<span class="ixr-spinner"></span> Loading into Studio…`;

      chrome.runtime.sendMessage({
        action: 'EDIT_DRIVE_AUDIO',
        fileId: audioInfo.fileId,
        fileName: audioInfo.fileName
      }, () => {
        btn.disabled = false;
        btn.innerHTML = `<span class="ixr-btn-icon">🎛️</span><span class="ixr-btn-text">Edit in IXR Studio</span>`;
      });
    });

    toolbar.insertBefore(btn, toolbar.firstChild);
  }

  // ─────────────────────────────────────────────────────────────────
  // DEBOUNCED SAFE SCANNER (Runs at most once every 600ms)
  // ─────────────────────────────────────────────────────────────────
  let scanTimer = null;
  function scheduleCheck() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      const audioInfo = detectAudioPreview();
      if (audioInfo) {
        injectPreviewButton(audioInfo);
      }
    }, 600);
  }

  // Run on initial load
  scheduleCheck();

  // Listen to navigation events (Drive is an SPA)
  window.addEventListener('popstate', scheduleCheck);
  window.addEventListener('hashchange', scheduleCheck);

  // Throttled MutationObserver that ONLY runs when a dialog or audio element appears
  const observer = new MutationObserver(() => {
    if (document.querySelector('[role="dialog"]') || document.querySelector('audio')) {
      scheduleCheck();
    }
  });

  // Start observing only after DOM is ready
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
