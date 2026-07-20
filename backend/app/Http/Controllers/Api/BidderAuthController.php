<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bidder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class BidderAuthController extends Controller
{
    /**
     * Register a new bidder
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:bidders,email',
            'password' => ['required', 'confirmed', Password::min(8)],
            'nik' => 'required|string|size:16|unique:bidders,nik',
            'npwp' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'ktp_file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120', // 5MB
            'npwp_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        // Store uploaded files
        $ktpPath = $request->file('ktp_file')->store('bidder-documents/ktp', 'public');
        $npwpPath = null;
        if ($request->hasFile('npwp_file')) {
            $npwpPath = $request->file('npwp_file')->store('bidder-documents/npwp', 'public');
        }

        // Create bidder
        $bidder = Bidder::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'nik' => $validated['nik'],
            'npwp' => $validated['npwp'] ?? null,
            'address' => $validated['address'] ?? null,
            'ktp_file' => $ktpPath,
            'npwp_file' => $npwpPath,
            'verification_status' => 'pending',
            'email_verification_token' => Str::random(64),
        ]);

        // TODO: Send email verification email
        // Mail::to($bidder->email)->send(new BidderVerificationEmail($bidder));

        return response()->json([
            'message' => 'Registrasi berhasil! Silakan verifikasi email Anda dan tunggu verifikasi dokumen oleh admin.',
            'bidder' => [
                'id' => $bidder->id,
                'name' => $bidder->name,
                'email' => $bidder->email,
                'verification_status' => $bidder->verification_status,
            ]
        ], 201);
    }

    /**
     * Verify email with token
     */
    public function verifyEmail(Request $request, string $token)
    {
        $bidder = Bidder::where('email_verification_token', $token)->first();

        if (!$bidder) {
            return response()->json([
                'message' => 'Token verifikasi tidak valid atau sudah kadaluarsa.'
            ], 400);
        }

        $bidder->update([
            'email_verified_at' => now(),
            'email_verification_token' => null,
        ]);

        return response()->json([
            'message' => 'Email berhasil diverifikasi! Silakan tunggu verifikasi dokumen oleh admin.'
        ]);
    }

    /**
     * Login bidder
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $bidder = Bidder::where('email', $validated['email'])->first();

        if (!$bidder || !Hash::check($validated['password'], $bidder->password)) {
            return response()->json([
                'message' => 'Email atau password salah.'
            ], 401);
        }

        if (!$bidder->is_active) {
            return response()->json([
                'message' => 'Akun Anda telah dinonaktifkan. Hubungi admin untuk informasi lebih lanjut.'
            ], 403);
        }

        // Create token, scoped to the 'bidder' ability so it cannot be
        // used against admin-only routes.
        $token = $bidder->createToken('bidder-token', ['bidder'])->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil!',
            'token' => $token,
            'bidder' => [
                'id' => $bidder->id,
                'name' => $bidder->name,
                'email' => $bidder->email,
                'nik' => $bidder->nik,
                'verification_status' => $bidder->verification_status,
                'email_verified' => $bidder->isEmailVerified(),
                'can_bid' => $bidder->canBid(),
            ]
        ]);
    }

    /**
     * Logout bidder
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil.'
        ]);
    }

    /**
     * Get current bidder profile
     */
    public function profile(Request $request)
    {
        $bidder = $request->user();

        return response()->json([
            'bidder' => [
                'id' => $bidder->id,
                'name' => $bidder->name,
                'email' => $bidder->email,
                'nik' => $bidder->nik,
                'npwp' => $bidder->npwp,
                'address' => $bidder->address,
                'ktp_file' => $bidder->ktp_file ? Storage::url($bidder->ktp_file) : null,
                'npwp_file' => $bidder->npwp_file ? Storage::url($bidder->npwp_file) : null,
                'verification_status' => $bidder->verification_status,
                'rejection_reason' => $bidder->rejection_reason,
                'email_verified' => $bidder->isEmailVerified(),
                'verified_at' => $bidder->verified_at,
                'can_bid' => $bidder->canBid(),
                'created_at' => $bidder->created_at,
            ]
        ]);
    }

    /**
     * Update bidder profile
     */
    public function updateProfile(Request $request)
    {
        $bidder = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'address' => 'nullable|string|max:500',
            'npwp' => 'nullable|string|max:20',
            'npwp_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        if ($request->hasFile('npwp_file')) {
            // Delete old file if exists
            if ($bidder->npwp_file) {
                Storage::disk('public')->delete($bidder->npwp_file);
            }
            $validated['npwp_file'] = $request->file('npwp_file')->store('bidder-documents/npwp', 'public');
        }

        $bidder->update($validated);

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'bidder' => [
                'id' => $bidder->id,
                'name' => $bidder->name,
                'email' => $bidder->email,
                'address' => $bidder->address,
                'npwp' => $bidder->npwp,
            ]
        ]);
    }

    /**
     * Resend email verification
     */
    public function resendVerification(Request $request)
    {
        $bidder = $request->user();

        if ($bidder->isEmailVerified()) {
            return response()->json([
                'message' => 'Email sudah terverifikasi.'
            ], 400);
        }

        $bidder->update([
            'email_verification_token' => Str::random(64),
        ]);

        // TODO: Send email verification email
        // Mail::to($bidder->email)->send(new BidderVerificationEmail($bidder));

        return response()->json([
            'message' => 'Email verifikasi telah dikirim ulang.'
        ]);
    }
}
