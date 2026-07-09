/* ═══════════════════════════════════════════════════════════════════════
   main.js — Portfolio Data Fetching & Rendering
   Fetches projects & skills from backend API and renders them dynamically
═══════════════════════════════════════════════════════════════════════ */

// ── API Configuration ─────────────────────────────────────────────────
const API_BASE = (() => {
  const { hostname, origin } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1'
    ? `http://localhost:5000`
    : origin;
})();

// ── Footer Year ───────────────────────────────────────────────────────
document.getElementById('footer-year').textContent = new Date().getFullYear();

// ── Category → Emoji Map ──────────────────────────────────────────────
const CATEGORY_EMOJI = {
  fullstack: '🌐',
  frontend:  '🎨',
  backend:   '⚙️',
  other:     '📦',
};

// ═════════════════════════════════════════════════════════════════════
// SKILLS
// ═════════════════════════════════════════════════════════════════════
const skillsGrid   = document.getElementById('skillsGrid');
const skillsLoader = document.getElementById('skillsLoader');
let   allSkills    = [];

async function fetchSkills() {
  try {
    const res  = await fetch(`${API_BASE}/api/skills`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    allSkills = json.data;
    renderSkills(allSkills);
  } catch (err) {
    skillsGrid.innerHTML = `
      <div class="api-error">
        <div class="error-emoji">🔌</div>
        <p>Could not load skills. Make sure the server is running.</p>
        <code>${err.message}</code>
      </div>`;
    console.warn('Skills API error:', err.message);
  }
}

function renderSkills(skills) {
  skillsGrid.innerHTML = '';
  if (!skills.length) {
    skillsGrid.innerHTML = '<div class="empty-state"><h3>No skills yet</h3><p>Add skills via the admin panel.</p></div>';
    return;
  }

  skills.forEach((skill, i) => {
    const card = document.createElement('div');
    card.className = 'skill-card reveal';
    card.style.animationDelay = `${i * 60}ms`;
    card.innerHTML = `
      <div class="skill-card-header">
        <div class="skill-name-row">
          <div class="skill-icon">
            <i class="${skill.icon} colored" title="${skill.name}"></i>
          </div>
          <span class="skill-name">${escapeHTML(skill.name)}</span>
        </div>
        <span class="skill-percentage">${skill.level}%</span>
      </div>
      <div class="skill-bar-track">
        <div class="skill-bar-fill" data-level="${skill.level}" style="width:0%"></div>
      </div>
    `;
    skillsGrid.appendChild(card);
  });

  // Re-trigger reveal observer for new elements
  observeNewReveals(skillsGrid.querySelectorAll('.reveal'));
  // Animate skill bars
  if (window.animateSkillBars) window.animateSkillBars();
}

// Skill Filter
document.getElementById('skillsCategories')?.addEventListener('click', e => {
  const btn = e.target.closest('.skill-filter-btn');
  if (!btn) return;
  document.querySelectorAll('.skill-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filter = btn.dataset.filter;
  const filtered = filter === 'all' ? allSkills : allSkills.filter(s => s.category === filter);
  renderSkills(filtered);
});

// ═════════════════════════════════════════════════════════════════════
// PROJECTS
// ═════════════════════════════════════════════════════════════════════
const projectsGrid   = document.getElementById('projectsGrid');
const projectsLoader = document.getElementById('projectsLoader');
let   allProjects    = [];
let   currentFilter  = 'all';

async function fetchProjects() {
  try {
    const res  = await fetch(`${API_BASE}/api/projects`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    allProjects = json.data;
    renderProjects(allProjects);
  } catch (err) {
    projectsGrid.innerHTML = `
      <div class="api-error">
        <div class="error-emoji">🔌</div>
        <p>Could not load projects. Make sure the server is running.</p>
        <code>${err.message}</code>
      </div>`;
    console.warn('Projects API error:', err.message);
  }
}

function renderProjects(projects) {
  projectsGrid.innerHTML = '';
  if (!projects.length) {
    projectsGrid.innerHTML = `
      <div class="empty-state">
        <h3>No projects found</h3>
        <p>Add your first project via the admin panel.</p>
      </div>`;
    return;
  }

  projects.forEach((proj, i) => {
    const card = document.createElement('article');
    card.className = `project-card reveal ${proj.featured ? 'featured' : ''}`;
    card.style.animationDelay = `${i * 80}ms`;

    const techTags = proj.tech
      .map(t => `<span class="tech-tag">${escapeHTML(t)}</span>`)
      .join('');

    const githubLink = proj.githubUrl
      ? `<a href="${escapeHTML(proj.githubUrl)}" target="_blank" rel="noopener noreferrer" class="project-link" aria-label="View ${escapeHTML(proj.title)} on GitHub">
           <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
           Code
         </a>`
      : '';

    const liveLink = proj.liveUrl
      ? `<a href="${escapeHTML(proj.liveUrl)}" target="_blank" rel="noopener noreferrer" class="project-link primary" aria-label="View ${escapeHTML(proj.title)} live">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
           Live Demo
         </a>`
      : '';

    const emoji = CATEGORY_EMOJI[proj.category] || '📦';

    card.innerHTML = `
      <div class="project-image">
        ${proj.imageUrl
          ? `<img src="${escapeHTML(proj.imageUrl)}" alt="${escapeHTML(proj.title)}" loading="lazy" />`
          : `<div class="project-image-placeholder">${emoji}</div>`
        }
        ${proj.featured ? '<span class="project-featured-badge">⭐ Featured</span>' : ''}
        <span class="project-category-badge">${proj.category}</span>
      </div>
      <div class="project-body">
        <h3 class="project-title">${escapeHTML(proj.title)}</h3>
        <p class="project-desc">${escapeHTML(proj.description)}</p>
        <div class="project-tech">${techTags}</div>
        <div class="project-links">
          ${githubLink}
          ${liveLink}
        </div>
      </div>
    `;

    projectsGrid.appendChild(card);
  });

  observeNewReveals(projectsGrid.querySelectorAll('.reveal'));
}

// Project Filter
document.getElementById('projectFilters')?.addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  const filtered = currentFilter === 'all'
    ? allProjects
    : allProjects.filter(p => p.category === currentFilter);
  renderProjects(filtered);
});

// ═════════════════════════════════════════════════════════════════════
// CONTACT FORM
// ═════════════════════════════════════════════════════════════════════
const contactForm   = document.getElementById('contactForm');
const formStatus    = document.getElementById('formStatus');
const contactBtnText = document.getElementById('contact-btn-text');

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name    = document.getElementById('contact-name').value.trim();
  const email   = document.getElementById('contact-email').value.trim();
  const subject = document.getElementById('contact-subject').value.trim();
  const message = document.getElementById('contact-message').value.trim();

  if (!name || !email || !subject || !message) {
    showFormStatus('Please fill in all fields.', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showFormStatus('Please enter a valid email address.', 'error');
    return;
  }

  // Simulate sending (replace with EmailJS or backend endpoint)
  contactBtnText.textContent = 'Sending...';
  document.getElementById('contact-submit').disabled = true;

  await new Promise(r => setTimeout(r, 1200)); // Simulate network request

  showFormStatus(`Thanks ${name}! Your message has been received. I'll get back to you soon. 🚀`, 'success');
  contactForm.reset();
  contactBtnText.textContent = 'Send Message';
  document.getElementById('contact-submit').disabled = false;
});

function showFormStatus(msg, type) {
  formStatus.textContent = msg;
  formStatus.className   = `form-status ${type}`;
  setTimeout(() => { formStatus.className = 'form-status'; }, 6000);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ═════════════════════════════════════════════════════════════════════
// UTILITIES
// ═════════════════════════════════════════════════════════════════════
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Observe newly added .reveal elements (after API render)
function observeNewReveals(elements) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  elements.forEach(el => observer.observe(el));
}

// ═════════════════════════════════════════════════════════════════════
// INIT
// ═════════════════════════════════════════════════════════════════════
(function init() {
  fetchSkills();
  fetchProjects();
})();
