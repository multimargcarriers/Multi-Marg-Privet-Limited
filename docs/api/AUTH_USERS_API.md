# 🔐 Authentication, Users & Branch Management API Specification

---

## 1. POST `/api/auth/login`
Authenticates a user and issues a JWT token.

* **Access**: Public
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "username": "admin",
  "password": "secure_password_123"
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_948f21",
    "name": "Admin User",
    "username": "admin",
    "email": "admin@multimarg.com",
    "role": "SuperAdmin",
    "branch": "Head Office",
    "permissions": ["all"]
  }
}
```
* **Error Response (401 Unauthorized)**:
```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

---

## 2. GET `/api/auth/profile`
Fetches the profile of the currently logged-in user.

* **Access**: Authenticated (`authenticateToken`)
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "usr_948f21",
    "name": "Admin User",
    "username": "admin",
    "role": "SuperAdmin",
    "branch": "Head Office"
  }
}
```

---

## 3. GET `/api/users`
Lists all system users.

* **Access**: SuperAdmin / Admin
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `branch` (string, optional): Filter by branch.
  * `role` (string, optional): Filter by role (`SuperAdmin`, `Admin`, `BranchStaff`, `User`).
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "usr_01",
      "name": "Super Admin",
      "username": "superadmin",
      "email": "admin@multimarg.com",
      "role": "SuperAdmin",
      "branch": "Head Office",
      "active": true,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 4. POST `/api/users`
Creates a new user account.

* **Access**: SuperAdmin
* **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Body**:
```json
{
  "name": "Jane Doe",
  "username": "janedoe",
  "email": "jane@multimarg.com",
  "password": "Password@123",
  "role": "BranchStaff",
  "branch": "Delhi Hub",
  "phone": "9876543210"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": { "id": "usr_882b", "username": "janedoe", "role": "BranchStaff" }
}
```

---

## 5. GET `/api/branches` & POST `/api/branches`
Branch location master management.

* **GET `/api/branches`**: List all branches.
* **POST `/api/branches`**: Create branch (`{ name, code, address, city, state, phone, gst }`).
