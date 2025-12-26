<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/docs/openapi.yaml', function () {
    $path = base_path('docs/openapi.yaml');

    abort_unless(file_exists($path), 404);

    return response()->file($path, [
        'Content-Type' => 'application/yaml',
    ]);
});

Route::get('/docs', function () {
    return response()->make(<<<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Med Tracker API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f6f6f6; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/docs/openapi.yaml',
          dom_id: '#swagger-ui',
          deepLinking: true,
          layout: 'BaseLayout',
        });
      };
    </script>
  </body>
</html>
HTML
    )->header('Content-Type', 'text/html');
});
