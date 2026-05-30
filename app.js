/* TALLY — Main Application Controller */
const App = (() => {
    // i18n translations
    const i18n = {
        en: { nav_dashboard: 'Due Tracker', nav_customers: 'Customers', btn_new_entry: 'New Entry', search_placeholder: 'Search name...', kpi_total_due: 'Total Due', dashboard_subtitle_simple: 'Track who owes you and who you owe.', btn_save: 'Save', btn_cancel: 'Cancel', btn_delete: 'Delete' },
        bn: { nav_dashboard: 'বাকিখাতা', nav_customers: 'কাস্টমার', btn_new_entry: 'নতুন এন্ট্রি', search_placeholder: 'নাম খুঁজুন...', kpi_total_due: 'মোট পাওনা', dashboard_subtitle_simple: 'কার কাছে কত পাওনা তার হিসাব রাখুন সহজে।', btn_save: 'সেভ করুন', btn_cancel: 'বাতিল', btn_delete: 'ডিলিট' }
    };
    let lang = 'en';

    function t(key) { return (i18n[lang] && i18n[lang][key]) || (i18n.en[key]) || key; }
    function fmt(n) { return '৳ ' + (parseFloat(n) || 0).toLocaleString('en-IN'); }
    function timeAgo(date) {
        if (!date) return lang === 'bn' ? 'কোনো আপডেট নেই' : 'No update';
        const now = new Date();
        const diff = Math.floor((now - new Date(date)) / 1000);
        if (diff < 60) return lang === 'bn' ? 'এইমাত্র' : 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + (lang === 'bn' ? ' মিনিট আগে' : 'm ago');
        if (diff < 86400) return Math.floor(diff / 3600) + (lang === 'bn' ? ' ঘণ্টা আগে' : 'h ago');
        const days = Math.floor(diff / 86400);
        if (days === 1) return lang === 'bn' ? 'গতকাল' : 'Yesterday';
        if (days < 30) return days + (lang === 'bn' ? ' দিন আগে' : ' days ago');
        const months = Math.floor(days / 30);
        return months + (lang === 'bn' ? ' মাস আগে' : ' mo ago');
    }

    // ---- Routing ----
    let currentPage = 'dashboard';
    function navigateTo(page) {
        currentPage = page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));

        const el = document.getElementById('page-' + page);
        if (el) el.classList.add('active');

        const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (nav) nav.classList.add('active');

        const bNav = document.querySelector(`.bottom-nav-item[data-page="${page}"]`);
        if (bNav) bNav.classList.add('active');

        closeSidebar();
        refreshPage(page);
    }

    function openSecuritySettings() {
        checkSecurity(() => {
            const currentPass = localStorage.getItem('tally_pass');
            openModal(lang === 'bn' ? 'সিকিউরিটি সেটিংস' : 'Security Settings', `
                <div class="form-group">
                    <label>${lang === 'bn' ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Set New Password'}</label>
                    <input type="password" id="f_new_pass" placeholder="পাসওয়ার্ড দিন" value="${currentPass || ''}" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:8px;">
                </div>
                <p style="font-size:12px; color:var(--text-secondary); line-height:1.4;">${lang === 'bn' ? 'এখানে পাসওয়ার্ড সেট থাকলে ডিলিট বা এন্ট্রি এডিট করার সময় পাসওয়ার্ড প্রয়োজন হবে। খালি রাখলে কোনো পাসওয়ার্ড চাইবে না।' : 'Setting a password will require it for delete or edit actions. Leave blank for no security.'}</p>
            `, () => {
                const pass = document.getElementById('f_new_pass').value.trim();
                localStorage.setItem('tally_pass', pass);
                toast(pass ? (lang === 'bn' ? 'পাসওয়ার্ড সেট করা হয়েছে' : 'Password set!') : (lang === 'bn' ? 'পাসওয়ার্ড মুছে ফেলা হয়েছে' : 'Password removed!'));
                closeModal();
            });
        });
    }

    function checkSecurity(onSuccess) {
        const savedPass = localStorage.getItem('tally_pass');
        if (!savedPass) {
            onSuccess();
            return;
        }

        const input = prompt(lang === 'bn' ? 'সুরক্ষার জন্য পাসওয়ার্ড দিন:' : 'Enter password to continue:');
        if (input === savedPass) {
            onSuccess();
        } else if (input !== null) {
            toast(lang === 'bn' ? 'ভুল পাসওয়ার্ড!' : 'Wrong password!', 'error');
        }
    }

    function openFilterSettings() {
        const currentSort = localStorage.getItem('tally_sort') || 'name_asc';
        openModal(lang === 'bn' ? 'সর্ট করুন' : 'Sort Options', `
            <div class="form-group">
                <label style="font-weight:600; display:block; margin-bottom:8px;">${lang === 'bn' ? 'কিভাবে সর্ট করতে চান?' : 'How to sort?'}</label>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <label style="display:flex; align-items:center; gap:10px; padding:12px; background:#f8fafc; border-radius:10px; cursor:pointer;">
                        <input type="radio" name="sort_opt" value="name_asc" ${currentSort === 'name_asc' ? 'checked' : ''}>
                        <span>${lang === 'bn' ? 'নাম অনুসারে (ক - হ)' : 'By Name (A - Z)'}</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; padding:12px; background:#f8fafc; border-radius:10px; cursor:pointer;">
                        <input type="radio" name="sort_opt" value="due_high" ${currentSort === 'due_high' ? 'checked' : ''}>
                        <span>${lang === 'bn' ? 'বেশি বাকি সবার উপরে' : 'Highest Due First'}</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; padding:12px; background:#f8fafc; border-radius:10px; cursor:pointer;">
                        <input type="radio" name="sort_opt" value="due_low" ${currentSort === 'due_low' ? 'checked' : ''}>
                        <span>${lang === 'bn' ? 'কম বাকি সবার উপরে' : 'Lowest Due First'}</span>
                    </label>
                </div>
            </div>
        `, () => {
            const selected = document.querySelector('input[name="sort_opt"]:checked').value;
            localStorage.setItem('tally_sort', selected);
            refreshDashboard(null, selected);
            closeModal();
        });
    }

    async function exportCSV() {
        toast(lang === 'bn' ? 'ব্যাকআপ ডাউনলোড হচ্ছে...' : 'Downloading backup...');
        await TallyStore.exportAllData();
    }

    // ---- Sidebar ----
    function openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').style.display = 'block'; }
    function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').style.display = 'none'; }

    // ---- Theme ----
    function toggleTheme() {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        document.getElementById('themeToggleBtn').innerHTML = isDark ? '<i class="ph ph-moon"></i>' : '<i class="ph ph-sun"></i>';
        localStorage.setItem('tally_theme', isDark ? 'light' : 'dark');
    }

    // ---- Language ----
    function toggleLang() {
        lang = lang === 'en' ? 'bn' : 'en';
        document.getElementById('langToggleBtn').querySelector('.lang-label').textContent = lang === 'en' ? 'EN' : 'বাং';
        document.documentElement.setAttribute('data-lang', lang);
        applyI18n();
        localStorage.setItem('tally_lang', lang);
        refreshPage(currentPage);
    }
    function applyI18n() {
        document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.getAttribute('data-i18n'); if (t(k) !== k) el.textContent = t(k); });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const k = el.getAttribute('data-i18n-placeholder'); if (t(k) !== k) el.placeholder = t(k); });
    }

    // ---- Toast ----
    function toast(msg, type = 'success') {
        const c = document.getElementById('toastContainer');
        const icons = { success: 'ph-check-circle', error: 'ph-warning-circle', info: 'ph-info' };
        const el = document.createElement('div'); el.className = 'toast';
        el.innerHTML = `<span class="toast-icon ${type}"><i class="ph ${icons[type] || icons.info}"></i></span><div class="toast-body"><strong>${msg}</strong></div>`;
        c.appendChild(el);
        setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 3500);
    }

    // ---- Modal ----
    // ---- Modal ----
    function openModal(title, bodyHTML, onSave, footerExtra, isReadOnly = false) {
        const overlay = document.getElementById('modalOverlay');
        const titleEl = document.getElementById('modalTitle');
        const bodyEl = document.getElementById('modalBody');
        const saveBtn = document.getElementById('modalSaveBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');
        const closeBtn = document.getElementById('modalCloseBtn');

        titleEl.textContent = title;
        bodyEl.innerHTML = bodyHTML;
        overlay.classList.add('active');

        // Reset display
        saveBtn.style.display = isReadOnly ? 'none' : 'block';
        cancelBtn.textContent = isReadOnly ? (lang === 'bn' ? 'বন্ধ করুন' : 'Close') : t('btn_cancel');

        // Clear and re-add listeners (safely)
        const newSave = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSave, saveBtn);
        newSave.textContent = t('btn_save');
        if (onSave) {
            newSave.addEventListener('click', async () => {
                const needsPass = (title === 'এন্ট্রি এডিট' || title === 'Edit Entry'); // Protect edit specifically
                const action = async () => {
                    if (newSave.getAttribute('data-loading') === 'true') return;
                    newSave.setAttribute('data-loading', 'true');
                    newSave.style.opacity = '0.7';
                    try {
                        await onSave();
                    } catch (e) {
                        console.error(e);
                        newSave.removeAttribute('data-loading');
                        newSave.style.opacity = '1';
                    }
                };

                if (needsPass) checkSecurity(action);
                else action();
            });
        }

        const newCancel = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        newCancel.addEventListener('click', closeModal);

        const newClose = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);
        newClose.addEventListener('click', closeModal);

        const footExtra = document.getElementById('modalFooterExtra');
        if (footExtra) {
            footExtra.innerHTML = '';
            if (footerExtra && !isReadOnly) {
                const extra = document.createElement('button');
                extra.className = 'btn btn-danger';
                extra.textContent = t('btn_delete');
                extra.style.marginRight = 'auto';
                extra.style.padding = '12px 18px';
                extra.style.fontSize = '14px';
                extra.addEventListener('click', () => checkSecurity(footerExtra));
                footExtra.appendChild(extra);
            }
        }
    }
    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
        const footExtra = document.getElementById('modalFooterExtra');
        if (footExtra) footExtra.innerHTML = '';
    }

    // ---- Chart Rendering (Canvas) ----
    function drawCashFlowChart(data) {
        const canvas = document.getElementById('cashFlowChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * dpr; canvas.height = 280 * dpr;
        canvas.style.width = rect.width + 'px'; canvas.style.height = '280px';
        ctx.scale(dpr, dpr);
        const W = rect.width, H = 280, pad = { t: 20, r: 20, b: 40, l: 60 };
        const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
        ctx.clearRect(0, 0, W, H);
        const maxVal = Math.max(1, ...data.map(d => Math.max(d.inflow, d.outflow)));
        const barW = Math.min(30, cW / data.length / 3);
        const gap = cW / data.length;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? '#94A3B8' : '#94A3B8'; ctx.font = '12px Inter'; ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) { const y = pad.t + cH - (cH / 4) * i; const v = Math.round(maxVal / 4 * i); ctx.fillText(fmt(v), pad.l - 10, y + 4); ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(226,232,240,0.8)'; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke(); }
        data.forEach((d, i) => {
            const x = pad.l + gap * i + gap / 2;
            const hIn = (d.inflow / maxVal) * cH, hOut = (d.outflow / maxVal) * cH;
            ctx.fillStyle = '#10B981'; roundRect(ctx, x - barW - 2, pad.t + cH - hIn, barW, hIn, 4);
            ctx.fillStyle = '#3B82F6'; roundRect(ctx, x + 2, pad.t + cH - hOut, barW, hOut, 4);
            ctx.fillStyle = isDark ? '#CBD5E1' : '#64748B'; ctx.textAlign = 'center'; ctx.font = '12px Inter';
            ctx.fillText(d.label, x, H - pad.b + 20);
        });
        // Legend
        ctx.fillStyle = '#10B981'; roundRect(ctx, pad.l, H - 14, 10, 10, 2); ctx.fillStyle = isDark ? '#CBD5E1' : '#475569'; ctx.textAlign = 'left'; ctx.font = '11px Inter'; ctx.fillText('Income', pad.l + 14, H - 5);
        ctx.fillStyle = '#3B82F6'; roundRect(ctx, pad.l + 80, H - 14, 10, 10, 2); ctx.fillStyle = isDark ? '#CBD5E1' : '#475569'; ctx.fillText('Expense', pad.l + 94, H - 5);
    }
    function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.fill(); }

    // ---- Refresh Pages ----
    async function refreshPage(page) {
        if (page === 'dashboard') await refreshDashboard();
        else if (page === 'customers') await refreshCustomers();
        else if (page === 'suppliers') await refreshSuppliers();
        else if (page === 'services') await refreshServices();
        else if (page === 'bkash') await refreshBkash();
        else if (page === 'expenses') await refreshExpenses();
        else if (page === 'inventory') await refreshInventory();
        else if (page === 'ledger') await refreshLedger();
        else if (page === 'cashbox') await refreshCashbox();
    }

    async function refreshDashboard(filter = null, sortBy = localStorage.getItem('tally_sort') || 'name_asc') {
        let customers = await TallyStore.getCustomers();
        let suppliers = await TallyStore.getSuppliers();

        let searchVal = filter;
        if (searchVal === null) {
            const input = document.getElementById('customerSearchMain');
            searchVal = input ? input.value : '';
        }
        const f = String(searchVal || '').toLowerCase().trim();
        if (f) {
            customers = customers.filter(c =>
                (c.name && c.name.toLowerCase().includes(f)) ||
                (c.phone && c.phone.includes(f))
            );
        }

        // Apply sorting
        if (sortBy === 'name_asc') customers.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bn'));
        else if (sortBy === 'name_desc') customers.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'bn'));
        else if (sortBy === 'due_high') customers.sort((a, b) => (parseFloat(b.due) || 0) - (parseFloat(a.due) || 0));
        else if (sortBy === 'due_low') customers.sort((a, b) => (parseFloat(a.due) || 0) - (parseFloat(b.due) || 0));

        // Update counts
        const dashCustomerCount = document.getElementById('dashCustomerCount');
        const dashSupplierCount = document.getElementById('dashSupplierCount');
        if (dashCustomerCount) dashCustomerCount.textContent = customers.length.toLocaleString('en-IN') || '০';
        if (dashSupplierCount) dashSupplierCount.textContent = suppliers.length.toLocaleString('en-IN') || '০';

        // Calculate Totals
        let totalReceivable = 0;
        let totalPayable = 0;
        customers.forEach(c => {
            const d = parseFloat(c.due) || 0;
            if (d > 0) totalReceivable += d; else if (d < 0) totalPayable += Math.abs(d);
        });
        suppliers.forEach(s => {
            const d = parseFloat(s.due) || 0;
            if (d > 0) totalPayable += d; else if (d < 0) totalReceivable += Math.abs(d);
        });

        const dashTotalGet = document.getElementById('dashTotalGet');
        const dashTotalGive = document.getElementById('dashTotalGive');
        if (dashTotalGet) dashTotalGet.textContent = fmt(totalReceivable);
        if (dashTotalGive) dashTotalGive.textContent = fmt(totalPayable);

        const list = document.getElementById('dashboardCustomerList');
        if (!list) return;
        list.innerHTML = '';

        if (!customers.length) {
            list.innerHTML = `<div class="empty-state" style="padding:40px; text-align:center; opacity:0.7;">
                <i class="ph ph-magnifying-glass" style="font-size:3rem; display:block; margin-bottom:10px;"></i>
                <p>${f ? (lang === 'bn' ? 'কোনো মিল পাওয়া যায়নি।' : 'No matches found.') : (lang === 'bn' ? 'কোনো কাস্টমার নেই।' : 'No customers yet.')}</p>
                ${f ? `<button class="btn btn-primary" style="margin-top:20px;" onclick="App.quickAddCustomer('${f}')">
                    <i class="ph ph-plus"></i> ${lang === 'bn' ? 'নতুন এন্ট্রি: ' : 'Add New: '} "${f}"
                </button>` : ''}
            </div>`;
            return;
        }

        customers.sort((a, b) => Math.abs(b.due || 0) - Math.abs(a.due || 0)).forEach(c => {
            const card = document.createElement('div');
            card.className = 'entity-card';
            card.style.border = 'none';
            card.style.borderBottom = '1px solid var(--border-light)';
            card.style.borderRadius = '0';
            card.style.padding = '12px 10px';
            card.style.boxShadow = 'none';
            card.onclick = () => openCustomerHistoryModal(c);

            const initials = (c.name.split(' ').map(n => n[0]).join('') || '?').substring(0, 2).toUpperCase();
            // Assign random tint based on name length for avatar
            const isRec = (c.due >= 0);
            const amtStr = Math.abs(c.due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

            card.innerHTML = `
                <div class="entity-avatar" style="background:#E2E8F0; color:#475569; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px;">${initials}</div>
                <div class="entity-info" style="margin-left:12px; min-width:0; flex:1;">
                    <h4 style="font-size:16px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.name}</h4>
                    <p style="font-size:12px; color:#64748B; margin-top:2px;">${timeAgo(c.updatedAt)}</p>
                </div>
                <div class="entity-due" style="display:flex; align-items:center; gap:8px;">
                    <span class="due-amount" style="font-size:17px; font-weight:700; color:${isRec ? 'var(--danger)' : 'var(--success)'};">৳ ${amtStr}</span>
                    <i class="ph ph-caret-right" style="color:#CBD5E1; font-size:18px;"></i>
                </div>
            `;
            list.appendChild(card);
        });
    }

    async function openCustomerHistoryModal(customer) {
        // Reload fresh customer data
        const allCustomers = await TallyStore.getCustomers();
        const freshCustomer = allCustomers.find(c => c.id === customer.id) || customer;

        const txns = (await TallyStore.getTransactions())
            .filter(t => t.entityName === freshCustomer.name)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first

        // Build history rows
        let historyRowsHTML = '';
        if (txns.length === 0) {
            historyRowsHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; opacity:0.6;">${lang === 'bn' ? 'কোনো ইতিহাস নেই' : 'No history yet'}</td></tr>`;
        } else {
            txns.forEach(t => {
                const isGave = ['sale', 'service', 'given'].includes(t.type);
                const amt = parseFloat(t.amount) || 0;
                const d = new Date(t.date);
                const dateStr = d.toLocaleDateString('en', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
                historyRowsHTML += `
                <tr>
                    <td style="padding:8px 6px; font-size:0.8rem; color:var(--text-secondary); white-space:nowrap;">${dateStr}</td>
                    <td style="padding:8px 6px; font-size:0.85rem;">${t.category || t.description || '—'}</td>
                    <td style="padding:8px 6px; font-weight:bold; text-align:right; color:${isGave ? 'var(--danger)' : 'var(--success)'}; white-space:nowrap;">
                        ${isGave ? '− ' : '+ '}৳${amt.toLocaleString('en-IN')}
                    </td>
                    <td style="padding:8px 6px; text-align:center;">
                        <button class="btn btn-secondary btn-sm" title="${lang === 'bn' ? 'এডিট' : 'Edit'}"
                            onclick="App.editTransaction('${t.id}', '${freshCustomer.id}')"
                            style="padding:4px 8px; font-size:0.75rem;">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                    </td>
                </tr>`;
            });
        }

        const historyHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #f1f5f9;">
                <div style="font-weight:700; font-size:1.15rem; color:${(freshCustomer.due || 0) >= 0 ? 'var(--danger)' : 'var(--success)'};">
                    ${lang === 'bn' ? ((freshCustomer.due || 0) >= 0 ? 'পাবো ৳ ' : 'দিবো ৳ ') : 'Due ৳ '}${Math.abs(freshCustomer.due || 0).toLocaleString('en-IN')}
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-secondary btn-sm" onclick="App.generateCustomerStatement('${freshCustomer.name}')" title="${lang === 'bn' ? 'রিপোর্ট' : 'Report'}" style="padding: 6px 12px; background:#f8fafc; border:none;">
                        <i class="ph ph-file-text"></i> ${lang === 'bn' ? 'স্টেটমেন্ট' : 'Statement'}
                    </button>
                    <div class="dropdown">
                        <button class="btn btn-secondary btn-sm" onclick="this.nextElementSibling.classList.toggle('show')" style="padding: 6px 10px; background:#f8fafc; border:none;">
                            <i class="ph ph-dots-three-vertical"></i>
                        </button>
                        <div class="dropdown-content" style="right:0; min-width:150px;">
                            <a href="#" style="color:var(--danger);" onclick="App.confirmDeleteCustomer('${freshCustomer.id}', '${freshCustomer.name}')">
                                <i class="ph ph-trash"></i> ${lang === 'bn' ? 'কাস্টমার ডিলিট' : 'Delete Customer'}
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom:24px; margin-top:8px;">
                <div style="display:flex; gap:12px; margin-bottom:16px;">
                    <div style="flex:1; position:relative; border:2px solid var(--danger); border-radius:8px; padding:12px 14px; background:white;">
                        <label style="position:absolute; top:-10px; left:12px; background:white; padding:0 4px; font-size:12px; color:var(--danger); font-weight:500;">
                            ${lang === 'bn' ? 'দিলাম/বেচা' : 'Gave/Sale'}
                        </label>
                        <div style="display:flex; align-items:center;">
                            <span style="font-size:18px; font-weight:700; color:var(--text); margin-right:4px;">৳</span>
                            <input type="number" id="f_pay_gave" placeholder="" style="border:none; outline:none; background:transparent; font-size:18px; font-weight:700; color:var(--text); width:100%;">
                        </div>
                    </div>
                    <div style="flex:1; position:relative; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; background:white;">
                        <div style="display:flex; align-items:center; height:100%;">
                            <span style="font-size:18px; font-weight:700; color:#cbd5e1; margin-right:4px;">৳</span>
                            <input type="number" id="f_pay_recv" placeholder="${lang === 'bn' ? 'পেলাম' : 'Received'}" style="border:none; outline:none; background:transparent; font-size:16px; color:var(--text); width:100%;">
                        </div>
                    </div>
                </div>
                
                <div style="position:relative; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; background:white; margin-bottom:16px;">
                    <div style="display:flex; align-items:center;">
                        <i class="ph ph-note-pencil" style="font-size:20px; color:var(--text-muted); margin-right:8px;"></i>
                        <input type="text" id="f_pay_desc" placeholder="${lang === 'bn' ? 'বিবরণ' : 'Description'}" style="border:none; outline:none; background:transparent; font-size:16px; color:var(--text); width:100%;">
                    </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <button class="btn btn-secondary btn-sm" style="background:#f1f5f9; border:none; border-radius:20px; padding:6px 14px; color:var(--text-secondary); font-size:13px;" onclick="document.getElementById('f_pay_date').showPicker && document.getElementById('f_pay_date').showPicker()">
                        <i class="ph ph-calendar-blank" style="margin-right:4px;"></i> 
                        ${new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short' })}
                        <input type="date" id="f_pay_date" style="position:absolute; opacity:0; width:0; height:0;">
                    </button>
                    
                    <button class="btn btn-secondary btn-sm" style="background:#f1f5f9; border:none; border-radius:20px; padding:6px 14px; color:var(--text-secondary); font-size:13px;" onclick="toast('ছবি সংযুক্তকরণ শীঘ্রই আসছে!')">
                        <i class="ph ph-camera" style="margin-right:4px;"></i> ${lang === 'bn' ? 'ছবি' : 'Photo'}
                    </button>
                </div>
            </div>

            <div style="font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary); margin-bottom:8px;">
                <i class="ph ph-clock-counter-clockwise"></i> ${lang === 'bn' ? 'লেনদেনের ইতিহাস' : 'Transaction History'}
            </div>
            <div style="max-height:260px; overflow-y:auto; border:1px solid var(--border-color); border-radius:10px;">
                <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                    <thead style="background:var(--bg-secondary); position:sticky; top:0;">
                        <tr>
                            <th style="padding:8px 6px; text-align:left; font-weight:600; font-size:0.75rem;">${lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                            <th style="padding:8px 6px; text-align:left; font-weight:600; font-size:0.75rem;">${lang === 'bn' ? 'বিবরণ' : 'Detail'}</th>
                            <th style="padding:8px 6px; text-align:right; font-weight:600; font-size:0.75rem;">${lang === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                            <th style="padding:8px 6px; text-align:center; font-weight:600; font-size:0.75rem;">${lang === 'bn' ? 'এডিট' : 'Edit'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historyRowsHTML}
                    </tbody>
                </table>
            </div>`;

        openModal(freshCustomer.name, historyHTML, async () => {
            const gave = parseFloat(document.getElementById('f_pay_gave').value) || 0;
            const recv = parseFloat(document.getElementById('f_pay_recv').value) || 0;
            const desc = document.getElementById('f_pay_desc').value.trim();

            if (gave === 0 && recv === 0) return;

            // Instant feedback
            closeModal();
            toast(lang === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...');

            const ps = [];
            if (gave > 0) {
                ps.push(TallyStore.addTransaction({ type: 'sale', entityName: freshCustomer.name, amount: gave, category: desc || (lang === 'bn' ? 'বাকি এন্ট্রি' : 'Due'), date: new Date().toISOString() }));
            }
            if (recv > 0) {
                ps.push(TallyStore.addTransaction({ type: 'payment_in', entityName: freshCustomer.name, amount: recv, category: desc || (lang === 'bn' ? 'টাকা ফেরত' : 'Payment'), date: new Date().toISOString() }));
            }

            await Promise.all(ps);
            freshCustomer.due = (parseFloat(freshCustomer.due) || 0) + (gave - recv);
            await TallyStore.updateCustomer(freshCustomer);

            refreshDashboard();
            toast(lang === 'bn' ? 'হিসাব আপডেট হয়েছে' : 'Due updated!', 'success');
        });

        // Auto-focus the "দিলাম/বেচা" input
        setTimeout(() => {
            const gaveInput = document.getElementById('f_pay_gave');
            if (gaveInput) gaveInput.focus();
        }, 300);
    }

    async function editTransaction(txId, customerId) {
        const txns = await TallyStore.getTransactions();
        const tx = txns.find(t => t.id === txId);
        if (!tx) return;

        const isSale = tx.type === 'sale';
        openModal(lang === 'bn' ? 'এন্ট্রি এডিট' : 'Edit Entry',
            `<div class="form-group"><label>${lang === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'}</label>
            <input id="f_ed_amt" type="number" value="${tx.amount}" style="font-weight:bold; color:${isSale ? 'var(--danger)' : 'var(--success)'}; font-size:1.2rem;"></div>
            <div class="form-group"><label>${lang === 'bn' ? 'বিবরণ' : 'Description'}</label>
            <input id="f_ed_desc" value="${tx.category || tx.description || ''}" placeholder="Photocopy, Printing etc."></div>`,
            async () => {
                const newAmt = parseFloat(document.getElementById('f_ed_amt').value) || 0;
                const newDesc = document.getElementById('f_ed_desc').value.trim();

                if (newAmt <= 0) { toast('Invalid amount', 'error'); return; }

                const oldDiff = isSale ? tx.amount : -tx.amount;
                const newDiff = isSale ? newAmt : -newAmt;
                const adjust = newDiff - oldDiff;

                // Instant UI feedback
                closeModal();
                toast(lang === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...');

                tx.amount = newAmt;
                tx.category = newDesc;

                const p1 = TallyStore.updateTransaction(tx);
                let p2 = Promise.resolve();

                const customers = await TallyStore.getCustomers();
                const c = customers.find(x => x.id === customerId);
                if (c) {
                    c.due = (parseFloat(c.due) || 0) + adjust;
                    p2 = TallyStore.updateCustomer(c);
                }

                await Promise.all([p1, p2]);
                refreshDashboard();
                toast(lang === 'bn' ? 'সফলভাবে আপডেট করা হয়েছে' : 'Updated successfully', 'success');
            },
            async () => {
                if (confirm(lang === 'bn' ? 'এই এন্ট্রিটি কি ডিলিট করতে চান?' : 'Delete this entry?')) {
                    const diff = isSale ? -tx.amount : tx.amount;
                    await TallyStore.deleteTransaction(tx.id);

                    const customers = await TallyStore.getCustomers();
                    const c = customers.find(x => x.id === customerId);
                    if (c) {
                        c.due = (parseFloat(c.due) || 0) + diff;
                        await TallyStore.updateCustomer(c);
                    }

                    toast(lang === 'bn' ? 'ডিলিট করা হয়েছে' : 'Deleted');
                    closeModal();
                    refreshDashboard();
                }
            }
        );
    }

    function makeTxItem(tx) {
        const li = document.createElement('li'); li.className = 'tx-item';
        const icons = { sale: 'ph-storefront', purchase: 'ph-shopping-cart', expense: 'ph-receipt', payment_in: 'ph-arrow-down-left', payment_out: 'ph-arrow-up-right' };
        const isCredit = ['sale', 'payment_in'].includes(tx.type);
        const d = new Date(tx.date);
        const dateStr = d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
        li.innerHTML = `<div class="tx-dot ${tx.type}"> <i class="ph ${icons[tx.type] || 'ph-coin'}"></i></div>
            <div class="tx-info"><h4>${tx.description || tx.type}</h4><small>${dateStr} • ${tx.paymentMethod || 'cash'}</small></div>
            <div class="tx-amount ${isCredit ? 'credit' : 'debit'}">${isCredit ? '+' : '−'} ${fmt(tx.amount)}</div>`;
        return li;
    }

    // ---- CUSTOMERS ----
    async function confirmDeleteCustomer(id, name) {
        if (confirm(lang === 'bn' ? `আপনি কি নিশ্চিতভাবে "${name}" কে ডিলিট করতে চান ? ` : `Are you sure you want to delete "${name}" ? `)) {
            await TallyStore.deleteCustomer(id);
            toast(lang === 'bn' ? 'কাস্টমার ডিলিট করা হয়েছে' : 'Customer deleted');
            closeModal();
            refreshDashboard();
        }
    }

    async function refreshCashbox() {
        const txns = await TallyStore.getTransactions();
        const now = new Date().toISOString().split('T')[0];
        const todayTxns = txns.filter(t => t.date && t.date.startsWith(now));

        let cashIn = 0;
        let cashOut = 0;

        todayTxns.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            // Cash in logic (simplified: sales/services/payments in)
            if (['sale', 'service', 'payment_in', 'mfs_in'].includes(t.type)) {
                cashIn += amt;
            } else if (['purchase', 'expense', 'payment_out', 'mfs_out'].includes(t.type)) {
                cashOut += amt;
            }
        });

        // Calculate current total balance from all transaction history (simplified)
        let totalBalance = 0;
        txns.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            if (['sale', 'service', 'payment_in', 'mfs_in'].includes(t.type)) totalBalance += amt;
            else totalBalance -= amt;
        });

        const elIn = document.getElementById('cashboxIn');
        const elOut = document.getElementById('cashboxOut');
        const elBal = document.getElementById('cashboxBalance');

        if (elIn) elIn.textContent = fmt(cashIn);
        if (elOut) elOut.textContent = fmt(cashOut);
        if (elBal) elBal.textContent = fmt(totalBalance);
    }

    async function refreshCustomers(filter = '') {
        let data = await TallyStore.getCustomers();
        if (filter) data = data.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
        const el = document.getElementById('customerList'); el.innerHTML = '';
        if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="ph ph-users-three"></i><p>No customers found.</p></div>'; return; }
        data.forEach(c => {
            const colors = ['#F97316', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#EC4899'];
            const color = colors[c.name.charCodeAt(0) % colors.length];
            const card = document.createElement('div'); card.className = 'entity-card'; card.onclick = () => openCustomerModal(c);
            card.innerHTML = `<div class="entity-avatar" style="background:${color}"> ${c.name.charAt(0)}</div>
                <div class="entity-info"><h4>${c.name}</h4><p>${c.phone || 'No phone'}</p></div>
                <div class="entity-due"><span class="due-label">Due</span><span class="due-amount receivable">${fmt(c.due || 0)}</span></div>`;
            el.appendChild(card);
        });
    }
    function openCustomerModal(existing) {
        const isEdit = !!existing;
        openModal(isEdit ? 'Edit Customer' : 'Add Customer',
            `<div class="form-group"><label>Name</label><input id="f_cname" value="${isEdit ? existing.name : ''}"></div>
            <div class="form-row"><div class="form-group"><label>Phone</label><input id="f_cphone" value="${isEdit ? existing.phone : ''}"></div>
            <div class="form-group"><label>Due Amount (৳)</label><input id="f_cdue" type="number" value="${isEdit ? (existing.due || 0) : '0'}"></div></div>
            <div class="form-group"><label>Address</label><input id="f_caddr" value="${isEdit ? existing.address : ''}"></div>
            <div class="form-group"><label>Notes</label><textarea id="f_cnotes" rows="2">${isEdit ? existing.notes : ''}</textarea></div>`,
            async () => {
                const obj = { name: document.getElementById('f_cname').value.trim(), phone: document.getElementById('f_cphone').value.trim(), due: parseFloat(document.getElementById('f_cdue').value) || 0, address: document.getElementById('f_caddr').value.trim(), notes: document.getElementById('f_cnotes').value.trim() };
                if (!obj.name) { toast('Name is required', 'error'); return; }
                if (isEdit) { Object.assign(existing, obj); await TallyStore.updateCustomer(existing); toast('Customer updated!'); }
                else { await TallyStore.addCustomer(obj); toast('Customer added!'); }
                closeModal(); refreshCustomers();
            },
            isEdit ? async () => { await TallyStore.deleteCustomer(existing.id); toast('Customer deleted'); closeModal(); refreshCustomers(); } : null
        );
    }

    // ---- SUPPLIERS (mirrors customers) ----
    async function refreshSuppliers(filter = '') {
        let data = await TallyStore.getSuppliers();
        if (filter) data = data.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));
        const el = document.getElementById('supplierList'); el.innerHTML = '';
        if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="ph ph-truck"></i><p>No suppliers found.</p></div>'; return; }
        data.forEach(s => {
            const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F97316', '#EF4444'];
            const color = colors[s.name.charCodeAt(0) % colors.length];
            const card = document.createElement('div'); card.className = 'entity-card'; card.onclick = () => openSupplierModal(s);
            card.innerHTML = `<div class="entity-avatar" style="background:${color}"> ${s.name.charAt(0)}</div><div class="entity-info"><h4>${s.name}</h4><p>${s.phone || 'No phone'}</p></div><div class="entity-due"><span class="due-label">Payable</span><span class="due-amount payable">${fmt(s.due || 0)}</span></div>`;
            el.appendChild(card);
        });
    }
    function openSupplierModal(existing) {
        const isEdit = !!existing;
        openModal(isEdit ? 'Edit Supplier' : 'Add Supplier',
            `<div class="form-group"><label>Name</label><input id="f_sname" value="${isEdit ? existing.name : ''}"></div>
            <div class="form-row"><div class="form-group"><label>Phone</label><input id="f_sphone" value="${isEdit ? existing.phone : ''}"></div><div class="form-group"><label>Payable (৳)</label><input id="f_sdue" type="number" value="${isEdit ? (existing.due || 0) : '0'}"></div></div>
            <div class="form-group"><label>Address</label><input id="f_saddr" value="${isEdit ? existing.address : ''}"></div>
            <div class="form-group"><label>Notes</label><textarea id="f_snotes" rows="2">${isEdit ? existing.notes : ''}</textarea></div>`,
            async () => { const o = { name: document.getElementById('f_sname').value.trim(), phone: document.getElementById('f_sphone').value.trim(), due: parseFloat(document.getElementById('f_sdue').value) || 0, address: document.getElementById('f_saddr').value.trim(), notes: document.getElementById('f_snotes').value.trim() }; if (!o.name) { toast('Name required', 'error'); return; } if (isEdit) { Object.assign(existing, o); await TallyStore.updateSupplier(existing); toast('Supplier updated!'); } else { await TallyStore.addSupplier(o); toast('Supplier added!'); } closeModal(); refreshSuppliers(); },
            isEdit ? async () => { await TallyStore.deleteSupplier(existing.id); toast('Supplier deleted'); closeModal(); refreshSuppliers(); } : null
        );
    }

    // ---- SERVICES (Photocopy/Printing) ----
    async function refreshServices() {
        const txns = (await TallyStore.getTransactions()).filter(t => t.type === 'service').sort((a, b) => new Date(b.date) - new Date(a.date));
        const body = document.getElementById('servicesTableBody'); body.innerHTML = '';
        document.getElementById('servicesEmpty').classList.toggle('hidden', txns.length > 0);
        document.getElementById('servicesTable').classList.toggle('hidden', txns.length === 0);
        txns.forEach((tx, i) => {
            body.innerHTML += `<tr><td>${i + 1}</td><td>${new Date(tx.date).toLocaleDateString()}</td><td>${tx.category || 'Photocopy'}</td><td>${tx.qty || 1}</td><td>${fmt(tx.amount)}</td><td><span class="status-badge paid">paid</span></td></tr> `;
        });
    }

    // ---- bKash / Nagad ----
    async function refreshBkash() {
        const txns = (await TallyStore.getTransactions()).filter(t => ['mfs_in', 'mfs_out'].includes(t.type)).sort((a, b) => new Date(b.date) - new Date(a.date));
        const body = document.getElementById('bkashTableBody'); body.innerHTML = '';
        document.getElementById('bkashEmpty').classList.toggle('hidden', txns.length > 0);
        document.getElementById('bkashTable').classList.toggle('hidden', txns.length === 0);
        txns.forEach((tx, i) => {
            const typeLabel = tx.type === 'mfs_in' ? 'Cash In' : 'Cash Out';
            body.innerHTML += `<tr><td>${i + 1}</td><td>${new Date(tx.date).toLocaleDateString()}</td><td>${typeLabel}</td><td>${tx.entityName || '—'}</td><td>${tx.paymentMethod}</td><td>${fmt(tx.amount)}</td><td style="color:var(--success)">+ ${fmt(tx.commission || 0)}</td></tr> `;
        });
    }

    // ---- EXPENSES ----
    async function refreshExpenses() {
        const txns = (await TallyStore.getTransactions()).filter(t => t.type === 'expense').sort((a, b) => new Date(b.date) - new Date(a.date));
        const body = document.getElementById('expensesTableBody'); body.innerHTML = '';
        document.getElementById('expensesEmpty').classList.toggle('hidden', txns.length > 0);
        document.getElementById('expensesTable').classList.toggle('hidden', txns.length === 0);
        const now = new Date(), todayS = now.toISOString().split('T')[0];
        let eTod = 0, eWeek = 0, eMonth = 0;
        txns.forEach((tx, i) => {
            const d = new Date(tx.date), ds = d.toISOString().split('T')[0], amt = parseFloat(tx.amount) || 0;
            if (ds === todayS) eTod += amt; const diffD = (now - d) / (864e5); if (diffD <= 7) eWeek += amt; if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) eMonth += amt;
            body.innerHTML += `<tr><td>${i + 1}</td><td>${d.toLocaleDateString()}</td><td>${tx.category || 'Others'}</td><td>${tx.description || ''}</td><td>${fmt(amt)}</td></tr> `;
        });
        document.getElementById('expToday').textContent = fmt(eTod);
        document.getElementById('expWeek').textContent = fmt(eWeek);
        document.getElementById('expMonth').textContent = fmt(eMonth);
    }

    // ---- INVENTORY ----
    async function refreshInventory() {
        const inv = await TallyStore.getInventory();
        const el = document.getElementById('inventoryList'); el.innerHTML = '';
        if (!inv.length) { el.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No products.</p></div>'; return; }
        inv.forEach(p => {
            const low = p.stock <= (p.minStock || 5);
            const card = document.createElement('div'); card.className = 'product-card'; card.onclick = () => openProductModal(p);
            card.innerHTML = `< h4 > ${p.name}</h4 ><div class="product-prices"><span>Buy: ${fmt(p.purchasePrice)}</span><span>Sell: ${fmt(p.salePrice)}</span></div><p class="product-stock ${low ? 'low' : ''}"><i class="ph ph-cube"></i> Stock: ${p.stock} ${low ? '⚠️ Low' : ''}</p>`;
            el.appendChild(card);
        });
    }
    function openProductModal(existing) {
        const e = !!existing;
        openModal(e ? 'Edit Product' : 'Add Product',
            `<div class="form-group"><label>Product Name</label><input id="f_pname" value="${e ? existing.name : ''}"></div>
            <div class="form-row"><div class="form-group"><label>Purchase Price</label><input id="f_pprice" type="number" value="${e ? existing.purchasePrice : ''}"></div><div class="form-group"><label>Sale Price</label><input id="f_sprice" type="number" value="${e ? existing.salePrice : ''}"></div></div>
            <div class="form-row"><div class="form-group"><label>Stock Qty</label><input id="f_pstock" type="number" value="${e ? existing.stock : ''}"></div><div class="form-group"><label>Min Stock Alert</label><input id="f_pmin" type="number" value="${e ? (existing.minStock || 5) : '5'}"></div></div>`,
            async () => { const o = { name: document.getElementById('f_pname').value.trim(), purchasePrice: parseFloat(document.getElementById('f_pprice').value) || 0, salePrice: parseFloat(document.getElementById('f_sprice').value) || 0, stock: parseInt(document.getElementById('f_pstock').value) || 0, minStock: parseInt(document.getElementById('f_pmin').value) || 5 }; if (!o.name) { toast('Name required', 'error'); return; } if (e) { Object.assign(existing, o); await TallyStore.updateProduct(existing); toast('Product updated!'); } else { await TallyStore.addProduct(o); toast('Product added!'); } closeModal(); refreshInventory(); },
            e ? async () => { await TallyStore.deleteProduct(existing.id); toast('Deleted'); closeModal(); refreshInventory(); } : null
        );
    }

    // ---- LEDGER ----
    async function refreshLedger() {
        const txns = (await TallyStore.getTransactions()).sort((a, b) => new Date(a.date) - new Date(b.date));
        const body = document.getElementById('ledgerTableBody');
        if (!body) return;
        body.innerHTML = '';

        const sel = document.getElementById('ledgerEntityFilter');
        const currentFilter = sel ? sel.value : 'all';

        const entities = [...new Set(txns.map(t => t.entityName).filter(Boolean))].sort();
        if (sel) {
            sel.innerHTML = '<option value="all">সকল কাস্টমার</option>' +
                entities.map(e => `<option value="${e}" ${e === currentFilter ? 'selected' : ''}>${e}</option>`).join('');
        }

        const filterEntity = sel ? sel.value : 'all';
        const fromDate = document.getElementById('ledgerDateFrom').value;
        const toDate = document.getElementById('ledgerDateTo').value;

        let runningBalance = 0;
        let displayedCount = 0;

        // Filter and calculate running balance in ascending order first
        let filtered = txns.filter(tx => {
            if (filterEntity !== 'all' && tx.entityName !== filterEntity) return false;
            const ds = tx.date ? tx.date.split('T')[0] : '';
            if (fromDate && ds < fromDate) return false;
            if (toDate && ds > toDate) return false;
            return true;
        });

        filtered.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(tx => {
            const amt = parseFloat(tx.amount) || 0;
            const isDebit = ['purchase', 'expense', 'payment_out', 'sale'].includes(tx.type);
            if (isDebit) runningBalance -= amt; else runningBalance += amt;
            tx._rb = runningBalance;
        });

        // Now sort descending for display
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        filtered.forEach(tx => {
            displayedCount++;
            const amt = parseFloat(tx.amount) || 0;
            const isDebit = ['purchase', 'expense', 'payment_out', 'sale'].includes(tx.type);

            body.innerHTML += `<tr>
                <td>${new Date(tx.date).toLocaleDateString()}</td>
                <td style="font-size:12px;">${tx.category || tx.type}</td>
                <td><strong>${tx.entityName || '—'}</strong></td>
                <td style="color:var(--danger); text-align:right;">${isDebit ? amt.toLocaleString() : ''}</td>
                <td style="color:var(--success); text-align:right;">${!isDebit ? amt.toLocaleString() : ''}</td>
                <td style="font-weight:700; text-align:right; color:${tx._rb >= 0 ? 'var(--success)' : 'var(--danger)'}">${Math.abs(tx._rb).toLocaleString()}</td>
            </tr>`;
        });

        const empty = document.getElementById('ledgerEmpty');
        const table = document.getElementById('ledgerTable');
        if (empty) empty.classList.toggle('hidden', displayedCount > 0);
        if (table) table.classList.toggle('hidden', displayedCount === 0);

        const netBal = document.getElementById('ledgerNetBalance');
        if (netBal) netBal.textContent = fmt(runningBalance);
    }

    // ---- SIMPLE NEW ENTRY MODAL ----
    function openNewTransactionModal() {
        const today = new Date();
        const dateStr = lang === 'bn' ? today.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' }) : today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

        const bodyHTML = `
            <div style="margin-bottom:15px; position:relative; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; background:white;">
                <label style="position:absolute; top:-10px; left:12px; background:white; padding:0 4px; font-size:12px; color:var(--text-secondary); font-weight:500;">
                    ${lang === 'bn' ? 'কাস্টমারের নাম' : 'Customer Name'}
                </label>
                <div style="display:flex; align-items:center;">
                    <i class="ph ph-user" style="font-size:20px; color:var(--text-muted); margin-right:8px;"></i>
                    <input type="text" id="f_tname" placeholder="${lang === 'bn' ? 'নাম লিখুন' : 'Enter Name'}" style="border:none; outline:none; background:transparent; font-size:16px; color:var(--text); width:100%;">
                    <button type="button" id="btnSelectContact" style="border:none; background:none; color:var(--primary); cursor:pointer; padding:4px;">
                        <i class="ph ph-address-book" style="font-size:24px;"></i>
                    </button>
                </div>
            </div>

            <div style="display:flex; gap:12px; margin-bottom:16px;">
                <div style="flex:1; position:relative; border:2px solid var(--danger); border-radius:8px; padding:12px 14px; background:white;">
                    <label style="position:absolute; top:-10px; left:12px; background:white; padding:0 4px; font-size:12px; color:var(--danger); font-weight:500;">
                        ${lang === 'bn' ? 'দিলাম/বেচা' : 'Gave/Sale'}
                    </label>
                    <div style="display:flex; align-items:center;">
                        <span style="font-size:18px; font-weight:700; color:var(--text); margin-right:4px;">৳</span>
                        <input type="number" id="f_tgave" placeholder="" style="border:none; outline:none; background:transparent; font-size:18px; font-weight:700; color:var(--text); width:100%;">
                    </div>
                </div>
                <div style="flex:1; position:relative; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; background:white;">
                    <div style="display:flex; align-items:center; height:100%;">
                        <span style="font-size:18px; font-weight:700; color:#cbd5e1; margin-right:4px;">৳</span>
                        <input type="number" id="f_trecv" placeholder="${lang === 'bn' ? 'পেলাম' : 'Received'}" style="border:none; outline:none; background:transparent; font-size:16px; color:var(--text); width:100%;">
                    </div>
                </div>
            </div>
            
            <div style="position:relative; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; background:white; margin-bottom:16px;">
                <div style="display:flex; align-items:center;">
                    <i class="ph ph-note-pencil" style="font-size:20px; color:var(--text-muted); margin-right:8px;"></i>
                    <input type="text" id="f_tdesc" placeholder="${lang === 'bn' ? 'বিবরণ' : 'Description'}" style="border:none; outline:none; background:transparent; font-size:16px; color:var(--text); width:100%;">
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <button class="btn btn-secondary btn-sm" style="background:#f1f5f9; border:none; border-radius:20px; padding:6px 14px; color:var(--text-secondary); font-size:13px;" onclick="const dp = document.getElementById('f_tdate'); if(dp.showPicker) dp.showPicker(); else dp.click();">
                    <i class="ph ph-calendar"></i> ${dateStr}
                    <input type="date" id="f_tdate" style="position:absolute; opacity:0; width:0; pointer-events:none;">
                </button>
                <button class="btn btn-secondary btn-sm" style="background:#f1f5f9; border:none; border-radius:20px; padding:6px 14px; color:var(--text-secondary); font-size:13px;" onclick="toast(lang === 'bn' ? 'ছবি আপলোড শীঘ্রই আসছে' : 'Image upload coming soon')">
                    <i class="ph ph-camera"></i> ${lang === 'bn' ? 'ছবি' : 'Photo'}
                </button>
            </div>
        `;

        openModal(lang === 'bn' ? 'নতুন এন্ট্রি' : 'New Entry', bodyHTML, async () => {
            const name = document.getElementById('f_tname').value.trim();
            const gave = parseFloat(document.getElementById('f_tgave').value) || 0;
            const recv = parseFloat(document.getElementById('f_trecv').value) || 0;
            const desc = document.getElementById('f_tdesc').value.trim();
            const dateVal = document.getElementById('f_tdate').value || new Date().toISOString();

            if (!name || (gave === 0 && recv === 0)) {
                toast(lang === 'bn' ? 'নাম ও অন্তত একটি পরিমাণ দিন' : 'Name and amount required', 'error');
                return;
            }

            // Move modal closing and toast to top for instant feedback
            closeModal();
            toast(lang === 'bn' ? 'হিসাব সেভ হচ্ছে...' : 'Saving entry...');

            const promises = [];
            if (gave > 0) {
                promises.push(TallyStore.addTransaction({ type: 'sale', entityName: name, amount: gave, category: desc, date: dateVal }));
            }
            if (recv > 0) {
                promises.push(TallyStore.addTransaction({ type: 'payment_in', entityName: name, amount: recv, category: desc || (lang === 'bn' ? 'টাকা ফেরত' : 'Payment'), date: dateVal }));
            }

            // Run transactions and customer find in parallel
            await Promise.all(promises);
            const customer = await TallyStore.findOrCreateCustomer(name);
            customer.due = (parseFloat(customer.due) || 0) + (gave - recv);
            await TallyStore.updateCustomer(customer);

            refreshDashboard();
            toast(lang === 'bn' ? 'হিসাব সেভ হয়েছে' : 'Entry saved!', 'success');
        });

        setTimeout(() => {
            const nameInput = document.getElementById('f_tname');
            if (nameInput) nameInput.focus();

            const contactBtn = document.getElementById('btnSelectContact');
            if (contactBtn) {
                contactBtn.addEventListener('click', async () => {
                    if ('contacts' in navigator) {
                        try {
                            const contacts = await navigator.contacts.select(['name'], { multiple: false });
                            if (contacts && contacts.length > 0) {
                                nameInput.value = contacts[0].name[0];
                            }
                        } catch (err) {
                            console.warn('Contact Picker cancelled or failed:', err);
                        }
                    } else {
                        toast(lang === 'bn' ? 'কন্টাক্ট লিস্ট সাপোর্ট করছে না' : 'Contact Picker not supported', 'info');
                    }
                });
            }
        }, 300);
    }

    function quickAddCustomer(name) {
        openNewTransactionModal();
        setTimeout(() => {
            const input = document.getElementById('f_tname');
            if (input) {
                input.value = name;
                document.getElementById('f_tgave').focus();
            }
        }, 300);
    }

    // ---- REPORTS ----
    function generateReport(type) {
        document.getElementById('reportOutput').classList.remove('hidden');
        document.getElementById('reportTitle').textContent = type.charAt(0).toUpperCase() + type.slice(1) + ' Report';
        TallyStore.getTransactions().then(txns => {
            const content = document.getElementById('reportContent');
            const now = new Date();
            let filtered = txns;
            if (type === 'daily') filtered = txns.filter(t => t.date && t.date.split('T')[0] === now.toISOString().split('T')[0]);
            else if (type === 'weekly') filtered = txns.filter(t => (now - new Date(t.date)) / (864e5) <= 7);
            else if (type === 'monthly') filtered = txns.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
            else if (type === 'expense') filtered = txns.filter(t => t.type === 'expense');
            else if (type === 'due') filtered = txns.filter(t => t.due > 0);
            let totalIn = 0, totalOut = 0;
            filtered.forEach(t => { const a = parseFloat(t.amount) || 0; if (['sale', 'payment_in'].includes(t.type)) totalIn += a; else totalOut += a; });
            let html = `<div class="expense-summary-row"><div class="mini-kpi"><span class="mini-kpi-label">Income</span><span class="mini-kpi-val" style="color:var(--success)">${fmt(totalIn)}</span></div><div class="mini-kpi"><span class="mini-kpi-label">Expense</span><span class="mini-kpi-val" style="color:var(--danger)">${fmt(totalOut)}</span></div><div class="mini-kpi"><span class="mini-kpi-label">Net</span><span class="mini-kpi-val">${fmt(totalIn - totalOut)}</span></div></div> `;
            html += `<table class="tx-table"><thead><tr><th>Date</th><th>Type</th><th>Entity</th><th>Amount</th></tr></thead><tbody>`;
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => { html += `<tr><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.type}</td><td>${t.entityName || '—'}</td><td>${fmt(t.amount)}</td></tr>`; });
            html += `</tbody></table> `;
            content.innerHTML = html;
        });
    }

    async function generateCustomerStatement(customerName) {
        const txns = (await TallyStore.getTransactions()).filter(t => t.entityName === customerName).sort((a, b) => new Date(a.date) - new Date(b.date));

        let totalGave = 0, totalRecv = 0;
        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0;">${customerName}</h3>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-secondary btn-sm" onclick="App.downloadCustomerStatement('${customerName}')" title="Download CSV"><i class="ph ph-download-simple"></i></button>
                    <button class="btn btn-secondary btn-sm" onclick="App.shareCustomerStatement('${customerName}')" title="Share"><i class="ph ph-share-network"></i></button>
                </div>
            </div> `;

        html += `<table class="tx-table" style="width:100%; font-size:0.9rem; border-collapse:collapse;">
            <thead><tr style="background:var(--bg-secondary);">
                <th style="padding:8px; border:1px solid var(--border-color);">${lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                <th style="padding:8px; border:1px solid var(--border-color);">${lang === 'bn' ? 'বিবরণ' : 'Detail'}</th>
                <th style="padding:8px; border:1px solid var(--border-color);">${lang === 'bn' ? 'দিলাম' : 'Gave'}</th>
                <th style="padding:8px; border:1px solid var(--border-color);">${lang === 'bn' ? 'পেলাম' : 'Recv'}</th>
            </tr></thead><tbody>`;

        txns.forEach(t => {
            const isGave = ['sale', 'service', 'given'].includes(t.type);
            const amt = parseFloat(t.amount) || 0;
            if (isGave) totalGave += amt; else totalRecv += amt;

            html += `<tr>
                <td style="padding:8px; border:1px solid var(--border-color);">${new Date(t.date).toLocaleDateString()}</td>
                <td style="padding:8px; border:1px solid var(--border-color);">${t.category || t.description || '—'}</td>
                <td style="padding:8px; border:1px solid var(--border-color); color:var(--danger); font-weight:bold;">${isGave ? fmt(amt) : ''}</td>
                <td style="padding:8px; border:1px solid var(--border-color); color:var(--success); font-weight:bold;">${!isGave ? fmt(amt) : ''}</td>
            </tr>`;
        });

        html += `</tbody><tfoot><tr style="background:var(--bg-secondary); font-weight:bold;">
            <td colspan="2" style="padding:8px; border:1px solid var(--border-color); text-align:right;">${lang === 'bn' ? 'মোট:' : 'Total:'}</td>
            <td style="padding:8px; border:1px solid var(--border-color); color:var(--danger);">${fmt(totalGave)}</td>
            <td style="padding:8px; border:1px solid var(--border-color); color:var(--success);">${fmt(totalRecv)}</td>
        </tr></tfoot></table> `;

        const net = totalGave - totalRecv;
        html += `<div style="margin-top:15px; text-align:right; font-size:1.1rem; font-weight:bold;">
    ${lang === 'bn' ? 'মোট পাওনা:' : 'Balance Due:'} <span style="color:${net >= 0 ? 'var(--danger)' : 'var(--success)'}">৳ ${Math.abs(net)}</span>
        </div> `;

        openModal(lang === 'bn' ? 'স্টেটমেন্ট' : 'Statement',
            `<div style="max-height:450px; overflow-y:auto; padding:5px;"> ${html}</div> `,
            null,
            null,
            true
        );
    }

    async function downloadCustomerStatement(customerName) {
        const txns = (await TallyStore.getTransactions()).filter(t => t.entityName === customerName).sort((a, b) => new Date(a.date) - new Date(b.date));
        let csv = '\uFEFF'; // UTF-8 BOM for Excel
        csv += `${lang === 'bn' ? 'তারিখ,বিবরণ,আমি দিয়েছি,আমি পেলাম' : 'Date,Description,I Gave,I Received'} \n`;
        txns.forEach(t => {
            const isGave = ['sale', 'service', 'given'].includes(t.type);
            csv += `${new Date(t.date).toLocaleDateString()},${(t.category || t.description || '').replace(/,/g, ' ')},${isGave ? t.amount : 0},${!isGave ? t.amount : 0} \n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${customerName} _Statement.csv`; a.click();
    }

    async function shareCustomerStatement(customerName) {
        const customer = (await TallyStore.getCustomers()).find(c => c.name === customerName);
        const text = lang === 'bn'
            ? `${customerName} -এর পাওনা হিসাব: \nমোট বাকি: ৳${customer.due || 0} \nধন্যবাদ!`
            : `Due Statement for ${customerName}: \nTotal Due: ৳${customer.due || 0} \nThank you!`;

        if (navigator.share) {
            navigator.share({ title: 'Tally Statement', text: text }).catch(() => { });
        } else {
            navigator.clipboard.writeText(text); toast(lang === 'bn' ? 'তথ্য কপি হয়েছে' : 'Copied to clipboard');
        }
    }

    // ---- VOICE ASSISTANT ORCHESTRATION ----
    function openVoiceAssistant() {
        const overlay = document.getElementById('voiceOverlay');
        overlay.classList.add('active', 'listening');
        document.getElementById('voiceResult').classList.add('hidden');
        document.getElementById('voiceTranscript').textContent = '';
        document.getElementById('voiceStatus').textContent = lang === 'bn' ? 'শুনছি...' : 'Listening...';
        TallyVoice.speak(lang === 'bn' ? 'বলুন' : 'Yes, tell me.', () => {
            const started = TallyVoice.startListening({
                lang: lang === 'bn' ? 'bn-BD' : 'en-US',
                onInterim: (txt) => { document.getElementById('voiceTranscript').textContent = txt; },
                onResult: (txt) => { processVoiceResult(txt); },
                onStatus: (s) => { if (s === 'no-speech' || s === 'ended') { if (!document.getElementById('voiceResult').classList.contains('hidden')) return; document.getElementById('voiceStatus').textContent = lang === 'bn' ? 'কিছু শুনতে পাইনি, আবার চেষ্টা করুন।' : "Didn't catch that. Try again."; overlay.classList.remove('listening'); } }
            });
            if (!started) { document.getElementById('voiceStatus').textContent = "Speech recognition not supported in this browser. Use Chrome for best results."; overlay.classList.remove('listening'); }
        });
    }

    async function processVoiceResult(text) {
        const overlay = document.getElementById('voiceOverlay');
        overlay.classList.remove('listening');
        document.getElementById('voiceTranscript').textContent = `"${text}"`;
        document.getElementById('voiceStatus').textContent = lang === 'bn' ? 'প্রসেস হচ্ছে...' : 'Processing...';

        const parsed = TallyVoice.parseVoiceCommand(text);
        if (!parsed.type || !parsed.amount) {
            const msg = lang === 'bn' ? 'বুঝতে পারিনি, আবার বলুন।' : "Couldn't understand, please try again.";
            TallyVoice.speak(msg);
            document.getElementById('voiceStatus').textContent = msg;
            return;
        }

        // Voice commands now either add to due or subtract from due
        const isPayment = ['payment_in', 'mfs_out'].includes(parsed.type);
        const txType = isPayment ? 'payment_in' : 'sale';

        const tx = {
            type: txType,
            entityName: parsed.entityName || (lang === 'bn' ? 'অজানা' : 'Unknown'),
            amount: parsed.amount,
            category: parsed.category || parsed.description,
            date: new Date().toISOString()
        };

        await TallyStore.addTransaction(tx);
        const customer = await TallyStore.findOrCreateCustomer(tx.entityName);
        customer.due = (parseFloat(customer.due) || 0) + (txType === 'sale' ? tx.amount : -tx.amount);
        await TallyStore.updateCustomer(customer);

        const confirmMsg = lang === 'bn'
            ? `${tx.entityName} এর হিসাবে ৳${tx.amount} ${txType === 'sale' ? 'বাকি' : 'জমা'} করা হয়েছে।`
            : `Recorded ৳${tx.amount} ${txType === 'sale' ? 'due' : 'payment'} for ${tx.entityName}.`;

        showVoiceSuccess('✅', confirmMsg, {
            [lang === 'bn' ? 'ব্যক্তি' : 'Person']: tx.entityName,
            [lang === 'bn' ? 'পরিমাণ' : 'Amount']: fmt(tx.amount)
        });

        TallyVoice.speak(confirmMsg, () => {
            setTimeout(() => { closeVoiceOverlay(); refreshDashboard(); }, 2500);
        });
    }

    function showVoiceSuccess(icon, title, details) {
        document.getElementById('voiceResult').classList.remove('hidden');
        document.getElementById('voiceResultTitle').textContent = title;
        let html = '';
        for (const [k, v] of Object.entries(details)) { html += `<p > <strong>${k}:</strong> ${v}</p> `; }
        document.getElementById('voiceResultDetails').innerHTML = html;
        document.getElementById('voiceStatus').textContent = '';
    }

    function closeVoiceOverlay() {
        document.getElementById('voiceOverlay').classList.remove('active', 'listening');
        TallyVoice.stopListening(); TallyVoice.stopSpeaking();
    }

    // ---- SEARCH ----
    async function globalSearch(query) {
        if (!query.trim()) { navigateTo('dashboard'); return; }
        const q = query.toLowerCase();
        const customers = await TallyStore.getCustomers();
        const match = customers.find(c => c.name.toLowerCase().includes(q));
        if (match) { navigateTo('customers'); setTimeout(() => refreshCustomers(q), 100); return; }
        const suppliers = await TallyStore.getSuppliers();
        const smatch = suppliers.find(s => s.name.toLowerCase().includes(q));
        if (smatch) { navigateTo('suppliers'); setTimeout(() => refreshSuppliers(q), 100); return; }
        toast('No results found', 'info');
    }

    // ---- Sync Status Indicator ----
    function setSyncStatus(state) {
        const el = document.getElementById('syncStatus');
        if (!el) return;
        const icons = {
            connecting: '<i class="ph ph-cloud" style="font-size:1.1rem; color:#94A3B8;"></i>',
            synced: '<i class="ph ph-cloud-check" style="font-size:1.1rem; color:#10B981;"></i>',
            offline: '<i class="ph ph-cloud-slash" style="font-size:1.1rem; color:#F59E0B;"></i>',
            error: '<i class="ph ph-cloud-warning" style="font-size:1.1rem; color:#EF4444;"></i>',
        };
        el.innerHTML = icons[state] || icons.connecting;
        el.title = { connecting: 'Connecting...', synced: 'Cloud Synced ✅', offline: 'Offline Mode ⚠️', error: 'Sync Error ❌' }[state];
    }

    // ---- INIT ----
    async function init() {
        // Restore preferences
        const savedTheme = localStorage.getItem('tally_theme');
        if (savedTheme) { document.documentElement.setAttribute('data-theme', savedTheme); document.getElementById('themeToggleBtn').innerHTML = savedTheme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>'; }
        const savedLang = localStorage.getItem('tally_lang');
        if (savedLang) { lang = savedLang; document.getElementById('langToggleBtn').querySelector('.lang-label').textContent = lang === 'en' ? 'EN' : 'বাং'; }

        // Show connecting status
        setSyncStatus('connecting');

        try {
            await TallyStore.init();
            setSyncStatus('synced');
        } catch (err) {
            console.error('Firebase init error:', err);
            setSyncStatus('error');
            toast('Cloud sync failed. Check internet.', 'error');
        }

        // Monitor online/offline
        window.addEventListener('online', () => { setSyncStatus('synced'); toast(lang === 'bn' ? 'ইন্টারনেট সংযোগ হয়েছে ✅' : 'Back online ✅', 'success'); });
        window.addEventListener('offline', () => { setSyncStatus('offline'); toast(lang === 'bn' ? 'অফলাইন মোড — ডেটা পরে sync হবে' : 'Offline mode — data will sync later', 'info'); });

        await TallyStore.seedDemoData();
        applyI18n();

        // Topbar Dropdown Toggle
        const brandNameMobile = document.querySelector('.brand-name-mobile');
        const dropdownContent = document.querySelector('.dropdown-content');
        if (brandNameMobile && dropdownContent) {
            brandNameMobile.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
            });
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.dropdown')) dropdownContent.classList.remove('show');
            });
        }

        // Realtime Subscription
        TallyStore.subscribeCustomers(() => {
            if (currentPage === 'dashboard') refreshDashboard();
            if (currentPage === 'customers') refreshCustomers();
        });

        // Events
        document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', e => { e.preventDefault(); navigateTo(n.dataset.page); }));
        document.querySelectorAll('.bottom-nav-item').forEach(n => n.addEventListener('click', e => { e.preventDefault(); navigateTo(n.dataset.page); }));

        const hamburgerBtn = document.getElementById('hamburgerBtn');
        if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);

        document.getElementById('sidebarCloseBtn').addEventListener('click', closeSidebar);
        document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
        // Safe Listeners helper
        const listen = (id, event, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, fn);
        };

        listen('themeToggleBtn', 'click', toggleTheme);
        listen('langToggleBtn', 'click', toggleLang);

        // Modal global listeners (for backup)
        listen('modalOverlay', 'click', e => { if (e.target === e.currentTarget) closeModal(); });

        const fabVoice = document.getElementById('fabVoice');
        if (fabVoice) fabVoice.addEventListener('click', openVoiceAssistant);
        listen('fabNewEntry', 'click', () => openNewTransactionModal());

        listen('voiceCloseBtn', 'click', closeVoiceOverlay);
        listen('voiceOverlay', 'click', e => { if (e.target === e.currentTarget) closeVoiceOverlay(); });

        listen('newTxBtnTop', 'click', () => openNewTransactionModal());
        listen('newTxBtnCashbox', 'click', () => openNewTransactionModal());
        listen('newTxBtnHome', 'click', () => openNewTransactionModal());
        listen('customerSearchMain', 'input', e => refreshDashboard(e.target.value));
        listen('addCustomerBtn', 'click', () => openCustomerModal(null));
        listen('addSupplierBtn', 'click', () => openSupplierModal(null));
        listen('addServiceBtn', 'click', () => openNewTransactionModal({ type: 'service' }));
        listen('addBkashBtn', 'click', () => openNewTransactionModal({ type: 'mfs_in' }));
        listen('addExpenseBtn', 'click', () => openNewTransactionModal({ type: 'expense' }));
        listen('addProductBtn', 'click', () => openProductModal(null));
        listen('btnFilterMain', 'click', openFilterSettings);
        listen('btnExportMain', 'click', exportCSV);
        listen('ledgerEntityFilter', 'change', refreshLedger);
        listen('ledgerDateFrom', 'change', refreshLedger);
        listen('ledgerDateTo', 'change', refreshLedger);

        // Set default dates for Ledger
        const fromInput = document.getElementById('ledgerDateFrom');
        const toInput = document.getElementById('ledgerDateTo');
        if (fromInput && toInput) {
            const now = new Date();
            const lastWeek = new Date(now); lastWeek.setDate(now.getDate() - 7);
            const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
            fromInput.value = lastWeek.toISOString().split('T')[0];
            toInput.value = nextWeek.toISOString().split('T')[0];
        }

        listen('viewAllTxBtn', 'click', () => navigateTo('ledger'));
        listen('customerSearch', 'input', e => refreshCustomers(e.target.value));
        listen('supplierSearch', 'input', e => refreshSuppliers(e.target.value));
        listen('ledgerEntityFilter', 'change', () => refreshLedger());
        listen('ledgerDateFrom', 'change', () => refreshLedger());
        listen('ledgerDateTo', 'change', () => refreshLedger());

        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) globalSearch.addEventListener('keydown', e => { if (e.key === 'Enter') globalSearchApi(e.target.value); });

        document.querySelectorAll('.report-card').forEach(c => c.addEventListener('click', () => generateReport(c.dataset.report)));
        listen('exportReportBtn', 'click', exportCSV);

        // Hash routing
        const hash = location.hash.replace('#', '');
        if (hash) {
            navigateTo(hash);
        } else {
            navigateTo(currentPage);
        }
        window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (h) navigateTo(h); });

        // Chart resize
        window.addEventListener('resize', () => { if (currentPage === 'dashboard') TallyStore.getLast7DaysCashFlow().then(drawCashFlowChart); });
    }

    document.addEventListener('DOMContentLoaded', init);
    return { navigateTo, toast, openNewTransactionModal, openSecuritySettings, generateCustomerStatement, downloadCustomerStatement, shareCustomerStatement, quickAddCustomer, confirmDeleteCustomer, editTransaction, exportBackup: () => TallyStore.exportAllData() };
})();
