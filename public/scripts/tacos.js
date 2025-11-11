// ====================
// FIREBASE CONFIGURATION
// ====================
// TODO: Replace this with your actual Firebase configuration
// You can find this in your Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: "AIzaSyCeT5eglBU9dkOU6P9aacD7TsOi8qOzuXw",
  authDomain: "personalwebsite-joseph.firebaseapp.com",
  projectId: "personalwebsite-joseph",
  storageBucket: "personalwebsite-joseph.firebasestorage.app",
  messagingSenderId: "84929715169",
  appId: "1:84929715169:web:9abfaab3f7856bfebb90a0",
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  showError("Failed to initialize Firebase. Please check your configuration.");
}

// Get Firestore instance
const db = firebase.firestore();

// ====================
// DOM ELEMENTS
// ====================
const loadingElement = document.getElementById("loading");
const errorElement = document.getElementById("error");
const emptyStateElement = document.getElementById("empty-state");
const tacosGridElement = document.getElementById("tacos-grid");

// ====================
// FETCH TACOS FROM FIRESTORE
// ====================
async function fetchTacos() {
  try {
    console.log("Fetching tacos from Firestore...");

    // Get the 'tacos' collection
    const tacosSnapshot = await db.collection("tacos").get();

    // Hide loading
    loadingElement.style.display = "none";

    // Check if collection is empty
    if (tacosSnapshot.empty) {
      console.log("No tacos found in collection");
      emptyStateElement.style.display = "block";
      return;
    }

    console.log(`Found ${tacosSnapshot.size} tacos`);

    // Display each taco
    tacosSnapshot.forEach((doc, index) => {
      const tacoData = doc.data();
      const tacoCard = createTacoCard(doc.id, tacoData, index);
      tacosGridElement.appendChild(tacoCard);
    });
  } catch (error) {
    console.error("Error fetching tacos:", error);
    loadingElement.style.display = "none";
    showError(`Error loading tacos: ${error.message}`);
  }
}

// ====================
// CREATE TACO CARD ELEMENT
// ====================
function createTacoCard(docId, data, index) {
  const card = document.createElement("div");
  card.className = "taco-card";
  card.style.animationDelay = `${index * 0.1}s`;

  // Create card content
  let cardHTML = `<h3>🌮 ${data.name || docId}</h3>`;

  // Display all fields from the document
  const excludeFields = ["name"]; // Don't show name twice

  Object.keys(data).forEach((key) => {
    if (!excludeFields.includes(key)) {
      const value = formatFieldValue(data[key]);
      cardHTML += `
        <div class="taco-field">
          <strong>${formatFieldName(key)}:</strong>
          <span>${value}</span>
        </div>
      `;
    }
  });

  // Add document ID
  cardHTML += `
    <div class="taco-field" style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #f0f0f0;">
      <strong>Document ID:</strong>
      <span style="font-family: monospace; font-size: 0.85rem;">${docId}</span>
    </div>
  `;

  card.innerHTML = cardHTML;
  return card;
}

// ====================
// HELPER FUNCTIONS
// ====================
function formatFieldName(fieldName) {
  // Convert camelCase or snake_case to Title Case
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatFieldValue(value) {
  // Handle different data types
  if (value === null || value === undefined) {
    return "<em>null</em>";
  }

  if (typeof value === "object") {
    if (value.toDate && typeof value.toDate === "function") {
      // Firestore Timestamp
      return value.toDate().toLocaleString();
    }
    // Other objects - stringify
    return JSON.stringify(value, null, 2);
  }

  if (typeof value === "boolean") {
    return value ? "✓ Yes" : "✗ No";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

function showError(message) {
  errorElement.style.display = "block";
  errorElement.innerHTML = `
    <h2>⚠️ Error</h2>
    <p>${message}</p>
    <p style="margin-top: 20px; font-size: 0.95rem;">
      Make sure you have:
      <br>1. Updated the Firebase configuration in tacos.js
      <br>2. Created a "tacos" collection in your Firestore database
      <br>3. Configured your Firestore security rules
    </p>
    <a href="index.html" class="back-button">← Back to Home</a>
  `;
}

// ====================
// MODAL FUNCTIONALITY
// ====================
let modal, addTacoBtn, closeModalBtn, cancelBtn, addTacoForm;

// Arrays to store tags
let fillings = [];
let garnishes = [];

function initializeModal() {
  modal = document.getElementById("addTacoModal");
  addTacoBtn = document.getElementById("addTacoBtn");
  closeModalBtn = document.getElementById("closeModal");
  cancelBtn = document.getElementById("cancelBtn");
  addTacoForm = document.getElementById("addTacoForm");

  // Open modal
  if (addTacoBtn) {
    addTacoBtn.addEventListener("click", () => {
      modal.classList.add("active");
      // Reset arrays when opening
      fillings = [];
      garnishes = [];
      renderTags("fillingsContainer", "fillingsInput", fillings);
      renderTags("garnishesContainer", "garnishesInput", garnishes);
    });
  }

  // Close modal
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeModal);
  }

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
}

// Close modal
function closeModal() {
  if (modal) {
    modal.classList.remove("active");
  }
  if (addTacoForm) {
    addTacoForm.reset();
  }
  fillings = [];
  garnishes = [];
  renderTags("fillingsContainer", "fillingsInput", fillings);
  renderTags("garnishesContainer", "garnishesInput", garnishes);
}

// ====================
// TAG INPUT FUNCTIONALITY
// ====================
function setupTagInput(inputId, containerId, getTagsArray) {
  const input = document.getElementById(inputId);

  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = input.value.trim();
      
      const tagsArray = getTagsArray();

      if (value && !tagsArray.includes(value)) {
        tagsArray.push(value);
        input.value = "";
        renderTags(containerId, inputId, tagsArray);
      }
    }
  });
}

function renderTags(containerId, inputId, tagsArray) {
  const container = document.getElementById(containerId);
  const input = document.getElementById(inputId);

  if (!container || !input) return;

  // Clear container except input
  container.innerHTML = "";

  // Add tags
  tagsArray.forEach((tag, index) => {
    const tagElement = document.createElement("div");
    tagElement.className = "tag";
    tagElement.innerHTML = `
      ${tag}
      <button type="button" class="tag-remove" data-index="${index}">×</button>
    `;

    tagElement.querySelector(".tag-remove").addEventListener("click", () => {
      tagsArray.splice(index, 1);
      renderTags(containerId, inputId, tagsArray);
    });

    container.appendChild(tagElement);
  });

  // Re-add input
  container.appendChild(input);
}

function initializeTagInputs() {
  // Setup tag inputs with closures to get current array values
  setupTagInput("fillingsInput", "fillingsContainer", () => fillings);
  setupTagInput("garnishesInput", "garnishesContainer", () => garnishes);
}

// ====================
// FORM SUBMISSION
// ====================
function initializeFormSubmission() {
  const form = document.getElementById("addTacoForm");
  
  if (!form) return;
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("submitBtn");
    const originalText = submitBtn.textContent;

    // Validate fillings
    console.log("Current fillings:", fillings); // Debug log
    if (fillings.length === 0) {
      alert("Please add at least one filling");
      return;
    }

    // Get form data
    const tacoData = {
      name: document.getElementById("tacoName").value.trim(),
      description: document.getElementById("tacoDescription").value.trim(),
      fillings: [...fillings], // Create a copy of the array
      garnishes: [...garnishes], // Create a copy of the array
      tortilla: document.getElementById("tacoTortilla").value,
      cuisine: document.getElementById("tacoCuisine").value.trim(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      // Disable submit button
      submitBtn.disabled = true;
      submitBtn.textContent = "Adding...";

      // Add to Firestore
      await db.collection("tacos").add(tacoData);

      // Success feedback
      submitBtn.textContent = "Added! ✓";
      submitBtn.style.background = "linear-gradient(135deg, #10b981, #059669)";

      // Close modal and refresh after delay
      setTimeout(() => {
        closeModal();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.style.background = "";

        // Refresh the tacos display
        tacosGridElement.innerHTML = "";
        fetchTacos();
      }, 1000);
    } catch (error) {
      console.error("Error adding taco:", error);
      alert(`Error adding taco: ${error.message}`);
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// ====================
// INITIALIZE ON PAGE LOAD
// ====================
document.addEventListener("DOMContentLoaded", () => {
  // Add fade-in animation to body
  document.body.style.opacity = "0";
  setTimeout(() => {
    document.body.style.transition = "opacity 0.5s ease";
    document.body.style.opacity = "1";
  }, 100);

  // Initialize modal and form functionality
  initializeModal();
  initializeTagInputs();
  initializeFormSubmission();

  // Fetch tacos
  fetchTacos();
});

// ====================
// REAL-TIME UPDATES (Optional)
// ====================
// Uncomment this if you want real-time updates when data changes
/*
db.collection('tacos').onSnapshot((snapshot) => {
  console.log("Real-time update detected");
  tacosGridElement.innerHTML = '';
  
  if (snapshot.empty) {
    emptyStateElement.style.display = 'block';
    return;
  }
  
  emptyStateElement.style.display = 'none';
  snapshot.forEach((doc, index) => {
    const tacoData = doc.data();
    const tacoCard = createTacoCard(doc.id, tacoData, index);
    tacosGridElement.appendChild(tacoCard);
  });
}, (error) => {
  console.error("Error in real-time listener:", error);
});
*/
