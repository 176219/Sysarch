    /* ══════════════════════════════════════
    DARK / LIGHT MODE
    ══════════════════════════════════════ */
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon  = document.getElementById('themeIcon');
        const label = document.getElementById('themeLabel');
        if (theme === 'dark') {
            icon.className  = 'fa-solid fa-sun';
        } else {
            icon.className  = 'fa-solid fa-moon';
        }
    }
    
    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next    = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('ccs_theme', next);
        applyTheme(next);
    
        // Animate the icon on toggle
        const icon = document.getElementById('themeIcon');
        icon.style.transform = 'rotate(360deg)';
        icon.style.transition = 'transform 0.4s ease';
        setTimeout(() => { icon.style.transform = ''; icon.style.transition = ''; }, 400);
    }
    
    // Load saved theme on page start
    (function() {
        const saved = localStorage.getItem('ccs_theme') || 'light';
        applyTheme(saved);
    })();

    // ── LOCAL DATA STORE (in-memory; replace with API calls as needed) ──
    let softwareList = JSON.parse(localStorage.getItem('ccs_software') || '[]');
    let selectedFile = null;

    // ── CATEGORY ICON MAP ──
    const categoryIcons = {
        'IDE / Code Editor':   'fa-solid fa-code',
        'Programming Language':'fa-solid fa-terminal',
        'Database Tool':       'fa-solid fa-database',
        'Design Tool':         'fa-solid fa-pen-ruler',
        'Productivity':        'fa-solid fa-briefcase',
        'Utility':             'fa-solid fa-screwdriver-wrench',
        'Other':               'fa-solid fa-cube',
    };

    // ── FILE INPUT ──
    document.getElementById('fileInput').addEventListener('change', function () {
        if (this.files[0]) handleFile(this.files[0]);
    });

    // ── DRAG & DROP ──
    const dz = document.getElementById('dropzone');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
        e.preventDefault();
        dz.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
        selectedFile = file;
        const preview = document.getElementById('filePreview');
        document.getElementById('filePreviewName').textContent = file.name;
        document.getElementById('filePreviewSize').textContent = formatSize(file.size);
        preview.style.display = 'flex';
        dz.style.display = 'none';

        // Set file icon by extension
        const ext = file.name.split('.').pop().toLowerCase();
        const iconMap = { pdf:'fa-file-pdf', zip:'fa-file-zipper', rar:'fa-file-zipper',
                          '7z':'fa-file-zipper', exe:'fa-file-code', msi:'fa-file-code',
                          apk:'fa-mobile-screen', docx:'fa-file-word' };
        preview.querySelector('i.fa-solid') .className =
            `fa-solid ${iconMap[ext] || 'fa-file'} ` ;
    }

    function removeFile() {
        selectedFile = null;
        document.getElementById('filePreview').style.display = 'none';
        document.getElementById('fileInput').value = '';
        dz.style.display = 'block';
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ── UPLOAD / REGISTER ──
    function uploadSoftware() {
        const name  = document.getElementById('swName').value.trim();
        const cat   = document.getElementById('swCategory').value;
        const desc  = document.getElementById('swDesc').value.trim();
        const labs  = [...document.querySelectorAll('.lab-check-group input:checked')].map(c => c.value);

        if (!name) return Swal.fire({ icon:'warning', title:'Missing Name', text:'Please enter a software name.', confirmButtonColor:'#2c3e70' });
        if (!cat)  return Swal.fire({ icon:'warning', title:'Missing Category', text:'Please select a category.', confirmButtonColor:'#2c3e70' });
        if (labs.length === 0) return Swal.fire({ icon:'warning', title:'No Lab Selected', text:'Please select at least one lab.', confirmButtonColor:'#2c3e70' });

        const entry = {
            id:       Date.now(),
            name,
            category: cat,
            desc:     desc || '—',
            labs,
            fileName: selectedFile ? selectedFile.name : null,
            date:     new Date().toLocaleDateString('en-CA')
        };

        softwareList.push(entry);
        localStorage.setItem('ccs_software', JSON.stringify(softwareList));

        Swal.fire({
            icon: 'success',
            title: 'Registered!',
            text: `"${name}" has been added successfully.`,
            confirmButtonColor: '#2c3e70',
            allowOutsideClick: false
        });

        // Reset form
        document.getElementById('swName').value = '';
        document.getElementById('swCategory').value = '';
        document.getElementById('swDesc').value = '';
        document.querySelectorAll('.lab-check-group input').forEach(c => c.checked = false);
        removeFile();

        renderList();
        updateLabCounts();
    }

    // ── RENDER LIST ──
    function renderList(filter = '') {
        const list     = document.getElementById('swList');
        const empty    = document.getElementById('emptyState');
        const filtered = softwareList.filter(s =>
            s.name.toLowerCase().includes(filter.toLowerCase()) ||
            s.category.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }

        empty.style.display = 'none';
        list.innerHTML = filtered.map(s => `
            <div class="software-item">
                <div class="software-icon">
                    <i class="${categoryIcons[s.category] || 'fa-solid fa-cube'}"></i>
                </div>
                <div class="software-info">
                    <span class="sw-name">${s.name}</span>
                    <div class="sw-meta">
                        <span class="sw-badge">${s.category}</span>
                        <span>${s.fileName || 'No file attached'}</span>
                    </div>
                    <div class="sw-labs">
                        ${s.labs.map(l => `<span class="sw-lab-tag">Lab ${l}</span>`).join('')}
                    </div>
                </div>
                <button class="sw-delete-btn" onclick="deleteSoftware(${s.id})" title="Remove">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    // ── FILTER ──
    function filterSoftware() {
        renderList(document.getElementById('swSearch').value);
    }

    // ── DELETE ──
    async function deleteSoftware(id) {
        const { isConfirmed } = await Swal.fire({
            title: 'Remove Software?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74a3b',
            cancelButtonColor: '#858796',
            confirmButtonText: 'Yes, Remove',
            allowOutsideClick: false
        });
        if (!isConfirmed) return;

        softwareList = softwareList.filter(s => s.id !== id);
        localStorage.setItem('ccs_software', JSON.stringify(softwareList));
        renderList(document.getElementById('swSearch').value);
        updateLabCounts();

        Swal.fire({ icon:'success', title:'Removed', timer:1200, showConfirmButton:false });
    }

    // ── LAB COUNTS ──
    function updateLabCounts() {
        ['524','526','528','529','531'].forEach(lab => {
            const count = softwareList.filter(s => s.labs.includes(lab)).length;
            const el = document.getElementById('count' + lab);
            if (el) el.textContent = count;
        });
    }

    // ── SEARCH MODAL (stub) ──
    function openUnifiedModal() {
            document.getElementById('unifiedSitInModal').style.display = 'flex';
            document.getElementById('searchResultsList').innerHTML = '';
            document.getElementById('studentDetailsBox').style.display = 'none';
            document.getElementById('uniFooter').style.display = 'none';
            document.getElementById('uniIdSearch').value = '';
            document.getElementById('uniPCSection').style.display = 'none';
            document.getElementById('uniPCNumber').value = '';
        }

        function closeModal(id) { document.getElementById(id).style.display = 'none'; }

                let searchTimer;


        document.getElementById('uniIdSearch').addEventListener('input', function() {
            const query = this.value.trim();
            
            clearTimeout(searchTimer);

            if (query.length === 0) {
                document.getElementById('searchResultsList').innerHTML = '';
                document.getElementById('studentDetailsBox').style.display = 'none';
                document.getElementById('uniFooter').style.display = 'none';
                return;
            }

            searchTimer = setTimeout(() => {
                searchAndPopulate();
            }, 300); 
        });

        async function searchAndPopulate() {
            const query = document.getElementById('uniIdSearch').value.trim();
            const list  = document.getElementById('searchResultsList');
            const details = document.getElementById('studentDetailsBox');

            if (!query) return;

            try {
                const res  = await fetch(`http://localhost:3000/search-students?q=${encodeURIComponent(query)}`);
                const data = await res.json();

                if (res.ok && data.length > 0) {
                    list.innerHTML = data.map(student => {
                        const initials = (student.firstName[0] + student.lastName[0]).toUpperCase();
                        return `
                            <div class="search-result-item" onclick='selectStudent(${JSON.stringify(student)})'>
                                <div class="user-avatar">${initials}</div>
                                <div class="user-info-text">
                                    <span class="name">${student.firstName} ${student.lastName}</span>
                                    <div class="meta">
                                        <span>ID: ${student.idNumber}</span>
                                        <span>${student.course} ${student.yearLevel}</span>
                                    </div>
                                </div>
                                <div class="user-status-badges">
                                    <span class="badge-sessions">${student.remainingSession ?? 30} sessions</span>
                                    <span style="color:#4e73df; font-size:10px;">Click to select</span>
                                </div>
                            </div>`;
                    }).join('');
                    details.style.display = 'none';
                    document.getElementById('uniFooter').style.display = 'none';
                } else {
                    list.innerHTML = '<p style="text-align:center; color:#858796; font-size:12px; padding:10px;">No student found.</p>';
                }
            } catch (e) { console.error("Search Error:", e); }
        }

        function selectStudent(data) {
            document.getElementById('searchResultsList').innerHTML = '';
            document.getElementById('studentDetailsBox').style.display = 'block';
            document.getElementById('uniFooter').style.display = 'flex';

            document.getElementById('uniIdSearch').value = data.idNumber;

            const remaining = data.remainingSession ?? 30;
            document.getElementById('accountInfoDisplay').innerHTML = `
                <span class="profile-name">${data.firstName} ${data.lastName}</span>
                <div class="profile-meta">
                    <div class="meta-item"><label>ID Number</label><span>${data.idNumber}</span></div>
                    <div class="meta-item"><label>Remaining Sessions</label>
                        <span style="color:${remaining <= 0 ? '#dc3545' : '#1cc88a'}; font-weight:700;">
                            ${remaining} / 30
                        </span>
                    </div>
                </div>
                ${remaining <= 0 ? '<p style="color:#dc3545; font-size:12px; margin-top:8px;"><i class="fa fa-exclamation-triangle"></i> This student has no remaining sessions.</p>' : ''}`;

            const confirmBtn = document.querySelector('#uniFooter .btn-confirm');
            confirmBtn.disabled      = remaining <= 0;
            confirmBtn.style.opacity = remaining <= 0 ? '0.5' : '1';
            confirmBtn.style.cursor  = remaining <= 0 ? 'not-allowed' : 'pointer';
            document.getElementById('uniPCSection').style.display = 'block';
            renderUniPCGrid();
        }

        function renderUniPCGrid() {
            const grid = document.getElementById('uniPCGrid');
            document.getElementById('uniPCNumber').value = '';
            grid.innerHTML = '';
            for (let i = 1; i <= 36; i++) {
                const pc = `PC${i}`;
                const btn = document.createElement('button');
                btn.textContent = pc;
                btn.type = 'button';
                btn.style.cssText = 'padding: 5px 2px; font-size: 11px; border: 1px solid #4e73df; border-radius: 4px; background: transparent; color: #4e73df; cursor: pointer; font-weight: 600;';
                btn.onclick = function () {
                    document.querySelectorAll('#uniPCGrid button').forEach(b => {
                        b.style.background = 'transparent';
                        b.style.color = '#4e73df';
                    });
                    btn.style.background = '#4e73df';
                    btn.style.color = 'white';
                    document.getElementById('uniPCNumber').value = pc;
                };
                grid.appendChild(btn);
            }
        }

        async function submitUnifiedSitIn() {
            const idNumber = document.getElementById('uniIdSearch').value.trim();
            const purpose  = document.getElementById('uniPurpose').value;
            const lab      = document.getElementById('uniLab').value;
            const pcNumber = document.getElementById('uniPCNumber').value;

            if (!idNumber) return Swal.fire('Warning', 'No student selected. Please search and click a student first.', 'warning');
            if (!pcNumber) return Swal.fire('Warning', 'Please select a PC number.', 'warning');

            try {
                const res = await fetch('http://localhost:3000/sit-in', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idNumber, purpose, lab, pcNumber })
                });
                if (res.ok) {
                    await Swal.fire({ icon: 'success', title: 'Sit-in Recorded!', timer: 1500, showConfirmButton: false });
                    closeModal('unifiedSitInModal');
                } else {
                    const txt = await res.text();
                    Swal.fire('Error', txt, 'error');
                }
            } catch (e) { Swal.fire('Error', 'Connection failed.', 'error'); }
        }

    // ── LOGOUT ──
    async function logout() {
        const { isConfirmed } = await Swal.fire({
            title: 'Logout Admin?',
            text: "This will end your admin session.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, Logout!',
            cancelButtonText: 'Stay Logged In'
        });

        if (!isConfirmed) return;

        try {

            sessionStorage.removeItem("adminWelcomeShown");
            localStorage.removeItem("adminId");
            sessionStorage.clear();

            await Swal.fire({
                icon: 'success',
                title: 'Logged Out',
                text: 'Admin session ended successfully.',
                timer: 1500,
                showConfirmButton: false
            });

            window.location.href = "login.html";

        } catch (err) {
            console.error("Admin logout error:", err);

            sessionStorage.clear();
            localStorage.removeItem("adminId");

            window.location.href = "login.html";
        }
    }

    // ── SEARCH MODAL & AUTOCOMPLETE ──
    function openModal(id)  { document.getElementById(id).style.display = 'flex'; }
    function closeModal(id) { document.getElementById(id).style.display = 'none'; }

    let _searchModalTimer;

    function openSearchModal() {
        openModal('searchModal');
        document.getElementById('modalSearchInput').focus();
    }

    async function searchModalAutoFill() {
        const id   = document.getElementById('modalSearchInput').value.trim();
        const drop = document.getElementById('searchModalDropdown');

        if (!id) { drop.style.display = 'none'; return; }

        clearTimeout(_searchModalTimer);
        _searchModalTimer = setTimeout(async () => {
            drop.innerHTML = `<div class="sit-drop-empty"><i class="fa fa-spinner fa-spin"></i> Searching...</div>`;
            drop.style.display = 'block';

            try {
                const res  = await fetch(`http://localhost:3000/search-students?q=${encodeURIComponent(id)}`);
                const data = await res.json();

                if (!res.ok || !data.length) {
                    drop.innerHTML = `<div class="sit-drop-empty">No students found for "<b>${id}</b>".</div>`;
                    return;
                }

                drop.innerHTML = data.map(s => `
                    <div class="sit-drop-item" onclick="selectSearchModalStudent(${JSON.stringify(s).replace(/"/g, '&quot;')})">
                        <div class="sit-drop-avatar">${s.firstName[0]}${s.lastName[0]}</div>
                        <div class="sit-drop-info">
                            <div class="sit-drop-name">${s.firstName} ${s.lastName}</div>
                            <div class="sit-drop-meta">${s.idNumber} · ${s.course || ''} ${s.yearLevel || ''}</div>
                        </div>
                        <div class="sit-drop-sessions">${s.remainingSession ?? 30} sessions</div>
                    </div>`).join('');

            } catch (e) {
                drop.innerHTML = `<div class="sit-drop-empty" style="color:#dc3545;"><i class="fa fa-exclamation-circle"></i> Server error.</div>`;
            }
        }, 200);
    }

    function selectSearchModalStudent(s) {
        document.getElementById('modalSearchInput').value = s.idNumber;
        document.getElementById('searchModalDropdown').style.display = 'none';
        executeSearch();
    }

    async function executeSearch(event) {
        if (event) event.preventDefault();

        const id = document.getElementById('modalSearchInput').value.trim();
        if (!id) return Swal.fire('Error', 'Please enter an ID', 'error');

        try {
            const res = await fetch(`http://localhost:3000/student/${id}`);
            const data = await res.json();

            if (res.ok) {
                closeModal('searchModal');
                
                const profilePhotoHtml = data.profilePhoto 
                    ? `<img src="${data.profilePhoto}" alt="Avatar" style="width:70px; height:70px; border-radius:50%; object-fit:cover; margin-bottom:10px;">`
                    : `<div class="user-avatar" style="width:70px; height:70px; font-size:24px; margin:0 auto 10px; display:flex; align-items:center; justify-content:center; background:#4e73df; color:white; border-radius:50%; font-weight:bold;">${data.firstName[0]}${data.lastName[0]}</div>`;

                const infoHtml = `
                    <div style="text-align:center; margin-bottom:15px;">
                        ${profilePhotoHtml}
                        <h3 style="margin:5px 0 2px; color:var(--text-main); font-family:'Sora', sans-serif;">${data.firstName} ${data.lastName}</h3>
                        <span class="badge badge-session" style="background:#4e73df; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700;">${data.idNumber}</span>
                    </div>
                    <div class="student-profile-card" style="margin:0; padding:15px; background:var(--bg-card-alt); border-left:5px solid #4e73df; border-radius:8px;">
                        <div class="profile-meta" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-family:'Plus Jakarta Sans', sans-serif;">
                            <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Middle Name</label><span style="font-weight:600; color:var(--text-main); font-size:13px;">${data.middleName || 'N/A'}</span></div>
                            <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Email</label><span style="font-weight:600; color:var(--text-main); font-size:13px; word-break:break-all;">${data.email || 'N/A'}</span></div>
                            <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Address</label><span style="font-weight:600; color:var(--text-main); font-size:13px;">${data.address || 'N/A'}</span></div>
                            <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Course</label><span style="font-weight:600; color:var(--text-main); font-size:13px;">${data.course || 'N/A'}</span></div>
                            <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Year Level</label><span style="font-weight:600; color:var(--text-main); font-size:13px;">${data.yearLevel || 'N/A'}</span></div>
                            <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Remaining</label><span style="color:#1cc88a; font-weight:800; font-size:13px;">${data.remainingSession ?? 30} Sessions</span></div>
                        </div>
                    </div>
                `;
                document.getElementById('infoBody').innerHTML = infoHtml;
                openModal('studentInfoModal');
            } else {
                Swal.fire('Error', data.message || 'Student not found', 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Unable to fetch student info', 'error');
        }
    }


    // ── INIT ──
    window.onload = () => {
        renderList();
        updateLabCounts();
    };