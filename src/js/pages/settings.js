import { getCurrentUserAny, updateUser, apiLogout } from "../auth.js";
import { showToast } from "../ui/toast.js";
import { initTogglePassword } from "../ui/toggle-password.js";
import {
  validateEmail,
  validatePhone,
  markError,
  clearError,
} from "../utils.js";

export function initSettingsPage() {
  _loadUserProfile();
  _initForm();
  _initPreferences();
  _initAvatarUpload();
  _initNav();
  _initLogout();
  _initNavAvatar();
  _initMobileTabBar();
  initTogglePassword();
}

// ── Profile ────────────────────────────────────────────────────
function _loadUserProfile() {
  const user = getCurrentUserAny();
  if (!user) return;

  // Settings panel profile card
  const sidebarAv = document.getElementById("settings-sidebar-avatar");
  const sidebarName = document.getElementById("settings-sidebar-name");
  const sidebarTagline = document.getElementById("settings-sidebar-tagline");
  if (sidebarAv) {
    if (user.avatar) {
      sidebarAv.style.backgroundImage = `url(${user.avatar})`;
      sidebarAv.style.backgroundSize = "cover";
      sidebarAv.textContent = "";
    } else {
      sidebarAv.style.background =
        user.avatarGradient || "linear-gradient(135deg,#2563EB,#7C3AED)";
      sidebarAv.textContent = user.initials || "Me";
    }
  }
  if (sidebarName) sidebarName.textContent = user.displayName;
  if (sidebarTagline) sidebarTagline.textContent = user.role || "";

  // Mobile bottom tab bar avatar
  const mobileTabAv = document.getElementById("mobile-tab-avatar");
  if (mobileTabAv) {
    if (user.avatar) {
      mobileTabAv.style.backgroundImage = `url(${user.avatar})`;
      mobileTabAv.style.backgroundSize = "cover";
      mobileTabAv.textContent = "";
    } else {
      mobileTabAv.style.background =
        user.avatarGradient || "linear-gradient(135deg,#2563EB,#7C3AED)";
      mobileTabAv.textContent = user.initials || "Me";
    }
  }

  // Profile section
  const profileAv = document.querySelector(".profile-section .avatar-lg");
  const profileName = document.querySelector(".profile-name");
  const profileRole = document.querySelector(".profile-role");

  if (profileAv) {
    if (user.avatar) {
      profileAv.style.backgroundImage = `url(${user.avatar})`;
      profileAv.style.backgroundSize = "cover";
      // Clear initials text node but keep the camera overlay div
      const textNode = [...profileAv.childNodes].find(
        (n) => n.nodeType === Node.TEXT_NODE,
      );
      if (textNode) textNode.textContent = "";
    } else {
      profileAv.style.backgroundImage = "";
      profileAv.style.background =
        user.avatarGradient || "linear-gradient(135deg,#2563EB,#7C3AED)";
      const textNode = [...profileAv.childNodes].find(
        (n) => n.nodeType === Node.TEXT_NODE,
      );
      if (textNode) textNode.textContent = user.initials || "GN";
    }
  }
  if (profileName) profileName.textContent = user.displayName;
  if (profileRole) profileRole.textContent = user.role || "";

  // Form fields
  _setVal("displayName", user.displayName);
  _setVal("settingsEmail", user.email);
  _setVal("settingsPhone", user.phone || "");
  _setVal("settingsRole", user.role || "");
}

// ── Form ───────────────────────────────────────────────────────
function _initForm() {
  const emailEl = document.getElementById("settingsEmail");
  const phoneEl = document.getElementById("settingsPhone");

  emailEl?.addEventListener("blur", () => {
    if (emailEl.value && !validateEmail(emailEl.value)) {
      markError(emailEl, "Please enter a valid email address.");
    } else {
      clearError(emailEl);
    }
  });
  phoneEl?.addEventListener("blur", () => {
    if (phoneEl.value && !validatePhone(phoneEl.value)) {
      markError(phoneEl, "Please enter a valid phone number.");
    } else {
      clearError(phoneEl);
    }
  });
  [emailEl, phoneEl].forEach((el) =>
    el?.addEventListener("focus", () => clearError(el)),
  );

  document
    .getElementById("save-settings-btn")
    ?.addEventListener("click", _saveSettings);
}

function _saveSettings() {
  const displayName =
    document.getElementById("displayName")?.value.trim() || "";
  const email = document.getElementById("settingsEmail")?.value.trim() || "";
  const phone = document.getElementById("settingsPhone")?.value.trim() || "";
  const role = document.getElementById("settingsRole")?.value.trim() || "";

  let valid = true;
  const emailEl = document.getElementById("settingsEmail");
  const phoneEl = document.getElementById("settingsPhone");

  if (!validateEmail(email)) {
    markError(emailEl, "Please enter a valid email address.");
    valid = false;
  }
  if (phone && !validatePhone(phone)) {
    markError(phoneEl, "Please enter a valid phone number.");
    valid = false;
  }
  if (!valid) return;

  const initials = displayName
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const result = updateUser({ displayName, email, phone, role, initials });
  if (result.ok) {
    showToast("Settings saved successfully!", "success");
    _loadUserProfile();
  } else {
    showToast(result.error || "Failed to save settings.", "error");
  }
}

// ── Preferences ────────────────────────────────────────────────
function _initPreferences() {
  const onlineToggle = document.getElementById("online-status-toggle");
  const receiptsToggle = document.getElementById("read-receipts-toggle");
  const volumeSlider = document.getElementById("volume-slider");
  const volumeDisplay = document.getElementById("volume-display");

  const prefs = _getPrefs();
  if (onlineToggle) onlineToggle.checked = prefs.onlineStatus !== false;
  if (receiptsToggle) receiptsToggle.checked = prefs.readReceipts === true;
  if (volumeSlider) {
    volumeSlider.value = prefs.volume ?? 75;
    _updateSliderBg(volumeSlider);
  }
  if (volumeDisplay) volumeDisplay.textContent = (prefs.volume ?? 75) + "%";

  onlineToggle?.addEventListener("change", () =>
    _savePrefs("onlineStatus", onlineToggle.checked),
  );
  receiptsToggle?.addEventListener("change", () =>
    _savePrefs("readReceipts", receiptsToggle.checked),
  );
  volumeSlider?.addEventListener("input", () => {
    const val = Number(volumeSlider.value);
    if (volumeDisplay) volumeDisplay.textContent = val + "%";
    _updateSliderBg(volumeSlider);
    _savePrefs("volume", val);
  });
}

function _updateSliderBg(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--color-accent) ${pct}%, var(--color-toggle-off) ${pct}%)`;
}

// ── Avatar upload ──────────────────────────────────────────────
function _initAvatarUpload() {
  const changeBtn = document.querySelector(".profile-buttons .btn-accent");
  const removeBtn = document.querySelector(".profile-buttons .btn-outline");

  let fileInput = document.getElementById("avatar-file-input");
  if (!fileInput) {
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "avatar-file-input";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
  }

  changeBtn?.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      updateUser({ avatar: e.target.result });
      _loadUserProfile();
      showToast("Photo updated.", "success");
    };
    reader.readAsDataURL(file);
  });

  removeBtn?.addEventListener("click", () => {
    updateUser({ avatar: null });
    _loadUserProfile();
    showToast("Photo removed.", "info");
  });
}

// ── Navigation ─────────────────────────────────────────────────
function _initNav() {
  document.querySelectorAll(".settings-nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      document
        .querySelectorAll(".settings-nav-item")
        .forEach((n) => n.classList.remove("active"));
      item.classList.add("active");

      const section = item.dataset.section || "general";

      // Hide all sections, show target
      document
        .querySelectorAll(".settings-section")
        .forEach((s) => s.classList.remove("active"));
      const target = document.getElementById("section-" + section);
      if (target) {
        target.classList.add("active");

        // On mobile: slide in the settings-main overlay panel
        if (window.innerWidth < 768) {
          const main = document.querySelector(".settings-main");
          main?.classList.add("mobile-open");
          const titleEl = document.getElementById("mobile-section-title");
          const navTitle =
            item.querySelector(".settings-nav-title")?.textContent?.trim() ||
            "Settings";
          if (titleEl) titleEl.textContent = navTitle;
        }
      } else {
        const title =
          item.querySelector(".settings-nav-title")?.textContent?.trim() ||
          section;
        showToast(`${title} settings: coming soon.`, "info");
      }
    });
  });

  // Mobile back button: close the slide-in panel
  document
    .getElementById("settings-back-btn")
    ?.addEventListener("click", () => {
      document.querySelector(".settings-main")?.classList.remove("mobile-open");
    });
}

// ── Mobile tab bar ─────────────────────────────────────────────
function _initMobileTabBar() {
  const mobileLabels = {
    calls: "Calls",
    community: "Community",
    updates: "Updates",
  };
  document.querySelectorAll(".mobile-tab-item[data-tab]").forEach((item) => {
    const tab = item.dataset.tab;
    if (tab !== "chats" && tab !== "you") {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        showToast(`${mobileLabels[tab] ?? tab}: coming soon.`, "info");
      });
    }
  });
}

// ── Nav bar avatar ─────────────────────────────────────────────
function _initNavAvatar() {
  const user = getCurrentUserAny();
  if (!user) return;
  const navAv = document.getElementById("nav-profile-avatar");
  if (navAv) {
    navAv.textContent = user.initials || "Me";
    navAv.style.background =
      user.avatarGradient || "linear-gradient(135deg,#2563EB,#7C3AED)";
  }
}

// ── Logout ─────────────────────────────────────────────────────
function _initLogout() {
  document.getElementById("logout-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    apiLogout();
    window.location.replace("index.html");
  });
}

// ── Helpers ────────────────────────────────────────────────────
function _setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || "";
}

function _getPrefs() {
  try {
    return JSON.parse(localStorage.getItem("ephemeral_prefs") || "{}");
  } catch {
    return {};
  }
}

function _savePrefs(key, value) {
  const prefs = _getPrefs();
  prefs[key] = value;
  localStorage.setItem("ephemeral_prefs", JSON.stringify(prefs));
}
