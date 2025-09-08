let map;

const cepInput = document.getElementById('cepInput');
const searchBtn = document.getElementById('searchBtn');
const historyDiv = document.getElementById('history');
const clearHistoryContainer = document.getElementById('clear-history-container');

const getHistory = () => JSON.parse(localStorage.getItem('cepHistory')) || [];

const addToHistory = (cep) => {
    let history = getHistory();
    if (!history.includes(cep)) {
        history.unshift(cep);
        history = history.slice(0, 5);
        localStorage.setItem('cepHistory', JSON.stringify(history));
    }
};

function formaCep(cep) {
    const somenteNumeros = cep.replace(/\D/g, '');

    if (!/^[0-9]{8}$|^[0-9]{5}-[0-9]{3}$/.test(somenteNumeros)) {
        return undefined;
    }

    const cepFormatado = `${somenteNumeros.slice(0, 5)}-${somenteNumeros.slice(5)}`;
    return cepFormatado.trim();
}


const clearHistory = () => {
    localStorage.removeItem('cepHistory');
    historyDiv.innerHTML = '';
    clearHistoryContainer.innerHTML = '';
};

const displayHistory = () => {
    const history = getHistory();
    if (history.length > 0) {
        const historyList = history.map(cep => `<li class="list-group-item history-item" style="cursor:pointer">${cep}</li>`).join('');
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

        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                cepInput.value = item.textContent;
                search();
            });
        });

        clearHistoryContainer.innerHTML = '<button id="clearHistoryBtn" class="btn btn-danger btn-sm">Limpar Histórico</button>';
        document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    } else {
        historyDiv.innerHTML = '';
        clearHistoryContainer.innerHTML = '';
    }
};

const search = (cep) => {
    cep = cep || cepInput.value;
    cep = formaCep(cep)
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

    fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('CEP não encontrado');
            }
            return response.json();
        })
        .then(data => {
            if (data.cep) {
                addToHistory(data.cep);
                displayHistory();
                console.log(data)
                resultDiv.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Endereço Encontrado</h5>
                            <ul class="list-group list-group-flush">
                                <li class="list-group-item"><strong>CEP:</strong> ${data.cep} <button class="btn btn-sm btn-outline-secondary copy-cep-btn" data-cep="${data.cep}">Copiar</button></li>
                                <li class="list-group-item"><strong>Logradouro:</strong> ${data.street}</li>
                                <li class="list-group-item"><strong>Bairro:</strong> ${data.neighborhood}</li>
                                <li class="list-group-item"><strong>Cidade:</strong> ${data.city}</li>
                                <li class="list-group-item"><strong>Estado:</strong> ${data.state}</li>
                            </ul>
                            <button class="btn btn-sm btn-outline-secondary copy-address-btn mt-2">Copiar Endereço</button>
                        </div>
                    </div>
                `;

                const copyCepBtn = document.querySelector('.copy-cep-btn');
                copyCepBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(copyCepBtn.dataset.cep);
                    copyCepBtn.textContent = 'Copiado!';
                    setTimeout(() => copyCepBtn.textContent = 'Copiar', 2000);
                });

                const copyAddressBtn = document.querySelector('.copy-address-btn');
                copyAddressBtn.addEventListener('click', () => {
                    const address = `${data.street}, ${data.neighborhood}, ${data.city} - ${data.state}, ${data.cep}`;
                    navigator.clipboard.writeText(address);
                    copyAddressBtn.textContent = 'Copiado!';
                    setTimeout(() => copyAddressBtn.textContent = 'Copiar Endereço', 2000);
                });

                loadingDiv.style.display = 'none';
                if (data.location && data.location.coordinates) {
                    const { latitude, longitude } = data.location.coordinates;

                    if (latitude == undefined || longitude == undefined) {
                        mapDiv.innerHTML = '<div class="alert alert-warning">Não foi possível encontrar as coordenadas para este endereço.</div>';
                        return;

                    }
                    mapDiv.style.display = 'block';
                    if (map) map.remove();

                    map = L.map('map').setView([latitude, longitude], 15);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(map);

                    L.marker([latitude, longitude]).addTo(map)
                        .bindPopup('Endereço aproximado.')
                        .openPopup();
                } else {
                    mapDiv.innerHTML = '<div class="alert alert-warning">Não foi possível encontrar as coordenadas para este endereço.</div>';
                }
            } else {
                loadingDiv.style.display = 'none';
                resultDiv.innerHTML = '<div class="alert alert-danger">CEP não encontrado.</div>';
            }
        })
        .catch(err => {
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
            console.error('BrasilAPI error:', err);
        });
};

document.addEventListener("keydown", (event) => {
    if (event.key == "Enter") {
        if (cepInput.matches(":focus")) {
            search()
        }
    }
});

searchBtn.addEventListener('click', () => search());
cepInput.addEventListener('keyup', e => { if (e.key === 'Enter') search(); });

displayHistory();