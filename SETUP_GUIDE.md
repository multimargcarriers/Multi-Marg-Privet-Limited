# Multimarg Carriers - Detailed Setup Specifications

The MERN stack migration has been architected to dynamically support **Firebase Firestore** for database management, **Redis** for high-speed caching, and **Cloudinary** for image/PDF uploads. 

The backend code for all 26 routes is fully equipped to interact with these cloud services. However, for security reasons, these services require your private credentials. Until you provide them, the application will run in a safe "Mock DB" mode so that the frontend remains 100% functional for UI development.

## 1. Firebase (Database) Integration

All API routes (e.g., `/api/bookings`, `/api/bills`) use a dual-mode system. When `USE_FIREBASE=true` is set, the API stops using the local mock arrays and begins reading/writing directly to your Firestore collections.

### How to Connect:
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Navigate to **Project Settings > Service Accounts**.
3. Click **Generate new private key** and save the downloaded JSON file as `serviceAccountKey.json` inside the `backend` folder.
4. Update the `backend/.env` file:
```env
USE_FIREBASE=true
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

---

## 2. Redis (High-Speed Caching)

Redis is implemented using a custom `getOrSet` wrapper in the backend. When `USE_REDIS=true` is set, GET requests to endpoints like `/api/cities`, `/api/branches`, and `/api/rates` will cache their Firestore results in Redis for 300 seconds. Subsequent requests will return instantly without querying Firebase, significantly reducing lag and database reads.

### How to Connect:
1. Install a local Redis server or use a cloud provider like [Upstash](https://upstash.com/) or [Redis Cloud](https://redis.com/).
2. Obtain your Redis connection string (e.g., `redis://username:password@host:port`).
3. Update the `backend/.env` file:
```env
USE_REDIS=true
REDIS_URL=your_redis_connection_string
```

---

## 3. Cloudinary (File Uploads)

File upload routes (`pod.js`, `box.js`, `vouchers.js`) use Cloudinary to store images and PDFs professionally. When a user uploads a Proof of Delivery (POD) from the React frontend, the file data is sent to the Express backend, which uploads it to Cloudinary and saves the secure URL into Firestore.

### How to Connect:
1. Create a free account on [Cloudinary](https://cloudinary.com/).
2. Navigate to your dashboard to find your Cloud Name, API Key, and API Secret.
3. Update the `backend/.env` file:
```env
USE_CLOUDINARY=true
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 4. Running the Complete System

Once your credentials are in place, start the servers:

**Terminal 1 (Backend)**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 (Frontend)**
```bash
cd frontend
npm install
npm run dev
```

Your system is now a fully professional, high-performance web application with glassmorphism UI aesthetics and robust cloud infrastructure!
