<?php
// api/bookings.php — Bookings API
// Handles: GET (list all), POST (create), DELETE (remove by id)

require_once "../db.php";

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: fetch all bookings ──────────────────────────────────
if ($method === 'GET') {
    $result = $conn->query("SELECT * FROM bookings ORDER BY created_at DESC");

    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        $bookings[] = [
            "id"       => (int)$row['id'],
            "name"     => $row['name'],
            "email"    => $row['email'],
            "phone"    => $row['phone'],
            "event"    => $row['event'],
            "checkIn"  => $row['check_in'],
            "checkOut" => $row['check_out'],
            "timeIn"   => $row['time_in'],
            "timeOut"  => $row['time_out'],
            "guests"   => (int)$row['guests'],
            "days"     => (int)$row['days'],
        ];
    }

    echo json_encode($bookings);
}

// ── POST: create a new booking ───────────────────────────────
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON"]);
        exit();
    }

    $name      = $conn->real_escape_string(trim($data['name']      ?? ''));
    $email     = $conn->real_escape_string(trim($data['email']     ?? ''));
    $phone     = $conn->real_escape_string(trim($data['phone']     ?? ''));
    $event     = $conn->real_escape_string(trim($data['event']     ?? ''));
    $check_in  = $conn->real_escape_string($data['checkIn']  ?? '');
    $check_out = $conn->real_escape_string($data['checkOut'] ?? '');
    $time_in   = !empty($data['timeIn'])  ? "'" . $conn->real_escape_string($data['timeIn'])  . "'" : "NULL";
    $time_out  = !empty($data['timeOut']) ? "'" . $conn->real_escape_string($data['timeOut']) . "'" : "NULL";
    $guests    = (int)($data['guests'] ?? 0);
    $days      = (int)($data['days']   ?? 1);

    if (!$name || !$email || !$phone || !$event || !$check_in || !$check_out || !$guests) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit();
    }

    // ── Conflict check: overlapping date range ───────────────
    // Two bookings conflict if their date ranges overlap:
    // existing.check_in <= new.check_out AND existing.check_out >= new.check_in
    $conflict_sql = "SELECT id, name, check_in, check_out, time_in, time_out
                     FROM bookings
                     WHERE check_in <= '$check_out'
                       AND check_out >= '$check_in'";

    $conflict_result = $conn->query($conflict_sql);

    if ($conflict_result && $conflict_result->num_rows > 0) {
        $has_conflict = false;
        $conflict_info = [];

        while ($row = $conflict_result->fetch_assoc()) {
            $new_is_single = ($check_in === $check_out);
            $ex_is_single  = ($row['check_in'] === $row['check_out']);
            $same_day      = ($new_is_single && $ex_is_single && $check_in === $row['check_in']);

            if ($same_day && $time_in !== "NULL" && !empty($row['time_in'])) {
                // Same single day — check if time ranges overlap
                $new_in  = strtotime($data['timeIn']);
                $new_out = strtotime($data['timeOut'] ?? '23:59');
                $ex_in   = strtotime($row['time_in']);
                $ex_out  = strtotime($row['time_out'] ?? '23:59');

                if ($new_in < $ex_out && $new_out > $ex_in) {
                    $has_conflict = true;
                    $conflict_info = $row;
                    break;
                }
            } elseif (!$same_day) {
                // Multi-day overlap — always a conflict
                $has_conflict = true;
                $conflict_info = $row;
                break;
            }
        }

        if ($has_conflict) {
            http_response_code(409);
            echo json_encode([
                "error" => "This date is already booked. Please choose a different date or time.",
                "conflictWith" => [
                    "name"     => $conflict_info['name'],
                    "checkIn"  => $conflict_info['check_in'],
                    "checkOut" => $conflict_info['check_out'],
                    "timeIn"   => $conflict_info['time_in']  ?? null,
                    "timeOut"  => $conflict_info['time_out'] ?? null,
                ]
            ]);
            exit();
        }
    }

    $sql = "INSERT INTO bookings (name, email, phone, event, check_in, check_out, time_in, time_out, guests, days)
            VALUES ('$name', '$email', '$phone', '$event', '$check_in', '$check_out', $time_in, $time_out, $guests, $days)";

    if ($conn->query($sql)) {
        http_response_code(201);
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $conn->error]);
    }
}

// ── DELETE: remove a booking by id ──────────────────────────
elseif ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);

    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Missing booking id"]);
        exit();
    }

    if ($conn->query("DELETE FROM bookings WHERE id = $id")) {
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