<?php

namespace App\Services;

use App\Models\AdminAuditLog;

class AdminAuditor
{
    /**
     * Record the *intent* of an admin action. Returns the row id so the caller
     * can update outcome after the upstream call returns.
     */
    public function start(int $userId, string $action, ?string $subject, array $payload, ?string $actorIp = null): int
    {
        return AdminAuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            'subject' => $subject,
            'payload' => $this->scrub($payload),
            'outcome' => 'pending',
            'actor_ip' => $actorIp,
        ])->id;
    }

    public function succeed(int $id): void
    {
        AdminAuditLog::where('id', $id)->update(['outcome' => 'success']);
    }

    public function fail(int $id, string $errorCode): void
    {
        AdminAuditLog::where('id', $id)->update([
            'outcome' => 'failed',
            'error_code' => substr($errorCode, 0, 64),
        ]);
    }

    /**
     * Defence-in-depth: never persist anything that looks like a token.
     */
    private function scrub(array $payload): array
    {
        $blocked = ['authorization', 'token', 'password', 'secret', 'api_key', 'siau_admin_token'];
        foreach ($payload as $k => $v) {
            if (in_array(strtolower((string) $k), $blocked, true)) {
                $payload[$k] = '[redacted]';
            }
        }
        return $payload;
    }
}
