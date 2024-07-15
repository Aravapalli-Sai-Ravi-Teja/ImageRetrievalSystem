const imageUrls = [
    "https://visionstudiodev9fed.blob.core.windows.net/nature/1577.png",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/1593.png",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture677.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture679.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/5401.png",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture46.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture223.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture218.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture42.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture227.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture124.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture675.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture688.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture91.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/4569.png",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture108.jpg",
    "https://visionstudiodev9fed.blob.core.windows.net/nature/Picture677.jpg"
];

const endpoint = "https://cmocomputervision.cognitiveservices.azure.com/";
const subscriptionKey = "subscription-key";
const imageVectorizeUrl = `${endpoint}/computervision/retrieval:vectorizeImage?api-version=2024-02-01&model-version=2023-04-15`;
const textVectorizeUrl = `${endpoint}/computervision/retrieval:vectorizeText?api-version=2024-02-01&model-version=2023-04-15`;
const headers = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": subscriptionKey
};

const imageGrid = document.getElementById('imageGrid');
const matchingImagesContainer = document.getElementById('matchingImages');
const searchHeading = document.getElementById('searchHeading');
let vectorizedImages = [];

function displayImages(imageUrls, container) {
    container.innerHTML = '';
    imageUrls.forEach((url, index) => {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.innerHTML = `
            <img src="${url}" alt="Image">
            <button class="delete-button" data-index="${index}">Delete</button>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', () => {
            const index = button.getAttribute('data-index');
            deleteImage(index);
        });
    });
}

function displayMatchedImages(imageUrls, container) {
    container.innerHTML = '';
    imageUrls.forEach((url, index) => {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.innerHTML = `
            <img src="${url}" alt="Image">
          
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', () => {
            const index = button.getAttribute('data-index');
            deleteImage(index);
        });
    });
}

async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        const response = await fetch(url, options);
        if (response.status !== 429) {
            return response;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error('Max retries reached');
}

async function vectorizeImage(url) {
    const options = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ url: url })
    };

    const response = await fetchWithRetry(imageVectorizeUrl, options);
    if (!response.ok) {
        throw new Error('Failed to vectorize image');
    }
    const data = await response.json();
    return data.vector;
}

async function vectorizeText(text) {
    const options = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ text: text })
    };

    const response = await fetchWithRetry(textVectorizeUrl, options);
    if (!response.ok) {
        throw new Error('Failed to vectorize text');
    }
    const data = await response.json();
    return data.vector;
}

function cosineSimilarity(vector1, vector2) {
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitude1 * magnitude2);
}

async function initializeImageVectors() {
    vectorizedImages = await Promise.all(imageUrls.map(async (url) => {
        try {
            const vector = await vectorizeImage(url);
            return { url, vector };
        } catch (error) {
            console.error(`Failed to vectorize image: ${url}`, error);
            return null;
        }
    })).then(results => results.filter(img => img));
    displayImages(imageUrls, imageGrid);
    console.log(vectorizedImages);
}

document.getElementById('addImageButton').addEventListener('click', async () => {
    const newImageUrl = document.getElementById('image_url').value;

    if (newImageUrl) {
        try {
            const newVector = await vectorizeImage(newImageUrl);
            imageUrls.push(newImageUrl);
            vectorizedImages.push({ url: newImageUrl, vector: newVector });
            displayImages(imageUrls, imageGrid);
            console.log(vectorizedImages);
        } catch (error) {
            console.error('Failed to add and vectorize new image:', error);
        }
    }
});

document.getElementById('searchButton').addEventListener('click', async () => {
    const queryText = document.getElementById('query_text').value;

    if (queryText) {
        try {
            const queryVector = await vectorizeText(queryText);
            console.log("Query Vector:", queryVector);

            const similarityThreshold = 0.1;
            const matchingImages = vectorizedImages
                .map(image => ({
                    url: image.url,
                    similarity: cosineSimilarity(queryVector, image.vector)
                }))
                .filter(image => image.similarity > similarityThreshold)
                .sort((a, b) => b.similarity - a.similarity);

            displayMatchedImages(matchingImages.map(image => image.url), matchingImagesContainer);
            searchHeading.textContent = `Searching for: ${queryText}`;
            searchHeading.style.display = 'block';
            matchingImagesContainer.style.display = 'grid';

            console.log("Matching Images:", matchingImages);
        } catch (error) {
            console.error('Failed to vectorize query text:', error);
        }
    }
});

function deleteImage(index) {
    imageUrls.splice(index, 1);
    vectorizedImages.splice(index, 1);
    displayImages(imageUrls, imageGrid);
    console.log(vectorizedImages);
}

// Initialize image vectors on page load
initializeImageVectors();
