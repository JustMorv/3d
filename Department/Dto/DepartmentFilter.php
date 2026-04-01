<?php

declare(strict_types=1);

namespace App\Shared\Rectorat\Department\Dto;

use DateTimeImmutable;

final class DepartmentFilter
{
    public function __construct(
        public readonly ?int $subdivisionRootId = null,
        public readonly ?string $action = null,
        public readonly ?string $error = null,
    ) {
    }

    public function hasAction(): bool
    {
        return $this->action !== null && $this->action !== '';
    }

    public function isViewAction(): bool
    {
        return $this->action === 'view';
    }
}
