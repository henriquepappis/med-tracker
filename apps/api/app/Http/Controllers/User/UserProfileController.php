<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json($request->user());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'timezone' => ['required', 'string'],
            'language' => ['required', 'string', 'in:en,pt-BR'],
        ]);

        $user = $request->user();
        $user->update($data);

        return response()->json($user->fresh());
    }
}
