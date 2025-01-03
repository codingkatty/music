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
    die("Connection failed: " . $conn->connect_error);
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $conn->real_escape_string($_POST['username']);
    $password = $_POST['password'];
    $preferences = $conn->real_escape_string($_POST['preferences']);

    // Get user from database
    $sql = "SELECT id, username, password FROM users WHERE username = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        if (password_verify($password, $user['password'])) {
            // Update preferences
            $sql = "UPDATE users SET preferences = ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("si", $preferences, $user['id']);
            $stmt->execute();

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $username;
            
            header("Location: discover.html");
            exit();
        }
    }

    // Invalid login
    header("Location: signup.html?error=1");
    exit();
}
?>