let allRestaurants = [];
let filteredRestaurants = [];
let currentSort = { column: "name", direction: "asc" };
let searchDebounceTimer = null;

function getCostDisplay(cost) {
  const costNum = parseInt(cost);
  if (costNum === 0) return "--";
  return "$".repeat(Math.max(1, costNum));
}

function getRatingDisplay(rating) {
  const ratingNum = parseInt(rating);
  if (ratingNum === 0) return "—";
  return "⭐".repeat(ratingNum);
}

function getCuisineClass(cuisine) {
  return "cuisine-" + cuisine.toLowerCase().replace(/\s+/g, "-");
}

function parseRestaurantData(data) {
  const lines = data.trim().split("\n");
  const restaurants = [];

  // Skip the first line (header) and pre-compile regex
  const nameRegex = /^\d+\.\s*(.+?)\s*#/;
  const numberRegex = /^(\d+)\./;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(" # ");

    if (parts.length >= 5) {
      const nameMatch = nameRegex.exec(line);
      const numberMatch = numberRegex.exec(line);
      const name = nameMatch
        ? nameMatch[1].trim()
        : parts[0].replace(/^\d+\.\s*/, "");
      const number = numberMatch ? parseInt(numberMatch[1], 10) : 0;

      restaurants.push({
        number: number,
        name: name,
        website: parts[1].trim(),
        cuisine: parts[2].trim(),
        rating: parts[3].trim(),
        cost: parts[4].trim(),
      });
    }
  }

  return restaurants;
}

function populateCuisineFilter() {
  const cuisines = [...new Set(allRestaurants.map((r) => r.cuisine))].sort();
  const filter = document.getElementById("cuisineFilter");

  cuisines.forEach((cuisine) => {
    const option = document.createElement("option");
    option.value = cuisine;
    option.textContent = cuisine;
    filter.appendChild(option);
  });
}

function updateStats() {
  const total = allRestaurants.length;
  const filtered = filteredRestaurants.length;
  const cuisines = new Set(filteredRestaurants.map((r) => r.cuisine)).size;

  document.getElementById("stats").innerHTML =
    `Showing ${filtered} of ${total} restaurants • ${cuisines} cuisines`;
}

function renderTable() {
    const tbody = document.getElementById("tableBody");

    if (filteredRestaurants.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="4" class="error">No restaurants found matching your criteria</td></tr>';
        updateStats();
        return;
    }

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  filteredRestaurants.forEach((restaurant) => {
    const tr = document.createElement("tr");

    // Name cell
    const nameCell = document.createElement("td");
    nameCell.className = "restaurant-name";

    if (
      restaurant.website === "No Web" ||
      restaurant.website === "No oficial"
    ) {
      const span = document.createElement("span");
      span.className = "no-website";
      span.innerHTML = `<span class="restaurant-number">${restaurant.number}.</span> ${restaurant.name} (no website)`;
      nameCell.appendChild(span);
    } else {
      const link = document.createElement("a");
      link.href = restaurant.website;
      link.target = "_blank";
      link.className = "restaurant-link";
      link.innerHTML = `<span class="restaurant-number">${restaurant.number}.</span> ${restaurant.name}`;
      nameCell.appendChild(link);
    }

    // Cuisine cell
    const cuisineCell = document.createElement("td");
    const cuisineSpan = document.createElement("span");
    cuisineSpan.className = `cuisine-tag ${getCuisineClass(restaurant.cuisine)}`;
    cuisineSpan.textContent = restaurant.cuisine;
    cuisineCell.appendChild(cuisineSpan);

    // Cost cell
    const costCell = document.createElement("td");
    costCell.className = "cost";
    costCell.innerHTML = getCostDisplay(restaurant.cost);

    // Rating cell
    const ratingCell = document.createElement("td");
    ratingCell.className = "rating";
    ratingCell.innerHTML = getRatingDisplay(restaurant.rating);

    tr.appendChild(nameCell);
    tr.appendChild(cuisineCell);
    tr.appendChild(costCell);
    tr.appendChild(ratingCell);

    fragment.appendChild(tr);
  });

  // Clear and append in one operation
  tbody.innerHTML = "";
  tbody.appendChild(fragment);

  updateStats();
}

function removeDiacritics(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sortRestaurants(restaurants, column, direction) {
  // Pre-compute sorting values to avoid repeated calculations
  const restaurantsWithSortKeys = restaurants.map((restaurant) => {
    let sortKey;
    switch (column) {
      case "name":
        sortKey = restaurant.number;
        break;
      case "cuisine":
        sortKey = restaurant.cuisine.toLowerCase();
        break;
      case "cost":
        sortKey = parseInt(restaurant.cost, 10) || 0;
        break;
      case "rating":
        sortKey = parseInt(restaurant.rating, 10) || 0;
        break;
      default:
        sortKey = 0;
    }
    return { ...restaurant, sortKey };
  });

  return restaurantsWithSortKeys
    .sort((a, b) => {
      const valueA = a.sortKey;
      const valueB = b.sortKey;

      if (valueA < valueB) return direction === "asc" ? -1 : 1;
      if (valueA > valueB) return direction === "asc" ? 1 : -1;

      // Secondary sort by original number for ties
      if (column !== "name") {
        return a.number - b.number;
      }

      return 0;
    })
    .map(({ sortKey, ...restaurant }) => restaurant);
}

function updateSortIndicators() {
  document.querySelectorAll("th").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
  });

  const currentHeader = document.querySelector(
    `th[data-column="${currentSort.column}"]`,
  );
  if (currentHeader) {
    currentHeader.classList.add(`sort-${currentSort.direction}`);
  }
}

function filterRestaurants() {
  const searchTerm = removeDiacritics(
    document.getElementById("searchInput").value.toLowerCase(),
  );
  const selectedCuisine = document.getElementById("cuisineFilter").value;

  // Early return if no search term and no cuisine filter
  if (!searchTerm && !selectedCuisine) {
    filteredRestaurants = [...allRestaurants];
  } else {
    filteredRestaurants = allRestaurants.filter((restaurant) => {
      // Skip expensive operations if possible
      if (selectedCuisine && restaurant.cuisine !== selectedCuisine) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const nameMatch = removeDiacritics(
        restaurant.name.toLowerCase(),
      ).includes(searchTerm);

      if (nameMatch) return true;

      const cuisineMatch = removeDiacritics(
        restaurant.cuisine.toLowerCase(),
      ).includes(searchTerm);

      return cuisineMatch;
    });
  }

  // Apply current sort to filtered results
  filteredRestaurants = sortRestaurants(
    filteredRestaurants,
    currentSort.column,
    currentSort.direction,
  );

  renderTable();
}

function debouncedFilterRestaurants() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(filterRestaurants, 150);
}

async function loadRestaurants() {
  try {
    console.log("Starting to load restaurants.gz...");
    const response = await fetch("restaurants.gz");
    if (!response.ok) {
      throw new Error(
        `Failed to load restaurant data: ${response.status} ${response.statusText}`,
      );
    }

    console.log("Compressed file fetched successfully, processing...");
    const compressedData = await response.arrayBuffer();
    console.log("Compressed data size:", compressedData.byteLength);

    // Use pako to inflate the compressed data
    const inflatedData = pako.inflate(new Uint8Array(compressedData));

    // Convert the inflated bytes to text
    const data = new TextDecoder("utf-8").decode(inflatedData);
    console.log("Data extracted, length:", data.length);
    allRestaurants = parseRestaurantData(data);

    // Apply initial sort
    allRestaurants = sortRestaurants(
      allRestaurants,
      currentSort.column,
      currentSort.direction,
    );
    filteredRestaurants = [...allRestaurants];

    populateCuisineFilter();
    updateSortIndicators();
    renderTable();

    // Add event listeners
    document
      .getElementById("searchInput")
      .addEventListener("input", debouncedFilterRestaurants);
    document
      .getElementById("cuisineFilter")
      .addEventListener("change", filterRestaurants);

    // Add sort event listeners
    document.querySelectorAll("th[data-column]").forEach((th) => {
      th.addEventListener("click", () => {
        const column = th.dataset.column;

        if (currentSort.column === column) {
          // Toggle direction if same column
          currentSort.direction =
            currentSort.direction === "asc" ? "desc" : "asc";
        } else {
          // New column, start with ascending except for rating which starts descending
          currentSort.column = column;
          currentSort.direction = column === "rating" ? "desc" : "asc";
        }

        updateSortIndicators();
        filterRestaurants();
      });
    });
  } catch (error) {
    document.getElementById("tableBody").innerHTML =
      `<tr><td colspan="4" class="error">Error loading restaurant data: ${error.message}</td></tr>`;
    console.error("Error loading restaurants:", error);
  }
}

// Load restaurants when page loads
document.addEventListener("DOMContentLoaded", loadRestaurants);
