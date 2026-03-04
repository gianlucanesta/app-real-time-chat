import { getCurrentUser, updateUser, logout } from '../auth.js';
import { showToast } from '../ui/toast.js';
import { initTogglePassword } from '../ui/toggle-password.js';
import { validateEmail, validatePhone, markError, clearError } from '../utils.js';

export function initSettingsPage() {
  _loadUserProfile();
  _initForm();
  _initPreferences();
  _initAvatarUpload();
  _initNav();
  _initLogout();
  initTogglePassword();
}

// ── Profile ────────────────────────────────────────────────────
function _loadUserProfile() {
  const user = getCurrentUser();
  if (!user) return;

  // Sidebar footer
  const sidebarAv   = document.querySelector('.settings-user-footer .avatar');
  const sidebarName = document.querySelector('.settings-user-footer .user-name');
  const sidebarRole = document.querySelector('.settings-user-footer .user-role');
  if (sidebarAv) {
    sidebarAv.style.background = user.avatarGradient || 'linear-gradient(135deg,#2563EB,#7C3AED)';
    sidebarAv.textContent = user.initials || 'Me';
  }
  if (sidebarName) sidebarName.textContent = user.displayName;
  if (sidebarRole) sidebarRole.textContent = user.role || '';

  // Profile section
  const profileAv   = document.querySelector('.profile-section .avatar-lg');
  const profileName = document.querySelector('.profile-name');
  const profileRole = document.querySelector('.profile-role');

  if (profileAv) {
    if (user.avatar) {
      profileAv.style.backgroundImage = `url(${user.avatar})`;
      profileAv.style.backgroundSize  = 'cover';
      // Clear initials text node but keep the camera overlay div
      const textNode = [...profileAv.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = '';
    } else {
      profileAv.style.backgroundImage = '';
      profileAv.style.background = user.avatarGradient || 'linear-gradient(135deg,#2563EB,#7C3AED)';
      const textNode = [...profileAv.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = user.initials || 'GN';
    }
  }
  if (profileName) profileName.textContent = user.displayName;
  if (profileRole) profileRole.textContent = user.role || '';

  // Form fields
  _setVal('displayName',    user.displayName);
  _setVal('settingsEmail',  user.email);
  _setVal('settingsPhone',  user.phone || '');
  _setVal('settingsRole',   user.role || '');
}

// ── Form ───────────────────────────────────────────────────────
function _initForm() {
  const emailEl = document.getElementById('settingsEmail');
  const phoneEl = document.getElementById('settingsPhone');

  emailEl?.addEventListener('blur', () => {
    if (emailEl.value && !validateEmail(emailEl.value)) {
      markError(emailEl, 'Please enter a valid email address.');
    } else {
      clearError(emailEl);
    }
  });
  phoneEl?.addEventListener('blur', () => {
    if (phoneEl.value && !validatePhone(phoneEl.value)) {
      markError(phoneEl, 'Please enter a valid phone number.');
    } else {
      clearError(phoneEl);
    }
  });
  [emailEl, phoneEl].forEach(el => el?.addEventListener('focus', () => clearError(el)));

  document.getElementById('save-settings-btn')?.addEventListener('click', _saveSettings);
}

function _saveSettings() {
  const displayName = document.getElementById('displayName')?.value.trim() || '';
  const email       = document.getElementById('settingsEmail')?.value.trim() || '';
  const phone       = document.getElementById('settingsPhone')?.value.trim() || '';
  const role        = document.getElementById('settingsRole')?.value.trim() || '';

  let valid = true;
  const emailEl = document.getElementById('settingsEmail');
  const phoneEl = document.getElementById('settingsPhone');

  if (!validateEmail(email)) {
    markError(emailEl, 'Please enter a valid email address.');
    valid = false;
  }
  if (phone && !validatePhone(phone)) {
    markError(phoneEl, 'Please enter a valid phone number.');
    valid = false;
  }
  if (!valid) return;

  const initials = displayName
    .split(/\s+/)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const result = updateUser({ displayName, email, phone, role, initials });
  if (result.ok) {
    showToast('Settings saved successfully!', 'success');
    _loadUserProfile();
  } else {
    showToast(result.error || 'Failed to save settings.', 'error');
  }
}

// ── Preferences ────────────────────────────────────────────────
function _initPreferences() {
  const onlineToggle   = document.getElementById('online-status-toggle');
  const receiptsToggle = document.getElementById('read-receipts-toggle');
  const volumeSlider   = document.getElementById('volume-slider');
  const volumeDisplay  = document.getElementById('volume-display');

  const prefs = _getPrefs();
  if (onlineToggle)   onlineToggle.checked   = prefs.onlineStatus !== false;
  if (receiptsToggle) receiptsToggle.checked = prefs.readReceipts === true;
  if (volumeSlider) {
    volumeSlider.value = prefs.volume ?? 75;
    _updateSliderBg(volumeSlider);
  }
  if (volumeDisplay) volumeDisplay.textContent = (prefs.volume ?? 75) + '%';

  onlineToggle?.addEventListener('change', () =>
    _savePrefs('onlineStatus', onlineToggle.checked)
  );
  receiptsToggle?.addEventListener('change', () =>
    _savePrefs('readReceipts', receiptsToggle.checked)
  );
  volumeSlider?.addEventListener('input', () => {
    const val = Number(volumeSlider.value);
    if (volumeDisplay) volumeDisplay.textContent = val + '%';
    _updateSliderBg(volumeSlider);
    _savePrefs('volume', val);
  });
}

function _updateSliderBg(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background =
    `linear-gradient(to right, var(--color-accent) ${pct}%, var(--color-toggle-off) ${pct}%)`;
}

// ── Avatar upload ──────────────────────────────────────────────
function _initAvatarUpload() {
  const changeBtn = document.querySelector('.profile-buttons .btn-accent');
  const removeBtn = document.querySelector('.profile-buttons .btn-outline');

  let fileInput = document.getElementById('avatar-file-input');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id   = 'avatar-file-input';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
  }

  changeBtn?.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      updateUser({ avatar: e.target.result });
      _loadUserProfile();
      showToast('Photo updated.', 'success');
    };
    reader.readAsDataURL(file);
  });

  removeBtn?.addEventListener('click', () => {
    updateUser({ avatar: null });
    _loadUserProfile();
    showToast('Photo removed.', 'info');
  });
}

// ── Navigation ─────────────────────────────────────────────────
function _initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const label = item.querySelector('span')?.textContent?.trim() || '';
      const sectionHeader = document.querySelector('.settings-section-header h1');
      if (sectionHeader) sectionHeader.textContent = label + ' Settings';

      if (label !== 'General') {
        showToast(`${label} settings: coming soon.`, 'info');
      }
    });
  });
}

// ── Logout ─────────────────────────────────────────────────────
function _initLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
    window.location.replace('index.html');
  });
}

// ── Helpers ────────────────────────────────────────────────────
function _setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function _getPrefs() {
  try {
    return JSON.parse(localStorage.getItem('ephemeral_prefs') || '{}');
  } catch {
    return {};
  }
}

function _savePrefs(key, value) {
  const prefs = _getPrefs();
  prefs[key] = value;
  localStorage.setItem('ephemeral_prefs', JSON.stringify(prefs));
}
