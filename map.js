class map {
    #fileName;
    constructor(fileName) {
        this.#fileName = fileName;
        this.init(this.#fileName);
    }

    init(fileName) {
        fetch(fileName)
            .then(res => res.json())
            .then(data => {
                this.mapHandler("map");
                this.loadMapData(data);
                document.getElementById("query").addEventListener("input", (event) => {
                    const searchValue = event.target.value.toLowerCase();
                    this.searchLocation(searchValue);
                });
            })
            .catch((error) => console.error("Error fetching JSON:", error));
    }

    mapHandler(mapElementId) {
        this.map = L.map(mapElementId).setView([8.359997, 124.868352], 18);
        this.allMarkers = [];

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(this.map);
    }

    loadMapData(data) {
        if (!data || !data.map_polygon_vertices || !data.map_pins) {
            throw new Error("Invalid JSON structure");
        }

        var features = L.featureGroup();

        // Create the map polygon (this is the main polygon)
        const polygon = L.polygon(data.map_polygon_vertices, { color: "blue" })
            .addTo(this.map)
            .bindPopup(data.map_name);

        features.addLayer(polygon);

        data.map_pins.forEach(pin => {
            let markerHandler = new MarkerHandler(pin, this.map);
            this.allMarkers.push(markerHandler);
            features.addLayer(markerHandler.marker);
        });
        this.map.fitBounds(features.getBounds());
    }

    searchLocation(searchValue) {
        this.allMarkers.forEach(markerHandler => {
            const matchesSearch = markerHandler.pin.pin_name.toLowerCase().includes(searchValue.toLowerCase());

            if (matchesSearch) {
                markerHandler.marker.addTo(this.map);
                if (markerHandler.polygon) {
                    markerHandler.polygon.addTo(this.map);  // Show polygon
                }
            } else {
                this.map.removeLayer(markerHandler.marker);
                if (markerHandler.polygon) {
                    this.map.removeLayer(markerHandler.polygon);  // Hide polygon
                }
            }
        });
    }
}

class MarkerHandler {
    constructor(pin, map) {
        this.numPc = 0;
        this.isReserved = false;
        this.isOccupied = false;
        this.pin = pin;
        this.map = map;
    
        // Add marker to the map
        this.marker = L.marker([pin.pin_lat, pin.pin_long])
            .addTo(map)
            .bindPopup(pin.pin_name);
    
        
        if (pin.pin_polygon_vertices && Array.isArray(pin.pin_polygon_vertices)) {
            this.polygon = L.polygon(pin.pin_polygon_vertices, { color: "rgb(153, 255, 146)" })
            .addTo(map)
            .bindPopup(`${pin.pin_name} Area`);
        }
    
        // Add click event for the marker
        this.marker.on("click", () => this.handleClick());
    }
    handleClick() {
        const display = document.getElementById("cardContainer");
        display.innerHTML = ""; // Clears existing content

        const cardContainer = document.createElement("div");
        cardContainer.className = "card";

        const textContent = document.createElement("div");
        textContent.id = "textContent";
        cardContainer.appendChild(textContent);

        const label = document.createElement("h4");
        label.textContent = this.pin.pin_name;
        textContent.appendChild(label);
        
        const info = document.createElement("p");
        info.id = "infoContainer";
        if(this.pin.pin_num_pc == 0){
            info.innerHTML = `Number of available PCs: none <br> Number of usable printers: ${this.pin.pin_num_printers}`;
            textContent.appendChild(info);
        }else if(this.isOccupied == true){
            info.innerHTML = `Number of available PCs: Occupied <br> Number of usable printers: ${this.pin.pin_num_printers}`;
            textContent.appendChild(info);
        }else{
            info.innerHTML = `Number of available PCs: ${this.numPc}/${this.pin.pin_num_pc} <br> Number of usable printers: ${this.pin.pin_num_printers}`;
            textContent.appendChild(info);
        }
    
        // Add buttons

        const btnContainer = document.createElement("div");
        btnContainer.id = "btnContainer";
        btnContainer.style.display = "flex";
        btnContainer.style.paddingInline = "1rem";
        btnContainer.style.gap = "1rem";
        textContent.appendChild(btnContainer);
        
        const freeBtn = document.createElement("button");
        freeBtn.textContent = "Free";
        freeBtn.className = "btn modern-btn occupy-btn"; // Add class
        btnContainer.appendChild(freeBtn);

        const reserveBtn = document.createElement("button");
        if(this.isOccupied == true){
            reserveBtn.textContent = "Room occupied";
            reserveBtn.className = "btn modern-btn reserve-btn"; // Add class
            btnContainer.appendChild(reserveBtn)
        }else{
            reserveBtn.textContent = "Use";
            reserveBtn.className = "btn modern-btn reserve-btn"; // Add class
            btnContainer.appendChild(reserveBtn);
        }
        
        const occupyBtn = document.createElement("button");
        occupyBtn.textContent = "Occupy";
        occupyBtn.className = "btn modern-btn occupy-btn"; // Add class
        btnContainer.appendChild(occupyBtn);

        const clearBtn = document.createElement("button");
        clearBtn.textContent = "Clear";
        clearBtn.className = "btn modern-btn occupy-btn";
        btnContainer.appendChild(clearBtn);

        // Img container
        const imgContainer = document.createElement("div");
        imgContainer.id = "imgContainer";
        cardContainer.appendChild(imgContainer);

        const image = document.createElement("img");
        image.src = this.pin.pin_image_url || "default-image.jpg";
        image.alt = `${this.pin.pin_name} Image`;
        image.style.width = "10rem";
        imgContainer.appendChild(image);

        // Add details to the navbar display
        display.appendChild(cardContainer);
        this.map.setZoom(50);
            
        freeBtn.addEventListener("click", () => {
            this.freeBtn();
        });

        reserveBtn.addEventListener("click", () => {
            if(this.isOccupied == true){
                this.occupyBtn();
            }else{
                this.reserveBtn();
            }
        });
    
        occupyBtn.addEventListener("click", () => {
            this.occupyBtn();
        });
    
        clearBtn.addEventListener("click", () => {
            this.clearBtn();
        });
    }

    freeBtn(){
        if(this.polygon){
            if(this.pin.pin_num_pc == 0 || this.numPc == 0){
                alert("No available PCs");
            }else{
                this.numPc -= 1;
                if(this.numPc < this.pin.pin_num_pc && this.numPc > 0){
                    this.isOccupied = false;
                    this.handleClick();
                    this.polygon.setStyle({ color: "orange" });
                }else if(this.numPc == 0){
                    this.polygon.setStyle({ color: "rgb(153, 255, 146)" });
                    this.handleClick();
                }
            }
        }
    }

    reserveBtn() {
        if (this.polygon) {
            if (this.numPc < this.pin.pin_num_pc) {
                this.numPc += 1;
                this.isReserved = true;
                this.polygon.setStyle({ color: "orange" });
            }
            if (this.numPc == this.pin.pin_num_pc) {
                this.isReserved = false;
                this.isOccupied = true;
                this.polygon.setStyle({ color: "red" });
            }
            this.handleClick();
        }
    }

    occupyBtn(){
        if (this.polygon) {
            if(this.isReserved == true || this.numPc > 0){
                alert("Sending a message to reservers...");
                this.handleClick();
            }else if(this.numPc == this.pin.pin_num_pc){
                this.isOccupied = true;
                this.handleClick();
                this.polygon.setStyle({ color: "red" });
            }else{
                this.isOccupied = true;
                this.handleClick();
                this.polygon.setStyle({ color: "red" });
            }
        }
    }

    clearBtn(){
        if (this.polygon) {
            this.numPc = 0;
            this.isReserved = false;
            this.isOccupied = false;
            this.handleClick();
            this.polygon.setStyle({ color: "rgb(153, 255, 146)" });
        }
    }

}

  const m = new map("map.json");