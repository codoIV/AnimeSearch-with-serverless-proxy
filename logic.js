// Relation types we care about when mapping out a franchise (seasons, movies, OVAs, etc.)
// We deliberately skip noisy ones like "character" and "spin_off" to keep the list focused.
const RELEVANT_RELATIONS = new Set([
    'prequel',
    'sequel',
    'alternative_version',
    'side_story',
    'full_story',
    'summary',
    'parent_story'
]);

const MAX_RELATED_FETCHES = 20; // safety cap so a big franchise can't trigger dozens of API calls

// Low-level helper: every call to the MAL API goes through /api/proxy
async function getAnimeNode(animeId, fields) {
    const url = `/api/proxy?path=/api/anime/${animeId}&fields=${encodeURIComponent(fields)}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Could not fetch anime node:', error);
        return null;
    }
}

async function searchAnime(query) {
    const term = query.trim();

    if (!term) {
        return null;
    }

    const url = `/api/proxy?path=/api/anime&q=${encodeURIComponent(term)}&limit=10`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result?.data?.[0]?.node || null;
    } catch (error) {
        console.error('Something went wrong with the fetch:', error);
        return null;
    }
}

// Walks the "prequel" chain backwards until it finds the entry with no prequel,
// which is what we treat as the base/season 1 entry.
async function findRootAnime(startId) {
    let currentId = startId;
    const visited = new Set();

    for (let i = 0; i < 15; i++) {
        if (visited.has(currentId)) {
            break; // safety net in case the API ever returns a cycle
        }
        visited.add(currentId);

        const node = await getAnimeNode(currentId, 'related_anime');
        const prequel = node?.related_anime?.find((r) => r.relation_type === 'prequel');

        if (!prequel) {
            return currentId;
        }

        currentId = prequel.node.id;
    }

    return currentId;
}

// Breadth-first walk over related_anime starting at the root, collecting every
// season/movie/OVA/etc. connected through the relation types we care about.
async function buildRelatedFranchise(rootId) {
    const visited = new Map();
    const queue = [{ id: rootId, relation_type: 'root' }];
    let fetchCount = 0;

    while (queue.length > 0 && fetchCount < MAX_RELATED_FETCHES) {
        const current = queue.shift();

        if (visited.has(current.id)) {
            continue;
        }

        const node = await getAnimeNode(current.id, 'title,media_type,start_date,related_anime{title,media_type}');
        fetchCount++;

        visited.set(current.id, {
            id: current.id,
            title: node?.title || `Anime #${current.id}`,
            media_type: node?.media_type || '',
            start_date: node?.start_date || '',
            relation_type: current.relation_type
        });

        const related = node?.related_anime || [];
        for (const rel of related) {
            if (!RELEVANT_RELATIONS.has(rel.relation_type)) {
                continue;
            }
            if (visited.has(rel.node.id)) {
                continue;
            }
            queue.push({ id: rel.node.id, relation_type: rel.relation_type });
        }
    }

    return Array.from(visited.values()).sort((a, b) => {
        return (a.start_date || '9999').localeCompare(b.start_date || '9999');
    });
}

function populateDropdown(list, selectedId) {
    const select = document.querySelector('#anime-related-select');
    if (!select) {
        return;
    }

    select.innerHTML = '';

    if (list.length <= 1) {
        select.classList.add('hidden');
        return;
    }

    list.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.id;

        const typeLabel = item.media_type ? item.media_type.toUpperCase() : '';
        const relationLabel = item.relation_type === 'root' ? '' : ` - ${item.relation_type.replace('_', ' ')}`;
        option.textContent = `${item.title}${typeLabel ? ` (${typeLabel})` : ''}${relationLabel}`;

        if (String(item.id) === String(selectedId)) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    select.classList.remove('hidden');
}

async function loadAnimeDetails(animeId) {
    if (!animeId) {
        return;
    }

    const animeData = await getAnimeNode(animeId, 'genres,studios,mean,main_picture');
    if (animeData) {
        updateAnimeDisplay(animeData);
    }
}

function hideCard() {
    const cardContainer = document.querySelector('#anime-card');
    if (cardContainer) {
        cardContainer.classList.add('hidden');
    }
}

async function handleSearch(typedText) {
    const candidate = await searchAnime(typedText);

    if (!candidate) {
        hideCard();
        return;
    }

    const rootId = await findRootAnime(candidate.id);
    const franchise = await buildRelatedFranchise(rootId);

    populateDropdown(franchise, rootId);
    await loadAnimeDetails(rootId);
}

function initSearch() {
    const searchInput = document.querySelector('#anime-search-input');

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener('input', (event) => {
        const typedText = event.target.value.trim();
        manageDebounce(typedText);
    });

    const relatedSelect = document.querySelector('#anime-related-select');
    if (relatedSelect) {
        relatedSelect.addEventListener('change', (event) => {
            loadAnimeDetails(event.target.value);
        });
    }
}

let searchTimer;

function manageDebounce(typedText) {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        if (!typedText) {
            hideCard();
            return;
        }

        handleSearch(typedText);
    }, 500);
}

function updateAnimeDisplay(animeData) {
    const titleLabel = document.querySelector('#anime-title');
    const imageLabel = document.querySelector('#anime-cover');
    const genresLabel = document.querySelector('#anime-genres');
    const studioLabel = document.querySelector('#anime-studios');
    const scoreLabel = document.querySelector('#anime-score');
    const cardContainer = document.querySelector('#anime-card');

    if (!titleLabel || !imageLabel || !genresLabel || !scoreLabel || !cardContainer || !studioLabel) {
        return;
    }

    const title = animeData?.title || 'Unknown';
    const genres = animeData?.genres ? animeData.genres.map((g) => g.name).join(', ') : 'None';
    const score = animeData?.mean ?? 'N/A';
    const imageUrl = animeData?.main_picture?.medium || '';
    const studio = animeData?.studios?.[0]?.name || 'Unknown';

    titleLabel.textContent = title;
    scoreLabel.textContent = score;
    genresLabel.textContent = genres;
    studioLabel.textContent = studio;

    imageLabel.src = imageUrl;
    imageLabel.alt = `${title} Cover`;

    cardContainer.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', initSearch);
