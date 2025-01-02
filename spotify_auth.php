<?php
session_start();
require_once 'config.php';

// Spotify API credentials
define('SPOTIFY_CLIENT_ID', 'your_client_id');
define('SPOTIFY_CLIENT_SECRET', 'your_client_secret');
define('SPOTIFY_REDIRECT_URI', 'http://your-domain.com/callback.php');

// If user clicked the Spotify connect button
if (isset($_GET['connect'])) {
    // Generate random state value for security
    $state = bin2hex(random_bytes(16));
    $_SESSION['spotify_state'] = $state;

    // Spotify authorization URL
    $params = array(
        'response_type' => 'code',
        'client_id' => SPOTIFY_CLIENT_ID,
        'scope' => 'user-read-private user-read-email',
        'redirect_uri' => SPOTIFY_REDIRECT_URI,
        'state' => $state
    );

    // Redirect to Spotify authorization page
    header('Location: https://accounts.spotify.com/authorize?' . http_build_query($params));
    exit;
}

// Handle callback from Spotify
if (isset($_GET['code'])) {
    // Verify state to prevent CSRF
    if ($_GET['state'] !== $_SESSION['spotify_state']) {
        die('State verification failed');
    }

    // Exchange code for access token
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://accounts.spotify.com/api/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(array(
        'grant_type' => 'authorization_code',
        'code' => $_GET['code'],
        'redirect_uri' => SPOTIFY_REDIRECT_URI,
        'client_id' => SPOTIFY_CLIENT_ID,
        'client_secret' => SPOTIFY_CLIENT_SECRET
    )));

    $result = json_decode(curl_exec($ch));
    curl_close($ch);

    // Store access token in session
    $_SESSION['spotify_access_token'] = $result->access_token;
    
    // Redirect to dashboard
    header('Location: dashboard.php');
    exit;
}
?>