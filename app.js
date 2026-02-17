const API_URL = "https://retailer-white-lamp-surrey.trycloudflare.com"; // Update port if needed

const App = {
    user: JSON.parse(localStorage.getItem('user')),
    token: localStorage.getItem('token'),
    isReg: false,
    tags: ['Games', 'Art', 'Music', 'Stories', 'Tutorials', 'Animations'],
    selectedTags: [],
    currExploreTab: 'projects',
    currTag: 'All',
    currSearch: '',
    currSort: 'recent',
    currId: null,
    currPage: 0,
    commentPage: 0, 
    cropper: null,
    croppedFiles: {},
    replyingTo: null,
    guidelinesText: '',
    profData: null,
    isFullscreen: false,
    
    // STATES
    remixingId: null,
    editingId: null,
    highlightCommentId: null,
    listState: { page: 0, type: null, uid: null },
    currChannelId: null,
    
    // ASSETS
    defAvatar: `${API_URL}/assets/default.png`,
    defThumb: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%20fill%3D%22%23f1f5f9%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%2F%3E%3C%2Fsvg%3E",

    // --- HELPERS ---
    escapeHTML: (str) => { if(!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); },
    escapeJS: (str) => { if(!str) return ''; return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;'); },
    linkify: (t) => App.escapeHTML(t).replace(/@([a-zA-Z0-9_-]+)/g, '<a href="#user/$1" class="mention-link">@$1</a>'),
    setLoading: (bool) => { const el = document.getElementById('global-loader'); if(bool) el.classList.remove('hidden'); else el.classList.add('hidden'); },
    timeAgo: (dateStr) => { if(!dateStr) return 'Unknown'; const str = dateStr.endsWith('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z'; const diff = (new Date() - new Date(str)) / 1000; if(isNaN(diff)) return 'Unknown'; if(diff < 60) return 'Just now'; if(diff < 3600) return Math.floor(diff/60) + 'm ago'; if(diff < 86400) return Math.floor(diff/3600) + 'h ago'; return Math.floor(diff/86400) + 'd ago'; },

    // --- UI GENERATORS ---
    skeleton: (type) => {
        const pulse = 'animate-pulse bg-slate-200 rounded-xl';
        if (type === 'card') return `<div class="aspect-[4/3] ${pulse} mb-2"></div><div class="h-4 w-3/4 ${pulse} mb-2"></div><div class="h-3 w-1/2 ${pulse}"></div>`;
        if (type === 'list') return `<div class="flex gap-3 mb-3"><div class="w-10 h-10 rounded-full ${pulse}"></div><div class="flex-1"><div class="h-3 w-1/4 ${pulse} mb-1"></div><div class="h-8 w-full ${pulse}"></div></div></div>`.repeat(3);
        return `<div class="h-32 w-full ${pulse}"></div>`;
    },

    card: (p) => `<a href="#project/${p.id}" class="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 border border-slate-100"><div class="aspect-[4/3] bg-slate-100 overflow-hidden relative"><img src="${API_URL + p.thumbnail_path}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500"><div class="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1"><span>👁 ${p.views}</span></div></div><div class="p-3"><h3 class="font-bold text-slate-900 truncate text-sm">${App.escapeHTML(p.title)}</h3><div class="flex items-center gap-2 mt-2"><div class="relative shrink-0 w-5 h-5"><img src="${p.author_avatar ? API_URL + p.author_avatar : App.defAvatar}" class="w-full h-full rounded-full bg-slate-200 object-cover">${App.renderStatusDot(p.author_status || 'offline', 'w-2 h-2')}</div><span class="text-xs font-bold text-slate-500 truncate flex items-center">${App.escapeHTML(p.author_display || p.author)} ${App.renderBadges(p)} ${App.studioTag(p)}</span></div></div></a>`,

    studioCard: (s) => `<a href="#studio/${s.studio_id || s.id}" class="block bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition"><img src="${s.thumbnail_path ? API_URL + s.thumbnail_path : App.defThumb}" class="w-full h-32 object-cover"><div class="p-3"><h3 class="font-bold text-slate-900 truncate">${App.escapeHTML(s.title)}</h3><div class="flex justify-between items-center"><span class="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">${App.escapeHTML(s.role || 'Studio')}</span><span class="text-[10px] font-bold text-slate-400 flex items-center"><img src="${API_URL}/assets/hype.png" class="w-3 h-3 inline mr-1"> ${s.hype || 0} Hype</span></div></div></a>`,

    renderBadges: (u) => {
        let b = '';
        const style = 'class="inline-block ml-1 h-4 w-4 align-middle"';
        if (u.is_owner) b += `<img src="${API_URL}/assets/owner.png" title="Owner" ${style}>`;
        if (u.is_mod) b += `<img src="${API_URL}/assets/mod.png" title="Moderator" ${style}>`;
        if (u.is_gold) b += `<img src="${API_URL}/assets/gold.png" title="Gold Member" ${style}>`;
        if (u.is_verified) b += `<img src="${API_URL}/assets/verified.png" title="Verified" ${style}>`;
        return b;
    },

    renderStatusDot: (status, size = 'w-3 h-3') => {
        const colors = { 'online': 'bg-green-500', 'offline': 'bg-slate-300', 'dnd': 'bg-red-500' };
        return `<span class="${size} rounded-full ${colors[status] || 'bg-slate-300'} border-2 border-white absolute bottom-0 right-0 shadow-sm z-10" title="${status}"></span>`;
    },

    studioTag: (user) => {
        if (!user.tag_text) return '';
        const font = user.tag_font || 'sans-serif';
        const color = user.tag_color || '#334155';
        const isRainbow = user.is_verified && user.tag_is_rainbow && !user.disable_rainbow;
        const style = `font-family: ${font}; ${!isRainbow ? `color: ${color};` : ''}`;
        const rainbowClass = isRainbow ? 'rainbow-text' : '';
        return `<span class="studio-tag ${rainbowClass}" style="${style}" onclick="window.location.hash='#studio/${user.equipped_studio_tag_id}'; event.stopPropagation();"><img src="${API_URL + user.tag_image}">${App.escapeHTML(user.tag_text)}</span>`;
    },

    // --- INITIALIZATION ---
// --- INITIALIZATION ---
    init: async () => {
        if (API_URL.includes("INSERT_YOUR")) alert("Setup: Update API_URL in js/app.js");
        App.fetchGuidelines();
        
        // --- 1. NEW: Browser Connectivity Listeners (Immediate check) ---
        const handleConnectionChange = () => {
            if (!navigator.onLine) {
                // User lost internet
                document.querySelectorAll('section').forEach(el => el.classList.remove('active'));
                document.getElementById('offline-view').classList.add('active');
            } else {
                // User came back online
                if (document.getElementById('offline-view').classList.contains('active')) {
                    document.getElementById('offline-view').classList.remove('active');
                    App.router(); // Reload current view
                }
            }
        };
        window.addEventListener('online', handleConnectionChange);
        window.addEventListener('offline', handleConnectionChange);
        
        // Run check immediately on load
        if (!navigator.onLine) handleConnectionChange();

        // --- User Status Logic ---
        if (App.user) {
            document.addEventListener('visibilitychange', () => { 
                if (document.visibilityState === 'visible') App.setStatus('online', true); 
                else App.setStatus('offline', true); 
            });
            window.addEventListener('beforeunload', () => App.setStatus('offline', true));
            App.setStatus('online', true);
        }

        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                const isAuthRequest = typeof args[0] === 'string' && (args[0].includes('/api/login') || args[0].includes('/api/register'));

                if (response.status === 401 && !isAuthRequest) { 
                    App.logout(); 
                    throw new Error("Unauthorized"); 
                }

                if (response.status === 403) { 
                    try { 
                        const data = await response.clone().json(); 
                        if (data.error === 'ACCOUNT_BANNED') { App.showBanScreen(data.reason); return new Response(JSON.stringify({ error: 'Banned' }), { status: 403 }); }
                        if (data.error === 'IP_BANNED') { App.showBanScreen("Your IP address has been permanently banned."); return new Response(JSON.stringify({ error: 'IP Banned' }), { status: 403 }); }
                    } catch(e) { } 
                }
                return response;
            } catch(e) { 
                // --- 2. Catch Network Errors (Server Down) ---
                if(!document.getElementById('banned-view').classList.contains('active') && e.message !== "Unauthorized") { 
                    document.querySelectorAll('section').forEach(el => el.classList.remove('active')); 
                    document.getElementById('offline-view').classList.add('active'); 
                } 
                throw e; 
            }
        };

        if (App.user) { 
            setInterval(App.checkBanStatus, 10000); 
            App.checkNewsBadge(); 
        }
        
        window.addEventListener('hashchange', App.router);
        
        document.addEventListener('click', (e) => { 
            const dropdown = document.getElementById('nav-dropdown'); 
            if(dropdown && !dropdown.classList.contains('hidden') && !e.target.closest('button')?.onclick?.toString().includes('toggleNavDropdown')) {
                dropdown.classList.add('hidden');
            }
        });
        
        // Auto-switch Engine Listener
        const sb3Input = document.querySelector('input[name="sb3"]');
        if(sb3Input) {
            sb3Input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if(file) {
                    const ext = file.name.split('.').pop().toLowerCase();
                    const toggle = document.getElementById('mod-toggle');
                    if (ext === 'pmp') { 
                        toggle.checked = true; 
                        App.alert("Detected .pmp file: Switched to PenguinMod engine."); 
                    } else if (ext === 'sb3') { 
                        toggle.checked = false; 
                    }
                }
            });
        }

        App.renderNav(); 
        App.renderFilterTags(); 
        App.renderUploadTags(); 
        App.router();
    }, // Correctly ends the init function

    fetchGuidelines: async () => { try { const res = await fetch(`${API_URL}/api/guidelines`); const data = await res.json(); App.guidelinesText = data.text; } catch {} },
    showGuidelines: () => { App.showModal("Community Guidelines", `<div class="markdown-body text-sm">${marked.parse(App.guidelinesText || "Loading...")}</div>`, [{text:"Close"}]); },
    checkBanStatus: async () => { if (!App.token) return; try { const res = await fetch(`${API_URL}/api/me/status`, { headers: { 'Authorization': `Bearer ${App.token}` } }); if (res.status === 403) { const data = await res.json(); if (data.error === 'ACCOUNT_BANNED') App.showBanScreen(data.reason); } } catch {} },
    showBanScreen: (reason) => { document.querySelectorAll('section').forEach(el => el.classList.remove('active')); document.getElementById('banned-view').classList.add('active'); document.getElementById('ban-msg').innerText = reason || "Violation."; document.getElementById('nav-auth').innerHTML = ''; localStorage.clear(); App.user = null; window.scrollTo(0,0); },
    setupEnterSubmit: (inputId, buttonAction) => { const el = document.getElementById(inputId); if (!el) return; el.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); buttonAction(); } }; },

router: () => {
        // 1. Checks for bans or offline status
        if(document.getElementById('banned-view').classList.contains('active') && !App.user) return;
        if(document.getElementById('offline-view').classList.contains('active')) return;
        
        const hash = window.location.hash || '#home';
        
        // 2. Cleanup from previous views
        if (!hash.startsWith('#project/')) { document.getElementById('game-container').innerHTML = ''; App.isFullscreen = false; }
        if (hash !== '#upload') { App.remixingId = null; if(!App.editingId) document.getElementById('upload-form').reset(); document.getElementById('remix-alert').classList.add('hidden'); document.getElementById('edit-alert').classList.add('hidden'); App.editingId = null; }
        
        // 3. Reset all sections
        document.querySelectorAll('section').forEach(el => el.classList.remove('active'));
        window.scrollTo(0,0);

        // 4. Default Footer Visibility (Show it by default)
        const footer = document.querySelector('footer');
        if(footer) footer.style.display = 'block';

        // 5. Routing Logic
        if (hash.startsWith('#project/')) { 
            const parts = hash.split('/');
            const pid = parts[1];
            App.loadProjectGame(pid); 
            document.getElementById('project-view').classList.add('active'); 
            if(parts.length > 3 && parts[2] === 'comment') App.highlightCommentId = parts[3]; else App.highlightCommentId = null;
        } 
        else if (hash.startsWith('#user/')) { 
            App.loadProfile(hash.split('/')[1]); 
            document.getElementById('profile-view').classList.add('active'); 
        } 
        else if (hash.startsWith('#studio/')) { 
            App.loadStudio(hash.split('/')[1]); 
            document.getElementById('studio-view').classList.add('active'); 
        }
        else if (hash === '#mystuff') { 
            App.loadMyStuff(); 
            document.getElementById('mystuff-view').classList.add('active'); 
        }
        else if (hash === '#upload') { 
            if(!App.user) window.location.hash = '#auth'; 
            else {
                document.getElementById('upload-view').classList.add('active'); 
                if(!App.editingId && !App.remixingId) {
                   document.getElementById('upload-title').innerText = "Create Project";
                   document.getElementById('upload-btn').innerText = "Publish";
                   document.getElementById('edit-alert').classList.add('hidden');
                   document.getElementById('upload-form').reset();
                   App.selectedTags = []; App.renderUploadTags();
                   document.getElementById('prev-img').src = App.defThumb;
                   document.getElementById('prev-title').innerText = "Your Title Here";
                }
            }
        } 
        else if (hash === '#auth') {
            document.getElementById('auth-view').classList.add('active'); 
        }
        else if (hash === '#news') { 
            App.loadNews(); 
            document.getElementById('news-view').classList.add('active'); 
        }
        // --- NEW: Create Page (Full Screen Editor) ---
        else if (hash === '#create') {
            if(footer) footer.style.display = 'none'; // Hide footer for editor
            document.getElementById('create-view').classList.add('active');
        }
        // --- Default: Explore / Home ---
        else { 
            App.loadExplore(App.currSearch); 
            document.getElementById('home-view').classList.add('active'); 
        }
    },

    // --- AUTHENTICATION ---
    handleAuth: async (e) => { 
        e.preventDefault(); 
        const u = document.getElementById('auth-user').value; 
        const p = document.getElementById('auth-pass').value; 
        const end = App.isReg ? '/api/register' : '/api/login'; 
        
        if(App.isReg && !document.getElementById('tos-check').checked) return App.alert("Please accept the Guidelines.");
        
        const body = { username: u, password: p };
        
        if (App.isReg) {
            const dob = document.getElementById('auth-dob').value;
            if(!dob) return App.alert("Date of Birth is required.");
            body.dob = dob;
            
            if (typeof hcaptcha !== 'undefined') {
                const captchaToken = hcaptcha.getResponse();
                if (!captchaToken) return App.alert("Please complete the captcha.");
                body.captchaToken = captchaToken;
            }
        }

        try { 
            App.setLoading(true);
            const res = await fetch(`${API_URL}${end}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(body) 
            }); 
            
            const data = await res.json(); 
            App.setLoading(false);
            
            if(res.ok) { 
                if(App.isReg) { 
                    confetti({ particleCount: 150 }); 
                    App.alert('Registered! Please log in.'); 
                    if(typeof hcaptcha !== 'undefined') hcaptcha.reset(); 
                    App.toggleAuth(); 
                } else { 
                    App.user = data; 
                    App.token = data.token; 
                    localStorage.setItem('user', JSON.stringify(App.user)); 
                    localStorage.setItem('token', App.token); 
                    App.renderNav(); 
                    window.history.back(); 
                } 
            } else { 
                App.alert(data.error); 
                if(App.isReg && typeof hcaptcha !== 'undefined') hcaptcha.reset();
            } 
        } catch(e) { 
            App.setLoading(false);
            console.error(e);
            App.alert('Connection Error'); 
        } 
    },

    toggleAuth: () => { 
        App.isReg = !App.isReg; 
        document.getElementById('auth-title').innerText = App.isReg ? 'Create Account' : 'Sign In'; 
        document.getElementById('auth-terms').style.display = App.isReg ? 'flex' : 'none'; 
        document.getElementById('auth-dob-container').style.display = App.isReg ? 'block' : 'none';
        const cap = document.getElementById('captcha-container'); 
        if(cap){
            cap.style.display = App.isReg ? 'flex' : 'none';
            if(typeof hcaptcha !== 'undefined') hcaptcha.reset();
        } 
    },

    logout: () => { 
        localStorage.clear(); 
        App.user = null; 
        App.token = null; 
        App.renderNav(); 
        window.location.hash = '#home'; 
        window.location.reload(); 
    },

    // --- MAIN LOGIC ---
    remixProject: () => { if (!App.user) return window.location.hash = '#auth'; App.remixingId = App.currId; document.getElementById('remix-alert').classList.remove('hidden'); document.querySelector('#remix-alert span').innerText = `🔄 Remixing Project #${App.currId}`; window.location.hash = '#upload'; },
    cancelRemix: () => { App.remixingId = null; document.getElementById('remix-alert').classList.add('hidden'); },
    
    handleUpload: async (e) => { 
        e.preventDefault(); 
        const btn = document.getElementById('upload-btn'); 
        if(btn.disabled) return; 
        
        const sb3Input = document.querySelector('input[name="sb3"]');
        if (sb3Input && sb3Input.files[0]) {
            const name = sb3Input.files[0].name.toLowerCase();
            if (!name.endsWith('.sb3') && !name.endsWith('.pmp')) {
                return App.alert("Invalid file type. Please upload .sb3 or .pmp only.");
            }
        }

        const isEdit = !!App.editingId;
        btn.innerText = isEdit ? 'Updating...' : 'Publishing...'; 
        btn.disabled = true; 
        App.setLoading(true); 
        
        const fd = new FormData(e.target); 
        if (App.croppedFiles['thumbnail']) fd.set('thumbnail', App.croppedFiles['thumbnail'], App.croppedFiles['thumbnail'].type === 'image/gif' ? 'thumbnail.gif' : 'thumbnail.jpg'); 
        if (App.remixingId) fd.append('parent_id', App.remixingId);
        
        const modType = document.getElementById('mod-toggle').checked ? 'penguinmod' : 'turbowarp';
        fd.set('mod_type', modType);

        try {
            let url = `${API_URL}/api/upload`;
            let method = 'POST';
            if (isEdit) { url = `${API_URL}/api/projects/${App.editingId}`; method = 'PUT'; }
            const res = await fetch(url, { method: method, headers: { 'Authorization': `Bearer ${App.token}` }, body: fd }); 
            App.setLoading(false); 
            
            if (res.ok) { 
                App.alert(isEdit ? 'Project Updated!' : 'Published!'); 
                App.remixingId = null; App.editingId = null;
                window.location.hash = '#home'; 
                App.croppedFiles = {}; 
            } else { 
                const err = await res.json(); 
                App.alert(err.error || 'Failed.'); 
            }
        } catch (error) { App.setLoading(false); App.alert("Connection Error"); }
        btn.innerText = isEdit ? 'Update Project' : 'Publish'; btn.disabled = false; 
    },

    setStatus: async (status, silent = false) => { await fetch(`${API_URL}/api/me/status-update`, { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${App.token}`}, body: JSON.stringify({ status }) }); App.user.status = status; localStorage.setItem('user', JSON.stringify(App.user)); App.renderNav(); if(!silent) App.alert(`Status set to ${status.toUpperCase()}`); },

    switchExploreTab: (tab) => { App.currExploreTab = tab; ['projects', 'studios', 'users'].forEach(t => { document.getElementById(`tab-${t}`).className = t === tab ? "text-sm font-bold text-slate-900 border-b-2 border-slate-900 pb-2" : "text-sm font-bold text-slate-400 hover:text-slate-900 pb-2"; }); document.getElementById('explore-tags-container').style.display = tab === 'projects' ? 'block' : 'none'; App.renderFilters(tab); App.loadExplore(App.currSearch, true); },
    renderFilters: (tab) => {
        const c = document.getElementById('project-filters');
        let html = '';
        if(tab === 'projects') {
            html = `<button onclick="App.filterProjects('recent')" class="filter-btn active">Recent</button><button onclick="App.filterProjects('trending')" class="filter-btn">Trending 🔥</button><button onclick="App.filterProjects('popular')" class="filter-btn">Popular</button><button onclick="App.filterProjects('loved')" class="filter-btn">Most Loved ❤️</button>`;
        } else if (tab === 'studios') {
            html = `<button onclick="App.filterProjects('recent')" class="filter-btn active">Recent</button><button onclick="App.filterProjects('hype')" class="filter-btn">Most Hyped <img src="${API_URL}/assets/hype.png" class="w-3 h-3 inline"></button><button onclick="App.filterProjects('trending')" class="filter-btn">Trending</button><button onclick="App.filterProjects('popular')" class="filter-btn">Popular</button><button onclick="App.filterProjects('most_followed')" class="filter-btn">Most Followed</button>`;
        } else if (tab === 'users') {
            html = `<button onclick="App.filterProjects('recent')" class="filter-btn active">Recent</button><button onclick="App.filterProjects('most_followed')" class="filter-btn">Most Followed</button><button onclick="App.filterProjects('oldest')" class="filter-btn">Oldest</button>`;
        }
        c.innerHTML = html;
        c.style.display = 'flex';
        App.currSort = 'recent';
    },
    filterProjects: (sortType) => { 
        App.currSort = sortType; 
        document.querySelectorAll('.filter-btn').forEach(b => {
             if(b.innerText.toLowerCase().includes(sortType.replace('_', ' '))) b.classList.add('bg-slate-900', 'text-white');
             else b.classList.remove('bg-slate-900', 'text-white');
             b.className = `filter-btn px-3 py-1 rounded-lg text-xs font-bold transition ${b.onclick.toString().includes(sortType) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;
        });
        App.loadExplore(App.currSearch, true); 
    },
    loadExplore: async (search, reset = true) => {
        if (reset) { App.currPage = 0; App.currSearch = search; }
        const grid = document.getElementById('explore-grid');
        const loadMoreBtn = document.getElementById('load-more-container');
        loadMoreBtn.classList.add('hidden');
        if(reset) {
            grid.innerHTML = Array(8).fill(0).map(() => App.skeleton('card')).join('');
        }
        
        let featuredHTML = '';
        if (App.currExploreTab === 'projects' && !search && App.currTag === 'All' && App.currSort === 'recent' && reset) {
            const fRes = await fetch(`${API_URL}/api/explore?sort=featured`);
            const fData = await fRes.json();
            if (fData.length > 0) featuredHTML = `<div class="col-span-full mb-6"><h3 class="font-black text-xl text-slate-900 mb-4 flex items-center gap-2"><span class="bg-yellow-400 text-white p-1 rounded">⭐</span> Featured Projects</h3><div class="relative group"><div id="featured-carousel" class="flex gap-4 overflow-x-auto pb-4 snap-x scroll-smooth no-scrollbar">${fData.map(p => `<div class="min-w-[250px] w-[250px] snap-start flex-shrink-0">${App.card(p)}</div>`).join('')}</div><button onclick="document.getElementById('featured-carousel').scrollBy({left: -300, behavior: 'smooth'})" class="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 shadow-lg p-2 rounded-full hidden md:group-hover:block hover:bg-white">←</button><button onclick="document.getElementById('featured-carousel').scrollBy({left: 300, behavior: 'smooth'})" class="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 shadow-lg p-2 rounded-full hidden md:group-hover:block hover:bg-white">→</button></div></div><div class="col-span-full h-px bg-slate-200 my-6"></div>`;
        }
        const offset = App.currPage * 24;
        const res = await fetch(`${API_URL}/api/explore?type=${App.currExploreTab}&search=${search}&tag=${App.currTag}&sort=${App.currSort}&offset=${offset}`);
        const data = await res.json();
        let html = '';
        if(App.currExploreTab === 'projects') html = data.map(App.card).join('');
        else if(App.currExploreTab === 'studios') html = data.map(s => App.studioCard(s)).join('');
        else html = data.map(u => `<a href="#user/${u.username}" class="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-xl hover:shadow-md transition"><div class="relative shrink-0 w-10 h-10"><img src="${u.avatar_path ? API_URL + u.avatar_path : App.defAvatar}" class="w-full h-full rounded-full object-cover border border-slate-200">${App.renderStatusDot(u.status || 'offline')}</div><div><h3 class="font-bold text-sm text-slate-900 flex items-center">${App.escapeHTML(u.display_name || u.username)} ${App.renderBadges(u)} ${App.studioTag(u)}</h3><p class="text-[10px] text-slate-400">@${App.escapeHTML(u.username)}</p></div></a>`).join('');
        if (reset) grid.innerHTML = featuredHTML + html; else grid.insertAdjacentHTML('beforeend', html);
        if(data.length === 24) loadMoreBtn.classList.remove('hidden');
        if(data.length === 0 && reset && !featuredHTML) grid.innerHTML = `<p class="col-span-full text-center text-slate-400 py-10">Nothing found.</p>`;
    },
    loadMoreExplore: () => { App.currPage++; App.loadExplore(App.currSearch, false); },

    openNews: () => window.location.hash = '#news',
    loadNews: async () => {
        const grid = document.getElementById('news-grid');
        grid.innerHTML = App.skeleton('list');
        const res = await fetch(`${API_URL}/api/news`);
        const data = await res.json();
        if (data.length > 0) { const latestId = Math.max(...data.map(n => n.id)); localStorage.setItem('lastNewsId', latestId); document.getElementById('nav-news-badge').classList.add('hidden'); }
        grid.innerHTML = data.map(n => `<div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mb-6"><div class="flex items-center justify-between mb-4 border-b border-slate-50 pb-4"><h3 class="text-2xl font-black text-slate-900">${App.escapeHTML(n.title)}</h3><div class="text-right"><p class="text-xs font-bold text-slate-400">${App.timeAgo(n.created_at)}</p>${n.author_name ? `<a href="#user/${n.author_name}" class="text-xs text-purple-600 font-bold hover:underline">by ${App.escapeHTML(n.author_name)} ${App.renderBadges(n)}</a>` : ''}</div></div><div class="markdown-body text-slate-600 leading-relaxed text-sm mb-6">${marked.parse(n.content)}</div><div class="bg-slate-50 rounded-xl p-4"><button onclick="App.toggleNewsComments(${n.id})" class="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-2">💬 Comments (${n.comment_count})</button><div id="news-comments-${n.id}" class="hidden mt-4"><div class="flex gap-2 mb-4"><input id="news-input-${n.id}" maxlength="150" class="flex-1 p-2 rounded border border-slate-200 text-sm" placeholder="Write a comment..."><button id="news-btn-${n.id}" onclick="App.postNewsComment(${n.id})" class="bg-purple-600 text-white px-3 py-1 rounded text-sm font-bold">Post</button></div><div id="news-list-${n.id}" class="space-y-3"></div><button id="news-load-${n.id}" onclick="App.loadNewsComments(${n.id}, true)" class="hidden text-xs text-purple-600 font-bold mt-2">Load More</button></div></div></div>`).join('');
        if(!data.length) grid.innerHTML = `<p class="text-center text-slate-400">No news yet.</p>`;
    },
    toggleNewsComments: (nid) => { const div = document.getElementById(`news-comments-${nid}`); if(div.classList.contains('hidden')) { div.classList.remove('hidden'); App.loadNewsComments(nid); setTimeout(() => App.setupEnterSubmit(`news-input-${nid}`, () => App.postNewsComment(nid)), 100); } else { div.classList.add('hidden'); } },
    loadNewsComments: async (nid, append = false) => { const list = document.getElementById(`news-list-${nid}`); const offset = append ? list.children.length : 0; const res = await fetch(`${API_URL}/api/news/${nid}/comments?offset=${offset}`); const comms = await res.json(); const html = comms.map(c => `<div class="flex gap-2"><div class="relative shrink-0 w-6 h-6"><img src="${c.avatar_path ? API_URL + c.avatar_path : App.defAvatar}" class="w-full h-full rounded-full object-cover">${App.renderStatusDot(c.status || 'offline')}</div><div class="bg-white p-2 rounded border border-slate-200 text-xs w-full"><a href="#user/${c.username}" class="font-bold text-slate-700 flex items-center">${App.escapeHTML(c.username)} ${App.renderBadges(c)}</a><p>${App.linkify(c.content)}</p></div></div>`).join(''); if(append) list.insertAdjacentHTML('beforeend', html); else list.innerHTML = html; const loadBtn = document.getElementById(`news-load-${nid}`); if(comms.length === 20) loadBtn.classList.remove('hidden'); else loadBtn.classList.add('hidden'); },
    postNewsComment: async (nid) => { if(!App.user) return window.location.hash = '#auth'; const inp = document.getElementById(`news-input-${nid}`); const btn = document.getElementById(`news-btn-${nid}`); if(!inp.value.trim() || btn.disabled) return; btn.disabled = true; await fetch(`${API_URL}/api/news/${nid}/comments`, { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${App.token}`}, body: JSON.stringify({ content: inp.value }) }); inp.value = ''; btn.disabled = false; App.loadNewsComments(nid); },
    checkNewsBadge: async () => { try { const res = await fetch(`${API_URL}/api/news/latest-id`); const { id } = await res.json(); const lastRead = parseInt(localStorage.getItem('lastNewsId') || '0'); if (id > lastRead) document.getElementById('nav-news-badge').classList.remove('hidden'); } catch {} },

    loadStudio: async (id) => {
        App.currId = id;
        App.setLoading(true);
        const res = await fetch(`${API_URL}/api/studios/${id}`, { headers: App.token ? { 'Authorization': `Bearer ${App.token}` } : {} });
        App.setLoading(false);
        if(!res.ok) return; 
        const s = await res.json();
        
        document.getElementById('stu-title').innerHTML = App.linkify(s.title);
        if (s.hype >= 15 && s.custom_title_color) document.getElementById('stu-title').style.color = s.custom_title_color;
        else document.getElementById('stu-title').style.color = '';
        if (s.hype >= 10 && s.custom_title_font) document.getElementById('stu-title').style.fontFamily = s.custom_title_font;
        else document.getElementById('stu-title').style.fontFamily = '';
        if (s.hype >= 30) document.getElementById('stu-title').classList.add('rainbow-text');
        else document.getElementById('stu-title').classList.remove('rainbow-text');

        document.getElementById('stu-desc').innerHTML = App.linkify(s.description);
        document.getElementById('stu-date').innerText = `Created ${App.timeAgo(s.created_at)}`;
        document.getElementById('stu-thumb').src = s.thumbnail_path ? API_URL + s.thumbnail_path : App.defThumb;
        
        const ownerTagProps = { tag_text: s.owner_tag_text, tag_image: s.owner_tag_image, equipped_studio_tag_id: s.owner_equipped_tag, tag_color: s.owner_tag_color, tag_font: s.owner_tag_font, is_verified: s.is_owner_verified, tag_is_rainbow: s.owner_tag_is_rainbow, disable_rainbow: s.owner_disable_rainbow };
        document.getElementById('stu-owner-name').innerHTML = `${App.escapeHTML(s.owner_display || s.owner_name)} ${App.renderBadges(s)} ${App.studioTag(ownerTagProps)}`;
        document.getElementById('stu-owner-img').src = s.owner_avatar ? API_URL + s.owner_avatar : App.defAvatar;
        const bannerEl = document.getElementById('stu-banner'); bannerEl.style.backgroundImage = s.banner_path ? `url('${API_URL + s.banner_path}')` : 'none';
        
        // Members Grouping
        App.renderStudioMembers(s.members, s.permissions);

        const followBtn = document.getElementById('stu-follow-btn'); const adoptBtn = document.getElementById('stu-adopt-btn'); const editBtn = document.getElementById('stu-edit-btn'); const inviteBtn = document.getElementById('stu-invite-btn');
        if(App.user) { 
            followBtn.style.display = 'block'; followBtn.innerText = s.isFollowing ? "Unfollow" : "Follow"; 
            adoptBtn.style.display = s.isFollowing ? 'block' : 'none'; 
            inviteBtn.style.display = 'block';
            inviteBtn.onclick = () => App.inviteToStudioModal();

            const isEquipped = App.user.equipped_studio_tag_id === s.id; 
            adoptBtn.innerText = isEquipped ? "Unadopt Tag" : "Adopt Tag"; 
            adoptBtn.className = isEquipped ? "flex-1 bg-red-50 text-red-500 border border-red-100 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-100" : "flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm"; 
            adoptBtn.onclick = isEquipped ? App.unadoptStudioTag : App.adoptStudioTag; 
            
            if (s.permissions.manage_settings) { 
                editBtn.classList.remove('hidden'); 
                editBtn.onclick = () => App.createStudioModal(s); 
            } else { 
                editBtn.classList.add('hidden'); 
            } 
        } else { 
            followBtn.style.display = 'none'; adoptBtn.style.display = 'none'; editBtn.classList.add('hidden'); inviteBtn.style.display = 'none';
        }
        
        const isMember = s.members.find(m => m.id === App.user?.id); document.getElementById('stu-join-btn').style.display = (!isMember && App.user) ? 'block' : 'none'; document.getElementById('stu-add-btn').style.display = (s.permissions.add_projects || s.allow_public_adds) ? 'block' : 'none';
        
        const settingsTab = document.getElementById('stu-tab-settings'); 
        if (s.permissions.manage_settings || s.permissions.manage_roles) { 
            settingsTab.classList.remove('hidden'); 
            document.getElementById('stu-tag-text').value = s.tag_text || '';
            document.getElementById('stu-tag-color').value = s.tag_color || '#334155';
            document.getElementById('stu-tag-font').value = s.tag_font || 'sans-serif';
            App.renderRoleEditor(s.roles); 
            App.renderMilestoneConfig(s.milestone_config); // Configurable milestones
        } else { 
            settingsTab.classList.add('hidden'); 
        }
        
        // --- CHANNELS RENDERING ---
        const channelList = document.getElementById('stu-channels-list');
        const addChannelBtn = document.getElementById('stu-add-channel-btn');
        if (s.permissions.manage_settings) addChannelBtn.classList.remove('hidden');
        else addChannelBtn.classList.add('hidden');

        channelList.innerHTML = s.channels.map(c => `
            <button onclick="App.switchStudioChannel(${c.id}, '${App.escapeJS(c.name)}')" class="flex justify-between items-center group w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition ${App.currChannelId === c.id ? 'bg-slate-200 text-slate-900' : ''}">
                <span># ${App.escapeHTML(c.name)}</span>
            </button>
        `).join('') || '<p class="text-[10px] text-slate-400 italic px-3">No channels.</p>';

        // --- HYPE ---
        const hypeBar = document.getElementById('stu-hype-fill');
        const hypeCount = document.getElementById('stu-hype-count');
        const hypeBtn = document.getElementById('stu-hype-btn');
        hypeCount.innerHTML = `<img src="${API_URL}/assets/hype.png" class="w-6 h-6 inline mr-2 object-contain"> ${s.hype} Hype`;
        
        const nextMilestone = s.hype < 10 ? 10 : s.hype < 15 ? 15 : s.hype < 30 ? 30 : s.hype < 60 ? 60 : 100;
        const progress = Math.min(100, (s.hype / nextMilestone) * 100);
        hypeBar.style.width = `${progress}%`;
        
        if (App.user) {
            const maxHype = App.user.is_verified ? 2 : 1;
            const dailyUsed = s.user_daily_hype || 0;
            if (dailyUsed >= maxHype) {
                hypeBtn.disabled = true;
                hypeBtn.innerText = "Hype Limit Reached";
                hypeBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                hypeBtn.disabled = false;
                hypeBtn.innerText = `Hype! (${dailyUsed}/${maxHype})`;
                hypeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                hypeBtn.onclick = () => App.hypeStudio(s.id);
            }
        } else {
             hypeBtn.disabled = true;
             hypeBtn.innerText = "Log in to Hype";
        }

        // --- CUSTOMIZABLE MILESTONES DISPLAY ---
        const msConfig = JSON.parse(s.milestone_config || '{}');
        const milestones = [
            { h: 10, k: 'font', t: 'Custom Title Font' },
            { h: 15, k: 'color', t: 'Custom Title Color' },
            { h: 30, k: 'rainbow', t: 'Rainbow Title Effect' },
            { h: 60, k: 'gif', t: 'GIF Thumbnail & Banner' },
            { h: 100, k: 'promo', t: 'Studio Promotion' }
        ];

        document.getElementById('stu-milestones-grid').innerHTML = milestones.map(m => {
             if (msConfig[m.k] === false) return ''; // Hide if disabled by owner
             const unlocked = s.hype >= m.h;
             return `<div class="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3"><span class="font-black text-xl ${unlocked ? 'text-green-500' : 'text-slate-300'}">${m.h}</span><span class="${unlocked ? 'text-green-600 font-bold' : 'text-slate-400 text-sm'}">${m.t}</span></div>`;
        }).join('');

        document.getElementById('stu-projects').innerHTML = s.projects.map(p => {
             const canRemove = (s.permissions.add_projects && p.user_id === App.user?.id) || s.owner_id === App.user?.id;
             return `<div class="relative group">${App.card(p)}${canRemove ? `<button onclick="App.removeProjectFromStudio(${s.id}, ${p.id})" class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">Remove</button>`:''}</div>`;
        }).join(''); 

        App.switchStudioTab('projects');
    },

    // --- STUDIO CHANNELS ---
    addChannelModal: () => {
        const name = prompt("Channel Name (no spaces):");
        if(name) {
             const cleanName = name.replace(/\s+/g, '-').toLowerCase();
             fetch(`${API_URL}/api/studios/${App.currId}/channels`, { 
                 method: 'POST', 
                 headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${App.token}`}, 
                 body: JSON.stringify({ name: cleanName }) 
             }).then(() => App.loadStudio(App.currId));
        }
    },
    switchStudioChannel: (cid, cname) => {
        App.currChannelId = cid;
        document.getElementById('stu-projects-area').style.display = 'none';
        document.getElementById('stu-chat-area').style.display = 'flex'; // Use flex for sticky footer layout
        document.getElementById('stu-members-area').style.display = 'none';
        document.getElementById('stu-hype-area').style.display = 'none';
        document.getElementById('stu-settings-area').style.display = 'none';
        
        document.getElementById('stu-channel-name').innerText = `# ${cname}`;
        
        document.getElementById('stu-del-channel-btn').onclick = () => App.deleteChannel(cid);
        document.getElementById('stu-del-channel-btn').classList.remove('hidden'); 

        App.commentPage = 0;
        App.loadComments('studio_channel', App.currId, 'stu-comments-list', true); // Special type
        setTimeout(() => App.setupEnterSubmit('stu-comment-input', App.postStudioComment), 100);
    },
    deleteChannel: async (cid) => {
        if(confirm("Delete this channel and all messages?")) {
            await fetch(`${API_URL}/api/studios/${App.currId}/channels/${cid}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${App.token}` } });
            App.loadStudio(App.currId);
        }
    },

    inviteToStudioModal: async () => {
        const res1 = await fetch(`${API_URL}/api/users/${App.user.id}/following`);
        const following = await res1.json();
        const res2 = await fetch(`${API_URL}/api/users/${App.user.id}/followers`);
        const followers = await res2.json();
        
        const users = [...new Map([...following, ...followers].map(item => [item['id'], item])).values()];
        
        const html = users.length ? `<div class="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">${users.map(u => `<div class="flex justify-between items-center p-2 border rounded hover:bg-slate-50"><span class="font-bold text-sm">${App.escapeHTML(u.username)}</span><button onclick="App.sendInvite(${u.id})" class="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded font-bold">Invite</button></div>`).join('')}</div>` : `<p>No followers/following to invite.</p>`;
        App.showModal("Invite Users", html, [{text:"Close"}]);
    },
    sendInvite: async (uid) => {
        const res = await fetch(`${API_URL}/api/studios/${App.currId}/invite`, { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${App.token}`}, body: JSON.stringify({ userId: uid }) });
        if(res.ok) App.alert("Invite Sent!");
        else { const e = await res.json(); App.alert(e.error); }
    },
    acceptInvite: async (iid) => {
        const res = await fetch(`${API_URL}/api/studios/accept-invite`, { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${App.token}`}, body: JSON.stringify({ inviteId: iid }) });
        if(res.ok) {
            const d = await res.json();
            App.alert("Joined!");
            window.location.hash = `#studio/${d.studio_id}`;
        }
    },

    renderMilestoneConfig: (configStr) => {
        const config = JSON.parse(configStr || '{}');
        const options = [
            { k: 'font', t: 'Custom Title Font (10 Hype)' },
            { k: 'color', t: 'Custom Title Color (15 Hype)' },
            { k: 'rainbow', t: 'Rainbow Effect (30 Hype)' },
            { k: 'gif', t: 'GIFs (60 Hype)' },
            { k: 'promo', t: 'Promotion (100 Hype)' }
        ];
        
        document.getElementById('stu-milestone-config').innerHTML = options.map(o => `
            <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-slate-700">${o.t}</span>
                <input type="checkbox" onchange="App.updateMilestoneConfig('${o.k}', this.checked)" ${config[o.k] !== false ? 'checked' : ''} class="w-4 h-4 accent-purple-600">
            </div>
        `).join('');
    },
    updateMilestoneConfig: async (key, val) => {
        const inputs = document.querySelectorAll('#stu-milestone-config input');
        const keys = ['font', 'color', 'rainbow', 'gif', 'promo'];
        const newConfig = {};
        keys.forEach((k, i) => newConfig[k] = inputs[i].checked);

        await fetch(`${API_URL}/api/studios/${App.currId}/milestones`, { 
            method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${App.token}`}, 
            body: JSON.stringify({ config: newConfig }) 
        });
    },

    renderStudioMembers: (members, permissions) => {
        const container = document.getElementById('stu-members');
        const grouped = {};
        const host = members.find(m => m.role_name === 'Host');
        const others = members.filter(m => m.role_name !== 'Host');
        if(host) grouped['Host'] = [host];
        others.forEach(m => {
            if(!grouped[m.role_name]) grouped[m.role_name] = [];
            grouped[m.role_name].push(m);
        });

        let html = '';
        for (const [role, mems] of Object.entries(grouped)) {
            html += `<div class="mb-3"><h4 class="text-xs font-bold uppercase text-slate-400 mb-2 border-b border-slate-100 pb-1">${role}s</h4>`;
            html += mems.map(m => `<div class="flex items-center justify-between bg-slate-50 p-2 rounded mb-1"><div class="flex items-center gap-2"><div class="relative shrink-0 w-6 h-6"><img src="${m.avatar_path ? API_URL + m.avatar_path : App.defAvatar}" class="w-full h-full rounded-full object-cover">${App.renderStatusDot(m.status || 'offline')}</div><a href="#user/${m.username}" class="text-xs font-bold text-slate-700 flex items-center hover:text-purple-600">${App.escapeHTML(m.display_name || m.username)} ${App.renderBadges(m)} ${App.studioTag(m)}</a></div>${(permissions.manage_members && m.role_name !== 'Host') ? `<button onclick="App.changeRoleModal(${m.id})" class="text-[10px] text-purple-600 font-bold hover:underline">Edit</button>` : ''}</div>`).join('');
            html += `</div>`;
        }
        container.innerHTML = html;
    },

    hypeStudio: async (sid) => {
        if(!App.user) return;
        try {
            const res = await fetch(`${API_URL}/api/studios/${sid}/hype`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` } });
            if(res.ok) {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                App.loadStudio(sid);
            } else {
                const err = await res.json();
                App.alert(err.error);
            }
        } catch(e) { App.alert("Connection Error"); }
    },

    switchStudioTab: async (tab) => {
        App.currChannelId = null; // Reset channel
        ['projects', 'hype', 'settings', 'members'].forEach(t => { 
            const btn = document.getElementById(`stu-tab-${t}`); 
            if (btn) {
                 if (t === tab) btn.classList.add('bg-slate-200', 'text-slate-900');
                 else btn.classList.remove('bg-slate-200', 'text-slate-900');
            }
        });
        
        document.getElementById('stu-projects-area').style.display = tab === 'projects' ? 'block' : 'none';
        document.getElementById('stu-chat-area').style.display = 'none';
        document.getElementById('stu-members-area').style.display = tab === 'members' ? 'block' : 'none';
        document.getElementById('stu-hype-area').style.display = tab === 'hype' ? 'block' : 'none';
        document.getElementById('stu-settings-area').style.display = tab === 'settings' ? 'block' : 'none';
    },

    renderRoleEditor: (roles) => { const container = document.getElementById('stu-roles-list'); const permLabels = { 'manage_settings': 'Manage Settings', 'manage_roles': 'Manage Roles', 'manage_members': 'Manage Members', 'add_projects': 'Add Projects' }; container.innerHTML = roles.map(r => { if (r.name === 'Host') return ''; const perms = JSON.parse(r.permissions); const checks = Object.keys(permLabels).map(key => `<label class="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-slate-100 hover:border-purple-200 transition"><input type="checkbox" onchange="App.updateRolePerm(${r.id}, '${key}', this.checked)" ${perms.includes(key) ? 'checked' : ''} class="w-4 h-4 accent-purple-600 rounded"><span class="text-xs font-bold text-slate-600">${permLabels[key]}</span></label>`).join(''); return `<div class="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm mb-3"><div class="flex justify-between items-center mb-3 border-b border-slate-200 pb-2"><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-purple-500"></span><input value="${App.escapeHTML(r.name)}" onchange="App.updateRoleName(${r.id}, this.value)" class="bg-transparent font-bold text-sm focus:border-purple-500 outline-none text-slate-900 w-32"></div><button onclick="App.deleteRole(${r.id})" class="text-xs text-red-400 font-bold hover:text-red-600 bg-white px-2 py-1 rounded border border-red-100">Delete</button></div><div class="grid grid-cols-2 gap-2">${checks}</div></div>`; }).join(''); },
    updateStudioTag: async () => { 
        const text = document.getElementById('stu-tag-text').value.toUpperCase(); 
        const color = document.getElementById('stu-tag-color').value;
        const font = document.getElementById('stu-tag-font').value;
        if (text.length > 6) return App.alert("Tag too long (max 6)."); 
        await fetch(`${API_URL}/api/studios/${App.currId}/tag`, { method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${App.token}`}, body: JSON.stringify({ tag_text: text, tag_color: color, tag_font: font }) }); 
        App.loadStudio(App.currId); 
    },
    adoptStudioTag: async () => { if(confirm("Adopt this studio's tag?")) { await fetch(`${API_URL}/api/me/tag/${App.currId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` } }); App.user.equipped_studio_tag_id = App.currId; localStorage.setItem('user', JSON.stringify(App.user)); App.alert("Tag Equipped!"); App.loadStudio(App.currId); } },
    unadoptStudioTag: async () => { if(confirm("Remove your current studio tag?")) { await fetch(`${API_URL}/api/me/tag`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${App.token}` } }); App.user.equipped_studio_tag_id = null; localStorage.setItem('user', JSON.stringify(App.user)); App.alert("Tag Removed!"); if(location.hash.startsWith('#studio')) App.loadStudio(App.currId); else if(location.hash.startsWith('#user')) App.loadProfile(App.user.username); } },
    addRoleModal: () => { const name = prompt("Role Name:"); if (name) fetch(`${API_URL}/api/studios/${App.currId}/roles`, { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization':`Bearer ${App.token}`}, body: JSON.stringify({ name }) }).then(()=>App.loadStudio(App.currId)); },
    updateRoleName: (rid, name) => { fetch(`${API_URL}/api/studios/${App.currId}/roles/${rid}`, { method: 'PUT', headers: {'Content-Type':'application/json', 'Authorization':`Bearer ${App.token}`}, body: JSON.stringify({ name }) }); },
    updateRolePerm: async (rid, perm, checked) => { await fetch(`${API_URL}/api/studios/${App.currId}/roles/${rid}/perm`, { method: 'PUT', headers: {'Content-Type':'application/json', 'Authorization':`Bearer ${App.token}`}, body: JSON.stringify({ perm, value: checked }) }); },
    deleteRole: (rid) => { if(confirm("Delete role?")) fetch(`${API_URL}/api/studios/${App.currId}/roles/${rid}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${App.token}` } }).then(()=>App.loadStudio(App.currId)); },
    
    changeRoleModal: async (uid) => { 
        const res = await fetch(`${API_URL}/api/studios/${App.currId}/roles`); 
        const roles = await res.json(); 
        const html = `<div class="space-y-4"><p class="text-sm text-slate-600 font-bold">Select a new role for this member:</p><div class="space-y-2">${roles.map(r => `<label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition"><input type="radio" name="role_select" value="${r.id}" class="w-4 h-4 accent-purple-600"><span class="font-bold text-sm text-slate-800">${App.escapeHTML(r.name)}</span></label>`).join('')}</div></div>`;
        App.showModal("Change Role", html, [{text: "Cancel"}, {text: "Save", primary: true, action: async () => { const selected = document.querySelector('input[name="role_select"]:checked'); if (!selected) return App.alert("Please select a role."); await fetch(`${API_URL}/api/studios/${App.currId}/members/${uid}/role`, { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization':`Bearer ${App.token}`}, body: JSON.stringify({ role_id: selected.value }) }); document.getElementById('modal-overlay').classList.add('hidden'); App.loadStudio(App.currId); }}]);
    },

    postStudioComment: async () => { 
        const inp = document.getElementById('stu-comment-input'); 
        const btn = inp.nextElementSibling; 
        if(!inp.value.trim() || btn.disabled) return; 
        btn.disabled = true; 
        const body = { content: inp.value };
        if(App.currChannelId) body.channel_id = App.currChannelId;
        await fetch(`${API_URL}/api/studios/${App.currId}/comments`, { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${App.token}`}, body: JSON.stringify(body) }); 
        inp.value = ''; 
        btn.disabled = false; 
        App.commentPage = 0; 
        App.loadComments('studio_channel', App.currId, 'stu-comments-list', true); 
    },

    toggleStudioFollow: async () => { await fetch(`${API_URL}/api/studios/${App.currId}/follow`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` } }); App.loadStudio(App.currId); },
    joinStudio: async () => { await fetch(`${API_URL}/api/studios/${App.currId}/join`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` } }); App.loadStudio(App.currId); },
    
    addToStudioModal: async () => { 
        const res = await fetch(`${API_URL}/api/me/stuff`, { headers: { 'Authorization': `Bearer ${App.token}` } }); 
        const { projects } = await res.json(); 
        const fRes = await fetch(`${API_URL}/api/users/${App.user.id}`);
        const fData = await fRes.json();
        const favs = fData.favorites || [];
        const allProjs = [...projects, ...favs.map(f => ({...f, isFav: true}))];
        const unique = Array.from(new Map(allProjs.map(item => [item['id'], item])).values());
        const html = unique.length ? `<div class="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">${unique.map(p => `<div onclick="App.addProjectToStudio(${p.id})" class="cursor-pointer border p-2 rounded hover:bg-slate-50 relative"><img src="${API_URL + p.thumbnail_path}" class="w-full h-20 object-cover rounded mb-1"><p class="text-xs font-bold truncate">${App.escapeHTML(p.title)}</p>${p.isFav?'<span class="absolute top-1 right-1 bg-yellow-400 text-white text-[10px] px-1 rounded">Fav</span>':''}</div>`).join('')}</div>` : `<p>No projects.</p>`; App.showModal("Add Project", html, [{text:"Cancel"}]); 
    },
    addProjectToStudio: async (pid) => { await fetch(`${API_URL}/api/studios/${App.currId}/add-project`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${App.token}` }, body: JSON.stringify({ project_id: pid }) }); document.getElementById('modal-overlay').classList.add('hidden'); App.loadStudio(App.currId); },
    removeProjectFromStudio: async (sid, pid) => { if(confirm("Remove this project from the studio?")) { await fetch(`${API_URL}/api/studios/${sid}/projects/${pid}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${App.token}` } }); App.loadStudio(sid); } },

    loadProjectGame: async (id) => {
        App.currId = id;
        App.setLoading(true);
        const res = await fetch(`${API_URL}/api/projects/${id}`, { headers: App.token ? { 'Authorization': `Bearer ${App.token}` } : {} });
        App.setLoading(false);
        if(!res.ok) return window.history.back();
        const p = await res.json();
        const container = document.getElementById('game-container');
        container.style.maxWidth = '640px'; container.style.margin = '0 auto';
        container.innerHTML = `<div class="relative w-full h-full group cursor-pointer" onclick="App.playGame('${p.sb3_path}', ${p.width}, ${p.height}, '${p.mod_type}')"><img src="${API_URL + p.thumbnail_path}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500"><div class="absolute inset-0 flex items-center justify-center"><button class="bg-purple-600 text-white pl-8 pr-6 py-4 rounded-full font-black text-xl shadow-2xl hover:scale-110 hover:bg-purple-500 transition flex items-center gap-3 ring-4 ring-white/20 backdrop-blur-sm"><svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>Play</button></div></div>`;
        
        // Setup Sticky Comment Form Container in DOM structure
        const commentListContainer = document.getElementById('comment-list');
        if (!document.getElementById('comment-form-container')) {
             const stickyContainer = document.createElement('div');
             stickyContainer.id = 'comment-form-container';
             stickyContainer.className = 'sticky-comment-bar rounded-xl shadow-lg border border-slate-200 mt-4 bg-white';
             stickyContainer.innerHTML = `
                <div class="flex gap-2 relative">
                    <button id="reply-cancel-btn" onclick="App.cancelReply()" class="hidden absolute -top-8 right-0 bg-red-50 text-red-500 text-xs px-2 py-1 rounded font-bold">Cancel Reply</button>
                    <input id="comment-input" class="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-pink-500 transition" placeholder="Add a comment..." maxlength="150">
                    <button onclick="App.postComment()" class="bg-purple-600 text-white px-4 rounded-lg font-bold text-sm hover:bg-purple-700 transition">Post</button>
                </div>
             `;
             commentListContainer.parentNode.insertBefore(stickyContainer, commentListContainer.nextSibling);
             App.setupEnterSubmit('comment-input', App.postComment);
        }

        App.renderProjectDetails(p);
    },
    playGame: (sb3Path, w, h, modType) => { 
        const url = `${API_URL}${sb3Path}`; 
        let embedBase = 'https://warp.mistium.com/embed';
        if (modType === 'penguinmod') embedBase = 'https://studio.penguinmod.com/embed';
        document.getElementById('game-container').innerHTML = `<iframe src="${embedBase}?project_url=${encodeURIComponent(url)}&settings-button&addons=pause,remove-curved-stage-border,vol-slider" width="100%" height="100%" frameborder="0" allowfullscreen></iframe><button onclick="App.toggleFullscreen()" class="absolute top-2 right-2 bg-black/50 hover:bg-black text-white p-2 rounded-lg backdrop-blur-sm transition z-10" title="Toggle Fullscreen"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg></button>`; 
    },
    toggleFullscreen: () => { const c = document.getElementById('game-container'); App.isFullscreen = !App.isFullscreen; if (App.isFullscreen) { c.style.maxWidth = '100%'; c.classList.add('fixed', 'inset-0', 'z-[100]', 'rounded-none', 'h-screen', 'w-screen'); c.classList.remove('aspect-[4/3]', 'rounded-xl', 'shadow-xl', 'ring-4'); } else { c.style.maxWidth = '640px'; c.classList.remove('fixed', 'inset-0', 'z-[100]', 'rounded-none', 'h-screen', 'w-screen'); c.classList.add('aspect-[4/3]', 'rounded-xl', 'shadow-xl', 'ring-4'); } },
    updateProjectStats: async () => { const res = await fetch(`${API_URL}/api/projects/${App.currId}`, { headers: App.token ? { 'Authorization': `Bearer ${App.token}` } : {} }); const p = await res.json(); App.renderProjectDetails(p, true); },
    renderProjectDetails: (p, updateOnly = false) => {
        App.currAuthor = p.author;
        document.getElementById('p-title').innerHTML = App.linkify(p.title);
        document.getElementById('p-desc').innerHTML = App.linkify(p.description);
        document.getElementById('p-date').innerText = `Posted ${App.timeAgo(p.created_at)}`;
        document.getElementById('p-author').innerHTML = `${App.escapeHTML(p.author_display || p.author)} ${App.renderBadges(p)} ${App.studioTag(p)}`;
        const remixLink = document.getElementById('p-remix-link');
        if (p.parent_id) { remixLink.innerHTML = `↪ Original project is from <a href="#project/${p.parent_id}" class="font-bold text-purple-600 hover:underline">${App.escapeHTML(p.parent_title || 'Unknown')}</a>`; remixLink.classList.remove('hidden'); } else { remixLink.classList.add('hidden'); }
        document.getElementById('p-likes').innerText = p.likes; document.getElementById('p-favs').innerText = p.favorites; document.getElementById('p-views').innerText = p.views;
        document.getElementById('p-author-img').src = p.author_avatar ? API_URL + p.author_avatar : App.defAvatar;
        document.getElementById('p-author-link').href = `#user/${p.author}`;
        
        const fBtn = document.getElementById('p-follow-btn');
        if (App.user && p.user_id !== App.user.id) {
            fBtn.classList.remove('hidden');
            fBtn.innerText = p.isFollowing ? "Unfollow" : "Follow";
            fBtn.onclick = async (e) => {
                e.stopPropagation();
                 await fetch(`${API_URL}/api/users/${p.user_id}/follow`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` } });
                 App.updateProjectStats();
            };
        } else { fBtn.classList.add('hidden'); }

        const sList = document.getElementById('p-studios-list');
        if (p.studios && p.studios.length > 0) { sList.innerHTML = p.studios.map(s => `<a href="#studio/${s.id}" class="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100 hover:border-purple-300 hover:shadow-md transition group"><img src="${s.thumbnail_path ? API_URL + s.thumbnail_path : App.defThumb}" class="w-10 h-10 rounded-md object-cover bg-slate-200"><span class="font-bold text-xs text-slate-700 group-hover:text-purple-600 truncate flex-1">${App.escapeHTML(s.title)}</span></a>`).join(''); } else { sList.innerHTML = `<p class="text-xs text-slate-400 italic">Not in any studios yet.</p>`; }
        const lBtn = document.getElementById('like-icon-bg'); if(p.isLiked) { lBtn.classList.remove('bg-slate-100', 'text-slate-400'); lBtn.classList.add('bg-pink-500', 'text-white'); } else { lBtn.classList.add('bg-slate-100', 'text-slate-400'); lBtn.classList.remove('bg-pink-500', 'text-white'); }
        const favBtn = document.getElementById('fav-icon-bg'); if(p.isFavorited) { favBtn.classList.remove('bg-slate-100', 'text-slate-400'); favBtn.classList.add('bg-yellow-400', 'text-white'); } else { favBtn.classList.add('bg-slate-100', 'text-slate-400'); favBtn.classList.remove('bg-yellow-400', 'text-white'); }
        document.getElementById('p-comments-title').innerText = `Comments (${p.commentsCount})`;
        
        if (!updateOnly) { App.commentPage = 0; App.loadComments('project', p.id, 'comment-list', true); }
    },
    loadComments: async (context, id, containerId, reset = false) => {
        const list = document.getElementById(containerId);
        if (reset) list.innerHTML = App.skeleton('list');
        const loadMoreId = `${containerId}-loadmore`;
        let loadMoreBtn = document.getElementById(loadMoreId);
        if (reset && loadMoreBtn) loadMoreBtn.remove();

        const offset = App.commentPage * 20;
        let url = `${API_URL}/api/${context}s/${id}/comments?offset=${offset}`; 
        if(context === 'profile') url = `${API_URL}/api/users/${id}/comments?offset=${offset}`;
        if(context === 'studio_channel') url = `${API_URL}/api/studios/${id}/comments?offset=${offset}&channel=${App.currChannelId}`;

        const res = await fetch(url); const comments = await res.json();
        if (reset) list.innerHTML = ''; 

        if (comments.length === 0 && reset) list.innerHTML = '<p class="text-slate-400 text-sm italic">No messages yet.</p>';
        else App.renderComments(comments, containerId, context, !reset);

        if(comments.length === 20) {
             if (!document.getElementById(loadMoreId)) {
                list.insertAdjacentHTML('afterend', `<div class="text-center mt-4"><button id="${loadMoreId}" class="text-xs font-bold text-slate-500 hover:text-purple-600 bg-slate-50 px-4 py-2 rounded-full">Load More</button></div>`);
                document.getElementById(loadMoreId).onclick = () => { App.commentPage++; App.loadComments(context, id, containerId, false); };
             }
        } else if (document.getElementById(loadMoreId)) document.getElementById(loadMoreId).remove();
    },
    renderComments: (comments, containerId, context, append) => { 
        const list = document.getElementById(containerId); 
        const renderSingle = (c, isChild) => {
            let replyTag = '';
            const linkUrl = `#${context === 'profile' ? `user/${App.currProfileId}` : context.startsWith('studio') ? `studio/${App.currId}` : `project/${App.currId}`}`;
            if (!isChild && c.parent_id && c.reply_to_username) { replyTag = `<span class="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded mr-1">Replying to @${App.escapeHTML(c.reply_to_username)}</span>`; }
            
            if (context === 'studio_channel') {
                return `<div class="flex gap-3 hover:bg-slate-50 p-2 rounded transition group"><div class="shrink-0 w-8 h-8"><img src="${c.avatar_path ? API_URL + c.avatar_path : App.defAvatar}" class="w-full h-full rounded-full object-cover"></div><div><div class="flex items-center gap-2 mb-0.5"><span class="font-bold text-sm text-slate-800">${App.escapeHTML(c.display_name || c.username)}</span><span class="text-[10px] text-slate-400">${App.timeAgo(c.created_at)}</span></div><p class="text-sm text-slate-700">${App.linkify(c.content)}</p></div></div>`;
            }
            return `<div id="c-${c.id}" class="flex gap-3 ${isChild ? 'comment-reply mt-2 pl-4 border-l-2 border-slate-100' : 'mt-4'} fade-in rounded-2xl transition duration-500"><div class="relative shrink-0 w-8 h-8"><img src="${c.avatar_path ? API_URL + c.avatar_path : App.defAvatar}" class="w-full h-full rounded-full border border-slate-100 object-cover">${App.renderStatusDot(c.status || 'offline', 'w-2.5 h-2.5')}</div><div class="bg-white p-3 rounded-2xl flex-1 border border-slate-100 shadow-sm"><div class="flex justify-between items-center mb-1"><div class="flex items-center gap-2"><a href="#user/${c.username}" class="font-bold text-xs flex items-center gap-1 text-slate-800 hover:text-purple-600">${App.escapeHTML(c.display_name || c.username)} ${App.renderBadges(c)} ${App.studioTag(c)}</a>${replyTag}</div><div class="flex gap-3 items-center"><button onclick="navigator.clipboard.writeText('${window.location.origin}${window.location.pathname}${linkUrl}'); App.alert('Link copied!')" class="text-[10px] text-slate-300 hover:text-purple-500 font-bold">Link</button><span class="text-[10px] text-slate-400 font-bold">${App.timeAgo(c.created_at)}</span><button onclick="App.reportModal('comment', ${c.id})" class="text-[10px] text-slate-300 hover:text-red-500 font-bold" title="Report">⚐</button></div></div><p class="text-sm text-slate-700 leading-relaxed">${App.linkify(c.content)}</p><button onclick="App.replyTo(${c.id}, '${App.escapeJS(c.username)}', '${context}')" class="text-[10px] font-bold text-slate-400 mt-2 hover:text-slate-600 flex items-center gap-1 transition">↪ Reply</button></div></div>`;
        };
        const map = {}; comments.forEach(c => map[c.id] = {...c, children: []}); const roots = [];
        comments.forEach(c => { if(c.parent_id && map[c.parent_id]) { map[c.parent_id].children.push(map[c.id]); } else { roots.push(map[c.id]); } });
        const buildHtml = (nodes, isChild) => nodes.map(n => renderSingle(n, isChild) + buildHtml(n.children, true)).join('');
        const html = buildHtml(roots, false);
        if(append) list.insertAdjacentHTML('beforeend', html); else list.innerHTML = html;
        if(context === 'studio_channel' && !append) list.scrollTop = list.scrollHeight; 
    },
    
    // --- COMMENT REPLY LOGIC ---
    replyTo: (id, user, context) => { 
        App.replyingTo = { id, user, context }; 
        
        // Find specific elements
        const formContainer = document.getElementById('comment-form-container');
        const targetComment = document.getElementById(`c-${id}`);
        const input = document.getElementById('comment-input');
        const cancelBtn = document.getElementById('reply-cancel-btn');

        if(formContainer && targetComment) {
            // Move form to under the comment
            targetComment.appendChild(formContainer);
            formContainer.classList.remove('sticky-comment-bar'); // Remove sticky if it was sticky
            formContainer.classList.add('mt-2', 'ml-8'); // Indent
            
            input.placeholder = `Replying to @${user}...`;
            input.focus();
            cancelBtn.classList.remove('hidden');
        }
    },
    cancelReply: () => { 
        App.replyingTo = null;
        
        const formContainer = document.getElementById('comment-form-container');
        const listContainer = document.getElementById('comment-list');
        const input = document.getElementById('comment-input');
        const cancelBtn = document.getElementById('reply-cancel-btn');

        if(formContainer && listContainer) {
            // Move back to main list bottom
            listContainer.parentNode.insertBefore(formContainer, listContainer.nextSibling);
            
            // Restore styles
            formContainer.classList.add('sticky-comment-bar');
            formContainer.classList.remove('mt-2', 'ml-8');
            
            input.placeholder = "Add a comment...";
            input.value = '';
            cancelBtn.classList.add('hidden');
        }
    },
    postComment: async () => { 
        const inp = document.getElementById('comment-input'); 
        const btn = inp.nextElementSibling; // The Post button
        
        if(!inp.value.trim() || btn.disabled) return; 
        
        btn.disabled = true; 
        const parentId = App.replyingTo?.context === 'project' ? App.replyingTo.id : null; 
        
        const res = await fetch(`${API_URL}/api/comments`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${App.token}`}, 
            body: JSON.stringify({ project_id: App.currId, content: inp.value, parent_id: parentId }) 
        }); 
        
        if(res.ok) { 
            inp.value = ''; 
            App.cancelReply(); // Resets form position
            App.commentPage = 0; 
            App.loadComments('project', App.currId, 'comment-list', true); 
            App.updateProjectStats(); 
        } 
        btn.disabled = false; 
    },
    toggleLike: async () => { if(!App.token) return window.location.hash = '#auth'; await fetch(`${API_URL}/api/projects/${App.currId}/like`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` } }); App.updateProjectStats(); },
    toggleFavorite: async () => { if(!App.token) return window.location.hash = '#auth'; await fetch(`${API_URL}/api/projects/${App.currId}/favorite`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` } }); App.updateProjectStats(); },

    loadProfile: async (u) => {
        App.setLoading(true);
        const isMe = App.user && App.user.username.toLowerCase() === u.toLowerCase();
        const res = await fetch(`${API_URL}/api/users/${u}`, { headers: App.token ? { 'Authorization': `Bearer ${App.token}` } : {} });
        App.setLoading(false);
        if (!res.ok) { App.alert("User not found."); return; }
        const d = await res.json();
        App.profData = d; App.currProfileId = d.id;
        
        const nameEl = document.getElementById('prof-name'); 
        if(nameEl) {
            let content = `${App.escapeHTML(d.user.display_name || d.user.username)} ${App.renderBadges(d.user)}`;
            if(d.achievements && d.achievements.length > 0) content += d.achievements.map(a => `<img src="${API_URL + a.image_path}" title="${App.escapeHTML(a.name)}" class="w-5 h-5 object-contain inline-block ml-1" />`).join('');
            content += ` ${App.studioTag(d.user)}`;
            nameEl.innerHTML = content;
        }

        if(document.getElementById('prof-username-real')) { document.getElementById('prof-username-real').innerText = `@${d.user.username}`; document.getElementById('prof-username-real').classList.remove('hidden'); }
        const avatarContainer = document.getElementById('prof-avatar-container');
        if(avatarContainer) { const oldStatus = avatarContainer.querySelector('span[title]'); if(oldStatus) oldStatus.remove(); avatarContainer.insertAdjacentHTML('beforeend', App.renderStatusDot(d.user.status, 'w-6 h-6 border-4')); }
        document.getElementById('prof-bio').innerHTML = App.linkify(d.user.bio || 'No bio yet.');
        if(document.getElementById('inp-display-name')) document.getElementById('inp-display-name').value = d.user.display_name || d.user.username; 
        if(document.getElementById('inp-disable-rainbow')) document.getElementById('inp-disable-rainbow').checked = d.user.disable_rainbow === 1;
        document.getElementById('prof-joined').innerText = `Joined ${d.user.created_at ? App.timeAgo(d.user.created_at) : 'Unknown'}`;
        document.getElementById('prof-avatar').src = d.user.avatar_path ? API_URL + d.user.avatar_path : App.defAvatar;
        document.getElementById('prof-id').innerText = `ID: #${d.id}`; document.getElementById('prof-followers-count').innerText = `${d.followersCount} Followers`; document.getElementById('prof-following-count').innerText = `${d.followingCount} Following`;
        const bannerEl = document.getElementById('prof-banner'); if (d.user.banner_path) { bannerEl.style.backgroundImage = `url('${API_URL + d.user.banner_path}')`; } else { bannerEl.style.backgroundImage = 'none'; }
        const rankEl = document.getElementById('prof-rank'); if(rankEl) { rankEl.innerText = d.user.rank; rankEl.className = d.user.rank === 'Fruiter' ? "px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700" : "px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-600"; }
        const annDiv = document.getElementById('prof-announcement');
        if (d.user.announcement_text) { annDiv.classList.remove('hidden'); document.getElementById('prof-ann-text').innerHTML = App.linkify(d.user.announcement_text); const annImg = document.getElementById('prof-ann-img'); if (d.user.announcement_image) { annImg.src = API_URL + d.user.announcement_image; annImg.classList.remove('hidden'); } else { annImg.classList.add('hidden'); } } else { annDiv.classList.add('hidden'); }
        const actContainer = document.getElementById('prof-activity-list');
        if(d.activity && d.activity.length > 0) { actContainer.innerHTML = d.activity.map(a => { let icon = '❓', text = 'did something', link = '#'; const safeName = App.escapeHTML(a.target_name); if(a.type === 'liked') { icon = '❤️'; text = `loved project <b>${safeName}</b>`; link = `#project/${a.target_id}`; } else if(a.type === 'favorited') { icon = '⭐'; text = `favorited project <b>${safeName}</b>`; link = `#project/${a.target_id}`; } else if(a.type === 'posted') { icon = '🚀'; text = `shared project <b>${safeName}</b>`; link = `#project/${a.target_id}`; } return `<div class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg mb-2"><div class="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-lg">${icon}</div><div class="flex-1"><a href="${link}" class="text-xs text-slate-600 hover:text-purple-600 block">${text}</a><span class="text-[10px] font-bold text-slate-400">${App.timeAgo(a.created_at)}</span></div></div>`; }).join(''); } else { actContainer.innerHTML = `<p class="text-slate-400 italic text-sm">No recent activity.</p>`; }
        const projContainer = document.getElementById('prof-projects');
        if(d.projects && d.projects.length > 0) { projContainer.innerHTML = d.projects.map(p => App.card({...p, author: d.user.username, author_display: d.user.display_name, author_avatar: d.user.avatar_path, tag_text: d.user.tag_text, tag_image: d.user.tag_image, equipped_studio_tag_id: d.user.equipped_studio_tag_id, tag_color: d.user.tag_color, tag_font: d.user.tag_font, is_verified: d.user.is_verified, tag_is_rainbow: d.user.tag_is_rainbow, disable_rainbow: d.user.disable_rainbow})).join(''); } else { projContainer.innerHTML = `<p class="text-slate-400 italic text-sm">No shared projects.</p>`; }
        const favContainer = document.getElementById('prof-favorites'); if (d.favorites && d.favorites.length > 0) { favContainer.innerHTML = d.favorites.map(p => App.card(p)).join(''); } else { favContainer.innerHTML = `<p class="text-slate-400 italic text-sm">No favorites.</p>`; }
        const stuContainer = document.getElementById('prof-studios-in'); if (d.studiosIn && d.studiosIn.length > 0) { stuContainer.innerHTML = d.studiosIn.map(s => App.studioCard(s)).join(''); } else { stuContainer.innerHTML = `<p class="text-slate-400 italic text-sm">Not in any studios.</p>`; }
        App.renderListPreview('followers', d.id); App.renderListPreview('following', d.id);
        document.getElementById('prof-comments-title').innerText = `Profile Comments`; App.commentPage = 0; App.loadComments('profile', d.id, 'prof-comment-list', true); setTimeout(() => App.setupEnterSubmit('prof-comment-input', App.postProfileComment), 100);
        
        const fBtn = document.getElementById('follow-btn'); const editBtn = document.getElementById('edit-prof-btn');
        // Removed Block Button
        if (isMe) { editBtn.classList.remove('hidden'); fBtn.classList.add('hidden'); } 
        else { 
            editBtn.classList.add('hidden'); 
            if(App.user) { 
                fBtn.classList.remove('hidden'); 
                fBtn.innerText = d.isFollowing ? "Unfollow" : "Follow"; 
                fBtn.className = d.isFollowing ? "px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" : "px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition bg-purple-600 text-white hover:bg-purple-700"; 
                fBtn.onclick = App.toggleFollow; // Re-bind click
            } else { 
                fBtn.classList.add('hidden'); 
            } 
        }
    },
    postProfileComment: async () => { const inp = document.getElementById('prof-comment-input'); const btn = inp.nextElementSibling; if(!inp.value.trim() || btn.disabled) return; btn.disabled = true; const parentId = App.replyingTo?.context === 'profile' ? App.replyingTo.id : null; await fetch(`${API_URL}/api/users/${App.currProfileId}/comments`, { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${App.token}`}, body: JSON.stringify({ content: inp.value, parent_id: parentId }) }); inp.value = ''; btn.disabled = false; App.cancelReply(); App.commentPage = 0; App.loadComments('profile', App.currProfileId, 'prof-comment-list', true); },
    toggleEditProfile: () => {
        const u = App.profData.user; const modalHtml = `<form id="edit-profile-form" onsubmit="App.handleProfileUpdate(event)" class="space-y-3"><div class="grid grid-cols-2 gap-6"><div class="text-center"><label class="block text-xs font-bold uppercase text-slate-400 mb-2">Avatar</label><div class="relative w-24 h-24 mx-auto bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200 cursor-pointer hover:border-purple-500 transition group"><img id="edit-avatar-preview" src="${u.avatar_path ? API_URL + u.avatar_path : App.defAvatar}" class="w-full h-full object-cover"><div class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white font-bold text-xs">Change</div><input name="avatar" type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" onchange="App.initCrop(this, 1, 'avatar');"></div></div><div><label class="block text-xs font-bold uppercase text-slate-400 mb-2">Display Name</label><input name="display_name" value="${App.escapeHTML(u.display_name || u.username)}" class="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-purple-500 outline-none"><label class="block text-xs font-bold uppercase text-slate-400 mt-3 mb-2">Bio</label><textarea name="bio" rows="3" class="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-purple-500 outline-none">${App.escapeHTML(u.bio || '')}</textarea></div></div><div><label class="block text-xs font-bold uppercase text-slate-400 mb-2">Banner</label><div class="relative w-full h-24 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:border-purple-500 transition group"><div id="edit-banner-preview" class="w-full h-full bg-cover bg-center" style="background-image: ${u.banner_path ? `url('${API_URL + u.banner_path}')` : 'none'}"></div><div class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white font-bold text-xs">Change Banner</div><input name="banner" type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" onchange="App.initCrop(this, 3, 'banner');"></div></div><div class="bg-purple-50 p-3 rounded-xl border border-purple-100"><label class="block text-xs font-bold uppercase text-purple-600 mb-2">Announcement</label><textarea name="announcement_text" placeholder="What's happening?" class="w-full p-2 bg-white border border-purple-200 rounded-lg text-sm mb-2 focus:outline-none">${App.escapeHTML(u.announcement_text || '')}</textarea><label class="flex items-center gap-2 text-xs text-slate-500 cursor-pointer"><span class="bg-white border border-purple-200 px-2 py-1 rounded font-bold">Attach Image</span><input name="announcement_image" type="file" accept="image/*" class="text-xs"></label></div><div class="bg-slate-50 p-3 rounded-xl border border-slate-200"><div class="flex items-center gap-2"><input type="checkbox" name="disable_rainbow" id="inp-disable-rainbow" class="w-4 h-4 accent-purple-600 rounded" ${u.disable_rainbow ? 'checked' : ''}><label for="inp-disable-rainbow" class="text-sm font-bold text-slate-700">Disable Rainbow Tag Effect</label></div></div>${App.user.is_verified ? '<p class="text-xs text-green-600 font-bold mt-2">✨ You are verified! You can upload GIFs as avatars/banners.</p>' : ''}${App.user.equipped_studio_tag_id ? `<div class="bg-slate-50 p-2 rounded flex justify-between items-center border border-slate-200"><span class="text-xs font-bold text-slate-500">Active Tag equipped</span><button type="button" onclick="App.unadoptStudioTag()" class="text-xs text-red-500 font-bold hover:underline">Remove Tag</button></div>` : ''}</form>`;
        const modal = document.querySelector('#modal-overlay > div'); modal.classList.add('max-w-xl'); App.showModal("Edit Profile", modalHtml, [{text:"Cancel", action: () => modal.classList.remove('max-w-xl')}, {text: "Save Changes", primary: true, action: () => { document.getElementById('edit-profile-form').requestSubmit(); modal.classList.remove('max-w-xl'); } }]);
    },
    showList: (type) => {
        const modalHtml = `<div id="list-grid-${type}" class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto"></div><div class="text-center mt-3"><button id="list-load-${type}" class="text-xs font-bold text-slate-400 hover:text-purple-600 hidden">Load More</button></div>`;
        App.showModal(type.charAt(0).toUpperCase() + type.slice(1), modalHtml, [{text: "Close"}]);
        App.listState = { page: 0, type: type, uid: App.currProfileId };
        const load = async () => {
            const res = await fetch(`${API_URL}/api/users/${App.listState.uid}/${type}?page=${App.listState.page}`); const list = await res.json(); const grid = document.getElementById(`list-grid-${type}`); const btn = document.getElementById(`list-load-${type}`);
            if(list.length > 0) { grid.insertAdjacentHTML('beforeend', list.map(u => `<a href="#user/${u.username}" onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="flex items-center gap-3 p-2 border border-slate-100 rounded-lg hover:shadow-sm transition group"><div class="relative shrink-0 w-10 h-10"><img src="${u.avatar_path ? API_URL + u.avatar_path : App.defAvatar}" class="w-full h-full rounded-full border border-slate-200 group-hover:border-purple-500 transition object-cover">${App.renderStatusDot(u.status || 'offline')}</div><span class="font-bold text-xs text-slate-700 truncate">${App.escapeHTML(u.display_name || u.username)} ${App.renderBadges(u)}</span></a>`).join('')); if(list.length === 20) { btn.classList.remove('hidden'); btn.onclick = () => { App.listState.page++; load(); }; } else btn.classList.add('hidden'); } else if (App.listState.page === 0) { grid.innerHTML = `<p class="col-span-full text-center text-slate-400 italic text-xs">No users found.</p>`; }
        }; load();
    },

    // --- MODERATION ---
    openModMenu: () => {
        const html = `<div class="flex gap-2 border-b border-slate-200 pb-2 mb-4 overflow-x-auto no-scrollbar"><button onclick="App.modSwitchTab('stats')" id="mod-btn-stats" class="text-xs font-bold px-3 py-1 bg-slate-800 text-white rounded transition">Dashboard</button><button onclick="App.modSwitchTab('reports')" id="mod-btn-reports" class="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition">Reports</button><button onclick="App.modSwitchTab('users')" id="mod-btn-users" class="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition">Users</button><button onclick="App.modSwitchTab('news')" id="mod-btn-news" class="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition">News</button><button onclick="App.modSwitchTab('achievements')" id="mod-btn-achievements" class="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition">Achievements</button><button onclick="App.modSwitchTab('logs')" id="mod-btn-logs" class="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition">Logs</button></div><div id="mod-tab-stats" class="space-y-4 min-h-[300px]"><div id="mod-stats-grid" class="grid grid-cols-2 gap-4">Loading stats...</div></div><div id="mod-tab-reports" class="hidden min-h-[300px]"><div class="flex justify-between items-center mb-3"><h4 class="font-bold text-sm">Active Reports</h4><button onclick="App.modAction('clear_reports')" class="text-xs text-red-500 font-bold hover:underline">Clear All</button></div><div id="mod-reports-list" class="space-y-2 max-h-[400px] overflow-y-auto pr-2">Loading...</div></div><div id="mod-tab-users" class="hidden min-h-[300px]"><input onkeyup="if(event.key === 'Enter') App.modSearchUser(this.value)" placeholder="Search Username or ID..." class="w-full p-2 border border-slate-200 rounded-lg text-sm mb-4 focus:border-purple-500 outline-none font-bold"><div id="mod-users-list" class="space-y-2 max-h-[400px] overflow-y-auto pr-2"></div></div><div id="mod-tab-news" class="hidden min-h-[300px] space-y-3"><div class="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2"><p class="text-xs text-blue-700 font-bold">Publish Site News</p></div><input id="mod-news-title" placeholder="News Title" class="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold"><textarea id="mod-news-content" placeholder="Content (Markdown supported)" rows="6" class="w-full p-2 border border-slate-200 rounded-lg text-sm"></textarea><button onclick="App.modPublishNews()" class="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-purple-700">Publish News</button></div><div id="mod-tab-achievements" class="hidden min-h-[300px]"><div class="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-3"><p class="text-xs text-purple-700 font-bold">Create Achievement</p><form onsubmit="App.modCreateAchievement(event)" class="mt-2 flex gap-2 items-center"><input name="name" placeholder="Achievement Name" class="p-2 text-xs border rounded flex-1" required><input type="file" name="image" class="text-xs" required><button class="bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded">Create</button></form></div><div id="mod-achievements-list" class="space-y-2 max-h-[300px] overflow-y-auto"></div></div><div id="mod-tab-logs" class="hidden min-h-[300px]"><div class="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3"><p class="text-xs text-slate-500 font-bold">Recent Moderator Actions (Read Only)</p></div><div id="mod-logs-list" class="space-y-2 max-h-[400px] overflow-y-auto pr-2 font-mono text-xs">Loading logs...</div></div>`;
        const modal = document.querySelector('#modal-overlay > div'); modal.classList.add('max-w-2xl'); App.showModal("🛡️ Admin Console", html, [{text:"Close", action: () => modal.classList.remove('max-w-2xl')}]); App.loadModStats();
    },
    modSwitchTab: (tab) => { ['stats', 'reports', 'users', 'news', 'achievements', 'logs'].forEach(t => { document.getElementById(`mod-tab-${t}`).style.display = 'none'; const btn = document.getElementById(`mod-btn-${t}`); if(btn) { btn.classList.remove('bg-slate-800', 'text-white'); btn.classList.add('bg-slate-100', 'text-slate-600'); } }); document.getElementById(`mod-tab-${tab}`).style.display = 'block'; const activeBtn = document.getElementById(`mod-btn-${tab}`); activeBtn.classList.remove('bg-slate-100', 'text-slate-600'); activeBtn.classList.add('bg-slate-800', 'text-white'); if(tab === 'reports') App.loadModReports(); if(tab === 'logs') App.loadModLogs(); if(tab === 'achievements') App.loadModAchievements(); },
    loadModAchievements: async () => { const res = await fetch(`${API_URL}/api/achievements`, { headers: { 'Authorization': `Bearer ${App.token}` } }); const list = await res.json(); document.getElementById('mod-achievements-list').innerHTML = list.map(a => `<div class="flex items-center justify-between p-2 bg-white border rounded"><div class="flex items-center gap-3"><img src="${API_URL + a.image_path}" class="w-8 h-8 object-contain"><span class="font-bold text-sm">${App.escapeHTML(a.name)}</span></div><div class="flex gap-2"><button onclick="App.modAssignAchievement(${a.id})" class="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">Assign User</button><button onclick="App.modAction('delete_content', 'achievements', ${a.id})" class="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-bold">Delete</button></div></div>`).join(''); },
    modCreateAchievement: async (e) => { e.preventDefault(); const fd = new FormData(e.target); await fetch(`${API_URL}/api/mod/achievements`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` }, body: fd }); e.target.reset(); App.loadModAchievements(); },
    modAssignAchievement: async (aid) => { const uid = prompt("Enter User ID to award achievement:"); if(uid) { await fetch(`${API_URL}/api/mod/achievements/${aid}/assign`, { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${App.token}`}, body: JSON.stringify({ user_id: uid }) }); alert("Assigned!"); } },
    modAction: async (action, type, id, extra = null) => { if(!confirm("Are you sure?")) return; App.setLoading(true); try { const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${App.token}` }; let url = `${API_URL}/api/mod/${action}`; let body = {}; if (action === 'ban') body = { id, reason: extra.reason, ip_ban: extra.ip_ban }; else if (action === 'unban') body = { id }; else if (action === 'badge') body = { id, badge: type, value: extra }; else if (action === 'delete_content') { url = `${API_URL}/api/mod/${type}/${id}`; } else if (action === 'delete_user') { url = `${API_URL}/api/mod/user/${id}`; } else if (action === 'dismiss_report') { url = `${API_URL}/api/mod/reports/${id}`; } else if (action === 'clear_reports') { url = `${API_URL}/api/mod/reports`; } const method = (action.includes('delete') || action.includes('dismiss') || action === 'clear_reports') ? 'DELETE' : 'POST'; const res = await fetch(url, { method, headers, body: method === 'POST' ? JSON.stringify(body) : null }); if(!res.ok) throw new Error("Action failed"); App.setLoading(false); if (document.getElementById('mod-tab-users').style.display === 'block') { const searchVal = document.querySelector('#mod-tab-users input').value; if(searchVal) App.modSearchUser(searchVal); } if (document.getElementById('mod-tab-reports').style.display === 'block') App.loadModReports(); if (document.getElementById('mod-tab-achievements').style.display === 'block') App.loadModAchievements(); } catch(e) { App.setLoading(false); alert("Error performing action."); } },
    loadModStats: async () => { const res = await fetch(`${API_URL}/api/mod/stats`, { headers: { 'Authorization': `Bearer ${App.token}` } }); const s = await res.json(); document.getElementById('mod-stats-grid').innerHTML = `<div class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center justify-center"><p class="text-3xl font-black text-blue-600">${s.users}</p><p class="text-xs uppercase font-bold text-blue-400">Users</p></div><div class="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center justify-center"><p class="text-3xl font-black text-purple-600">${s.projects}</p><p class="text-xs uppercase font-bold text-purple-400">Projects</p></div><div class="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center justify-center"><p class="text-3xl font-black text-green-600">${s.studios}</p><p class="text-xs uppercase font-bold text-green-400">Studios</p></div><div class="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col items-center justify-center"><p class="text-3xl font-black text-red-600">${s.reports}</p><p class="text-xs uppercase font-bold text-red-400">Reports</p></div>`; },
    loadModReports: async () => { const res = await fetch(`${API_URL}/api/mod/reports`, { headers: { 'Authorization': `Bearer ${App.token}` } }); const data = await res.json(); document.getElementById('mod-reports-list').innerHTML = data.map(r => { let viewLink = r.target_type === 'project' ? `#project/${r.target_id}` : r.target_type === 'studio' ? `#studio/${r.target_id}` : `#user/${r.target_id}`; if (r.target_type === 'comment') viewLink = `#project/0/comment/${r.target_id}`; return `<div class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-start"><div><span class="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">${App.escapeHTML(r.target_type)}</span><p class="text-sm font-bold text-slate-800 mt-1">Reason: ${App.escapeHTML(r.reason)}</p><p class="text-[10px] text-slate-400">Target ID: ${r.target_id} | By: ${App.escapeHTML(r.reporter)}</p></div><div class="flex flex-col gap-1"><button onclick="window.open('${viewLink}', '_blank')" class="text-[10px] px-2 py-1 rounded font-bold border bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100">View</button><button onclick="App.modAction('dismiss_report', null, ${r.id})" class="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded font-bold border border-green-100 hover:bg-green-100">Dismiss</button><button onclick="App.modAction('delete_content', '${r.target_type}', ${r.target_id})" class="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold border border-red-100 hover:bg-red-100">Delete Content</button></div></div>`; }).join('') || '<p class="text-center text-slate-400 text-xs py-4">No active reports.</p>'; },
    modSearchUser: async (q) => { if(q.length < 1) return; App.setLoading(true); const res = await fetch(`${API_URL}/api/mod/search?q=${q}`, { headers: { 'Authorization': `Bearer ${App.token}` } }); const users = await res.json(); App.setLoading(false); document.getElementById('mod-users-list').innerHTML = users.map(u => `<div class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center"><div><div class="flex items-center gap-2"><span class="font-bold text-sm">${App.escapeHTML(u.username)}</span><span class="text-xs text-slate-400 font-mono">ID: ${u.id}</span>${u.is_banned ? '<span class="bg-red-500 text-white text-[10px] px-1 rounded font-bold">BANNED</span>' : ''}</div><div class="flex flex-wrap gap-2 mt-2"><label class="text-[10px] font-bold flex items-center gap-1"><input type="checkbox" ${u.is_verified?'checked':''} onchange="App.modAction('badge', 'is_verified', ${u.id}, this.checked)"> Verified</label><label class="text-[10px] font-bold flex items-center gap-1"><input type="checkbox" ${u.is_gold?'checked':''} onchange="App.modAction('badge', 'is_gold', ${u.id}, this.checked)"> Gold</label><label class="text-[10px] font-bold flex items-center gap-1"><input type="checkbox" ${u.is_mod?'checked':''} onchange="App.modAction('badge', 'is_mod', ${u.id}, this.checked)"> Mod</label><label class="text-[10px] font-bold flex items-center gap-1"><input type="checkbox" ${u.is_owner?'checked':''} onchange="App.modAction('badge', 'is_owner', ${u.id}, this.checked)"> Owner</label></div></div><div class="flex gap-1">${u.is_banned ? `<button onclick="App.modAction('unban', null, ${u.id})" class="bg-green-100 text-green-600 text-xs font-bold px-2 py-1 rounded hover:bg-green-200">Unban</button>` : `<button onclick="App.modBanModal(${u.id})" class="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded hover:bg-red-200">Ban</button>`}<button onclick="if(confirm('HARD DELETE USER? This cannot be undone.')) App.modAction('delete_user', null, ${u.id})" class="bg-black text-white text-xs font-bold px-2 py-1 rounded hover:bg-slate-800">Delete</button></div></div>`).join(''); },
    modBanModal: (uid) => { const html = `<div class="space-y-4"><div><label class="text-xs font-bold uppercase text-slate-400">Ban Reason</label><input id="ban-reason-input" class="w-full p-2 border border-slate-200 rounded mt-1 text-sm"></div><div class="flex items-center gap-2"><input type="checkbox" id="ip-ban-check" class="w-4 h-4 accent-red-600"><label for="ip-ban-check" class="text-sm font-bold text-slate-700">Ban IP Address?</label></div></div>`; App.showModal("Ban User", html, [{text: "Cancel"}, {text: "Execute Ban", primary: true, action: () => { const reason = document.getElementById('ban-reason-input').value; const ipBan = document.getElementById('ip-ban-check').checked; if(!reason) return alert("Reason required"); document.getElementById('modal-overlay').classList.add('hidden'); App.modAction('ban', null, uid, { ip_ban: ipBan, reason: reason }); }}]); },
    loadModLogs: async () => { const res = await fetch(`${API_URL}/api/mod/logs`, { headers: { 'Authorization': `Bearer ${App.token}` } }); const logs = await res.json(); document.getElementById('mod-logs-list').innerHTML = logs.map(l => `<div class="border-l-2 border-slate-300 pl-2 py-1"><div class="flex justify-between"><span class="font-bold text-purple-600">${App.escapeHTML(l.mod_name)}</span><span class="text-slate-400">${App.timeAgo(l.created_at)}</span></div><p class="text-slate-700">${App.escapeHTML(l.action)}</p></div>`).join('') || '<p class="text-slate-400 italic">No logs found.</p>'; },
    modPublishNews: async () => { const title = document.getElementById('mod-news-title').value; const content = document.getElementById('mod-news-content').value; if(!title || !content) return alert("Fill all fields"); await fetch(`${API_URL}/api/mod/news`, { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${App.token}`}, body: JSON.stringify({title, content}) }); alert("News Published!"); document.getElementById('mod-news-title').value = ''; document.getElementById('mod-news-content').value = ''; },

    // --- REPORTING ---
    reportModal: (type, id) => {
        if(!App.user) return window.location.hash = '#auth';
        const html = `
            <div class="space-y-3">
                <p class="text-sm text-slate-600">Why are you reporting this content?</p>
                <select id="report-reason" class="w-full p-2 border border-slate-200 rounded text-sm font-bold bg-white">
                    <option value="Spam">Spam</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Offensive Language">Offensive Language</option>
                    <option value="Other">Other</option>
                </select>
                <textarea id="report-details" placeholder="Additional details..." class="w-full p-2 border border-slate-200 rounded text-sm"></textarea>
            </div>
        `;
        App.showModal("Report Content", html, [
            {text: "Cancel"},
            {text: "Submit Report", primary: true, action: async () => {
                const reason = document.getElementById('report-reason').value;
                const details = document.getElementById('report-details').value;
                const fullReason = `${reason}: ${details}`;
                await fetch(`${API_URL}/api/report`, { 
                    method: 'POST', 
                    headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${App.token}`}, 
                    body: JSON.stringify({ target_type: type, target_id: id, reason: fullReason }) 
                });
                document.getElementById('modal-overlay').classList.add('hidden');
                App.alert("Report submitted. Thank you for keeping Fruitcore safe.");
            }}
        ]);
    },

    renderListPreview: async (type, uid) => { 
        const res = await fetch(`${API_URL}/api/users/${uid}/${type}`); 
        const list = await res.json(); 
        const container = document.getElementById(`prof-${type}-list`); 
        if(list.length === 0) { 
            container.innerHTML = `<span class="text-xs text-slate-400 italic">None</span>`; 
        } else { 
            container.innerHTML = list.slice(0, 5).map(u => `<a href="#user/${u.username}" class="shrink-0 group relative w-10 h-10 block" title="${App.escapeHTML(u.username)}"><img src="${u.avatar_path ? API_URL + u.avatar_path : App.defAvatar}" class="w-full h-full rounded-full border border-slate-200 group-hover:border-pink-500 transition object-cover">${App.renderStatusDot(u.status || 'offline')}</a>`).join(''); 
        } 
    },
    
    toggleFollow: async () => { 
        if(!App.token) return; 
        const btn = document.getElementById('follow-btn');
        const isFollowing = btn.innerText === "Unfollow";
        btn.innerText = isFollowing ? "Follow" : "Unfollow";
        btn.className = isFollowing ? "px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition bg-purple-600 text-white hover:bg-purple-700" : "px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50";

        try {
            await fetch(`${API_URL}/api/users/${App.currProfileId}/follow`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` } }); 
            // Don't reload, just toggle state
        } catch (e) {
            btn.innerText = isFollowing ? "Unfollow" : "Follow";
            alert("Connection error.");
        }
    },
    
    // MISSING FUNCTIONS RESTORED
    loadMyStuff: async () => { 
        if(!App.user) return window.location.hash = '#auth'; 
        const res = await fetch(`${API_URL}/api/me/stuff`, { headers: { 'Authorization': `Bearer ${App.token}` } }); 
        if(!res.ok) return; 
        const { projects, studios, joinedStudios, followedStudios } = await res.json(); 
        document.getElementById('my-projects-grid').innerHTML = projects.map(p => `<div class="relative group">${App.card(p)}<div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onclick="App.openEditProjectModal(${p.id})" class="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">Edit</button><button onclick="App.deleteProject(${p.id})" class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">Delete</button></div></div>`).join(''); 
        document.getElementById('my-studios-grid').innerHTML = [...studios, ...joinedStudios].map(s => `<div class="relative group">${App.studioCard(s)}${s.owner_id === App.user.id ? `<button onclick="App.deleteStudio(${s.id})" class="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">Delete</button>` : ''}</div>`).join(''); 
        document.getElementById('my-followed-studios-grid').innerHTML = followedStudios.map(s => App.studioCard(s)).join('');
        
        // Render Invites
        const resI = await fetch(`${API_URL}/api/me/invites`, { headers: { 'Authorization': `Bearer ${App.token}` } });
        const invites = await resI.json();
        document.getElementById('my-studio-invites').innerHTML = invites.length ? invites.map(i => `<div class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm"><img src="${i.thumbnail_path ? API_URL+i.thumbnail_path : App.defThumb}" class="w-full h-24 object-cover rounded mb-2"><h4 class="font-bold text-sm">${App.escapeHTML(i.title)}</h4><p class="text-xs text-slate-500 mb-2">Invited by ${App.escapeHTML(i.inviter)}</p><button onclick="App.acceptInvite(${i.id})" class="w-full bg-purple-600 text-white py-1 rounded text-xs font-bold">Accept</button></div>`).join('') : '<p class="text-slate-400 italic text-sm">No pending invites.</p>';
    },
    
    deleteStudio: async (sid) => { if(confirm("Delete this studio?")) { await fetch(`${API_URL}/api/studios/${sid}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${App.token}` } }); App.loadMyStuff(); } },
    
    initCrop: (input, ratio, keyName) => { 
        if (input.files && input.files[0]) { 
            const file = input.files[0];
            if (file.type === 'image/gif' && App.user?.is_verified) {
                 if(App.croppedFiles[keyName]) delete App.croppedFiles[keyName];
                 App.croppedFiles[keyName] = file;
                 const url = URL.createObjectURL(file);
                 if (keyName === 'avatar' && document.getElementById('edit-avatar-preview')) document.getElementById('edit-avatar-preview').src = url;
                 if (keyName === 'banner' && document.getElementById('edit-banner-preview')) document.getElementById('edit-banner-preview').style.backgroundImage = `url(${url})`;
                 if (keyName === 'thumbnail' && document.getElementById('prev-img')) document.getElementById('prev-img').src = url;
                 if (keyName === 'studio_thumb' && document.getElementById('prev-stu-img')) document.getElementById('prev-stu-img').src = url;
                 return;
            }
            if(App.croppedFiles[keyName]) delete App.croppedFiles[keyName]; 
            const reader = new FileReader(); 
            reader.onload = (e) => { 
                document.getElementById('cropper-modal').classList.remove('hidden'); 
                const img = document.getElementById('cropper-img'); 
                img.src = e.target.result; 
                if (App.cropper) App.cropper.destroy(); 
                App.cropper = new Cropper(img, { aspectRatio: ratio, viewMode: 1, autoCropArea: 1, responsive: true }); 
                App.currentCropKey = keyName; 
                App.currentCropInput = input; 
            }; 
            reader.readAsDataURL(file); 
        } 
    },
    confirmCrop: () => { if (App.cropper) { App.cropper.getCroppedCanvas().toBlob((blob) => { App.croppedFiles[App.currentCropKey] = blob; if (App.currentCropKey === 'avatar' && document.getElementById('edit-avatar-preview')) { document.getElementById('edit-avatar-preview').src = URL.createObjectURL(blob); } if (App.currentCropKey === 'banner' && document.getElementById('edit-banner-preview')) { document.getElementById('edit-banner-preview').style.backgroundImage = `url(${URL.createObjectURL(blob)})`; } if (App.currentCropKey === 'thumbnail' && document.getElementById('prev-img')) { document.getElementById('prev-img').src = URL.createObjectURL(blob); } if (App.currentCropKey === 'studio_thumb' && document.getElementById('prev-stu-img')) { document.getElementById('prev-stu-img').src = URL.createObjectURL(blob); } document.getElementById('cropper-modal').classList.add('hidden'); App.cropper.destroy(); App.cropper = null; }, 'image/jpeg', 0.9); } },
    cancelCrop: () => { document.getElementById('cropper-modal').classList.add('hidden'); if (App.cropper) App.cropper.destroy(); App.cropper = null; if(App.currentCropInput) App.currentCropInput.value = ''; if(App.currentCropKey) delete App.croppedFiles[App.currentCropKey]; },
    handleProfileUpdate: async (e) => { e.preventDefault(); if(!App.token) return; const btn = document.querySelector('#modal-actions button:last-child'); const oldText = btn.innerText; btn.innerText = "Saving..."; btn.disabled = true; try { const fd = new FormData(e.target); if (App.croppedFiles['avatar']) fd.set('avatar', App.croppedFiles['avatar'], App.croppedFiles['avatar'].type === 'image/gif' ? 'avatar.gif' : 'avatar.jpg'); if (App.croppedFiles['banner']) fd.set('banner', App.croppedFiles['banner'], App.croppedFiles['banner'].type === 'image/gif' ? 'banner.gif' : 'banner.jpg'); 
    fd.append('disable_rainbow', document.getElementById('inp-disable-rainbow').checked);
    await fetch(`${API_URL}/api/profile/update`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` }, body: fd }); App.croppedFiles = {}; document.getElementById('modal-overlay').classList.add('hidden'); App.loadProfile(App.user.username); } catch (err) { alert("Update failed. Please try again."); btn.innerText = oldText; btn.disabled = false; } },
    
    openEditProjectModal: async (id) => { 
        App.setLoading(true);
        const res = await fetch(`${API_URL}/api/projects/${id}`); 
        const p = await res.json(); 
        App.setLoading(false);
        App.editingId = id; 
        App.croppedFiles = {}; 
        window.location.hash = '#upload';
        document.getElementById('upload-title').innerText = "Edit Project";
        document.getElementById('edit-alert').classList.remove('hidden'); 
        const form = document.getElementById('upload-form');
        form.title.value = p.title;
        form.description.value = p.description;
        form.width.value = p.width;
        form.height.value = p.height;
        document.getElementById('inp-tags').value = p.tags;
        App.selectedTags = p.tags.split(',');
        App.renderUploadTags();
        const tagContainer = document.getElementById('upload-tags');
        Array.from(tagContainer.children).forEach(child => {
            if(App.selectedTags.includes(child.innerText)) {
                child.classList.add('bg-slate-900', 'text-white');
                child.classList.remove('text-slate-500');
            }
        });
        document.getElementById('mod-toggle').checked = (p.mod_type === 'penguinmod');
        document.getElementById('prev-title').innerText = p.title;
        document.getElementById('prev-img').src = API_URL + p.thumbnail_path;
        document.getElementById('upload-btn').innerText = "Update Project";
    },

    deleteProject: async (id) => { if(confirm("Delete?")) { await fetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${App.token}` } }); App.loadMyStuff(); } },
    
    createStudioModal: (existing = null) => { 
        const isEdit = !!existing;
        const html = `
        <form onsubmit="App.createStudio(event, ${isEdit ? existing.id : 'null'})" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-4">
                    <div>
                        <label class="text-xs font-bold uppercase text-slate-400">Studio Name</label>
                        <input name="title" value="${isEdit ? App.escapeHTML(existing.title) : ''}" required class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500">
                    </div>
                    <div>
                        <label class="text-xs font-bold uppercase text-slate-400">Description</label>
                        <textarea name="description" rows="4" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500">${isEdit ? App.escapeHTML(existing.description) : ''}</textarea>
                    </div>
                     <div class="flex items-center gap-2">
                        <input type="checkbox" name="allow_public_adds" id="inp-pub-adds" value="true" class="w-5 h-5 accent-purple-600 rounded" ${isEdit && existing.allow_public_adds ? 'checked' : ''}>
                        <label for="inp-pub-adds" class="text-sm font-bold text-slate-700">Allow anyone to add projects</label>
                    </div>
                </div>
                <div class="space-y-4">
                     <div>
                        <label class="text-xs font-bold uppercase text-slate-400">Thumbnail ${App.user.is_verified ? '(GIFs allowed)' : ''}</label>
                        <div class="flex gap-2">
                            <div class="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                <img id="prev-stu-img" src="${isEdit && existing.thumbnail_path ? API_URL + existing.thumbnail_path : App.defThumb}" class="w-full h-full object-cover">
                            </div>
                            <input type="file" name="studio_thumb" class="flex-1 text-xs" onchange="App.initCrop(this, 1, 'studio_thumb')">
                        </div>
                    </div>
                    ${isEdit ? `<div>
                        <label class="text-xs font-bold uppercase text-slate-400">Banner ${App.user.is_verified ? '(GIFs allowed)' : ''}</label>
                        <input type="file" name="studio_banner" class="w-full text-xs mt-1" onchange="App.initCrop(this, 3, 'studio_banner')">
                    </div>` : ''}
                </div>
            </div>
            <button id="create-stu-btn" class="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition">${isEdit ? 'Update Studio' : 'Create Studio'}</button>
        </form>`; 
        const modal = document.querySelector('#modal-overlay > div'); modal.classList.add('max-w-2xl');
        App.showModal(isEdit ? "Edit Studio" : "Create Studio", html, [{text:"Cancel", action:()=>modal.classList.remove('max-w-2xl')}]); 
    },
// PASTE THIS right after createStudioModal: (existing = null) => { ... },

createStudio: async (e, existingId = null) => {
    e.preventDefault();
    const btn = document.getElementById('create-stu-btn');
    if(btn.disabled) return;
    
    btn.disabled = true;
    btn.innerText = "Processing...";
    
    const fd = new FormData(e.target);
    // Handle cropped files
    if (App.croppedFiles['studio_thumb']) fd.set('studio_thumb', App.croppedFiles['studio_thumb'], 'thumb.jpg');
    if (App.croppedFiles['studio_banner']) fd.set('studio_banner', App.croppedFiles['studio_banner'], 'banner.jpg');
    
    // Fix for checkbox not sending 'false'
    if(!document.getElementById('inp-pub-adds').checked) fd.set('allow_public_adds', 'false');

    try {
        let url = `${API_URL}/api/studios`;
        let method = 'POST';
        
        if (existingId) {
            url = `${API_URL}/api/studios/${existingId}`;
            method = 'PUT';
        }

        const res = await fetch(url, { 
            method: method, 
            headers: { 'Authorization': `Bearer ${App.token}` }, 
            body: fd 
        });

        if (res.ok) {
            const data = await res.json();
            App.alert(existingId ? "Studio Updated!" : "Studio Created!");
            document.getElementById('modal-overlay').classList.add('hidden');
            App.croppedFiles = {};
            
            if(existingId) App.loadStudio(existingId);
            else window.location.hash = `#studio/${data.id}`;
        } else {
            const err = await res.json();
            App.alert(err.error || "Failed.");
        }
    } catch (e) {
        console.error(e);
        App.alert("Connection Error");
    }
    btn.disabled = false;
    btn.innerText = existingId ? "Update Studio" : "Create Studio";
},
    toggleNavDropdown: (e) => { e.stopPropagation(); document.getElementById('nav-dropdown').classList.toggle('hidden'); },
    renderNav: () => { 
        const nav = document.getElementById('nav-auth'); 
        if (App.user) { 
            nav.innerHTML = `
            <div class="flex items-center gap-4 relative">
                <button onclick="App.toggleMail()" class="relative text-slate-400 hover:text-slate-900 transition p-1 group">
                    <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    <span id="mail-count" class="hidden absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">0</span>
                </button>
                <div class="relative">
                    <button onclick="App.toggleNavDropdown(event)" class="flex items-center gap-2 hover:opacity-80 transition focus:outline-none">
                        <div class="relative">
                            <img src="${App.user.avatar_path ? API_URL + App.user.avatar_path : App.defAvatar}" class="w-9 h-9 rounded-full bg-slate-200 object-cover border border-slate-200">
                            ${App.renderStatusDot(App.user.status || 'online')}
                        </div>
                    </button>
                    <div id="nav-dropdown" class="hidden absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 dropdown-enter origin-top-right">
                        <div class="px-4 py-3 border-b border-slate-50 mb-1">
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed in as</p>
                            <p class="text-sm font-bold text-slate-900 truncate">${App.escapeHTML(App.user.username)}</p>
                        </div>
                        <div class="px-4 py-2 border-b border-slate-50">
                            <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Status</p>
                            <div class="flex gap-2">
                                <button onclick="App.setStatus('online')" title="Online" class="w-4 h-4 rounded-full bg-green-500 hover:scale-110 transition border border-white shadow-sm"></button>
                                <button onclick="App.setStatus('offline')" title="Offline" class="w-4 h-4 rounded-full bg-slate-300 hover:scale-110 transition border border-white shadow-sm"></button>
                                <button onclick="App.setStatus('dnd')" title="Do Not Disturb" class="w-4 h-4 rounded-full bg-red-500 hover:scale-110 transition border border-white shadow-sm"></button>
                            </div>
                        </div>
                        <a href="#user/${App.user.username}" onclick="document.getElementById('nav-dropdown').classList.add('hidden')" class="block px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-purple-600 transition">Profile</a>
                        <a href="#mystuff" onclick="document.getElementById('nav-dropdown').classList.add('hidden')" class="block px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-purple-600 transition">My Stuff</a>
                        ${App.user.is_mod ? `<button onclick="App.openModMenu();document.getElementById('nav-dropdown').classList.add('hidden')" class="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition">🛡️ Mod Menu</button>` : ''}
                        <button onclick="App.manageBlocked()" class="hidden w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-purple-600 transition">Blocked Users</button>
                        <button onclick="App.showGuidelines(); document.getElementById('nav-dropdown').classList.add('hidden')" class="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-purple-600 transition">Rules</button>
                        <button onclick="App.logout()" class="w-full text-left px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition">Logout</button>
                    </div>
                </div>
                <div id="mail-modal" class="hidden absolute top-12 right-0 w-80 bg-white shadow-xl rounded-xl border border-slate-100 p-4 z-[60] dropdown-enter">
                    <h3 class="font-bold mb-3 flex justify-between text-slate-900">Notifications <button onclick="App.toggleMail()" class="text-slate-400 hover:text-slate-600">×</button></h3>
                    <div id="mail-list" class="space-y-2 max-h-60 overflow-y-auto text-sm"></div>
                </div>
            </div>`; 
            App.checkMail(); 
        } else {
            nav.innerHTML = `<a href="#auth" class="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-black transition shadow-lg shadow-slate-200 btn-bounce">Sign In</a>`; 
        }
    },
    checkMail: async () => { 
        if(!App.token) return; 
        const res = await fetch(`${API_URL}/api/notifications`, { headers: { 'Authorization': `Bearer ${App.token}` } }); 
        if(!res.ok) return; 
        const msgs = await res.json(); 
        const unread = msgs.filter(m => !m.is_read).length; 
        const badge = document.getElementById('mail-count'); 
        if(unread>0){badge.classList.remove('hidden');badge.innerText=unread>9?'9+':unread;}else badge.classList.add('hidden'); 
        
        document.getElementById('mail-list').innerHTML = msgs.map(m=> { 
            let link = '#'; 
            let icon = '📢';
            if(['comment', 'mention'].includes(m.type)) { link = `#project/${m.context_id}`; icon = '💬'; }
            else if(m.type === 'favorite') { link = `#project/${m.context_id}`; icon = '⭐'; }
            else if(m.type === 'like') { link = `#project/${m.context_id}`; icon = '❤️'; }
            else if(m.type === 'follow') { link = `#user/${App.user.username}`; icon = '👣'; } 
            else if(m.type === 'profile_comment') { link = `#user/${App.user.username}`; icon = '👤'; }
            else if(m.type === 'studio_comment') { link = `#studio/${m.context_id}`; icon = '🎙️'; }
            else if(m.type === 'studio_invite') { link = `#mystuff`; icon = '💌'; }
            else if(m.type === 'news') { link = '#news'; icon = '📰'; }
            
            return `<div onclick="window.location.hash='${link}';App.toggleMail()" class="cursor-pointer p-3 bg-slate-50 rounded-lg hover:bg-purple-50 transition ${m.is_read?'opacity-60':'border-l-4 border-pink-500 bg-white shadow-sm'}">
                <div class="flex justify-between items-start mb-1">
                    <p class="font-bold text-[10px] uppercase text-slate-400 flex items-center gap-1"><span>${icon}</span> ${m.type}</p>
                    <p class="text-[10px] font-bold text-slate-300">${App.timeAgo(m.created_at)}</p>
                </div>
                <p class="text-xs text-slate-700 font-medium leading-relaxed">${App.escapeHTML(m.message)}</p>
            </div>`; 
        }).join('') || '<p class="text-slate-400 italic text-center py-4">All caught up!</p>'; 
    },
    toggleMail: async () => { document.getElementById('mail-modal').classList.toggle('hidden'); document.getElementById('mail-count').classList.add('hidden'); await fetch(`${API_URL}/api/notifications/read`, { method: 'POST', headers: { 'Authorization': `Bearer ${App.token}` } }); },
    renderFilterTags: () => { document.getElementById('tag-filters').innerHTML = ['All', ...App.tags].map(t => `<button onclick="App.currTag='${t}';App.loadExplore(App.currSearch)" class="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${App.currTag === t ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}">${t}</button>`).join(''); },
    renderUploadTags: () => { document.getElementById('upload-tags').innerHTML = App.tags.map(t => `<div onclick="App.toggleTag('${t}', this)" class="cursor-pointer px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold select-none text-slate-500 hover:border-pink-500 transition">${t}</div>`).join(''); },
    toggleTag: (t, el) => { if(App.selectedTags.includes(t)) { App.selectedTags = App.selectedTags.filter(x => x !== t); el.classList.remove('bg-slate-900', 'text-white'); el.classList.add('text-slate-500'); } else { App.selectedTags.push(t); el.classList.add('bg-slate-900', 'text-white'); el.classList.remove('text-slate-500'); } document.getElementById('inp-tags').value = App.selectedTags.join(','); },
    timeAgo: (dateStr) => { if(!dateStr) return 'Unknown'; const str = dateStr.endsWith('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z'; const diff = (new Date() - new Date(str)) / 1000; if(isNaN(diff)) return 'Unknown'; if(diff < 60) return 'Just now'; if(diff < 3600) return Math.floor(diff/60) + 'm ago'; if(diff < 86400) return Math.floor(diff/3600) + 'h ago'; return Math.floor(diff/86400) + 'd ago'; },
    showModal: (title, bodyHtml, actions) => { document.getElementById('modal-title').innerText = title; document.getElementById('modal-body').innerHTML = bodyHtml; const actDiv = document.getElementById('modal-actions'); actDiv.innerHTML = ''; actions.forEach(a => { const btn = document.createElement('button'); btn.className = `px-4 py-2 rounded-lg text-sm font-bold transition ${a.primary ? 'bg-slate-900 text-white hover:bg-black' : 'text-slate-500 hover:bg-slate-50'}`; btn.innerText = a.text; btn.onclick = () => { if(a.close !== false) document.getElementById('modal-overlay').classList.add('hidden'); if(a.action) a.action(); }; actDiv.appendChild(btn); }); document.getElementById('modal-overlay').classList.remove('hidden'); },
    alert: (msg) => App.showModal("Alert", `<p>${msg}</p>`, [{text: "OK", primary: true}]),
    confirm: (msg, cb) => App.showModal("Confirm", `<p>${msg}</p>`, [{text: "Cancel"}, {text: "Confirm", primary: true, action: cb}]),
};
window.onload = App.init;
