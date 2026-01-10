
window.openClientDetailsPage = (clientId) => {
    const client = state.clients.find(c => c.id.toString() === clientId.toString());
    if (!client) return;

    // Switch View
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('client-details-view').classList.add('active');

    // Populate Info
    document.getElementById('client-page-name').innerText = client.name;
    document.getElementById('client-page-phone').innerHTML = client.phone || '<span style="color: var(--text-secondary);">Не указан</span>';

    const telegramLink = document.getElementById('client-page-telegram');
    if (client.telegram) {
        let href = client.telegram;
        if (!href.startsWith('http') && !href.startsWith('tg://')) {
            href = 'https://t.me/' + href.replace('@', '');
        }
        telegramLink.innerText = client.telegram;
        telegramLink.href = href;
        telegramLink.style.display = 'inline';
    } else {
        telegramLink.innerText = 'Не указан';
        telegramLink.removeAttribute('href');
        telegramLink.style.display = 'inline';
    }

    // Calculate Stats
    const clientProjects = state.projects.filter(p => p.client && p.client.trim().toLowerCase() === client.name.trim().toLowerCase());
    const activeProjects = clientProjects.filter(p => p.status === 'in-progress' || p.status === 'sketch').length;

    document.getElementById('client-page-total-projects').innerText = clientProjects.length;
    document.getElementById('client-page-active-projects').innerText = activeProjects;

    const totalRevenueUSD = clientProjects.filter(p => (!p.currency || p.currency === 'USD')).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalRevenueUZS = clientProjects.filter(p => p.currency === 'UZS').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    document.getElementById('client-page-revenue-usd').innerText = formatMoney(totalRevenueUSD, 'USD');
    document.getElementById('client-page-revenue-uzs').innerText = formatMoney(totalRevenueUZS, 'UZS');

    // Render Project History
    const historyList = document.getElementById('client-projects-list');
    if (clientProjects.length === 0) {
        historyList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">Нет проектов</div>';
    } else {
        historyList.innerHTML = clientProjects.map(p =>
            `<div class="compact-card" onclick="openProjectDetails('${p.id}')" style="cursor: pointer;">
                <div class="compact-header">
                    <h3 class="compact-title">${p.name}</h3>
                    <span class="status-badge status-${p.status}">${getStatusName(p.status)}</span>
                </div>
                <div class="compact-row">
                    <span style="font-weight: 600; color: var(--accent-primary);">${formatMoney(p.amount, p.currency)}</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(p.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
            </div>`
        ).join('');
    }

    // Setup Actions
    document.getElementById('client-page-edit-btn').onclick = () => editClient(client.id);
    document.getElementById('client-page-delete-btn').onclick = () => deleteClient(client.id);
};

window.closeClientDetailsPage = () => {
    document.getElementById('client-details-view').classList.remove('active');
    document.getElementById('clients-view').classList.add('active');
};
