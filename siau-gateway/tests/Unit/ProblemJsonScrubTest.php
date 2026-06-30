<?php

namespace Tests\Unit;

use App\Support\ProblemJson;
use PHPUnit\Framework\TestCase;

class ProblemJsonScrubTest extends TestCase
{
    public function test_strips_full_sqlstate_dump(): void
    {
        $raw = "SQLSTATE[HY000] [1045] Access denied for user 'c1db_siisyana'@'172.16.211.68' "
             . "(using password: YES) (Connection: siisyana_ro, Host: 172.16.121.38, Port: 3306, "
             . "Database: c1db_siisyana, SQL: SELECT 1 AS ok)";

        $out = ProblemJson::scrub($raw);

        $this->assertSame('Upstream database error.', $out);
    }

    public function test_strips_ip_and_user_at_host(): void
    {
        $raw = "Connection failed at 192.168.10.4:3306 with user 'app'@'10.0.0.5'";
        $out = ProblemJson::scrub($raw);
        $this->assertStringNotContainsString('192.168.10.4', $out);
        $this->assertStringNotContainsString("'app'@'10.0.0.5'", $out);
        $this->assertStringContainsString('<redacted-host>', $out);
        $this->assertStringContainsString('<redacted-user@host>', $out);
    }

    public function test_strips_password_in_connection_string(): void
    {
        $raw = "Bad credentials user=root password=hunter2 host=db.example";
        $out = ProblemJson::scrub($raw);
        $this->assertStringNotContainsString('hunter2', $out);
        $this->assertStringContainsString('password=<redacted>', $out);
    }

    public function test_passes_through_safe_messages(): void
    {
        $this->assertSame(
            'Room not found.',
            ProblemJson::scrub('Room not found.')
        );
    }
}
