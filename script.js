const cepInput = document.getElementById('cepInput');
const searchBtn = document.getElementById('searchBtn');

const search = () => {
    const cep = cepInput.value;
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const mapDiv = document.getElementById('map');
    let map;

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
                resultDiv.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Endereço Encontrado</h5>
                            <ul class="list-group list-group-flush">
                                <li class="list-group-item"><strong>CEP:</strong> ${data.cep}</li>
                                <li class="list-group-item"><strong>Logradouro:</strong> ${data.logradouro}</li>
                                <li class="list-group-item"><strong>Bairro:</strong> ${data.bairro}</li>
                                <li class="list-group-item"><strong>Cidade:</strong> ${data.localidade}</li>
                                <li class="list-group-item"><strong>Estado:</strong> ${data.uf}</li>
                            </ul>
                        </div>
                    </div>
                `;

                const address = `${data.logradouro}, ${data.localidade}, ${data.uf}`;
                return fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
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
            resultDiv.innerHTML = '<div class="alert alert-danger">Ocorreu um erro ao buscar o CEP.</div>';
            console.error('Error:', error);
        });
};

searchBtn.addEventListener('click', search);

cepInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        search();
    }
});