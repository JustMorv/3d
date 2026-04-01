<?php

/**
 * @var string $title
 * @var array $debug
 * @var \Yiisoft\View\WebView $this
 */

use Yiisoft\Html\Html;

function renderTree(array $items, int $level = 0): string {
    $html = '';

    foreach ($items as $item) {
        $id = $item['IDSubdivision'] ?? '';
        $name = $item['SubDivisionFullName'] ?? $item['SubDivisionShortName'] ?? 'Без названия';
        $shortName = $item['SubDivisionShortName'] ?? '';
        $type = $item['SubDivisionType'] ?? '';
        $chair = $item['IDChair'] ?? 0;
        $deleted = !empty($item['okDeleted']);
        $hasChildren = !empty($item['children']);

        // Определяем, должен ли уровень быть открытым по умолчанию (1-2 уровни)
        $isExpandedByDefault = $level < 2; // 0,1 - открыты, 2 и выше - закрыты

        $marginLeft = ($level * 2.5) . 'rem';

        $html .= '<div class="rectorat-tree-item"
                       data-id="' . $id . '"
                       data-parent="' . ($item['IDSubdivisionParent'] ?? '') . '"
                       data-level="' . $level . '">';

        // Карточка подразделения
        $html .= '<div class="card department-card border-0 shadow-sm" style="margin-left: ' . $marginLeft . ';">';
        $html .= '<div class="card-body p-3">';

        // Используем flex для лучшего контроля
        $html .= '<div class="d-flex flex-wrap align-items-center gap-3">';

        // Левая часть с иконкой и названием
        $html .= '<div class="flex-grow-1 d-flex align-items-center gap-2">';

        // Иконка для раскрытия/сворачивания
        if ($hasChildren) {
            $expandedClass = $isExpandedByDefault ? 'expanded' : '';
            $iconClass = $isExpandedByDefault ? 'fa-chevron-down' : 'fa-chevron-right';
            $ariaExpanded = $isExpandedByDefault ? 'true' : 'false';

            $html .= '<span class="rectorat-tree-toggle ' . $expandedClass . '" onclick="toggleBranch(this)" aria-expanded="' . $ariaExpanded . '">';
            $html .= '<i class="fa-solid ' . $iconClass . '"></i>';
            $html .= '</span>';
        } else {
            $html .= '<span class="text-secondary opacity-25" style="width: 32px;">';
            $html .= '<i class="fa-solid fa-circle fa-xs"></i>';
            $html .= '</span>';
        }

        // Название
        $html .= '<div>';
        $html .= '<span class="fw-medium">' . Html::encode($name) . '</span>';
        if (!empty($shortName) && $shortName !== $name) {
            $html .= ' <span class="badge bg-light text-secondary border">' . Html::encode($shortName) . '</span>';
        }
        $html .= '</div>';
        $html .= '</div>';

        // Правая часть с тегами
        $html .= '<div class="d-flex flex-wrap align-items-center gap-2 rectorat-tree-meta">';

        // ID
        $html .= '<span class="badge bg-light text-secondary border px-3 py-2">';
        $html .= '<i class="fa-solid fa-hashtag me-1 fa-xs"></i>' . $id;
        $html .= '</span>';

        // Тип
        if ($type) {
            $typeClass = $deleted ? 'bg-secondary text-white' : 'bg-primary-soft text-primary';
            $html .= '<span class="badge ' . $typeClass . ' border-0 px-3 py-2">';
            $html .= '<i class="fa-solid fa-tag me-1 fa-xs"></i>' . Html::encode($type);
            $html .= '</span>';
        }

        // Кафедра
        if ($chair) {
            $html .= '<span class="badge bg-success-soft text-success border-0 px-3 py-2">';
            $html .= '<i class="fa-solid fa-chalkboard-user me-1"></i>Кафедра';
            $html .= '</span>';
        }

        // Статус
        if ($deleted) {
            $html .= '<span class="badge bg-danger-soft text-danger border-0 px-3 py-2">';
            $html .= '<i class="fa-solid fa-ban me-1"></i>Удалено';
            $html .= '</span>';
        } else {
            $html .= '<span class="badge bg-success-soft text-success border-0 px-3 py-2">';
            $html .= '<i class="fa-solid fa-circle-check me-1"></i>Активно';
            $html .= '</span>';
        }

        $html .= '</div>'; // закрываем правую часть
        $html .= '</div>'; // закрываем flex
        $html .= '</div>'; // закрываем card-body
        $html .= '</div>'; // закрываем card

        // Контейнер для детей
        if ($hasChildren) {
            $collapsedClass = $isExpandedByDefault ? '' : 'collapsed';
            $html .= '<div class="rectorat-tree-children ' . $collapsedClass . '">';
            $html .= renderTree($item['children'], $level + 1);
            $html .= '</div>';
        }

        $html .= '</div>'; // закрываем rectorat-tree-item
    }

    return $html;
}

$subtitle = 'Иерархическая структура подразделений';
?>

<style>
    /* Переопределяем кастомные стили в соответствии с глобальными */
    .rectorat-tree-item {
        animation: rectorat-rise 0.3s ease both;
        margin-bottom: 0.5rem;
    }

    .department-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(148, 163, 184, 0.24) !important;
        border-radius: 14px;
        background: #f8fafc;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03) !important;
    }

    :root[data-theme="dark"] .department-card {
        background: rgba(15, 23, 42, 0.7);
        border-color: rgba(148, 163, 184, 0.25) !important;
    }

    .department-card:hover {
        transform: translateX(4px) translateY(-2px);
        border-left-color: var(--rect-primary) !important;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08) !important;
    }

    .rectorat-tree-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
        border-radius: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        background: transparent;
    }

    .rectorat-tree-toggle:hover {
        background: rgba(59, 130, 246, 0.12);
    }

    .rectorat-tree-toggle[aria-expanded="true"] {
        background: var(--rect-primary);
        border-color: var(--rect-primary);
        color: #ffffff;
    }

    .rectorat-tree-toggle[aria-expanded="true"]:hover {
        background: var(--rect-primary-strong);
    }

    .rectorat-tree-toggle i {
        font-size: 14px;
        transition: transform 0.2s ease;
    }

    .rectorat-tree-toggle:not([aria-expanded="true"]) i {
        transform: rotate(-90deg);
    }

    .rectorat-tree-children {
        margin-top: 0.75rem;
        margin-left: 1.125rem;
        padding-left: 0.875rem;
        border-left: 2px dashed rgba(148, 163, 184, 0.5);
        transition: all 0.2s ease;
    }

    .rectorat-tree-children.collapsed {
        display: none;
    }

    :root[data-theme="dark"] .rectorat-tree-children {
        border-left-color: rgba(148, 163, 184, 0.35);
    }

    .rectorat-tree-meta .badge {
        background: #eef2ff;
        border: 1px solid rgba(148, 163, 184, 0.35);
        color: #334155;
        font-weight: 500;
    }

    :root[data-theme="dark"] .rectorat-tree-meta .badge {
        background: rgba(148, 163, 184, 0.2);
        border-color: rgba(148, 163, 184, 0.3);
        color: #e2e8f0;
    }

    /* Кастомные бейджи */
    .badge.bg-primary-soft {
        background-color: var(--primary-soft);
        color: var(--bs-primary);
    }

    .badge.bg-success-soft {
        background-color: var(--success-soft);
        color: #059669;
    }

    .badge.bg-danger-soft {
        background-color: var(--danger-soft);
        color: #dc2626;
    }

    :root[data-theme="dark"] .badge.bg-success-soft {
        color: #6ee7b7;
    }

    :root[data-theme="dark"] .badge.bg-danger-soft {
        color: #fca5a5;
    }

    /* Статистика в стиле hero */
    .stat-card {
        background: linear-gradient(135deg, var(--bs-primary), #818cf8);
        color: white;
        border-radius: 16px;
        padding: 1.5rem;
        position: relative;
        overflow: hidden;
        box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.2);
        transition: transform 0.3s ease;
    }

    .stat-card:hover {
        transform: translateY(-4px);
    }

    .stat-card:nth-child(2) {
        background: linear-gradient(135deg, #059669, #10b981);
        box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.2);
    }

    .stat-card:nth-child(3) {
        background: linear-gradient(135deg, #d97706, #f59e0b);
        box-shadow: 0 20px 25px -5px rgba(245, 158, 11, 0.2);
    }

    .stat-card::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 200%;
        height: 200%;
        background: rgba(255, 255, 255, 0.1);
        transform: rotate(45deg);
    }

    .stat-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        opacity: 0.8;
    }

    .stat-value {
        font-size: 2.5rem;
        font-weight: 700;
        line-height: 1.2;
    }

    .stat-label {
        font-size: 0.875rem;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
    }

    /* Анимации */
    @keyframes highlight {
        0%, 100% { background-color: transparent; }
        50% { background-color: var(--primary-soft); }
    }

    .highlight {
        animation: highlight 1.5s ease;
    }

    /* Адаптивность */
    @media (max-width: 768px) {
        .department-card {
            margin-left: 0 !important;
        }

        .rectorat-tree-children {
            margin-left: 0.5rem !important;
            padding-left: 0.5rem !important;
        }

        .stat-value {
            font-size: 1.8rem;
        }
    }
</style>

<div class="rectorat-shell">
    <!-- Hero секция -->
    <section class="rectorat-hero p-4 p-lg-5 mb-4">
        <div class="d-flex flex-column gap-2">
            <div class="text-uppercase text-white-50 fw-semibold small"><?= Html::encode($title) ?></div>
            <h1 class="display-6 fw-semibold mb-1"><?= Html::encode($subtitle) ?></h1>
            <div class="text-white-50">Управление структурой подразделений университета</div>
        </div>
    </section>

    <?php if ($debug['status'] === 'error'): ?>
        <!-- Ошибка -->
        <div class="alert alert-danger d-flex align-items-center rounded-4" role="alert">
            <i class="fa-solid fa-circle-exclamation fs-5 me-3"></i>
            <div>
                <strong>Ошибка!</strong> <?= Html::encode($debug['error']['message']) ?>
            </div>
        </div>
    <?php else: ?>

        <!-- Статистика -->
        <div class="row g-4 mb-5">
            <div class="col-sm-4">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fa-solid fa-diagram-project"></i>
                    </div>
                    <div class="stat-value"><?= $debug['total_count'] ?? 0 ?></div>
                    <div class="stat-label">Всего подразделений</div>
                </div>
            </div>
            <div class="col-sm-4">
                <div class="stat-card" style="background: linear-gradient(135deg, #059669, #10b981);">
                    <div class="stat-icon">
                        <i class="fa-solid fa-filter"></i>
                    </div>
                    <div class="stat-value"><?= $debug['filtered_count'] ?? $debug['hierarchy_count'] ?? 0 ?></div>
                    <div class="stat-label">После фильтрации</div>
                </div>
            </div>
            <div class="col-sm-4">
                <div class="stat-card" style="background: linear-gradient(135deg, #d97706, #f59e0b);">
                    <div class="stat-icon">
                        <i class="fa-solid fa-layer-group"></i>
                    </div>
                    <div class="stat-value"><?= count($debug['root_options'] ?? []) ?></div>
                    <div class="stat-label">Корневых элементов</div>
                </div>
            </div>
        </div>

        <!-- Фильтры -->
        <div class="filter-section">
            <form method="get" class="row g-4">
                <div class="col-md-4">
                    <label for="search" class="form-label fw-medium">
                        <i class="fa-solid fa-magnifying-glass me-1 text-primary"></i>
                        Поиск по названию
                    </label>
                    <input type="text"
                           class="form-control"
                           id="search"
                           name="search"
                           value="<?= Html::encode($debug['search'] ?? '') ?>"
                           placeholder="Введите название...">
                </div>

                <div class="col-md-3">
                    <label for="type" class="form-label fw-medium">
                        <i class="fa-solid fa-tag me-1 text-primary"></i>
                        Тип подразделения
                    </label>
                    <select class="form-select" id="type" name="type">
                        <option value="">Все типы</option>
                        <?php if (!empty($debug['type_options'])): ?>
                            <?php foreach ($debug['type_options'] as $typeOption): ?>
                                <option value="<?= Html::encode($typeOption) ?>" <?= ($debug['type'] ?? '') == $typeOption ? 'selected' : '' ?>>
                                    <?= Html::encode($typeOption) ?>
                                </option>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </select>
                </div>

                <div class="col-md-3">
                    <label for="root_id" class="form-label fw-medium">
                        <i class="fa-solid fa-diagram-project me-1 text-primary"></i>
                        Корневой элемент
                    </label>
                    <select class="form-select" id="root_id" name="root_id">
                        <option value="326" <?= ($debug['root_id'] ?? 326) == 326 ? 'selected' : '' ?>>Совет директоров (326)</option>
                        <?php if (!empty($debug['root_options'])): ?>
                            <?php foreach ($debug['root_options'] as $root): ?>
                                <?php if ($root['id'] != 326): ?>
                                    <option value="<?= $root['id'] ?>" <?= ($debug['root_id'] ?? 0) == $root['id'] ? 'selected' : '' ?>>
                                        <?= Html::encode($root['name']) ?>
                                    </option>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </select>
                </div>

                <div class="col-md-2 d-flex align-items-end">
                    <div class="d-flex gap-2 w-100">
                        <button type="submit" class="btn btn-primary flex-grow-1">
                            <i class="fa-solid fa-filter me-2"></i>Применить
                        </button>
                        <a href="?" class="btn btn-outline-secondary">
                            <i class="fa-solid fa-xmark"></i>
                        </a>
                    </div>
                </div>
            </form>
        </div>

        <!-- Сообщение о фильтрах -->
        <?php if (!empty($debug['search']) || !empty($debug['type'])): ?>
            <div class="filter-message d-flex flex-wrap align-items-center gap-3">
                <i class="fa-solid fa-circle-info fs-5"></i>
                <span class="fw-medium">Применены фильтры:</span>
                <?php if (!empty($debug['search'])): ?>
                    <span class="badge bg-primary-soft text-primary border-0 px-3 py-2">
                        <i class="fa-solid fa-magnifying-glass me-1"></i> "<?= Html::encode($debug['search']) ?>"
                    </span>
                <?php endif; ?>
                <?php if (!empty($debug['type'])): ?>
                    <span class="badge bg-primary-soft text-primary border-0 px-3 py-2">
                        <i class="fa-solid fa-tag me-1"></i> "<?= Html::encode($debug['type']) ?>"
                    </span>
                <?php endif; ?>
                <span class="ms-auto small text-primary opacity-75">
                    <i class="fa-solid fa-eye me-1"></i>
                    <?= $debug['filtered_count'] ?? $debug['hierarchy_count'] ?? 0 ?> из <?= $debug['total_count'] ?? 0 ?>
                </span>
            </div>
        <?php endif; ?>

        <!-- Дерево подразделений -->
        <div class="tree-container mt-4">
            <?php if (!empty($debug['hierarchy'])): ?>
                <?= renderTree($debug['hierarchy']) ?>
            <?php else: ?>
                <div class="text-center py-5">
                    <div class="display-1 text-secondary opacity-25 mb-3">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <h3 class="fw-light">Нет данных для отображения</h3>
                    <p class="text-secondary">Попробуйте изменить параметры фильтрации</p>
                </div>
            <?php endif; ?>
        </div>

    <?php endif; ?>
</div>

<script>
    function toggleBranch(element) {
        const treeItem = element.closest('.rectorat-tree-item');
        const childrenContainer = treeItem.querySelector('.rectorat-tree-children');
        const isExpanded = element.getAttribute('aria-expanded') === 'true';

        if (childrenContainer) {
            if (isExpanded) {
                // Сворачиваем
                childrenContainer.classList.add('collapsed');
                element.setAttribute('aria-expanded', 'false');
            } else {
                // Разворачиваем
                childrenContainer.classList.remove('collapsed');
                element.setAttribute('aria-expanded', 'true');
            }
        }
    }

    // Подсветка при поиске
    <?php if (!empty($debug['search'])): ?>
    document.addEventListener('DOMContentLoaded', function() {
        const searchText = '<?= addslashes($debug['search']) ?>'.toLowerCase();
        if (!searchText) return;

        const cards = document.querySelectorAll('.department-card');
        cards.forEach(card => {
            const title = card.querySelector('.fw-medium');
            if (title && title.textContent.toLowerCase().includes(searchText)) {
                card.classList.add('highlight');

                // Раскрываем родителей
                let parent = card.closest('.rectorat-tree-item');
                while (parent) {
                    const container = parent.querySelector('.rectorat-tree-children');
                    const toggle = parent.querySelector('.rectorat-tree-toggle');

                    if (container && container.classList.contains('collapsed')) {
                        container.classList.remove('collapsed');
                    }

                    if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
                        toggle.setAttribute('aria-expanded', 'true');
                    }

                    parent = parent.parentElement.closest('.rectorat-tree-item');
                }

                setTimeout(() => card.classList.remove('highlight'), 1500);
            }
        });
    });
    <?php endif; ?>
</script>
