<?php
session_start();

// Database configuration
$dbHost = 'localhost';
$dbUsername = 'root';
$dbPassword = '';
$dbName = 'music_app';

// Create connection
$conn = new mysqli($dbHost, $dbUsername, $dbPassword, $dbName);

// Check connection
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => "Connection failed: " . $conn->connect_error]));
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'User not logged in']);
        exit;
    }

    $userId = $_SESSION['user_id'];
    
    // Get JSON data
    $data = json_decode(file_get_contents('php://input'), true);
    $genre = $conn->real_escape_string($data['genre']);

    // Update user preferences
    $sql = "UPDATE users SET preferences = CONCAT_WS(',', preferences, ?) WHERE id = ? AND NOT FIND_IN_SET(?, preferences)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sis", $genre, $userId, $genre);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error updating preferences']);
    }
}
?>