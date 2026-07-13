require('dotenv').config();
const dns = require('dns');

// Fix ISP DNS and IPv6 routing issues causing MongoDB connection timeouts
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const { db } = require('./src/config/firebase');

async function seedUser() {
    try {
        console.log("Seeding super admin...");
        
        const email = "praveen.pr105@gmail.com";
        const password = "123456";
        
        // Wait a few seconds for mongo to connect
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        const usersRef = db.collection("users");
        
        const snapshot = await usersRef.where("email", "==", email).get();
        if (!snapshot.empty) {
            console.log("Super admin already exists!");
            let existingId;
            snapshot.forEach(doc => { existingId = doc.id; });
            
            await usersRef.doc(existingId).update({
                password,
                role: "SuperAdmin",
                permissions: ["all"]
            });
            console.log("Updated existing super admin credentials.");
            process.exit(0);
        }

        const docRef = await usersRef.add({
            name: "Praveen",
            email,
            password,
            role: "SuperAdmin",
            permissions: ["all"],
            status: "active",
            createdAt: new Date().toISOString()
        });
        
        console.log("Successfully seeded super admin with ID:", docRef.id);
        process.exit(0);
        
    } catch (error) {
        console.error("Seed error:", error);
        process.exit(1);
    }
}

seedUser();
