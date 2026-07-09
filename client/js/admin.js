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
  await Promise.all([loadProjects(), loadSkills()]);
  updateStats();
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
