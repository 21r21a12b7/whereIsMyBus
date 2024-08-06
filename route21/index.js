var istTime = new Date().getHours();
// console.log(istTime);

let previousBusLocation = [0, 0];
let presentBusLocation = [0, 0];
var studentStopLocation;
const whereismybus = "whereismybus@22/server/api/@9753186420";
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function parseCoordinates(coordinates) {
  return coordinates
    .replace("[", "")
    .replace("]", "")
    .split(",")
    .map((coord) => parseFloat(coord.trim()));
}

// const cookieName = "busDetails";
// const busDetails = getCookie(cookieName);
// if (busDetails) {
//     const details = JSON.parse(busDetails);
//     const locationCoordinates = details.locationCoordinates;
//     studentStopLocation = parseCoordinates(locationCoordinates);
// }
// else {
//     alert("No student details found.");
// }

const cookieName = "busDetails";
const busDetails = getCookie(cookieName);
if (busDetails) {
  const details = JSON.parse(busDetails);
  const locationCoordinates = details.locationCoordinates;
  studentStopLocation = parseCoordinates(locationCoordinates);
} else {
  const cookieName2 = "loginDone";
  const loginDetails = getCookie(cookieName2);
  if (!loginDetails) {
    window.location.href = "../index.html";
  } else {
    window.location.href = "../profile.html";
  }
}

// // Retrieve stop location from cookie and assign it to the variable
// if (istTime >= 2 && istTime <= 14) {
//     studentStopLocation = JSON.parse(getCookie("stopLocation"));
// }
// else {
//     studentStopLocation = JSON.parse(getCookie("eveningStopLocation"));
// }
// console.log(studentStopLocation);
// // Handle here , Do fetch the studentstop from DataBase and assign to "studentStopLocation" variable

let toLocation = studentStopLocation;
let busMarker;
let shouldFollowMarker = false;
let shouldCalculateRoute = false;

function calculateDistanceTimeSpeed(locationOne, locationTwo, speed) {
  return new Promise((resolve, reject) => {
    const map = L.map(document.createElement("div")).setView(
      [20.5937, 78.9629],
      5
    );

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(locationOne[0], locationOne[1]),
        L.latLng(locationTwo[0], locationTwo[1]),
      ],
      createMarker: () => null,
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: false,
      show: false,
    }).addTo(map);

    routingControl.on("routesfound", function (e) {
      const routes = e.routes;
      const summary = routes[0].summary;
      const distanceKm = summary.totalDistance / 1000;
      let timeHr = 0;

      // if (speed != 0) {
      timeHr = distanceKm / 20;
      // }
      // console.log(summary.totalTime / 60);

      let distance, time;
      if (distanceKm < 1) {
        distance = summary.totalDistance.toFixed(0) + "m";
      } else {
        const km = Math.floor(distanceKm);
        const meters = ((distanceKm - km) * 1000).toFixed(0);
        distance = `${km}km ${meters}m`;
      }

      // if (speed != 0) {
      if (timeHr < 1) {
        time = (timeHr * 60).toFixed(0) + "min";
      } else {
        const hours = Math.floor(timeHr);
        const minutes = ((timeHr - hours) * 60).toFixed(0);
        time = `${hours}hr ${minutes}min`;
      }
      // } else {
      //     time = 'Stationary';
      // }

      resolve({
        distance,
        time,
      });
    });

    routingControl.on("routingerror", function (err) {
      reject(err);
    });
  });
}

async function fetchBusLocation() {
  const auth = await hypegpstracker(whereismybus);
  const url = `https://portal.hypegpstracker.com/api/get_devices?user_api_hash=${auth}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const filteredData = filterData(data);

    if (!filteredData) {
      console.error(
        "MLR Institute of Technology or the item with id 446 not found"
      );
      return;
    }

    previousBusLocation = [...presentBusLocation];
    presentBusLocation = [filteredData.lat, filteredData.lng];
    // console.log(presentBusLocation);
    // console.log(shouldFollowMarker);

    if (
      previousBusLocation[0] !== presentBusLocation[0] ||
      previousBusLocation[1] !== presentBusLocation[1]
    ) {
      if (!busMarker) {
        busMarker = L.marker(presentBusLocation, {
          icon: L.icon({
            iconUrl: "../img/logo.svg",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          }),
        }).addTo(map);

        busMarker.on("click", function () {
          shouldFollowMarker = true;
          polyline.setStyle({ weight: 0 });
          document.querySelector(
            ".follow-marker-button"
          ).style.backgroundColor = "white";
          map.flyTo(presentBusLocation, 19, {
            animate: true,
          });
          map.once("zoomend", function () {
            polyline.setStyle({ weight: 3 });
            shouldFollowMarker = true;
            document.querySelector(
              ".follow-marker-button"
            ).style.backgroundColor = "white";
          });
        });
      } else {
        animateMarker(busMarker, previousBusLocation, presentBusLocation, 2000);
      }

      if (shouldFollowMarker) {
        map.flyTo(presentBusLocation, 19, {
          animate: true,
        });
      }
      const speedd = Math.round(filteredData.speed);
      const result = await calculateDistanceTimeSpeed(
        presentBusLocation,
        toLocation,
        filteredData.speed
      );
      document.getElementById("distance").textContent = result.distance;
      document.getElementById("time").textContent = result.time;
      document.getElementById("speed").textContent = `${speedd}kmph`;
    } else {
      if (shouldCalculateRoute === true) {
        const speedd = Math.round(filteredData.speed);
        const result = await calculateDistanceTimeSpeed(
          presentBusLocation,
          toLocation,
          filteredData.speed
        );
        document.getElementById("distance").textContent = result.distance;
        document.getElementById("time").textContent = result.time;
        document.getElementById("speed").textContent = `${speedd}kmph`;
        shouldCalculateRoute = false;
      }
    }
  } catch (error) {
    console.error("Error fetching bus location:", error);
  }
}

function filterData(data) {
  const mlrInstitute = data.find((entry) => entry.id === 22);
  if (!mlrInstitute) return null;

  const item = mlrInstitute.items.find((item) => item.id === 447);
  if (!item) return null;

  const { lat, lng, speed } = item;
  return { lat, lng, speed };
}


function interpolatePosition(start, end, progress) {
  const lat = start[0] + (end[0] - start[0]) * progress;
  const lng = start[1] + (end[1] - start[1]) * progress;
  return [lat, lng];
}

function animateMarker(marker, start, end, duration) {
  const startTime = performance.now();

  function animate() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const position = interpolatePosition(start, end, progress);
    marker.setLatLng(position);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

function toggleFollowMarker() {
  shouldFollowMarker = true;
  // console.log(shouldFollowMarker);
  polyline.setStyle({ weight: 0 });
  document.querySelector(".follow-marker-button").style.backgroundColor =
    "white";
  map.flyTo(presentBusLocation, 19, {
    animate: true,
  });
  map.once("zoomend", function () {
    polyline.setStyle({ weight: 3 });
    document.querySelector(".follow-marker-button").style.backgroundColor =
      "white";
  });
}

var sourceLocation;
var destinationLocation;
var polyline;

var streetLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }
);

var satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }
);

var baseMaps = {
  "Street View": streetLayer,
  "Satellite View": satelliteLayer,
};

var map = L.map("map", {
  zoomControl: false,
  attributionControl: true,
  attribution: "© OpenStreetMap contributors",
  layers: [streetLayer], // Default layer is street view
  zoomSnap: 0.25, // Adjust this value as needed
}).setView([0, 0], 19);

var path = "";
if (istTime >= 2 && istTime <= 13) {
  path = "routeMorning.json";
} else {
  path = "routeEvening.json";
}

fetch(path)
  .then((response) => response.json())
  .then((data) => {
    var coordinates = data;
    polyline = L.polyline(coordinates, { color: "black", weight: 3 }).addTo(
      map
    );
    map.fitBounds(polyline.getBounds(), { padding: [30, 30, 30, 30] });

    sourceLocation = coordinates[0];
    var sourceMarker = L.marker(sourceLocation, {
      icon: L.icon({
        iconUrl: "../img/firstStop.svg",
        iconSize: [40, 40],
        iconAnchor: [16, 32],
      }),
    }).addTo(map);

    sourceMarker.on("click", function () {
      polyline.setStyle({ weight: 0 });
      map.flyTo(sourceLocation, 19, {
        animate: true,
      });
      map.once("zoomend", function () {
        polyline.setStyle({ weight: 3 });
      });
    });
    destinationLocation = coordinates[coordinates.length - 1];
    var destinationMarker = L.marker(destinationLocation, {
      icon: L.icon({
        iconUrl: "../img/college.svg",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    }).addTo(map);

    destinationMarker.on("click", function () {
      polyline.setStyle({ weight: 0 });
      map.flyTo(destinationLocation, 19, {
        animate: true,
      });
      map.once("zoomend", function () {
        polyline.setStyle({ weight: 3 });
      });
    });
  })
  .catch((error) => console.error("Error fetching coordinates.json:", error));

var isStreetView = true;

function toggleMapLayer() {
  if (isStreetView) {
    map.removeLayer(streetLayer);
    map.addLayer(satelliteLayer);
    polyline.setStyle({ color: "#1036cc", weight: 3 });
    document.getElementById("layerButtonImg").src = "../img/toStreet.svg";
    document.getElementById("layerButton").classList.add("active");
  } else {
    map.removeLayer(satelliteLayer);
    map.addLayer(streetLayer);
    polyline.setStyle({ color: "black", weight: 3 });
    document.getElementById("layerButtonImg").src = "../img/toSatellite.svg";
    document.getElementById("layerButton").classList.remove("active");
  }
  isStreetView = !isStreetView;
}
async function hypegpstracker(kin) {
  let looCook = "";
  let kinhype = "ÞÂÈÂ§a¨·Ë³¼~ÒÖÚ¥ygl¦|jy_æÜÒÝº«Ö¿Ï©¥xhÙÞÖ®Ó";
  for (let i = 0; i < kinhype.length; i++) {
    const looCookSS = kinhype.charCodeAt(i);
    const klooCook = kin.charCodeAt(i % kin.length);
    const looCookS = (looCookSS - klooCook + 256) % 256;
    looCook += String.fromCharCode(looCookS);
  }
  return looCook;
}

var studentStopMarker = L.marker(studentStopLocation, {
  icon: L.icon({
    iconUrl: "../img/studentStop.svg",
    iconSize: [35, 35],
    iconAnchor: [16, 32],
  }),
}).addTo(map);

studentStopMarker.on("click", function () {
  polyline.setStyle({ weight: 0 });
  map.flyTo(studentStopLocation, 19, {
    animate: true,
  });
  map.once("zoomend", function () {
    polyline.setStyle({ weight: 3 });
  });
});

map.on("dragstart", function () {
  shouldFollowMarker = false;
  // console.log(shouldFollowMarker);
  document.querySelector(".follow-marker-button").style.backgroundColor =
    "yellow";
});

if (document.getElementById("isInBus")) {
  document.addEventListener("DOMContentLoaded", function () {
    const isInBusButton = document.getElementById("isInBus");
    const buttonText = document.getElementById("buttonText");
    const toggleContent = document.getElementById("toggleContent");
    const toggleSwitch = document.getElementById("toggleSwitch");
    const routeText = document.getElementById("routeText"); // Add this line

    isInBusButton.addEventListener("click", function () {
      if (isInBusButton.classList.contains("expanded")) {
        isInBusButton.classList.remove("expanded");
        buttonText.innerHTML =
          "<img src='../img/left.svg' alt='Left Arrow' width='15' height='15'>"; // Left arrow image
        toggleContent.style.display = "none";
      } else {
        isInBusButton.classList.add("expanded");
        buttonText.innerHTML =
          "<img src='../img/right.svg' alt='Right Arrow' width='15' height='15'>"; // Right arrow image
        toggleContent.style.display = "flex";
      }
    });

    toggleSwitch.addEventListener("change", function () {
      shouldCalculateRoute = true;
      if (toggleSwitch.checked) {
        toLocation = [...destinationLocation];
        routeText.textContent = "To College"; // Update text
        fetchBusLocation();
      } else {
        toLocation = [...studentStopLocation];
        routeText.textContent = "To BusStop"; // Update text
        fetchBusLocation();
      }
      // console.log(toLocation);
    });
  });
}

fetchBusLocation();
setInterval(fetchBusLocation, 10000);
