import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

/* =========================
   FIREBASE
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyD2Fbkc_LNBavHzHLKK1dcaii1UeOkgRr8",
  authDomain: "carte-chantiers-92bc6.firebaseapp.com",
  projectId: "carte-chantiers-92bc6",
  storageBucket: "carte-chantiers-92bc6.firebasestorage.app",
  messagingSenderId: "562550101389",
  appId: "1:562550101389:web:304ccc7ae6e31aeeca59c4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================
   APP
========================= */
document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       CARTE
    ========================= */
    const map = L.map("map").setView([48.8566, 2.3522], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(map);

    const icons = {
        "a-visiter": L.icon({
            iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            iconSize: [32, 32]
        }),
        "en-cours": L.icon({
            iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
            iconSize: [32, 32]
        })
    };

    /* =========================
       ELEMENTS HTML
    ========================= */
    const nom = document.getElementById("nom");
    const adresse = document.getElementById("adresse");
    const description = document.getElementById("description");
    const charge = document.getElementById("charge");
    const telephone = document.getElementById("telephone");
    const statut = document.getElementById("statut");
    const lat = document.getElementById("lat");
    const lng = document.getElementById("lng");

    const addBtn = document.getElementById("addBtn");
    const updateBtn = document.getElementById("updateBtn");
    const deleteBtn = document.getElementById("deleteBtn");
    const searchAdresse = document.getElementById("searchAdresse");
    const liste = document.getElementById("liste");

    /* =========================
       DONNÉES
    ========================= */
    let chantiers = [];
    let markers = {};
    let selectedId = null;
    let tempMarker = null;

    /* =========================
       FORMULAIRE
    ========================= */
    function clearForm() {
        nom.value = "";
        adresse.value = "";
        description.value = "";
        charge.value = "";
        telephone.value = "";
        lat.value = "";
        lng.value = "";
        statut.value = "a-visiter";
        selectedId = null;
        updateBtn.disabled = true;
        deleteBtn.disabled = true;
    }

    function removeTempMarker() {
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
    }

    /* =========================
       CLIC SUR CARTE
    ========================= */
    map.on("click", e => {
        lat.value = e.latlng.lat.toFixed(6);
        lng.value = e.latlng.lng.toFixed(6);

        removeTempMarker();
        tempMarker = L.marker(e.latlng).addTo(map);
    });

    /* =========================
       GPS ADRESSE
    ========================= */
    searchAdresse.onclick = () => {

        if (!adresse.value) {
            alert("Adresse manquante");
            return;
        }

        fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=fr&q=${encodeURIComponent(adresse.value)}`)
        .then(r => r.json())
        .then(d => {

            if (!d.length) {
                alert("Adresse introuvable");
                return;
            }

            lat.value = d[0].lat;
            lng.value = d[0].lon;

            removeTempMarker();
            tempMarker = L.marker([lat.value, lng.value]).addTo(map);

            map.setView([lat.value, lng.value], 16);
        });
    };

    /* =========================
       AJOUT
    ========================= */
    addBtn.onclick = () => {

        if (!nom.value) {
            alert("Le nom du chantier est obligatoire");
            return;
        }

        if (lat.value && lng.value) {
            ajouterChantier();
            return;
        }

        if (adresse.value) {

            fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=fr&q=${encodeURIComponent(adresse.value)}`)
            .then(r => r.json())
            .then(d => {

                if (!d.length) {
                    alert("Adresse introuvable");
                    return;
                }

                lat.value = d[0].lat;
                lng.value = d[0].lon;

                ajouterChantier();
            });

            return;
        }

        alert("Clique sur la carte ou renseigne une adresse valide");
    };

    /* =========================
       AJOUT FIREBASE
    ========================= */
    async function ajouterChantier() {

        const chantier = {
            nom: nom.value,
            adresse: adresse.value,
            description: description.value,
            charge: charge.value,
            telephone: telephone.value,
            statut: statut.value,
            lat: parseFloat(lat.value),
            lng: parseFloat(lng.value)
        };

        const docRef = await addDoc(collection(db, "chantiers"), chantier);

        chantier.id = docRef.id;

        chantiers.push(chantier);

        render();
        removeTempMarker();
        clearForm();
    }

    /* =========================
       RENDER
    ========================= */
    function render() {

        liste.innerHTML = "";

        Object.values(markers).forEach(m => map.removeLayer(m));
        markers = {};

        chantiers.forEach(c => {

            if (!icons[c.statut]) c.statut = "a-visiter";

            const latNum = parseFloat(c.lat);
            const lngNum = parseFloat(c.lng);

            if (isNaN(latNum) || isNaN(lngNum)) return;

            const marker = L.marker([latNum, lngNum], { icon: icons[c.statut] }).addTo(map);

            marker.bindPopup(`
                <strong>${c.nom}</strong><br>
                ${c.adresse || ""}<br>
                ${c.description || ""}<br><br>
                <strong>Chargé :</strong> ${c.charge || "-"}<br>
                <strong>Tél :</strong> ${c.telephone || "-"}
            `);

            marker.on("click", () => select(c.id));

            markers[c.id] = marker;

            const li = document.createElement("li");

            li.className = "statut-" + c.statut;

            li.innerHTML = `
                <strong>${c.nom}</strong><br>
                <button class="statut-btn">Changer statut</button>
            `;

            li.onclick = () => select(c.id);

            li.querySelector("button").onclick = e => {
                e.stopPropagation();

                c.statut = c.statut === "a-visiter" ? "en-cours" : "a-visiter";

                render();
            };

            liste.appendChild(li);
        });
    }

    /* =========================
       SELECTION
    ========================= */
    function select(id) {

        removeTempMarker();

        const c = chantiers.find(x => x.id === id);

        if (!c) return;

        selectedId = id;

        nom.value = c.nom;
        adresse.value = c.adresse;
        description.value = c.description;
        charge.value = c.charge;
        telephone.value = c.telephone;
        statut.value = c.statut;
        lat.value = c.lat;
        lng.value = c.lng;

        updateBtn.disabled = false;
        deleteBtn.disabled = false;

        map.setView([c.lat, c.lng], 15);

        markers[id].openPopup();
    }

    /* =========================
       CHARGER FIREBASE
    ========================= */
    async function chargerChantiers() {

        const querySnapshot = await getDocs(collection(db, "chantiers"));

        querySnapshot.forEach(doc => {

            const data = doc.data();

            data.id = doc.id;

            chantiers.push(data);
        });

        render();
    }

    chargerChantiers();

    /* =========================
       MENU MOBILE
    ========================= */
    const toggleBtn = document.getElementById("toggleSidebar");
    const sidebar = document.getElementById("sidebar");

    if (toggleBtn) {
        toggleBtn.onclick = () => {
            sidebar.classList.toggle("open");
        };
    }

});
