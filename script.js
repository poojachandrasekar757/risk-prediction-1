// In-memory storage (simulates backend for demo)
       
 let predictions = [];
        let currentPredictionId = null;
        let locationData = null;
        let imageData = null;
        let model;
const BASE_URL = "https://your-backend-url.onrender.com";
async function loadModel() {
    model = await mobilenet.load();
    console.log("AI Model Loaded");
}

window.addEventListener('load', function() {
    loadModel();
});
        // Tab switching
        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');

            if (tabName === 'metrics') loadMetrics();
            if (tabName === 'history') loadHistory();
        }

        function openImageModal() {
            document.getElementById('imageModal').classList.add('active');
        }

        function closeImageModal() {
            document.getElementById('imageModal').classList.remove('active');
        }

    function selectCamera() {
    closeImageModal();
    document.getElementById('cameraInput').click();
}
        function selectGallery() {
            closeImageModal();
            document.getElementById('galleryInput').click();
        }

        function getLocation() {
            if (navigator.geolocation) {
                document.getElementById('loading').classList.add('active');
                document.getElementById('locationSection').style.display = 'none';
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        calculateLocationRisk(lat, lon);
                    },
                    (error) => {
                        alert('Unable to get location. Using simulated data.');
                        calculateLocationRisk(37.7749, -122.4194);
                    }
                );
            } else {
                alert('Geolocation is not supported by this browser.');
            }
        }
          async function calculateLocationRisk(lat, lon) {
    const API_KEY = "2dbca3caed9b2f7ee3ba7ab5012604d7";

    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );

        const data = await response.json();

        const temp = data.main.temp;
        const humidity = data.main.humidity;
        const windSpeed = data.wind.speed * 3.6; // convert m/s to km/h

        // Vegetation estimation using weather condition
        const weatherMain = data.weather[0].main;
        let vegetation = "Medium";

        if (weatherMain === "Rain") vegetation = "Low";
        else if (weatherMain === "Clear") vegetation = "High";

        let riskScore = 0;

        if (temp > 35) riskScore += 3;
        else if (temp > 30) riskScore += 2;
        else riskScore += 1;

        if (humidity < 30) riskScore += 3;
        else if (humidity < 50) riskScore += 2;
        else riskScore += 1;

        if (windSpeed > 25) riskScore += 3;
        else if (windSpeed > 15) riskScore += 2;
        else riskScore += 1;

        if (vegetation === "High") riskScore += 3;
        else if (vegetation === "Medium") riskScore += 2;
        else riskScore += 1;

        locationData = {
            latitude: lat,
            longitude: lon,
            temp,
            humidity,
            windSpeed: parseFloat(windSpeed.toFixed(1)),
            vegetation,
            riskScore
        };
        
        displayLocationRisk();

    } catch (error) {
        alert("Weather API Error. Check API key.");
        console.error(error);
    }
}
        function displayLocationRisk() {
            const { temp, humidity, windSpeed, vegetation, riskScore } = locationData;
            
            document.getElementById('temperature').textContent = temp + '°C';
            document.getElementById('humidity').textContent = humidity + '%';
            document.getElementById('windSpeed').textContent = windSpeed + ' km/h';
            document.getElementById('vegetation').textContent = vegetation;

            const riskLevelEl = document.getElementById('riskLevel');
            let riskLevel = '';
            
            if (riskScore <= 4) {
                riskLevelEl.textContent = '✅ LOW RISK';
                riskLevelEl.className = 'risk-level risk-low';
                riskLevel = 'LOW';
            } else if (riskScore <= 7) {
                riskLevelEl.textContent = '⚠️ MODERATE RISK';
                riskLevelEl.className = 'risk-level risk-moderate';
                riskLevel = 'MODERATE';
            } else if (riskScore <= 10) {
                riskLevelEl.textContent = '🔥 HIGH RISK';
                riskLevelEl.className = 'risk-level risk-high';
                riskLevel = 'HIGH';
            } else {
                riskLevelEl.textContent = '🚨 EXTREME RISK';
                riskLevelEl.className = 'risk-level risk-extreme';
                riskLevel = 'EXTREME';
            }

            locationData.riskLevel = riskLevel;

            document.getElementById('loading').classList.remove('active');
            document.getElementById('riskDisplay').classList.add('active');

            updateCombinedResult();
        }

        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('uploadedImage').src = e.target.result;
                    document.getElementById('imageResult').style.display = 'block';
                    
                    setTimeout(() => {
                        analyzeImage(e.target.result);
                    }, 1000);
                };
                reader.readAsDataURL(file);
            }
        }
        
function analyzeImage(base64Image) {

    const img = document.getElementById('uploadedImage');
    const canvas = document.getElementById('smokeCanvas');
    const ctx = canvas.getContext('2d');

    // Ensure image is ready
    if (!img.complete) {
        img.onload = () => processImage();
    } else {
        processImage();
    }

    function processImage() {

        const width = 300;
        const height = (img.height / img.width) * 300;

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        const imageDataObj = ctx.getImageData(0, 0, width, height);
        const pixels = imageDataObj.data;

        let smokePixels = 0;
        let totalPixels = width * height;

        for (let i = 0; i < pixels.length; i += 4) {

            let r = pixels[i];
            let g = pixels[i + 1];
            let b = pixels[i + 2];

            let brightness = (r + g + b) / 3;

            let max = Math.max(r, g, b);
            let min = Math.min(r, g, b);
            let saturation = max === 0 ? 0 : (max - min) / max;

            if (
                brightness > 120 &&
                brightness < 240 &&
                saturation < 0.25
            ) {
                smokePixels++;
            }
        }

        let smokePercentage = (smokePixels / totalPixels) * 100;

        let imageRiskScore = 0;
        if (smokePercentage > 60) imageRiskScore = 4;
        else if (smokePercentage > 40) imageRiskScore = 3;
        else if (smokePercentage > 20) imageRiskScore = 2;
        else imageRiskScore = 1;

        document.getElementById('smokeLevel').textContent =
            smokePercentage.toFixed(2) + "%";

        imageData = {
            smokeLevel: smokePercentage,
            imageRiskScore: imageRiskScore,
            imageData: base64Image
        };

        updateCombinedResult();
    }
}
async function getDynamicThresholds() {
    const res = await fetch(`${BASE_URL}/thresholds`);
    return await res.json();
}
async function updateThresholds(feedback) {

    const ref = firebase.firestore()
        .collection("systemConfig")
        .doc("thresholds");

    const doc = await ref.get();

    let t = doc.exists
        ? doc.data()
        : { low: 7, moderate: 12, high: 15 };

    console.log("Before Update:", t);

   if (feedback === "false_alarm") {

    // Reduce unnecessary alerts slowly
    t.low += 0.5;
    t.moderate += 0.5;

}

if (feedback === "real_fire") {

    // Increase sensitivity slowly
    t.low = Math.max(1, t.low - 0.5);
    t.moderate = Math.max(5, t.moderate - 0.5);

}

    await ref.set(t);

    console.log("After Update:", t);
}

        console.log(getDynamicThresholds());
        async function updateCombinedResult() {
            if (locationData && imageData) {
                const combinedScore =
    (locationData.riskScore * 0.5) +
    (imageData.imageRiskScore * 2);
                const finalRiskEl = document.getElementById('finalRisk');
                
                let riskText = '';
                let finalRiskLevel = '';
                const t = await getDynamicThresholds();
            

if (combinedScore <= t.low) {
    riskText = 'Overall Risk: LOW - Safe conditions detected';
    finalRiskLevel = 'LOW';
} else if (combinedScore <= t.moderate) {
    riskText = 'Overall Risk: MODERATE - Exercise caution';
    finalRiskLevel = 'MODERATE';
} else if (combinedScore <= t.high) {
    riskText = 'Overall Risk: HIGH - Danger present, take precautions';
    finalRiskLevel = 'HIGH';
} else {
    riskText = 'Overall Risk: EXTREME - Immediate evacuation recommended';
    finalRiskLevel = 'EXTREME';
}
                
                finalRiskEl.textContent = riskText;
                document.getElementById('combinedResult').style.display = 'block';
                document.getElementById('confirmationSection').style.display = 'block';

                // Save prediction
                if (!currentPredictionId) {
    await savePrediction(combinedScore, finalRiskLevel);
}
            }
        }
async function savePrediction(combinedScore, finalRiskLevel) {
    console.log("Sending prediction to backend...");

    // Only store primitives, no image
    const prediction = {
        username: localStorage.getItem("currentUser"),
        timestamp: new Date(),
        location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            temp: locationData.temp,
            humidity: locationData.humidity,
            windSpeed: locationData.windSpeed,
            vegetation: locationData.vegetation,
            riskScore: locationData.riskScore,
            riskLevel: locationData.riskLevel
        },
        combinedRiskScore: combinedScore,
        finalRiskLevel: finalRiskLevel,
        userConfirmation: 'pending'
    };

    try {
        const response = await fetch(`${BASE_URL}/savePrediction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prediction)
        });

        console.log("Response received");

        const result = await response.json();
        console.log("Backend returned:", result);

        if (result.success) {
            currentPredictionId = result.id;
            console.log("Prediction saved with ID:", result.id);
        } else {
            console.error("Failed to save prediction to backend.");
        }
    } catch (error) {
        console.error("Error sending prediction:", error);
    }
}
async function confirmPrediction(confirmation) {

    if (!currentPredictionId) {
        alert("Please generate a prediction first.");
        return;
    }

    const response = await fetch(`${BASE_URL}/confirmPrediction`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: currentPredictionId,
            confirmation: confirmation
        })
    });

    const result = await response.json();

    if (result.success) {
        // 🔄 Refresh metrics and history automatically
       await updateThresholds(confirmation);
        await loadHistory();
        await loadMetrics();

        // Show success message instead of alert
        const successMsg = document.getElementById('successMessage');
        successMsg.classList.add('active');
        setTimeout(() => successMsg.classList.remove('active'), 3000);
    } else {
        alert("Error confirming prediction.");
    }
}
        function calculateMetrics() {
            const confirmedPredictions = predictions.filter(p => p.userConfirmation !== 'pending');
            
            let totalPredictions = confirmedPredictions.length;
            let truePositives = 0;
            let falsePositives = 0;
            let trueNegatives = 0;
            let falseNegatives = 0;
            
            confirmedPredictions.forEach(pred => {
                const systemPredictedFire = pred.combinedRiskScore > 8;
                
                if (systemPredictedFire && pred.userConfirmation === 'real_fire') {
                    truePositives++;
                } else if (systemPredictedFire && pred.userConfirmation === 'false_alarm') {
                    falsePositives++;
                } else if (!systemPredictedFire && pred.userConfirmation === 'no_fire') {
                    trueNegatives++;
                } else if (!systemPredictedFire && pred.userConfirmation === 'real_fire') {
                    falseNegatives++;
                }
            });
            
            const FIR = (falsePositives + trueNegatives) > 0 
                ? (falsePositives / (falsePositives + trueNegatives)) * 100 
                : 0;
            
            const FRR = (truePositives + falseNegatives) > 0 
                ? (falseNegatives / (truePositives + falseNegatives)) * 100 
                : 0;
            
            const accuracy = totalPredictions > 0 
                ? ((truePositives + trueNegatives) / totalPredictions) * 100 
                : 0;
            
            return {
                totalPredictions,
                confirmedRealFires: truePositives,
                falseAlarms: falsePositives,
                missedDetections: falseNegatives,
                FIR: parseFloat(FIR.toFixed(2)),
                FRR: parseFloat(FRR.toFixed(2)),
                accuracy: parseFloat(accuracy.toFixed(2))
            };
        }
async function loadMetrics() {
    // Fetch all predictions from backend
    const user = localStorage.getItem("currentUser");

if (!user) {
    console.error("No user found in localStorage");
    return;
}

const response = await fetch(`${BASE_URL}/history/${user}`);
const result = await response.json();

const data = Array.isArray(result) ? result : [];
    predictions = data; // Update local array with server data

    const confirmedPredictions = predictions.filter(p => p.userConfirmation !== 'pending');

    let totalPredictions = confirmedPredictions.length;
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    confirmedPredictions.forEach(pred => {
        const systemPredictedFire = pred.combinedRiskScore > 8;

        if (systemPredictedFire && pred.userConfirmation === 'real_fire') {
            truePositives++;
        } else if (systemPredictedFire && pred.userConfirmation === 'false_alarm') {
            falsePositives++;
        } else if (!systemPredictedFire && pred.userConfirmation === 'no_fire') {
            trueNegatives++;
        } else if (!systemPredictedFire && pred.userConfirmation === 'real_fire') {
            falseNegatives++;
        }
    });

    const FIR = (falsePositives + trueNegatives) > 0
        ? (falsePositives / (falsePositives + trueNegatives)) * 100
        : 0;

    const FRR = (truePositives + falseNegatives) > 0
        ? (falseNegatives / (truePositives + falseNegatives)) * 100
        : 0;

    const accuracy = totalPredictions > 0
        ? ((truePositives + trueNegatives) / totalPredictions) * 100
        : 0;

    document.getElementById('totalPredictions').textContent = totalPredictions;
    document.getElementById('confirmedFires').textContent = truePositives;
    document.getElementById('falseAlarms').textContent = falsePositives;
    document.getElementById('missedDetections').textContent = falseNegatives;
    document.getElementById('firRate').textContent = FIR.toFixed(2) + '%';
    document.getElementById('frrRate').textContent = FRR.toFixed(2) + '%';
    document.getElementById('accuracy').textContent = accuracy.toFixed(2) + '%';
}
// 👇 ADD THIS HERE (top-level, not inside any function)
function formatDate(timestamp) {
    try {
        if (typeof timestamp === "string") {
            const d = new Date(timestamp);
            if (!isNaN(d)) return d.toLocaleString();
        }

        if (timestamp && timestamp._seconds) {
            const d = new Date(timestamp._seconds * 1000);
            if (!isNaN(d)) return d.toLocaleString();
        }

        if (timestamp instanceof Date) {
            return timestamp.toLocaleString();
        }

        return "Invalid Date";
    } catch (e) {
        return "Invalid Date";
    }
}

async function loadHistory() {

    const user = localStorage.getItem("currentUser");

    if (!user) {
        console.error("No user found in localStorage");
        return;
    }

    const response = await fetch(`${BASE_URL}/history/${user}`);
    const result = await response.json();

    const data = Array.isArray(result) ? result : [];

    predictions = data;

    const historyList = document.getElementById("historyList");

    historyList.innerHTML = data.map(pred => `
        <div class="history-item">
            <h4>${pred.finalRiskLevel} Risk</h4>
            <p><strong>Date:</strong> ${formatDate(pred.timestamp)}</p>
            <p><strong>Status:</strong> ${pred.userConfirmation}</p>
        </div>
    `).join("");
}
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}
        // Load predictions from localStorage on page load
        window.addEventListener('load', function() {
            const saved = localStorage.getItem('firePredictions');
            if (saved) {
                predictions = JSON.parse(saved);
                loadMetrics();
            }
        });