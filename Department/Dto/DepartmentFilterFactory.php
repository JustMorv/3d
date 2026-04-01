<?php

declare(strict_types=1);

namespace App\Shared\Rectorat\Department\Dto;

use Psr\Http\Message\ServerRequestInterface;

final class DepartmentFilterFactory
{
    public function fromRequest(ServerRequestInterface $request): DepartmentFilter
    {
        $queryParams = $request->getQueryParams();

        $subdivisionRootId = isset($queryParams['IDSubdivisionRoot'])
            ? (int)$queryParams['IDSubdivisionRoot']
            : 326; // По умолчанию 326 - совет директоров

        $action = isset($queryParams['action'])
            ? (string)$queryParams['action']
            : null;

        return new DepartmentFilter(
            subdivisionRootId: $subdivisionRootId,
            action: $action,
        );
    }
}
