<?php
// NOTE: a MAL client ID is not a secret credential the way an API key/secret is —
// it's meant to be used by client apps. But it's still good practice to keep it
// out of version control. See the chat for how to move this to an environment
// variable on whichever host you deploy this to.
$clientId = 'ceb06efcd0ee9f9dca7f258fd0fe28ba';
$path = $_GET['path'] ?? '';

if ($path === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing path']);
    exit;
}

if (strpos($path, '/api/anime') !== 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Not Found']);
    exit;
}

$targetPath = str_replace('/api/anime', '/v2/anime', $path);
$targetUrl = 'https://api.myanimelist.net' . $targetPath;

$params = $_GET;
unset($params['path']);

$queryString = http_build_query($params);
if ($queryString !== '') {
    $targetUrl .= '?' . $queryString;
}

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-MAL-CLIENT-ID: ' . $clientId,
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => $curlError]);
    exit;
}

http_response_code($statusCode);
echo $response;
