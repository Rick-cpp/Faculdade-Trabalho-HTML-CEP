let map;

const cepInput = document.getElementById('cepInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const historyDiv = document.getElementById('history');
const clearHistoryContainer = document.getElementById('clear-history-container');

const getHistory = () => {
    return JSON.parse(localStorage.getItem('cepHistory')) || [];
};

const addToHistory = (cep) => {
    let history = getHistory();
    if (!history.includes(cep)) {
        history.unshift(cep);
        history = history.slice(0, 5);
        localStorage.setItem('cepHistory', JSON.stringify(history));
    }
};

const clearHistory = () => {
    localStorage.removeItem('cepHistory');
    historyDiv.innerHTML = '';
    clearHistoryContainer.innerHTML = '';
};

const displayHistory = () => {
    const history = getHistory();
    if (history.length > 0) {
        const historyList = history.map(cep => `<li class="list-group-item history-item" style="cursor: pointer;">${cep}</li>`).join('');
        historyDiv.innerHTML = `
            <div class="card mt-4">
                <div class="card-body">
                    <h5 class="card-title">Histórico de Pesquisa</h5>
                    <ul class="list-group list-group-flush">
                        ${historyList}
                    </ul>
                </div>
            </div>
        `;

        const historyItems = document.querySelectorAll('.history-item');
        historyItems.forEach(item => {
            item.addEventListener('click', () => {
                cepInput.value = item.textContent;
                search();
            });
        });

        clearHistoryContainer.innerHTML = '<button id="clearHistoryBtn" class="btn btn-danger btn-sm">Limpar Histórico</button>';
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        clearHistoryBtn.addEventListener('click', clearHistory);
    } else {
        historyDiv.innerHTML = '';
        clearHistoryContainer.innerHTML = '';
    }
};

const search = (cep) => {
    cep = cep || cepInput.value;
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const mapDiv = document.getElementById('map');

    if (!cep) {
        resultDiv.innerHTML = '<div class="alert alert-danger">Por favor, digite um CEP.</div>';
        return;
    }

    loadingDiv.style.display = 'block';
    resultDiv.innerHTML = '';
    mapDiv.style.display = 'none';

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                loadingDiv.style.display = 'none';
                resultDiv.innerHTML = '<div class="alert alert-danger">CEP não encontrado.</div>';
            } else {
                addToHistory(cep);
                displayHistory();
                resultDiv.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Endereço Encontrado</h5>
                            <ul class="list-group list-group-flush">
                                <li class="list-group-item"><strong>CEP:</strong> ${data.cep} <button class="btn btn-sm btn-outline-secondary copy-cep-btn" data-cep="${data.cep}">Copiar</button></li>
                                <li class="list-group-item"><strong>Logradouro:</strong> ${data.logradouro}</li>
                                <li class="list-group-item"><strong>Bairro:</strong> ${data.bairro}</li>
                                <li class="list-group-item"><strong>Cidade:</strong> ${data.localidade}</li>
                                <li class="list-group-item"><strong>Estado:</strong> ${data.uf}</li>
                            </ul>
                            <button class="btn btn-sm btn-outline-secondary copy-address-btn mt-2">Copiar Endereço</button>
                        </div>
                    </div>
                `;

                const copyCepBtn = document.querySelector('.copy-cep-btn');
                copyCepBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(copyCepBtn.dataset.cep);
                    copyCepBtn.textContent = 'Copiado!';
                    setTimeout(() => {
                        copyCepBtn.textContent = 'Copiar';
                    }, 2000);
                });

                const copyAddressBtn = document.querySelector('.copy-address-btn');
                copyAddressBtn.addEventListener('click', () => {
                    const address = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}, ${data.cep}`;
                    navigator.clipboard.writeText(address);
                    copyAddressBtn.textContent = 'Copiado!';
                    setTimeout(() => {
                        copyAddressBtn.textContent = 'Copiar Endereço';
                    }, 2000);
                });

                const address = `${data.logradouro}, ${data.localidade}, ${data.uf}`;
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
                    headers: {
                        'User-Agent': 'TrabalhoViaCEP/1.0 (your_email@example.com)' // Replace with your application name and email
                    }
                })
                    .then(response => response.json())
                    .then(nominatimData => {
                        loadingDiv.style.display = 'none';
                        if (nominatimData.length > 0) {
                            const lat = nominatimData[0].lat;
                            const lon = nominatimData[0].lon;

                            mapDiv.style.display = 'block';
                            if (map) {
                                map.remove();
                            }
                            map = L.map('map').setView([lat, lon], 15);

                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            }).addTo(map);

                            L.marker([lat, lon]).addTo(map)
                                .bindPopup('Endereço aproximado.')
                                .openPopup();
                        } else {
                            mapDiv.innerHTML = '<div class="alert alert-warning">Não foi possível encontrar as coordenadas para este endereço.</div>';
                        }
                    })
                    .catch(error => {
                        loadingDiv.style.display = 'none';
                        mapDiv.innerHTML = '<div class="alert alert-warning">Ocorreu um erro ao buscar as coordenadas para o mapa.</div>';
                        console.error('Error fetching coordinates:', error);
                    });
            }
        })
        .catch(error => {
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = '<div class="alert alert-danger">Ocorreu um erro ao buscar o CEP.</div>';
            console.error('Error fetching CEP:', error);
        });
};

const searchByLocation = () => {
    if (navigator.geolocation) {
        locationBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Buscando...';
        locationBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                .then(response => response.json())
                .then(data => {
                    if (data.address && data.address.postcode) {
                        const cep = data.address.postcode.replace('-', '');
                        cepInput.value = cep;
                        search(cep);
                    } else {
                        alert('Não foi possível encontrar o CEP para sua localização.');
                    }
                })
                .catch(error => {
                    alert('Ocorreu um erro ao buscar o CEP para sua localização.');
                    console.error('Error:', error);
                })
                .finally(() => {
                    locationBtn.innerHTML = 'Usar minha localização';
                    locationBtn.disabled = false;
                });
        });
    } else {
        alert('Geolocalização não é suportada por este navegador.');
    }
};

searchBtn.addEventListener('click', () => search());

locationBtn.addEventListener('click', searchByLocation);

cepInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        search();
    }
});

displayHistory();