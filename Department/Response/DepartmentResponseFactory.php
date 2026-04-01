<?php

declare(strict_types=1);

namespace App\Shared\Rectorat\Department\Response;

use App\Shared\Rectorat\Department\Dto\DepartmentFilter;

final class DepartmentResponseFactory
{
    /**
     * @param array<int, array{
     *     IDSubdivision: int,
     *     IDSubdivisionParent: int,
     *     IDChair: int,
     *     IDFaculty: int,
     *     Level: int,
     *     okDeleted: int,
     *     ParentSubdivisionNameRU: string,
     *     SubDivisionFullName: string,
     *     SubDivisionFullKazName: string,
     *     SubDivisionFullNameEng: string,
     *     SubDivisionShortName: string,
     *     SubDivisionShortKazName: string,
     *     SubDivisionShortNameEng: string,
     *     SubDivisionType: string,
     *     SubdivisionCasePrefix: string,
     * }> $subdivisions
     * @param array<int, array{id:int, name:string, level:int}> $subdivisionTree
     */
    public function build(
        DepartmentFilter $filter,
        array $subdivisions,
        array $subdivisionTree,
        bool $accessEdit,
        bool $isAdmin,
    ): array {
        return [
            'filter' => $filter,
            'subdivisions' => $subdivisions,
            'subdivisionTree' => $subdivisionTree,
            'accessEdit' => $accessEdit,
            'isAdmin' => $isAdmin,
            'selectedRootId' => $filter->subdivisionRootId,
        ];
    }
}
