# 🏛️ Multi Marg Carriers - System Architecture & Engineering Guide

---

## 1. Overview & Architectural Pattern

The platform is designed as a **decoupled Client-Server architecture**:
* **Frontend**: Single-Page Application (SPA) built with **React 18** and bundled with **Vite**.
* **Backend**: Modular RESTful API server built on **Node.js** and **Express**.
* **Database Layer**: **MongoDB** operated via an abstracted **Firestore-compatible Adapter** (`dbAdapter.js`), facilitating flexible query chains without tight ORM coupling.
* **Caching Layer**: **Redis** cache client used for query caching with active invalidation on mutations.

---

## 2. The Database Adapter (`dbAdapter.js`)

To maintain high compatibility across querying syntax, the backend uses a custom adapter layer (`backend/src/config/dbAdapter.js`) that wraps the native MongoDB driver.

### Query Chaining API:
```javascript
// Example: Querying a collection with filtering, sorting, and limits
const snapshot = await db
  .collection("bookings")
  .where("billed", "==", false)
  .where("client", "==", "ABC CORP")
  .orderBy("date", "desc")
  .limit(50)
  .get();

// Reading document data
snapshot.forEach((doc) => {
  const data = doc.data();
  const id = doc.id;
});
```

### Supported Operators:
* `==`: Exact equality (`$eq`)
* `!=`: Inequality (`$ne`)
* `>`, `>=`, `<`, `<=`: Range queries
* `in`: Array membership (`$in`)
* `array-contains`: Element containment (`$all` / `$in`)

### Document Operations:
* `doc(id).get()`: Fetch single document.
* `doc(id).set(data)`: Upsert document.
* `doc(id).update(data)`: Patch document with `$set` and automatic `updatedAt` tracking.
* `doc(id).delete(user)`: Remove document with audit trail logging.
* `collection(name).add(data)`: Insert new document with automatic UUID ID.

---

## 3. Caching & Performance (`redis.js`)

To ensure low latency for heavy reporting and dashboard views, the backend integrates an active Redis caching layer (`backend/src/config/redis.js`).

### Cache Helper Functions:
* `getCache(key)`: Retrieves cached JSON data.
* `setCache(key, data, ttlSeconds)`: Sets cache with configurable TTL (default 10 minutes).
* `delCache(patternOrKey)`: Invalidates exact keys or wildcard patterns (e.g. `delCache("bills*")`).

### Invalidation Strategy:
Every mutating controller endpoint (POST / PUT / DELETE) must invalidate its corresponding collection cache as well as any composite report caches.

---

## 4. Authentication & Security Middleware

1. **JSON Web Tokens (JWT)**:
   * Tokens are signed using `process.env.JWT_SECRET` with user payload (`id`, `username`, `role`, `branch`).
   * Authenticated endpoints are protected using `authenticateToken` middleware in `server.js`.

2. **Role-Based Access Control (RBAC)**:
   * **Super Admin**: Unrestricted access to all branches, logs, audit trails, and Year-End closing.
   * **Admin / Manager**: Full management within designated branch / company scope.
   * **Clerk / User**: Restricted to creating bookings, generating manifests, and viewing assigned records.

3. **Audit Logging & Activity Tracking**:
   * All critical mutations (deletions, updates, cash disbursements) are recorded in the `logs` collection with timestamp, IP, and user identity.
