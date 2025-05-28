const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// const API_BASE_URL = "https://magic-gentle-plough.glitch.me"; // Replace with your remote db.json API base URL
const API_BASE_URL = "https://crud-restaurant-db.onrender.com"
const API_KEY = "86dg6qwd6g7878g0D68G97y9SF8Y9-sfgy8AD"; // Replace with your API Key

const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers["api-key"];
  if (apiKey === API_KEY) {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Invalid API Key" });
  }
};

const fetchJson = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error("Error connecting to the remote API");
  }
};

// Routes

app.put("/updateRes/:id", apiKeyMiddleware, (req, res) => {
  const restaurantId = req.params.id;
  const updatedData = req.body;

  // Validate token
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, "9huais89hafnuaf89j", (err) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Validate updated data
    if (!updatedData || typeof updatedData !== "object") {
      return res.status(400).json({ message: "Invalid restaurant data" });
    }

    // Update restaurant in external JSON database
    fetch(`${API_BASE_URL}/restaurants/${restaurantId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to update restaurant: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((updatedRestaurant) => {
        res.status(200).json({
          message: "Restaurant updated successfully",
          restaurant: updatedRestaurant,
        });
      })
      .catch((error) => {
        console.error("Error updating restaurant:", error);
        res.status(500).json({ message: "Internal Server Error" });
      });
  });
});

app.post("/signIn", apiKeyMiddleware, async (req, res) => {
  const { username, password } = req.body;

  try {
    const { admin: user } = await fetchJson("/db");
    if (user.username === username && user.password === password) {
      const token = jwt.sign(
        { username: user.username },
        "9huais89hafnuaf89j",
        { expiresIn: "1h" }
      );
      res.status(200).json({ message: "Login successful", token });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/validateToken", apiKeyMiddleware, (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "No token provided" });
  }

  jwt.verify(token, "9huais89hafnuaf89j", (err) => {
    if (err) {
      return res.status(401).json({ valid: false, message: "Invalid token" });
    }
    res.status(200).json({ valid: true, message: "Valid token" });
  });
});

app.get("/restaurants", async (req, res) => {
  try {
    fetch(`${API_BASE_URL}/restaurants`)
      .then((res) => res.json())
      .then((data) => res.status(200).json({ message: "success", data }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/restaurantsPut/:id", async (req, res) => {
  const restaurantId = req.params.id;
  const reviewData = req.body;

  if (!reviewData || typeof reviewData !== "object") {
    return res.status(400).json({ message: "Invalid review data" });
  }

  try {
    const restaurant = await fetchJson(`/restaurants/${restaurantId}`);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    restaurant.reviewsList.push(reviewData);
    restaurant.reviews = restaurant.reviewsList.length;

    await fetch(`${API_BASE_URL}/restaurants/${restaurantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restaurant),
    });

    res.status(200).json({ message: "Review added successfully", restaurant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/deleteRest/:id", apiKeyMiddleware, async (req, res) => {
  const restaurantId = req.params.id;

  try {
    const response = await fetch(
      `${API_BASE_URL}/restaurants/${restaurantId}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      throw new Error("Failed to delete restaurant");
    }
    res.status(200).json({ message: "Restaurant deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/addRest", apiKeyMiddleware, async (req, res) => {
  const newRestaurant = { ...req.body, reviews: 0, id: uuidv4() };

  const requiredFields = [
    "phone",
    "image",
    "restauranttype",
    "businessname",
    "address",
    "slug",
    "email",
    "reviewsList",
  ];

  // Validate required fields except for `parkinglot`
  for (const field of requiredFields) {
    if (!newRestaurant[field]) {
      return res
        .status(400)
        .json({ message: `Missing required field: ${field}` });
    }
  }

  // Check specifically for `parkinglot`
  if (newRestaurant.parkinglot === undefined) {
    return res
      .status(400)
      .json({ message: "Missing required field: parkinglot" });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/restaurants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRestaurant),
    });

    if (!response.ok) {
      throw new Error(`Failed to add restaurant: ${response.statusText}`);
    }

    const data = await response.json();

    res
      .status(201)
      .json({ message: "Restaurant added successfully", restaurant: data });
  } catch (error) {
    console.error("Error adding restaurant:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
