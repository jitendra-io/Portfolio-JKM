/* ═══════════════════════════════════════════════════════════════════════
   admin.js — Portfolio Admin Panel Logic
   Login → JWT Auth → CRUD for Projects & Skills
═══════════════════════════════════════════════════════════════════════ */

const API_BASE = (() => {
  const { hostname, origin } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : origin;
})();

// ── State ─────────────────────────────────────────────────────────────
let token      = localStorage.getItem('portfolio_admin_token') || null;
let projects   = [];
let skills     = [];
let editingId  = null;
let activeTab  = 'projects';

// ── DOM References ────────────────────────────────────────────────────
const loginScreen    = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm      = document.getElementById('loginForm');
const loginError     = document.getElementById('loginError');
const loginBtnText   = document.getElementById('loginBtnText');
const logoutBtn      = document.getElementById('logoutBtn');
const modalOverlay   = document.getElementById('modalOverlay');
const modalTitle     = document.getElementById('modalTitle');
const modalBody      = document.getElementById('modalBody');
const modalClose     = document.getElementById('modalClose');
const toast          = document.getElementById('toast');

// ═════════════════════════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════════════════════════
async function checkAuth() {
  if (!token) { showLogin(); return; }
  try {
    const res = await apiFetch('/api/auth/verify');
    if (res.success) showDashboard();
    else { token = null; localStorage.removeItem('portfolio_admin_token'); showLogin(); }
  } catch {
    showLogin();
  }
}

function showLogin()     { loginScreen.style.display = 'flex'; adminDashboard.style.display = 'none'; }
function showDashboard() { loginScreen.style.display = 'none'; adminDashboard.style.display = 'block'; loadAll(); }

loginForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value;
  if (!username || !password) return showLoginError('Enter username and password.');

  loginBtnText.textContent = 'Signing in...';
  loginForm.querySelector('button[type=submit]').disabled = true;

  try {
    const res = await apiFetch('/api/auth/login', 'POST', { username, password }, false);
    if (res.success) {
      token = res.token;
      localStorage.setItem('portfolio_admin_token', token);
      showDashboard();
    } else {
      showLoginError(res.message || 'Invalid credentials.');
    }
  } catch (err) {
    showLoginError('Server error. Make sure backend is running.');
  }

  loginBtnText.textContent = 'Sign In';
  loginForm.querySelector('button[type=submit]').disabled = false;
});

logoutBtn?.addEventListener('click', () => {
  token = null;
  localStorage.removeItem('portfolio_admin_token');
  showLogin();
});

document.getElementById('togglePassword')?.addEventListener('click', () => {
  const inp = document.getElementById('admin-password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.className = 'form-status error';
  setTimeout(() => { loginError.className = 'form-status'; }, 4000);
}

// ═════════════════════════════════════════════════════════════════════
// DATA LOADING
// ═════════════════════════════════════════════════════════════════════
async function loadAll() {
  await Promise.all([loadProjects(), loadSkills(), loadResume(), loadUnreadCount()]);
  updateStats();
}

async function loadUnreadCount() {
  try {
    const res = await apiFetch('/api/messages');
    messages = res.data || [];
    updateUnreadBadge(res.unreadCount || 0);
  } catch { /* silent fail */ }
}


async function loadProjects() {
  try {
    const res = await apiFetch('/api/projects');
    projects = res.data || [];
    renderProjectsList();
  } catch (err) {
    document.getElementById('projectsList').innerHTML = `<p style="color:var(--text-muted);padding:20px;">Error loading projects: ${err.message}</p>`;
  }
}

async function loadSkills() {
  try {
    const res = await apiFetch('/api/skills');
    skills = res.data || [];
    renderSkillsList();
  } catch (err) {
    document.getElementById('skillsList').innerHTML = `<p style="color:var(--text-muted);padding:20px;">Error loading skills: ${err.message}</p>`;
  }
}

function updateStats() {
  document.getElementById('stat-proj-count').textContent    = projects.length;
  document.getElementById('stat-skill-count').textContent   = skills.length;
  document.getElementById('stat-featured-count').textContent = projects.filter(p => p.featured).length;
}

// ═════════════════════════════════════════════════════════════════════
// TABS
// ═════════════════════════════════════════════════════════════════════
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    activeTab = tab.dataset.tab;
  });
});

// ═════════════════════════════════════════════════════════════════════
// PROJECTS — Render List
// ═════════════════════════════════════════════════════════════════════
function renderProjectsList() {
  const el = document.getElementById('projectsList');
  if (!projects.length) {
    el.innerHTML = '<div class="empty-state"><h3>No projects yet</h3><p>Click "Add Project" to get started.</p></div>';
    return;
  }

  el.innerHTML = projects.map(p => `
    <div class="admin-item" id="proj-item-${p._id}">
      <div class="admin-item-info">
        <div class="admin-item-title">${escapeHTML(p.title)}</div>
        <div class="admin-item-meta">
          <span class="admin-item-badge badge-${p.category}">${p.category}</span>
          ${p.featured ? '<span class="admin-item-badge badge-featured">⭐ Featured</span>' : ''}
          <span>${p.tech.slice(0, 3).map(t => escapeHTML(t)).join(' · ')}</span>
        </div>
      </div>
      <div class="admin-item-actions">
        <button class="action-btn action-btn-edit"   onclick="openEditProject('${p._id}')">Edit</button>
        <button class="action-btn action-btn-delete" onclick="confirmDelete('project', '${p._id}', '${escapeHTML(p.title)}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// ── Add Project Button ──
document.getElementById('addProjectBtn')?.addEventListener('click', () => openProjectModal());

function openProjectModal(proj = null) {
  editingId = proj ? proj._id : null;
  modalTitle.textContent = proj ? 'Edit Project' : 'Add New Project';

  modalBody.innerHTML = `
    <form id="projectForm" novalidate>
      <div class="form-group">
        <label class="form-label">Project Title *</label>
        <input type="text" id="pf-title" class="form-input" value="${escapeHTML(proj?.title || '')}" required placeholder="Banking System API" />
      </div>
      <div class="form-group">
        <label class="form-label">Short Description * <small style="color:var(--text-muted)">(max 300 chars)</small></label>
        <textarea id="pf-desc" class="form-input form-textarea" rows="2" required placeholder="Brief description...">${escapeHTML(proj?.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Long Description</label>
        <textarea id="pf-longdesc" class="form-input form-textarea" rows="3" placeholder="Detailed description...">${escapeHTML(proj?.longDescription || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Tech Stack * <small style="color:var(--text-muted)">(comma-separated)</small></label>
        <input type="text" id="pf-tech" class="form-input" value="${(proj?.tech || []).join(', ')}" required placeholder="Node.js, Express.js, MongoDB" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="pf-category" class="form-input">
            ${['fullstack','frontend','backend','other'].map(c =>
              `<option value="${c}" ${proj?.category === c ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Order</label>
          <input type="number" id="pf-order" class="form-input" value="${proj?.order ?? 0}" min="0" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">GitHub URL</label>
        <input type="url" id="pf-github" class="form-input" value="${escapeHTML(proj?.githubUrl || '')}" placeholder="https://github.com/..." />
      </div>
      <div class="form-group">
        <label class="form-label">Live URL</label>
        <input type="url" id="pf-live" class="form-input" value="${escapeHTML(proj?.liveUrl || '')}" placeholder="https://..." />
      </div>
      <div class="form-group">
        <label class="form-label">Image URL</label>
        <input type="url" id="pf-image" class="form-input" value="${escapeHTML(proj?.imageUrl || '')}" placeholder="https://..." />
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
          <input type="checkbox" id="pf-featured" ${proj?.featured ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent-indigo);" />
          <span class="form-label" style="margin:0;">Featured Project</span>
        </label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${proj ? 'Save Changes' : 'Add Project'}</button>
      </div>
    </form>
  `;

  document.getElementById('projectForm').addEventListener('submit', submitProject);
  openModal();
}

function openEditProject(id) {
  const proj = projects.find(p => p._id === id);
  if (proj) openProjectModal(proj);
}
window.openEditProject = openEditProject;

async function submitProject(e) {
  e.preventDefault();
  const tech = document.getElementById('pf-tech').value.split(',').map(t => t.trim()).filter(Boolean);

  const data = {
    title:           document.getElementById('pf-title').value.trim(),
    description:     document.getElementById('pf-desc').value.trim(),
    longDescription: document.getElementById('pf-longdesc').value.trim(),
    tech,
    category:        document.getElementById('pf-category').value,
    order:           parseInt(document.getElementById('pf-order').value) || 0,
    githubUrl:       document.getElementById('pf-github').value.trim(),
    liveUrl:         document.getElementById('pf-live').value.trim(),
    imageUrl:        document.getElementById('pf-image').value.trim(),
    featured:        document.getElementById('pf-featured').checked,
  };

  if (!data.title || !data.description || !tech.length) {
    showToast('Title, description, and tech stack are required.', 'error');
    return;
  }

  try {
    const method = editingId ? 'PUT' : 'POST';
    const url    = editingId ? `/api/projects/${editingId}` : '/api/projects';
    const res    = await apiFetch(url, method, data);
    if (res.success) {
      showToast(editingId ? 'Project updated!' : 'Project added!', 'success');
      closeModal();
      await loadProjects();
      updateStats();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Error saving project: ' + err.message, 'error');
  }
}

// ═════════════════════════════════════════════════════════════════════
// SKILLS — Render List
// ═════════════════════════════════════════════════════════════════════
function renderSkillsList() {
  const el = document.getElementById('skillsList');
  if (!skills.length) {
    el.innerHTML = '<div class="empty-state"><h3>No skills yet</h3><p>Click "Add Skill" to get started.</p></div>';
    return;
  }

  const grouped = {};
  skills.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  el.innerHTML = Object.entries(grouped).map(([cat, catSkills]) => `
    <div style="margin-bottom:8px;">
      <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;padding:4px 0 8px;">${cat}</div>
      ${catSkills.map(s => `
        <div class="admin-item" id="skill-item-${s._id}">
          <div class="admin-item-info">
            <div class="admin-item-title">
              <i class="${escapeHTML(s.icon)} colored" style="font-size:1.2rem;margin-right:8px;vertical-align:middle;"></i>
              ${escapeHTML(s.name)}
            </div>
            <div class="admin-item-meta">
              <span class="admin-item-badge badge-${s.category}">${s.category}</span>
              <span style="font-family:var(--font-mono);color:var(--accent-indigo);">${s.level}%</span>
            </div>
          </div>
          <div style="width:120px;height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
            <div style="width:${s.level}%;height:100%;background:var(--gradient-main);border-radius:4px;"></div>
          </div>
          <div class="admin-item-actions">
            <button class="action-btn action-btn-edit"   onclick="openEditSkill('${s._id}')">Edit</button>
            <button class="action-btn action-btn-delete" onclick="confirmDelete('skill', '${s._id}', '${escapeHTML(s.name)}')">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

document.getElementById('addSkillBtn')?.addEventListener('click', () => openSkillModal());

function openSkillModal(skill = null) {
  editingId = skill ? skill._id : null;
  modalTitle.textContent = skill ? 'Edit Skill' : 'Add New Skill';

  modalBody.innerHTML = `
    <form id="skillForm" novalidate>
      <div class="form-group">
        <label class="form-label">Skill Name *</label>
        <input type="text" id="sf-name" class="form-input" value="${escapeHTML(skill?.name || '')}" required placeholder="Node.js" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="sf-category" class="form-input">
            ${['backend','frontend','database','tools','other'].map(c =>
              `<option value="${c}" ${skill?.category === c ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Order</label>
          <input type="number" id="sf-order" class="form-input" value="${skill?.order ?? 0}" min="0" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Proficiency Level — <span id="level-display">${skill?.level ?? 80}%</span></label>
        <div class="slider-wrapper">
          <input type="range" id="sf-level" class="skill-slider" min="0" max="100" value="${skill?.level ?? 80}" />
          <span class="slider-value" id="slider-val">${skill?.level ?? 80}%</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Devicon Class <a href="https://devicon.dev" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan);font-size:0.8rem;margin-left:8px;">Browse icons ↗</a></label>
        <input type="text" id="sf-icon" class="form-input" value="${escapeHTML(skill?.icon || '')}" placeholder="devicon-nodejs-plain" />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${skill ? 'Save Changes' : 'Add Skill'}</button>
      </div>
    </form>
  `;

  // Slider interaction
  const slider   = document.getElementById('sf-level');
  const sliderVal = document.getElementById('slider-val');
  const levelDisp = document.getElementById('level-display');
  slider.addEventListener('input', () => {
    sliderVal.textContent  = slider.value + '%';
    levelDisp.textContent  = slider.value + '%';
  });

  document.getElementById('skillForm').addEventListener('submit', submitSkill);
  openModal();
}

function openEditSkill(id) {
  const skill = skills.find(s => s._id === id);
  if (skill) openSkillModal(skill);
}
window.openEditSkill = openEditSkill;

async function submitSkill(e) {
  e.preventDefault();
  const data = {
    name:     document.getElementById('sf-name').value.trim(),
    category: document.getElementById('sf-category').value,
    level:    parseInt(document.getElementById('sf-level').value),
    icon:     document.getElementById('sf-icon').value.trim(),
    order:    parseInt(document.getElementById('sf-order').value) || 0,
  };

  if (!data.name) { showToast('Skill name is required.', 'error'); return; }

  try {
    const method = editingId ? 'PUT' : 'POST';
    const url    = editingId ? `/api/skills/${editingId}` : '/api/skills';
    const res    = await apiFetch(url, method, data);
    if (res.success) {
      showToast(editingId ? 'Skill updated!' : 'Skill added!', 'success');
      closeModal();
      await loadSkills();
      updateStats();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Error saving skill: ' + err.message, 'error');
  }
}

// ═════════════════════════════════════════════════════════════════════
// DELETE
// ═════════════════════════════════════════════════════════════════════
function confirmDelete(type, id, name) {
  editingId = id;
  modalTitle.textContent = 'Confirm Delete';
  modalBody.innerHTML = `
    <div class="confirm-body">
      <div class="confirm-icon">🗑️</div>
      <p>Are you sure you want to delete</p>
      <p><strong>"${escapeHTML(name)}"</strong>?</p>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-top:8px;">This action cannot be undone.</p>
      <div class="modal-actions" style="justify-content:center;margin-top:24px;">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);" onclick="executeDelete('${type}','${id}')">Delete</button>
      </div>
    </div>
  `;
  openModal();
}
window.confirmDelete = confirmDelete;

async function executeDelete(type, id) {
  try {
    const url = type === 'project' ? `/api/projects/${id}` : `/api/skills/${id}`;
    const res = await apiFetch(url, 'DELETE');
    if (res.success) {
      showToast(`${type === 'project' ? 'Project' : 'Skill'} deleted.`, 'success');
      closeModal();
      if (type === 'project') { await loadProjects(); }
      else                    { await loadSkills();   }
      updateStats();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}
window.executeDelete = executeDelete;

// ═════════════════════════════════════════════════════════════════════
// MODAL
// ═════════════════════════════════════════════════════════════════════
function openModal() {
  modalOverlay.style.display = 'flex';
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.style.display = 'none';
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  editingId = null;
  modalBody.innerHTML = '';
}
window.closeModal = closeModal;

modalClose?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ═════════════════════════════════════════════════════════════════════
// TOAST
// ═════════════════════════════════════════════════════════════════════
let toastTimer;
function showToast(msg, type = 'success') {
  toast.textContent  = (type === 'success' ? '✅ ' : '❌ ') + msg;
  toast.className    = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ═════════════════════════════════════════════════════════════════════
// API HELPER
// ═════════════════════════════════════════════════════════════════════
async function apiFetch(path, method = 'GET', body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(`${API_BASE}${path}`, opts);
  const json = await res.json();
  return json;
}

// ═════════════════════════════════════════════════════════════════════
// UTILITIES
// ═════════════════════════════════════════════════════════════════════
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═════════════════════════════════════════════════════════════════════
// INIT
// ═════════════════════════════════════════════════════════════════════
checkAuth();

// ═════════════════════════════════════════════════════════════════════
// RESUME MANAGEMENT
// ═════════════════════════════════════════════════════════════════════
let selectedResumeFile = null;

// Load resume status when dashboard loads
async function loadResume() {
  const statusEl = document.getElementById('resumeStatus');
  const deleteBtn = document.getElementById('deleteResumeBtn');
  if (!statusEl) return;

  try {
    const res = await apiFetch('/api/resume');
    if (res.success && res.data) {
      const uploadedDate = new Date(res.data.uploadedAt).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      statusEl.innerHTML = `
        <div class="resume-current-info">
          <div class="resume-file-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div>
            <div class="resume-file-name">${escapeHTML(res.data.originalName)}</div>
            <div class="resume-file-meta">Uploaded: ${uploadedDate}</div>
          </div>
          <a href="${API_BASE}${res.data.url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="padding:8px 16px;font-size:0.8rem;margin-left:auto;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview
          </a>
        </div>
      `;
      if (deleteBtn) deleteBtn.style.display = 'flex';
    } else {
      statusEl.innerHTML = `<div class="resume-no-file"><span>⚠️</span> No resume uploaded yet.</div>`;
      if (deleteBtn) deleteBtn.style.display = 'none';
    }
  } catch (err) {
    statusEl.innerHTML = `<div class="resume-no-file"><span>❌</span> Error loading resume info.</div>`;
  }
}

// File input / drag-and-drop
document.addEventListener('DOMContentLoaded', () => {
  const dropZone       = document.getElementById('resumeDropZone');
  const fileInput      = document.getElementById('resumeFileInput');
  const uploadBtn      = document.getElementById('uploadResumeBtn');
  const deleteBtn      = document.getElementById('deleteResumeBtn');
  const selectedName   = document.getElementById('selectedFileName');
  const uploadStatus   = document.getElementById('resumeUploadStatus');

  function setSelectedFile(file) {
    if (!file || file.type !== 'application/pdf') {
      showToast('Please select a valid PDF file.', 'error');
      return;
    }
    selectedResumeFile = file;
    if (selectedName) selectedName.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    if (uploadBtn) uploadBtn.disabled = false;
    if (dropZone) dropZone.classList.add('has-file');
  }

  fileInput?.addEventListener('change', e => {
    if (e.target.files[0]) setSelectedFile(e.target.files[0]);
  });

  dropZone?.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]);
  });
  dropZone?.addEventListener('click', () => fileInput?.click());

  uploadBtn?.addEventListener('click', async () => {
    if (!selectedResumeFile) return;
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    const formData = new FormData();
    formData.append('resume', selectedResumeFile);

    try {
      const res = await fetch(`${API_BASE}/api/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        showToast('Resume uploaded successfully! ✅', 'success');
        selectedResumeFile = null;
        if (selectedName) selectedName.textContent = '';
        if (fileInput) fileInput.value = '';
        if (dropZone) dropZone.classList.remove('has-file');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Resume`;
        await loadResume();
      } else {
        showToast(json.message || 'Upload failed.', 'error');
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Resume`;
      }
    } catch (err) {
      showToast('Upload error: ' + err.message, 'error');
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `Upload Resume`;
    }
  });

  deleteBtn?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to remove the current resume?')) return;
    try {
      const res = await apiFetch('/api/resume', 'DELETE');
      if (res.success) {
        showToast('Resume removed.', 'success');
        await loadResume();
      } else {
        showToast(res.message || 'Delete failed.', 'error');
      }
    } catch (err) {
      showToast('Delete error: ' + err.message, 'error');
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// MESSAGES TAB
// ═════════════════════════════════════════════════════════════════════
let messages = [];

async function loadMessages() {
  const el = document.getElementById('messagesList');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading...</span></div>';
  try {
    const res = await apiFetch('/api/messages');
    messages = res.data || [];
    updateUnreadBadge(res.unreadCount || 0);
    renderMessagesList();
  } catch (err) {
    el.innerHTML = `<p style="color:var(--text-muted);padding:20px;">Error loading messages: ${err.message}</p>`;
  }
}

function updateUnreadBadge(count) {
  const badge = document.getElementById('msgUnreadBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function renderMessagesList() {
  const el = document.getElementById('messagesList');
  if (!el) return;
  if (!messages.length) {
    el.innerHTML = '<div class="empty-state"><h3>No messages yet</h3><p>Messages from the contact form will appear here.</p></div>';
    return;
  }

  el.innerHTML = messages.map(m => `
    <div class="admin-item msg-item ${m.read ? '' : 'msg-unread'}" id="msg-item-${m._id}" style="flex-direction:column;align-items:stretch;gap:0;">

      <!-- ── Header row ── -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 18px;">
        <div class="admin-item-info" style="flex:1;min-width:0;">
          <div class="admin-item-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${m.read ? '' : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent-cyan);flex-shrink:0;" title="Unread"></span>'}
            <strong>${escapeHTML(m.name)}</strong>
            <span style="font-size:0.78rem;color:var(--text-muted);font-weight:400;">&lt;${escapeHTML(m.email)}&gt;</span>
          </div>
          <div class="admin-item-meta" style="margin-top:4px;">
            <span style="color:var(--text-primary);font-weight:600;">${escapeHTML(m.subject)}</span>
            <span style="color:var(--text-muted);"> · ${formatDate(m.createdAt)}</span>
          </div>
        </div>
        <div class="admin-item-actions" style="flex-shrink:0;align-items:center;">
          <button class="btn btn-primary" onclick="toggleReplyPanel('${m._id}')" style="padding:7px 16px;font-size:0.8rem;display:inline-flex;align-items:center;gap:6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
            Reply
          </button>
          ${!m.read ? `<button class="btn btn-outline" onclick="markMsgRead('${m._id}')" style="padding:7px 14px;font-size:0.8rem;" title="Mark as read">✓ Read</button>` : ''}
          <button class="btn btn-outline" onclick="deleteMsg('${m._id}')" style="padding:7px 14px;font-size:0.8rem;color:#ef4444;border-color:rgba(239,68,68,0.3);" title="Delete">🗑</button>
        </div>
      </div>

      <!-- ── Original message body ── -->
      <div style="padding:0 18px 14px;">
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;font-size:0.875rem;line-height:1.7;color:var(--text-secondary);white-space:pre-wrap;word-break:break-word;">${escapeHTML(m.message)}</div>
      </div>

      <!-- ── Reply history ── -->
      ${m.replies && m.replies.length ? `
        <div style="padding:0 18px 14px;">
          <p style="font-size:0.72rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Sent Replies (${m.replies.length})</p>
          ${m.replies.map(r => `
            <div style="display:flex;gap:10px;margin-bottom:10px;">
              <div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--gradient-main);display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#fff;font-weight:700;">J</div>
              <div style="flex:1;">
                <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">${formatDate(r.sentAt)}</div>
                <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:0 10px 10px 10px;padding:10px 14px;font-size:0.875rem;line-height:1.65;color:var(--text-secondary);white-space:pre-wrap;word-break:break-word;">${escapeHTML(r.body)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- ── Reply compose panel (hidden by default) ── -->
      <div id="reply-panel-${m._id}" class="reply-panel" style="display:none;">
        <div style="padding:14px 18px 18px;border-top:1px solid rgba(255,255,255,0.07);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" stroke-width="2.5"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
            <span style="font-size:0.8rem;font-weight:600;color:var(--text-primary);">Replying to ${escapeHTML(m.name)} &lt;${escapeHTML(m.email)}&gt;</span>
          </div>
          <textarea
            id="reply-textarea-${m._id}"
            class="form-input reply-textarea"
            placeholder="Type your reply here…"
            rows="5"
            style="width:100%;resize:vertical;font-family:var(--font-body);font-size:0.875rem;line-height:1.65;box-sizing:border-box;"
          ></textarea>
          <div style="display:flex;align-items:center;gap:10px;margin-top:10px;justify-content:flex-end;">
            <button class="btn btn-outline" onclick="toggleReplyPanel('${m._id}')" style="padding:8px 18px;font-size:0.83rem;">Cancel</button>
            <button class="btn btn-primary" id="reply-send-btn-${m._id}" onclick="sendReply('${m._id}')" style="padding:8px 22px;font-size:0.83rem;display:inline-flex;align-items:center;gap:7px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Send Reply
            </button>
          </div>
          <div id="reply-status-${m._id}" style="font-size:0.8rem;margin-top:8px;text-align:right;min-height:18px;"></div>
        </div>
      </div>

    </div>
  `).join('');
}


function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function markMsgRead(id) {
  try {
    const res = await apiFetch(`/api/messages/${id}/read`, 'PATCH');
    if (res.success) {
      const idx = messages.findIndex(m => m._id === id);
      if (idx !== -1) messages[idx].read = true;
      const unread = messages.filter(m => !m.read).length;
      updateUnreadBadge(unread);
      renderMessagesList();
    } else {
      showToast(res.message || 'Failed to mark as read.', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
window.markMsgRead = markMsgRead;

async function deleteMsg(id) {
  if (!confirm('Delete this message? This cannot be undone.')) return;
  try {
    const res = await apiFetch(`/api/messages/${id}`, 'DELETE');
    if (res.success) {
      messages = messages.filter(m => m._id !== id);
      const unread = messages.filter(m => !m.read).length;
      updateUnreadBadge(unread);
      renderMessagesList();
      showToast('Message deleted.', 'success');
    } else {
      showToast(res.message || 'Delete failed.', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
window.deleteMsg = deleteMsg;

// ── Toggle reply compose panel ────────────────────────────────────────────────
function toggleReplyPanel(id) {
  const panel = document.getElementById(`reply-panel-${id}`);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    // Smooth slide-in
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(-8px)';
    panel.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
    });
    setTimeout(() => document.getElementById(`reply-textarea-${id}`)?.focus(), 100);
  }
}
window.toggleReplyPanel = toggleReplyPanel;

// ── Send reply email ──────────────────────────────────────────────────────────
async function sendReply(id) {
  const textarea  = document.getElementById(`reply-textarea-${id}`);
  const sendBtn   = document.getElementById(`reply-send-btn-${id}`);
  const statusEl  = document.getElementById(`reply-status-${id}`);
  const replyBody = textarea?.value?.trim();

  if (!replyBody) {
    if (statusEl) { statusEl.textContent = '⚠ Please type a reply first.'; statusEl.style.color = '#f59e0b'; }
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 1s linear infinite"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Sending…`;
  if (statusEl) { statusEl.textContent = ''; }

  try {
    const res = await apiFetch(`/api/messages/${id}/reply`, 'POST', { replyBody });

    if (res.success) {
      if (statusEl) { statusEl.textContent = '✅ Reply sent!'; statusEl.style.color = '#22c55e'; }
      textarea.value = '';

      // Update local state with the returned doc (includes new reply)
      const idx = messages.findIndex(m => m._id === id);
      if (idx !== -1 && res.data) {
        messages[idx] = res.data;
      }

      // Close panel and re-render after a brief success moment
      setTimeout(() => {
        const unread = messages.filter(m => !m.read).length;
        updateUnreadBadge(unread);
        renderMessagesList();
        showToast(`Reply sent to ${res.data?.email || 'sender'} ✉️`, 'success');
      }, 800);
    } else {
      if (statusEl) { statusEl.textContent = `❌ ${res.message || 'Failed to send.'}`; statusEl.style.color = '#ef4444'; }
      sendBtn.disabled = false;
      sendBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Reply`;
    }
  } catch (err) {
    if (statusEl) { statusEl.textContent = `❌ Network error: ${err.message}`; statusEl.style.color = '#ef4444'; }
    sendBtn.disabled = false;
    sendBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Reply`;
  }
}
window.sendReply = sendReply;

// Mark all as read
document.getElementById('markAllReadBtn')?.addEventListener('click', async () => {
  const unread = messages.filter(m => !m.read);
  if (!unread.length) { showToast('No unread messages.', 'success'); return; }
  await Promise.all(unread.map(m => apiFetch(`/api/messages/${m._id}/read`, 'PATCH')));
  messages.forEach(m => { m.read = true; });
  updateUnreadBadge(0);
  renderMessagesList();
  showToast('All messages marked as read. ✅', 'success');
});

// Load messages when Messages tab is clicked
document.getElementById('tab-messages')?.addEventListener('click', () => {
  loadMessages();
});


