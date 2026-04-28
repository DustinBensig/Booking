<?php
// api/inquiries.php — Inquiries API
// Handles: GET (list all), POST (create), DELETE (remove by id)

require_once "../db.php";

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: fetch all inquiries ─────────────────────────────────
if ($method === 'GET') {
    $result = $conn->query("SELECT * FROM inquiries ORDER BY created_at DESC");

    $inquiries = [];
    while ($row = $result->fetch_assoc()) {
        $inquiries[] = [
            "id"      => (int)$row['id'],
            "name"    => $row['name'],
            "email"   => $row['email'],
            "phone"   => $row['phone'],
            "type"    => $row['type'],
            "message" => $row['message'],
            "date"    => date("M d, Y", strtotime($row['created_at'])),
        ];
    }

    echo json_encode($inquiries);
}

// ── POST: submit a new inquiry ───────────────────────────────
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON"]);
        exit();
    }

    $name    = $conn->real_escape_string(trim($data['name']    ?? ''));
    $email   = $conn->real_escape_string(trim($data['email']   ?? ''));
    $phone   = $conn->real_escape_string(trim($data['phone']   ?? ''));
    $type    = $conn->real_escape_string(trim($data['type']    ?? ''));
    $message = $conn->real_escape_string(trim($data['message'] ?? ''));

    if (!$name || !$email || !$phone || !$type || !$message) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit();
    }

    $sql = "INSERT INTO inquiries (name, email, phone, type, message)
            VALUES ('$name', '$email', '$phone', '$type', '$message')";

    if ($conn->query($sql)) {
        http_response_code(201);
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $conn->error]);
    }
}

// ── DELETE: remove an inquiry by id ─────────────────────────
elseif ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);

    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Missing inquiry id"]);
        exit();
    }

    if ($conn->query("DELETE FROM inquiries WHERE id = $id")) {
        echo json_encode(["success" => true]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $conn->error]);
    }
}

else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

$conn->close();
?>
