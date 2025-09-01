document.addEventListener('DOMContentLoaded', () => {
    const els = {
        ciphertext: document.getElementById('ciphertext'),
        plaintext: document.getElementById('plaintext'),
        timeline: document.getElementById('timeline'),
        statTotal: document.getElementById('statTotal'),
        statStart: document.getElementById('statStart'),
        statEnd: document.getElementById('statEnd'),
        statDuration: document.getElementById('statDuration'),
        errorBox: document.getElementById('errorBox'),
        copyBtn: document.getElementById('copyDecrypted'),
        toggleTheme: document.getElementById('toggleTheme')
    };

    // Theme toggle - default to light theme
    // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // if (prefersDark) document.body.classList.add('dark');
    if (els.toggleTheme) {
        updateThemeButton();
        els.toggleTheme.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            updateThemeButton();
        });
    }
    function updateThemeButton() {
        if (!els.toggleTheme) return;
        els.toggleTheme.textContent = document.body.classList.contains('dark') ? '🌞' : '🌙';
    }

    // Copy raw decrypted
    if (els.copyBtn) {
        els.copyBtn.addEventListener('click', () => {
            const text = els.plaintext.textContent || '';
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => showCopyToast()).catch(()=>{});
        });
    }
    function showCopyToast() {
        const tip = document.createElement('div');
        tip.className = 'copy-success';
        tip.textContent = '已复制';
        document.body.appendChild(tip);
        setTimeout(() => tip.remove(), 2800);
    }

    els.ciphertext.addEventListener('input', handleInput);

    function handleInput() {
        const cipher = els.ciphertext.value.trim();
        resetUI();
        if (!cipher) return;
        let plain = '';
        try {
            plain = decrypt(cipher);
            if (!plain) throw new Error('空结果');
            els.plaintext.textContent = plain;
            const records = parseRecords(plain);
            renderStats(records);
            renderTimeline(records);
        } catch (err) {
            showError('解析失败：请重新检查密文是否复制粘贴出错');
            els.plaintext.textContent = '';
        }
    }

    function resetUI() {
        els.errorBox.hidden = true;
        els.errorBox.textContent = '';
        els.timeline.innerHTML = '';
        els.statTotal.textContent = '-';
        els.statStart.textContent = '-';
        els.statEnd.textContent = '-';
        els.statDuration.textContent = '-';
    }

    function showError(msg) {
        els.errorBox.hidden = false;
        els.errorBox.textContent = msg;
    }

    // AES 解密
    function decrypt(ciphertext) {
        const key = CryptoJS.enc.Utf8.parse('13c91b2ef3022f85');
        const iv = CryptoJS.enc.Utf8.parse('7794373177729563');
        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
            iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        const result = decrypted.toString(CryptoJS.enc.Utf8);
        if (!result) throw new Error('解析失败');
        return result;
    }

    // 解析解密后的记录格式: 地点|日期|时间|序号 & ...
    function parseRecords(text) {
        if (!text) return [];
        return text.split('&')
            .map(s => s.trim())
            .filter(Boolean)
            .map(seg => {
                const parts = seg.split('|');
                return {
                    place: parts[0] || '(未知地点)',
                        date: parts[1] || '',
                        time: parts[2] || '',
                        order: Number(parts[3]) || NaN,
                        raw: seg
                };
            })
            .sort((a,b) => (a.order || 0) - (b.order || 0));
    }

    function renderStats(records) {
        if (!records.length) return;
        els.statTotal.textContent = records.length;
        const first = records[0];
        const last = records[records.length - 1];
        els.statStart.innerHTML = (first.date || '') + '<br>' + (first.time || '');
        els.statEnd.innerHTML = (last.date || '') + '<br>' + (last.time || '');
        const duration = diffTime(first, last);
        els.statDuration.textContent = duration || '-';
    }

    function diffTime(a, b) {
        if (!a.date || !b.date) return '';
        const start = new Date(a.date + 'T' + (a.time || '00:00:00'));
        const end = new Date(b.date + 'T' + (b.time || '00:00:00'));
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
        let ms = end - start;
        if (ms < 0) return '';
        const sec = Math.floor(ms / 1000);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return [h && (h + 'h'), (h || m) && (m + 'm'), (s + 's')].filter(Boolean).join(' ');
    }

    function renderTimeline(records) {
        if (!records.length) {
            els.timeline.innerHTML = '<li><div class="empty-hint">暂无解密记录</div></li>';
            return;
        }
        const frag = document.createDocumentFragment();
        records.forEach((r, idx) => {
            const li = document.createElement('li');
            li.className = 'fade-in';
            li.innerHTML = `
                <span class="dot"></span>
                <div class="card${idx === records.length-1 ? ' highlight-latest' : ''}">
                    <div class="place">
                        <span class="order">#${r.order || idx+1}</span>
                        <span>${escapeHTML(r.place)}</span>
                    </div>
                    <div class="meta">
                        <span class="time">⏱ ${r.time || '-'}</span>
                        <span class="date">📅 ${r.date || '-'}</span>
                    </div>
                </div>`;
            frag.appendChild(li);
        });
        els.timeline.innerHTML = '';
        els.timeline.appendChild(frag);
    }

        function escapeHTML(str) {
            return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]||c));
        }
});
