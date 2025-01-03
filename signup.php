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
    $genres = $conn->real_escape_string($_POST['genres']);

    // Check if username already exists
    $checkUser = "SELECT id FROM users WHERE username = ?";
    $stmt = $conn->prepare($checkUser);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        header("Location: signup.html?error=exists");
        exit();
    }

    // Hash password and insert user
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $sql = "INSERT INTO users (username, password, preferences) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $username, $hashedPassword, $genres); // Changed from 'ssss' to 'sss'

    if ($stmt->execute()) {
        $_SESSION['user_id'] = $stmt->insert_id;
        $_SESSION['username'] = $username;
        header("Location: discover.html");
        exit();
    } else {
        header("Location: signup.html?error=1");
        exit();
    }
}
?>