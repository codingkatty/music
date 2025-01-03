<?php
session_start();

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
<<<<<<< HEAD
=======
    // Check if user is logged in
>>>>>>> e229d951b9406629859f95d5053aa6f16049af2f
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'User not logged in']);
        exit;
    }

    $userId = $_SESSION['user_id'];
<<<<<<< HEAD
    $data = json_decode(file_get_contents('php://input'), true);
    $genre = $conn->real_escape_string($data['genre']);

    // First get current preferences
    $getPrefs = "SELECT preferences FROM users WHERE id = ?";
    $stmt = $conn->prepare($getPrefs);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row) {
        $currentPrefs = $row['preferences'];
        
        // Handle existing preferences
        if (!empty($currentPrefs)) {
            $prefArray = explode(',', $currentPrefs);
            // Remove genre if exists
            $prefArray = array_diff($prefArray, [$genre]);
            // Add genre to end
            $prefArray[] = $genre;
            $newPrefs = implode(',', $prefArray);
        } else {
            $newPrefs = $genre;
        }
        
        // Update preferences
        $updateSql = "UPDATE users SET preferences = ? WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("si", $newPrefs, $userId);
        
        if (!$stmt->execute()) {
            echo json_encode(['success' => false, 'message' => $stmt->error]);
        } else {
            echo json_encode(['success' => true]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found']);
=======
    
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
>>>>>>> e229d951b9406629859f95d5053aa6f16049af2f
    }
}
?>