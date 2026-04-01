<?php

declare(strict_types=1);

namespace App\Shared\Rectorat\Department\Service;

use Yiisoft\Db\Exception\Exception;
use Yiisoft\Db\Exception\InvalidConfigException;
use Yiisoft\Db\Mssql\Connection;

final class DepartmentService
{
    public function __construct(private readonly Connection $db)
    {
    }

    /**
     * Простой запрос для проверки
     *
     * @throws Exception
     * @throws InvalidConfigException
     */
    public function getSimpleSubdivisions(): array
    {
        // Простой SELECT запрос для MSSQL
        $sql = "SELECT TOP 5
                    IDSubDivision,
                    SubDivisionFullName,
                    SubDivisionShortName
                FROM NKZUPublic.dbo.SubDivisions
                ORDER BY SubDivisionFullName";

        $command = $this->db->createCommand($sql);
        return $command->queryAll();
    }

    /**
     * Запрос с параметром
     */
    public function getSubdivisionById(int $id): ?array
    {
        $sql = "SELECT
                    IDSubDivision,
                    SubDivisionFullName,
                    SubDivisionShortName
                FROM NKZUPublic.dbo.SubDivisions
                WHERE IDSubDivision = :id";

        $command = $this->db->createCommand($sql, [':id' => $id]);
        return $command->queryOne();
    }

    /**
     * Вызов хранимой процедуры
     */
    public function getSubdivisionsHierarchy(int $rootId = 326): array
    {
        $sql = "EXEC NKZUPublic.dbo.sd_subdivisions_hierarchy_get :root, 0";

        $command = $this->db->createCommand($sql, [':root' => $rootId]);
        return $command->queryAll();
    }
}
