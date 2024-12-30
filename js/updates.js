const versionAPI = "https://api.jsonsilo.com/public/9739f42d-9634-4592-8251-e5c989a46310";
const changelogAPI = "https://api.github.com/repos/nitra-global/NG-Extension-Manager/releases";
const manifestData = chrome.runtime.getManifest();
const installedVersion = manifestData.version;

function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    applySavedTheme(); // Apply theme when the page loads
    document.getElementById("installed-version").textContent = installedVersion;
    document.getElementById("close-sheet").addEventListener("click", closeBottomSheet);
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    document.getElementById("search-input").addEventListener("input", filterReleases);

    fetchData();
});

async function fetchData() {
    showLoadingIndicator("releases-grid");
    await fetchVersion();
    await fetchReleases();
}

async function fetchVersion() {
    const cacheKey = "latestVersionCache";
    try {
        let data = getCachedData(cacheKey);

        if (!data) {
            const response = await fetch(versionAPI);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            data = await response.json();
            cacheData(cacheKey, data, 3600); // Cache for 1 hour
        }

        document.getElementById("latest-version").textContent = data.version;
        showNewVersionMessage(data.version);
    } catch (error) {
        handleError("latest-version", "Error loading latest version.", error);
    }
}

async function fetchReleases() {
    const cacheKey = "releasesCache";
    try {
        let releases = getCachedData(cacheKey);

        if (!releases) {
            const response = await fetch(changelogAPI);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            releases = await response.json();
            cacheData(cacheKey, releases, 3600); // Cache for 1 hour
        }

        updateReleasesGrid(releases);
    } catch (error) {
        handleError("releases-grid", "Error loading releases.", error);
    } finally {
        hideLoadingIndicator("releases-grid");
    }
}

function openBottomSheet(release) {
    setReleaseDetails(release);
    document.getElementById("bottom-sheet").classList.add("open");

    document.querySelectorAll(".release-card").forEach(card => card.classList.remove("active"));
    const activeCard = Array.from(document.querySelectorAll(".release-card"))
        .find(card => card.dataset.release === JSON.stringify(release));
    if (activeCard) activeCard.classList.add("active");
}

function closeBottomSheet() {
    document.getElementById("bottom-sheet").classList.remove("open");
}

function filterReleases() {
    const query = document.getElementById("search-input").value.toLowerCase();
    const releaseCards = document.querySelectorAll(".release-card");

    releaseCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? "block" : "none";
    });
}

function showNewVersionMessage(latestVersion) {
    const statusMessage = document.getElementById("status-message");
    if (isNewVersion(installedVersion, latestVersion)) {
        statusMessage.textContent = `A new version (${latestVersion}) is available!`;
        statusMessage.style.color = "green";
    } else {
        statusMessage.textContent = "You are using the latest version.";
        statusMessage.style.color = "blue";
    }
}

function isNewVersion(current, latest) {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const latestPart = latestParts[i] || 0;
        if (latestPart > currentPart) return true;
        if (latestPart < currentPart) return false;
    }
    return false;
}

function handleError(elementId, message, error) {
    document.getElementById(elementId).textContent = message;
    console.error(message, error);
}

function updateReleasesGrid(releases) {
    const releasesGrid = document.getElementById("releases-grid");
    releasesGrid.innerHTML = '';
    releases.forEach(release => {
        const releaseCard = document.createElement("div");
        releaseCard.className = "release-card";
        releaseCard.dataset.release = JSON.stringify(release);

        releaseCard.innerHTML = `
            <div class="release-card-header">
                <h3>${release.name}</h3>
                <span class="${release.prerelease ? 'pre-release-tag' : 'stable-release-tag'}">
                    ${release.prerelease ? 'Pre-Release' : 'Stable'}
                </span>
            </div>
            <p>${new Date(release.published_at).toLocaleDateString()}</p>
            <a href="${release.html_url}" target="_blank">View on GitHub</a>
        `;
        releaseCard.onclick = () => openBottomSheet(release);
        releasesGrid.appendChild(releaseCard);
    });

    if (releases.length === 0) {
        releasesGrid.textContent = "No releases found.";
    }
}

function showLoadingIndicator(elementId) {
    const element = document.getElementById(elementId);
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    element.appendChild(spinner);
}

function hideLoadingIndicator(elementId) {
    const element = document.getElementById(elementId);
    const spinner = element.querySelector(".spinner");
    if (spinner) spinner.remove();
}

function cacheData(key, data, ttl) {
    const cache = {
        data,
        expiry: Date.now() + ttl * 1000
    };
    localStorage.setItem(key, JSON.stringify(cache));
}

function getCachedData(key) {
    const cache = localStorage.getItem(key);
    if (!cache) return null;

    const parsedCache = JSON.parse(cache);
    if (Date.now() > parsedCache.expiry) {
        localStorage.removeItem(key);
        return null;
    }

    return parsedCache.data;
}
