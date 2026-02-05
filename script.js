document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       CARTE
    ========================= */
    const map = L.map("map").setView([48.8566, 2.3522], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

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
    let chantiers = JSON.parse(localStorage.getItem("chantiers")) || [];
    let markers = {};
    let selectedId = null;
    let tempMarker = null;

    /* =========================
       UTILITAIRES
    ========================= */
    function save() {
        localStorage.setItem("chantiers", JSON.stringify(chantiers));
    }

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
       CLIC SUR LA CARTE
    ========================= */
    map.on("click", e => {
        lat.value = e.latlng.lat.toFixed(6);
        lng.value = e.latlng.lng.toFixed(6);
        removeTempMarker();
        tempMarker = L.marker(e.latlng).addTo(map);
    });

    /* =========================
       GPS ADRESSE (FR)
    ========================= */
    searchAdresse.onclick = () => {
        if (!adresse.value) return alert("Adresse manquante");

        fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=fr&q=${encodeURIComponent(adresse.value)}`)
            .then(r => r.json())
            .then(d => {
                if (!d.length) return alert("Adresse introuvable");
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

    // CAS 1 : position déjà définie
    if (lat.value && lng.value) {
        ajouterChantier();
        return;
    }

    // CAS 2 : pas de position mais une adresse → GPS automatique
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
            })
            .catch(() => alert("Erreur de localisation"));
        return;
    }

    // CAS 3 : rien
    alert("Clique sur la carte ou renseigne une adresse valide");
};
function ajouterChantier() {
    chantiers.push({
        id: Date.now(),
        nom: nom.value,
        adresse: adresse.value,
        description: description.value,
        charge: charge.value,
        telephone: telephone.value,
        statut: statut.value,
        lat: parseFloat(lat.value),
lng: parseFloat(lng.value)

    });

    save();
    render();
    removeTempMarker();
    clearForm();
}


    /* =========================
       MODIFIER
    ========================= */
    updateBtn.onclick = () => {
        const c = chantiers.find(x => x.id === selectedId);
        if (!c) return;

        Object.assign(c, {
            nom: nom.value,
            adresse: adresse.value,
            description: description.value,
            charge: charge.value,
            telephone: telephone.value,
            statut: statut.value,
            lat: lat.value,
            lng: lng.value
        });

        save();
        render();
        map.setView([c.lat, c.lng], 15);
        clearForm();
    };

    /* =========================
       SUPPRIMER
    ========================= */
    deleteBtn.onclick = () => {
        if (!selectedId) return;
        if (!confirm("Supprimer ce chantier ?")) return;

        chantiers = chantiers.filter(c => c.id !== selectedId);
        save();
        render();
        removeTempMarker();
        clearForm();
    };

    /* =========================
       RENDER
    ========================= */
    function render() {
        liste.innerHTML = "";
        Object.values(markers).forEach(m => map.removeLayer(m));
        markers = {};

        chantiers.forEach(c => {
// Nettoyage des anciennes données
chantiers = chantiers.filter(c =>
    c &&
    (c.statut === "a-visiter" || c.statut === "en-cours") &&
    !isNaN(parseFloat(c.lat)) &&
    !isNaN(parseFloat(c.lng))
);
save();

    // Sécurité données
    if (!icons[c.statut]) {
        c.statut = "a-visiter";
    }

    const latNum = parseFloat(c.lat);
    const lngNum = parseFloat(c.lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
        return; // on ignore ce chantier cassé
    }

    const m = L.marker([latNum, lngNum], { icon: icons[c.statut] }).addTo(map);

            m.bindPopup(`
                <strong>${c.nom}</strong><br>
                ${c.adresse || ""}<br>
                ${c.description || ""}<br><br>
                <strong>Chargé :</strong> ${c.charge || "-"}<br>
                <strong>Tél :</strong> ${c.telephone || "-"}
            `);
            m.on("click", () => select(c.id));
            markers[c.id] = m;

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
                save();
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

        updateBtn.disabled = deleteBtn.disabled = false;
        map.setView([c.lat, c.lng], 15);
        markers[id].openPopup();
    }

    /* =========================
       INIT
    ========================= */
    render();
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
