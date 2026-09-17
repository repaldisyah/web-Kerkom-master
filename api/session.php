<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (!isset($_SESSION['user_id'])) {
    respond(['success' => true, 'authenticated' => false]);
}

respond([
    'success' => true,
    'authenticated' => true,
    'user' => [
        'name' => $_SESSION['user_name'],
        'role' => $_SESSION['user_role'],
        'branch_id' => $_SESSION['user_branch_id'] ?? null,
        'customer_id' => $_SESSION['user_customer_id'] ?? null,
    ],
]);
