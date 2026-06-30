<?php

namespace App\Http\Controllers\Admin;

use App\Support\JsonEnvelope;
use App\Support\RoomCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

/**
 * Admin toggle for room visibility (is_public). Rooms with no row default
 * to public. Setting is_public=false hides schedule/availability endpoints
 * from non-admin callers.
 */
class RoomVisibilityController extends Controller
{
    public function update(string $id, Request $request): JsonResponse
    {
        if (!ctype_digit($id)) {
            return JsonEnvelope::validation('id must be a positive integer', $request->path());
        }

        $payload = $request->json()->all();
        if (!array_key_exists('is_public', $payload) || !is_bool($payload['is_public'])) {
            return JsonEnvelope::validation('is_public must be boolean', $request->path());
        }

        $roomId = (int) $id;
        $isPublic = (bool) $payload['is_public'];
        $actor = $request->header('X-Siau-Admin-User') ?: 'admin';

        DB::connection('gateway')->table('room_visibility')->updateOrInsert(
            ['siisyana_room_id' => $roomId],
            [
                'is_public' => $isPublic,
                'updated_by' => substr($actor, 0, 128),
                'updated_at' => now(),
            ],
        );

        // Bump the room's cache version so the detail payload (which now
        // carries is_public) and per-room asset entries refresh immediately.
        // Schedule/availability gating reads room_visibility live, so access
        // enforcement is already immediate. The parameterized /rooms list
        // cache is bounded by its 6h TTL.
        RoomCache::bump($roomId);

        return JsonEnvelope::ok([
            'id' => (string) $roomId,
            'is_public' => $isPublic,
        ]);
    }
}
