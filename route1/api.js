const whereismybus = "whereismybus@22/server/api/@9753186420";


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
                    // polyline.setStyle({ weight: 0 });
                    // document.querySelector(
                    //     ".follow-marker-button"
                    // ).style.backgroundColor = "white";
                    map.flyTo(presentBusLocation, 19, {
                        animate: true,
                    });
                    // map.once("zoomend", function () {
                    //     polyline.setStyle({ weight: 3 });
                    //     shouldFollowMarker = true;
                    //     document.querySelector(
                    //         ".follow-marker-button"
                    //     ).style.backgroundColor = "white";
                    // });
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
        } 
        // else {
        //     if (shouldCalculateRoute === true) {
        //         const speedd = Math.round(filteredData.speed);
        //         const result = await calculateDistanceTimeSpeed(
        //             presentBusLocation,
        //             toLocation,
        //             filteredData.speed
        //         );
        //         document.getElementById("distance").textContent = result.distance;
        //         document.getElementById("time").textContent = result.time;
        //         document.getElementById("speed").textContent = `${speedd}kmph`;
        //         shouldCalculateRoute = false;
        //     }
        // }
    } catch (error) {
        console.error("Error fetching bus location:", error);
    }
}

function filterData(data) {
    const mlrInstitute = data.find((entry) => entry.id === 22);
    if (!mlrInstitute) return null;

    const item = mlrInstitute.items.find((item) => item.id === 444);
    if (!item) return null;

    const { lat, lng, speed } = item;
    return { lat, lng, speed };
}
