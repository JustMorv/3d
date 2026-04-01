<?php

declare(strict_types=1);

namespace App\Web\Rectorat\Department\Routes;

use App\Web\Rectorat\Department\Index\DepartmentIndexAction;
use App\Web\Rectorat\Shared\Routes\RectoratRouteEnumTrait;
use Yiisoft\Http\Method;

enum DepartmentRoutesEnum: string
{
    use RectoratRouteEnumTrait;

    case RECTORAT_DEPARTMENT_INDEX = '/department';

    /**
     * @return array{methods: array, action: class-string, name: string, access?: int[]}
     */
    public function definition(): array
    {
        return match ($this) {
            self::RECTORAT_DEPARTMENT_INDEX => [
                'methods' => [Method::GET],
                'action' => DepartmentIndexAction::class,
                'name' => 'department',
                // 'access' => [333],
            ],
        };
    }
}
