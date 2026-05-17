  
const express = require("express");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Make sure this is correct

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/public", express.static("public"));

app.get("/thresholds", async (req, res) => {
  try {
    const doc = await db.collection("systemConfig")
      .doc("thresholds")
      .get();

    res.json(doc.exists ? doc.data() : {
      low: 7,
      moderate: 12,
      high: 15
    });
  } catch (err) {
    console.error(err);
    res.json({ low: 7, moderate: 12, high: 15 });
  }
});
// 🔥 Save Prediction API
app.post("/savePrediction", async (req, res) => {
  try {
    const prediction = req.body;

    if (!prediction.username) {
      return res.status(400).json({
        success: false,
        message: "username is required"
      });
    }

    const dataToSave = {
      ...prediction,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("predictions").add(dataToSave);

    res.json({
      success: true,
      id: docRef.id
    });

  } catch (error) {
    console.error("Save error:", error);
    res.status(500).json({ success: false });
  }
});
// 🔥 Confirm Prediction API
app.post("/confirmPrediction", async (req, res) => {
  try {
    const { id, confirmation } = req.body;

    await db.collection("predictions").doc(id).update({
      userConfirmation: confirmation,
      confirmedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Confirm error:", error);
    res.status(500).json({ success: false });
  }
});


// 🔥 Get History API
app.get("/history/:username", async (req, res) => {
  try {
    const username = req.params.username;

    const snapshot = await db.collection("predictions")
      .where("username", "==", username)
      .get(); // ❌ remove orderBy for now

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(data); // MUST be array

  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/", (req, res) => {
    res.sendFile(__dirname + "login.html");
});
app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});