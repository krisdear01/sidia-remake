<?php

namespace App\Database;

use Illuminate\Database\Connection;
use RuntimeException;

class ReadOnlyGuard
{
    private const ALLOWED = '/^\s*(select|show|describe|desc|explain|with)\b/i';

    public static function attach(Connection $connection): void
    {
        $connection->beforeExecuting(function (string $query) use ($connection): void {
            if (!preg_match(self::ALLOWED, $query)) {
                throw new RuntimeException(sprintf(
                    'ReadOnlyGuard: refused non-SELECT query on connection [%s].',
                    $connection->getName() ?? 'unknown'
                ));
            }
        });
    }
}
