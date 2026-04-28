<?php
// db.php — Database connection
// Place this file in: C:/xampp/htdocs/gymnatorium/

$host     = "localhost";
$user     = "root";       // Default XAMPP MySQL user
$password = "";           // Default XAMPP MySQL password (empty)
$database = "gymnatorium";

$conn = new mysqli($host, $user, $password, $database);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

// Allow requests from the same origin (adjust if needed)
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
