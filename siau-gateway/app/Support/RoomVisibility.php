<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Resolves the public/private state of a room (gateway-local table
 * room_visibility) and authorizes private-room access against the
 * admin bearer token. Rooms with no row default to public.
 */
class RoomVisibility
{
    /** Returns true when the room is public or the caller is admin-authed. */
    public static function isAccessible(int $siisyanaRoomId, Request $request): bool
    {
        $isPublic = self::isPublic($siisyanaRoomId);
        if ($isPublic) return true;
        return self::isAdmin($request);
    }

    public static function isPublic(int $siisyanaRoomId): bool
    {
        $val = DB::connection('gateway')->table('room_visibility')
            ->where('siisyana_room_id', $siisyanaRoomId)
            ->value('is_public');
        return $val === null ? true : (bool) $val;
    }

    public static function isAdmin(Request $request): bool
    {
        $expected = (string) config('siau.admin_token', '');
        $provided = (string) $request->bearerToken();
        return $expected !== '' && hash_equals($expected, $provided);
    }
}
