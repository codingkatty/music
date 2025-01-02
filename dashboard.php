<?php
session_start();
require_once 'config.php';

// Check if user is logged in
if(!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true){
    header("location: login.php");
    exit;
}

// Get user's Spotify data if connected
$spotify_data = null;
if(isset($_SESSION['spotify_access_token'])) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.spotify.com/v1/me');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: Bearer ' . $_SESSION['spotify_access_token']));
    $spotify_data = json_decode(curl_exec($ch));
    curl_close($ch);
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css">
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8">
        <div class="bg-white rounded-lg shadow-md p-6">
            <h1 class="text-2xl font-bold mb-6">Welcome, <?php echo htmlspecialchars($_SESSION["username"]); ?>!</h1>
            
            <div class="mb-6">
                <h2 class="text-xl font-semibold mb-3">Account Information</h2>
                <p>Username: <?php echo htmlspecialchars($_SESSION["username"]); ?></p>
                <?php if($spotify_data): ?>
                    <p>Spotify Account: Connected (<?php echo htmlspecialchars($spotify_data->email); ?>)</p>
                <?php else: ?>
                    <p>Spotify Account: Not Connected</p>
                    <a href="spotify_auth.php?connect=1" class="inline-block mt-2 bg-green-500 text-white px-4 py-2 rounded">Connect Spotify</a>
                <?php endif; ?>
            </div>

            <div class="flex justify-between">
                <a href="update_preferences.php" class="bg-blue-500 text-white px-4 py-2 rounded">Update Preferences</a>
                <a href="logout.php" class="bg-red-500 text-white px-4 py-2 rounded">Sign Out</a>
            </div>
        </div>
    </div>
</body>
</html>