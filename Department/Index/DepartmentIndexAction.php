<?php

declare(strict_types=1);

namespace App\Web\Rectorat\Department\Index;

use App\Shared\Rectorat\Department\Service\DepartmentService;
use App\Web\Rectorat\Layout\LayoutViewInjection;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Yiisoft\Yii\View\Renderer\ViewRenderer;

final class DepartmentIndexAction
{
    private ViewRenderer $viewRenderer;

    public function __construct(
        ViewRenderer $viewRenderer,
        private readonly DepartmentService $departmentService
    ) {
        $this->viewRenderer = $viewRenderer
            ->withViewPath('@src/Web/Rectorat')
            ->withControllerName('Department/Index')
            ->withLayout('@src/Web/Rectorat/Layout/main.php')
            ->withInjections(LayoutViewInjection::class);
    }

    public function __invoke(ServerRequestInterface $request): ResponseInterface
    {
        $queryParams = $request->getQueryParams();

        // Фильтры
        $search = $queryParams['search'] ?? '';
        $type = $queryParams['type'] ?? '';
        $rootId = (int)($queryParams['root_id'] ?? 326);

        $debug = [];

        try {
            // Получаем иерархию
            $allHierarchy = $this->departmentService->getSubdivisionsHierarchy($rootId);

            // Применяем фильтры с сохранением родителей
            $filteredHierarchy = $this->applyFiltersWithParents($allHierarchy, $search, $type);

            // Строим дерево из отфильтрованных элементов
            $tree = $this->buildTree($filteredHierarchy);

            // Получаем уникальные типы для фильтра
            $typeOptions = $this->getTypeOptions($allHierarchy);

            $debug['hierarchy'] = $tree;
            $debug['hierarchy_count'] = count($filteredHierarchy);
            $debug['filtered_count'] = count($filteredHierarchy);
            $debug['total_count'] = count($allHierarchy);

            // Для фильтров
            $debug['search'] = $search;
            $debug['type'] = $type;
            $debug['root_id'] = $rootId;
            $debug['type_options'] = $typeOptions;

            // Получаем список корневых подразделений для фильтра
            $debug['root_options'] = $this->getRootOptions($allHierarchy);

            $debug['status'] = 'success';
            $debug['message'] = 'Запросы выполнены успешно';

        } catch (\Throwable $e) {
            $debug['status'] = 'error';
            $debug['error'] = [
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ];
        }

        return $this->viewRenderer->render('index', [
            'title' => 'Департаменты',
            'debug' => $debug
        ]);
    }

    /**
     * Применение фильтров с сохранением родителей
     */
    private function applyFiltersWithParents(array $data, string $search, string $type): array
    {
        if (empty($search) && empty($type)) {
            return $data;
        }

        // Сначала находим все элементы, которые соответствуют фильтру
        $matchingIds = [];
        foreach ($data as $item) {
            $match = true;

            if (!empty($search)) {
                $name = mb_strtolower($item['SubDivisionFullName'] ?? '');
                $shortName = mb_strtolower($item['SubDivisionShortName'] ?? '');
                $searchLower = mb_strtolower($search);

                $match = $match && (str_contains($name, $searchLower) || str_contains($shortName, $searchLower));
            }

            if (!empty($type)) {
                $itemType = mb_strtolower($item['SubDivisionType'] ?? '');
                $typeLower = mb_strtolower($type);

                $match = $match && ($itemType === $typeLower);
            }

            if ($match) {
                $matchingIds[] = (int)($item['IDSubdivision'] ?? 0);
            }
        }

        // Собираем всех родителей для найденных элементов
        $resultIds = [];
        foreach ($matchingIds as $id) {
            $this->collectParents($data, $id, $resultIds);
        }

        // Добавляем сами найденные элементы
        $resultIds = array_unique(array_merge($resultIds, $matchingIds));

        // Фильтруем исходные данные
        return array_filter($data, function($item) use ($resultIds) {
            return in_array((int)($item['IDSubdivision'] ?? 0), $resultIds);
        });
    }

    /**
     * Рекурсивный сбор родителей элемента
     */
    private function collectParents(array $data, int $childId, array &$result): void
    {
        foreach ($data as $item) {
            if ((int)($item['IDSubdivision'] ?? 0) === $childId) {
                $parentId = (int)($item['IDSubdivisionParent'] ?? 0);
                if ($parentId > 0 && !in_array($parentId, $result)) {
                    $result[] = $parentId;
                    $this->collectParents($data, $parentId, $result);
                }
                break;
            }
        }
    }

    /**
     * Получение уникальных типов подразделений для фильтра
     */
    private function getTypeOptions(array $hierarchy): array
    {
        $types = [];
        foreach ($hierarchy as $item) {
            $type = $item['SubDivisionType'] ?? '';
            if (!empty($type) && !in_array($type, $types)) {
                $types[] = $type;
            }
        }
        sort($types);
        return $types;
    }

    /**
     * Построение дерева из плоского списка
     */
    private function buildTree(array $items, int $parentId = 0): array
    {
        $tree = [];

        foreach ($items as $item) {
            $currentParentId = (int)($item['IDSubdivisionParent'] ?? 0);

            if ($currentParentId === $parentId) {
                $children = $this->buildTree($items, (int)$item['IDSubdivision']);
                if (!empty($children)) {
                    $item['children'] = $children;
                }
                $tree[] = $item;
            }
        }

        return $tree;
    }

    /**
     * Получение списка корневых подразделений для фильтра
     */
    private function getRootOptions(array $hierarchy): array
    {
        $roots = [];
        $seen = [];

        foreach ($hierarchy as $item) {
            $parentId = (int)($item['IDSubdivisionParent'] ?? 0);
            $id = (int)($item['IDSubdivision'] ?? 0);

            // Если у элемента нет родителя или родитель 0, это корень
            if ($parentId === 0 && $id > 0 && !isset($seen[$id])) {
                $roots[] = [
                    'id' => $id,
                    'name' => $item['SubDivisionFullName'] ?? $item['SubDivisionShortName'] ?? "ID: {$id}"
                ];
                $seen[$id] = true;
            }
        }

        return $roots;
    }
}
