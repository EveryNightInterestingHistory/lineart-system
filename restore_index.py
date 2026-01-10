
import os

# Part 1: Read the first 188 lines of the existing index.html
with open('e:/ИИ/NP/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    header_content = "".join(lines[:188])

# Part 2: The corrected Project Details View and Modals
new_content = """
            <div id="project-details-view" class="view">
                <div class="details-header">
                    <button class="btn-secondary" onclick="closeProjectDetails()">← Назад</button>
                    <div class="actions">
                        <button class="btn-secondary" onclick="openHistoryModal()">📜 История</button>
                        <button class="btn-secondary" onclick="editCurrentProject()">✎ Редактировать</button>
                        <button class="btn-danger" onclick="deleteCurrentProject()">🗑 Удалить</button>
                    </div>
                </div>

                <div class="details-card"
                    style="margin-bottom: 30px; padding: 30px; background: rgba(30, 30, 30, 0.6); backdrop-filter: blur(12px); border: 1px solid var(--glass-border); border-radius: 16px;">
                    <div style="display: flex;">
                        <!-- Left Side: Project Info -->
                        <div style="flex: 1;">
                            <div class="card-header" style="margin-bottom: 25px;">
                                <h3
                                    style="font-size: 1.1rem; color: var(--text-secondary); font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                                    Информация о проекте</h3>
                                <button class="btn-edit-icon" onclick="editCurrentProject()" title="Редактировать">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                        stroke-linejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7">
                                        </path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z">
                                        </path>
                                    </svg>
                                </button>
                            </div>

                            <h1 id="detail-project-name" style="font-size: 2rem; margin-bottom: 10px;">-</h1>
                            <div id="detail-project-address"
                                style="color: var(--text-secondary); margin-bottom: 20px; font-size: 1.1rem;">-
                            </div>
                            <div id="detail-project-description"
                                style="margin-bottom: 20px; color: var(--text-primary); white-space: pre-wrap; display: none; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 3px solid var(--accent-primary);">
                            </div>

                            <div
                                style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                                <span class="label"
                                    style="color: var(--text-secondary); display: flex; align-items: center; gap: 8px;"><span>🔹</span>
                                    Статус</span>
                                <span id="detail-project-status" class="status-badge"
                                    style="font-size: 0.9rem; padding: 6px 12px;">Статус</span>
                            </div>
                            <div
                                style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                                <span class="label"
                                    style="color: var(--text-secondary); display: flex; align-items: center; gap: 8px;"><span>📅</span>
                                    Создан</span>
                                <span id="detail-project-created" class="value"
                                    style="font-family: monospace; font-size: 1rem;">-</span>
                            </div>
                        </div>

                        <!-- Vertical Divider -->
                        <div style="width: 1px; background: rgba(255,255,255,0.2); margin: 0 30px;">
                        </div>

                        <!-- Right Side: Contacts -->
                        <div style="flex: 1;">
                            <div class="card-header" style="margin-bottom: 25px;">
                                <h3
                                    style="font-size: 1.1rem; color: var(--text-secondary); font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                                    Контакты</h3>
                                <button class="btn-action-sm" onclick="openAdditionalPersonModal()">+
                                    Добавить</button>
                            </div>
                            <div class="contacts-content">
                                <div class="contact-group"
                                    style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                                    <div class="label"
                                        style="margin-bottom: 8px; color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">
                                        Клиент</div>
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <div
                                            style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">
                                            👤</div>
                                        <div id="detail-project-client" class="value"
                                            style="font-weight: 600; font-size: 1.1rem;">-
                                        </div>
                                    </div>
                                </div>

                                <div style="padding-top: 10px;">
                                    <div class="label"
                                        style="margin-bottom: 15px; color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">
                                        Дополнительные контакты</div>
                                    <div id="detail-additional-persons-list" class="compact-grid"
                                        style="grid-template-columns: 1fr 1fr; gap: 10px;">
                                        <!-- Populated by JS -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="details-grid-2col">
                    <!-- Finance Card -->
                    <div class="details-card">
                        <div class="card-header">
                            <h3>Финансы</h3>
                            <button class="btn-icon-sm" onclick="editCurrentProject()">✎</button>
                        </div>
                        <div class="finance-breakdown">
                            <div class="finance-row">
                                <span>Сумма договора</span>
                                <span id="detail-finance-total">0</span>
                            </div>
                            <div class="finance-row">
                                <span>Оплачено</span>
                                <span id="detail-finance-paid">0</span>
                            </div>
                            <div class="finance-row">
                                <span>Расходы</span>
                                <span id="detail-finance-expenses">0</span>
                            </div>
                            <div class="finance-row">
                                <span>Прибыль</span>
                                <span id="detail-finance-profit">0</span>
                            </div>
                            <div class="finance-divider"></div>
                            <div class="finance-row total">
                                <span>Остаток</span>
                                <span id="detail-finance-balance">0</span>
                            </div>

                            <div class="progress-container" style="margin-top: 15px;">
                                <div class="progress-bar"
                                    style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                                    <div id="detail-finance-bar"
                                        style="width: 0%; height: 100%; background: var(--accent-success); transition: width 0.3s;">
                                    </div>
                                </div>
                                <div
                                    style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.8rem; color: var(--text-secondary);">
                                    <span>Процент оплаты</span>
                                    <span id="detail-finance-percent">0%</span>
                                </div>
                            </div>

                            <div style="height: 200px; margin-top: 20px;">
                                <canvas id="financeChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Transactions Card -->
                    <div class="details-card">
                        <div class="card-header">
                            <h3>Транзакции</h3>
                            <button class="btn-action-sm" onclick="openTransactionModalForProject()">+
                                Операция</button>
                        </div>
                        <div class="transactions-list-container" style="max-height: 400px; overflow-y: auto;">
                            <ul id="detail-transaction-list" class="transaction-list">
                                <!-- Populated by JS -->
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Sections -->
                <div class="full-width-section" style="margin-top: 20px;">
                    <div class="section-header"
                        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3>Разделы проекта</h3>
                        <button class="btn-action-sm" onclick="openNewSectionModal()">+ Новый раздел</button>
                    </div>
                    <div id="detail-sections-list" class="compact-list">
                        <!-- Populated by JS -->
                    </div>
                </div>

                <!-- Gallery -->
                <div class="details-card" style="margin-top: 20px;">
                    <div class="section-header"
                        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3>Галерея</h3>
                        <label class="btn-action-sm" style="cursor: pointer;">
                            + Загрузить фото
                            <input type="file" multiple accept="image/*" style="display: none;"
                                onchange="handlePhotoUpload(this)">
                        </label>
                    </div>
                    <div id="detail-gallery-grid" class="gallery-grid">
                        <!-- Populated by JS -->
                    </div>
                </div>

                <!-- Location Map -->
                <div class="details-card" style="margin-top: 20px;">
                    <div class="section-header" style="margin-bottom: 15px;">
                        <h3>Расположение объекта</h3>
                    </div>
                    <div id="map-wrapper" style="position: relative; border-radius: 12px; overflow: hidden;">
                        <div id="project-map" style="height: 600px; width: 100%; z-index: 1;"></div>
                        <button id="project-map-fullscreen-btn" class="btn-secondary"
                            onclick="toggleProjectMapFullscreen()" title="На весь экран"
                            style="position: absolute; top: 20px; right: 20px; z-index: 1000; background: rgba(30,30,30,0.8); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer;">
                            ⛶
                        </button>

                        <!-- Map Controls -->
                        <div class="map-controls"
                            style="position: absolute; top: 20px; right: 70px; display: flex; flex-direction: column; gap: 10px; z-index: 1000;">
                            <button class="btn-secondary" onclick="toggleMapEditMode()" id="map-edit-btn"
                                style="background: rgba(30,30,30,0.8); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1);">
                                ✎ Редактировать
                            </button>
                            <div id="map-edit-controls" style="display: none; flex-direction: column; gap: 5px;">
                                <button class="btn-secondary" onclick="setMapDrawingMode('marker')"
                                    title="Поставить метку"
                                    style="background: rgba(30,30,30,0.8); backdrop-filter: blur(4px);">📍</button>
                                <button class="btn-secondary" onclick="setMapDrawingMode('polygon')"
                                    title="Рисовать контур"
                                    style="background: rgba(30,30,30,0.8); backdrop-filter: blur(4px);">⬠</button>
                                <button class="btn-secondary" onclick="clearMapDrawing()" title="Очистить"
                                    style="background: rgba(30,30,30,0.8); backdrop-filter: blur(4px);">🗑</button>
                                <button class="btn-primary" onclick="saveMapData()" title="Сохранить"
                                    style="margin-top: 5px;">💾</button>
                            </div>
                        </div>

                        <!-- Instruction Overlay -->
                        <div id="map-instruction"
                            style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); padding: 8px 16px; border-radius: 20px; color: white; font-size: 0.9rem; pointer-events: none; display: none; z-index: 1000;">
                            Выберите точку на карте
                        </div>
                    </div>
                </div>
            </div>

            <div id="section-modal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeModal('section-modal')">&times;</span>
                    <h2>Новый раздел</h2>
                    <button class="nav-btn prev" onclick="navigateLightbox(-1)"
                        style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1); border: none; color: white; padding: 15px; cursor: pointer; border-radius: 50%; font-size: 24px;">&#10094;</button>
                    <button class="nav-btn next" onclick="navigateLightbox(1)"
                        style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1); border: none; color: white; padding: 15px; cursor: pointer; border-radius: 50%; font-size: 24px;">&#10095;</button>
                </div>
            </div>

            <div id="employee-modal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeModal('employee-modal')">&times;</span>
                    <h2>Новый инженер</h2>
                    <form id="employee-form">
                        <input type="hidden" name="id">
                        <input type="text" name="name" placeholder="Имя" required>
                        <input type="text" name="position" placeholder="Должность" required>
                        <input type="tel" name="phone" placeholder="Телефон">
                        <button type="submit" class="btn-primary">Сохранить</button>
                    </form>
                </div>
            </div>

            <div id="project-modal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeModal('project-modal')">&times;</span>
                    <h2>Новый проект</h2>
                    <form id="project-form">
                        <input type="hidden" name="id">
                        <input type="text" name="name" placeholder="Название проекта" required>
                        <input type="text" name="address" placeholder="Адрес (местонахождение)">

                        <textarea name="description" placeholder="Описание проекта"
                            style="width: 100%; height: 100px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: white; padding: 10px; margin-bottom: 15px; resize: vertical; font-family: inherit;"></textarea>

                        <div class="input-group">
                            <select name="client" required>
                                <option value="" disabled selected>Выберите клиента</option>
                            </select>
                            <button type="button" class="btn-icon" onclick="openModal('client-modal')"
                                title="Добавить клиента">+</button>
                        </div>

                        <div class="input-group">
                            <input type="number" name="amount" placeholder="Сумма договора" required>
                            <select name="currency">
                                <option value="USD">USD ($)</option>
                                <option value="UZS">UZS (сум)</option>
                            </select>
                        </div>

                        <select name="status">
                            <option value="sketch">Эскиз</option>
                            <option value="in-progress">В процессе</option>
                            <option value="completed">Завершен</option>
                            <option value="delivered">Сдан</option>
                        </select>

                        <button type="submit" class="btn-primary">Сохранить</button>
                    </form>
                </div>
            </div>

            <div id="history-modal" class="modal">
                <div class="modal-content" style="width: 500px; max-height: 80vh; overflow-y: auto;">
                    <span class="close" onclick="closeModal('history-modal')">&times;</span>
                    <h2>История изменений</h2>
                    <div id="project-history-list" class="history-list">
                        <!-- History items -->
                    </div>
                </div>
            </div>

            <div id="engineer-stats-modal" class="modal">
                <div class="modal-content" style="width: 500px; max-height: 90vh; overflow-y: auto;">
                    <span class="close" onclick="closeModal('engineer-stats-modal')">&times;</span>
                    <h2 id="stats-engineer-name">Инженер</h2>
                    <div style="margin-bottom: 20px; color: var(--text-secondary); font-size: 0.9rem;">
                        <div id="stats-engineer-position"></div>
                        <div id="stats-engineer-phone"></div>
                    </div>

                    <div class="contract-display-container">
                        <div id="contract-view-mode" class="contract-view">
                            <div style="display: flex; align-items: center;">
                                <span class="currency-symbol">$</span>
                                <span id="contract-display-value" class="contract-value">0</span>
                            </div>
                            <button class="btn-icon-sm" onclick="toggleContractEdit()">✎</button>
                        </div>
                        <div id="contract-edit-mode" class="contract-edit" style="display: none;">
                            <input type="number" id="engineer-contract-amount" placeholder="Сумма договора"
                                style="width: 120px;">
                            <button class="btn-icon-sm success" onclick="saveContractEdit()">✓</button>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">Сумма
                            договора
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                        <div class="stat-card">
                            <div class="label">Выплачено</div>
                            <div class="value" id="stats-engineer-revenue">0</div>
                        </div>
                        <div class="stat-card">
                            <div class="label">Остаток</div>
                            <div class="value" style="color: var(--text-secondary);">calc</div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3>Сделать выплату</h3>
                        <div class="input-group">
                            <input type="number" id="engineer-payment-amount" placeholder="Сумма">
                            <button class="btn-primary" onclick="addEngineerPayment()">Выплатить</button>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3>Разделы</h3>
                        <div id="stats-engineer-sections" class="compact-list">
                            <!-- Sections -->
                        </div>
                    </div>

                    <div>
                        <h3>История выплат</h3>
                        <div id="stats-engineer-transactions" class="compact-list">
                            <!-- Transactions -->
                        </div>
                    </div>
                </div>
            </div>
            <div id="client-modal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeModal('client-modal')">&times;</span>
                    <h2>Новый клиент</h2>
                    <form id="client-form">
                        <input type="hidden" name="id">
                        <input type="text" name="name" placeholder="Имя" required>
                        <input type="tel" name="phone" placeholder="Телефон">
                        <input type="text" name="telegram" placeholder="Telegram (@username)">
                        <button type="submit" class="btn-primary">Сохранить</button>
                    </form>
                </div>
            </div>

            <div id="client-details-modal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeModal('client-details-modal')">&times;</span>
                    <h2>Информация о клиенте</h2>
                    <div class="client-details">
                        <div class="detail-row">
                            <span class="label">Имя:</span>
                            <span class="value" id="client-detail-name">-</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Телефон:</span>
                            <span class="value" id="client-detail-phone">-</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Telegram:</span>
                            <a href="#" target="_blank" class="value link" id="client-detail-telegram">-</a>
                        </div>

                        <div id="client-stats-container"
                            style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                            <h3>Статистика</h3>
                            <div class="detail-row">
                                <span class="label">Проектов:</span>
                                <span class="value" id="client-detail-projects-count">0</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Общая выручка:</span>
                                <span class="value" id="client-detail-total-revenue">0 $</span>
                            </div>
                        </div>

                        <div class="modal-actions" style="margin-top: 20px; text-align: right;">
                            <button id="client-edit-btn" class="btn-secondary">Редактировать</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="project-expense-modal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeModal('project-expense-modal')">&times;</span>
                    <h2>Новый расход</h2>
                    <form id="project-expense-form">
                        <input type="hidden" id="expense-project-id">
                        <select name="engineer" id="expense-engineer">
                            <option value="">Без инженера (общий расход)</option>
                        </select>
                        <input type="text" name="description" placeholder="Описание" required>
                        <div class="input-group">
                            <input type="number" name="amount" placeholder="Сумма" required>
                            <select name="currency">
                                <option value="USD">USD ($)</option>
                                <option value="UZS">UZS (сум)</option>
                            </select>
                        </div>
                        <button type="submit" class="btn-primary">Сохранить</button>
                    </form>
                </div>
            </div>

            <div id="transaction-modal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeModal('transaction-modal')">&times;</span>
                    <h2>Новая операция</h2>
                    <form id="transaction-form">
                        <input type="hidden" name="projectId">
                        <select name="type">
                            <option value="income">Доход</option>
                            <option value="expense">Расход</option>
                        </select>
                        <input type="text" name="description" placeholder="Описание" required>
                        <div class="input-group">
                            <input type="number" name="amount" placeholder="Сумма" required>
                            <select name="currency">
                                <option value="USD">USD ($)</option>
                                <option value="UZS">UZS (сум)</option>
                            </select>
                        </div>
                        <input type="date" name="date" required>
                        <button type="submit" class="btn-primary">Сохранить</button>
                    </form>
                </div>
            </div>

            <div id="lightbox-modal" class="modal lightbox">
                <span class="close" onclick="closeModal('lightbox-modal')">&times;</span>
                <img class="lightbox-content" id="lightbox-image">
                <div id="lightbox-caption"></div>
                <button class="nav-btn prev" onclick="navigateLightbox(-1)">&#10094;</button>
                <button class="nav-btn next" onclick="navigateLightbox(1)">&#10095;</button>
            </div>
        </main>
    </div>
    <script src="app.js"></script>
</body>

</html>
"""

# Part 3: Write the full content to index.html
with open('e:/ИИ/NP/index.html', 'w', encoding='utf-8') as f:
    f.write(header_content + new_content)

print("index.html restored successfully.")
