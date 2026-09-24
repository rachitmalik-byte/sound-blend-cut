// IXR Audio Studio - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('txt-drive-status');
  const editCurrentBtn = document.getElementById('btn-edit-current-drive');
  const openEmptyBtn = document.getElementById('btn-open-empty');
  const linkInp = document.getElementById('inp-drive-link');
  const loadLinkBtn = document.getElementById('btn-load-link');

  // Check active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let activeDriveAudio = null;

  if (tab && tab.url && tab.url.includes('drive.google.com')) {
    statusEl.textContent = 'Google Drive tab detected';
    
    // Check if the tab URL itself has a file ID
    const urlMatch = tab.url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) {
      const fileId = urlMatch[1];
      activeDriveAudio = { fileId, fileName: tab.title.replace(/ - Google Drive$/, '') || 'Google_Drive_Audio.mp3' };
    }

    if (activeDriveAudio) {
      statusEl.textContent = `Audio: ${activeDriveAudio.fileName}`;
      editCurrentBtn.style.display = 'flex';
      editCurrentBtn.textContent = `⚡ Edit "${activeDriveAudio.fileName}"`;
      editCurrentBtn.onclick = () => {
        chrome.runtime.sendMessage({
          action: 'EDIT_DRIVE_AUDIO',
          fileId: activeDriveAudio.fileId,
          fileName: activeDriveAudio.fileName
        });
        window.close();
      };
    }
  } else {
    statusEl.textContent = 'Open Google Drive to edit files';
  }

  // Open empty studio
  openEmptyBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_STUDIO' });
    window.close();
  });

  // Load from link
  loadLinkBtn.addEventListener('click', () => {
    const val = linkInp.value.trim();
    if (!val) return;
    const m = val.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || val.match(/id=([a-zA-Z0-9_-]+)/) || [null, val];
    const fileId = m[1];
    if (fileId && fileId.length > 5) {
      chrome.runtime.sendMessage({
        action: 'EDIT_DRIVE_AUDIO',
        fileId: fileId,
        fileName: 'Google_Drive_Audio.mp3'
      });
      window.close();
    } else {
      alert('Please enter a valid Google Drive file URL or ID');
    }
  });
});
