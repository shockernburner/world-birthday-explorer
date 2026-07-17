let countries = [];
let byName = new Map();
let layers = new Map();
let deferredPrompt;

const $ = (selector) => document.querySelector(selector);
const monthName = (month) => new Date(2024, month - 1, 1).toLocaleString(undefined, { month: 'long' });

const map = L.map('map', { worldCopyJump: true, minZoom: 1, maxZoom: 6 }).setView([18, 15], 2);
L.control.zoom({ position: 'bottomright' }).addTo(map);

function style() {
	return { color: '#fff', weight: 1, fillColor: '#60a5fa', fillOpacity: 0.82 };
}

function pick(name) {
	const country = byName.get(name);
	if (!country) return;

	document.querySelectorAll('.leaflet-interactive').forEach((node) => node.classList.remove('selected'));

	const layer = layers.get(name);
	if (layer) {
		layer.setStyle({ fillColor: '#f59e0b', fillOpacity: 1, weight: 3 });
		map.fitBounds(layer.getBounds(), { padding: [25, 25], maxZoom: 4 });
	}

	const date = `${country.day} ${monthName(country.month)} ${country.year}`;
	$('#card').className = 'card';
	$('#card').innerHTML = `${country.flag ? `<img class="flag" src="${country.flag}" alt="Flag of ${country.name}" onerror="this.style.display='none'">` : ''}<h2>${country.name}</h2><span class="date-badge">🎂 ${date}</span><h3>${country.occasion}</h3><div class="facts"><div class="fact"><b>Capital</b>${country.capital}</div><div class="fact"><b>Region</b>${country.region}</div></div><p class="story">${country.history}</p><button onclick="speak('${country.name.replaceAll("'", "\\'")}')">🔊 Read it aloud</button>`;
	$('#search').value = country.name;
}

window.speak = (name) => {
	const country = byName.get(name);
	if (!country) return;
	speechSynthesis.cancel();
	speechSynthesis.speak(new SpeechSynthesisUtterance(`${country.name}. ${country.occasion} is on ${country.day} ${monthName(country.month)}. ${country.history}`));
};

function upcoming() {
	const now = new Date();
	const year = now.getFullYear();
	const today = new Date(year, now.getMonth(), now.getDate());

	const items = countries
		.map((country) => {
			let celebration = new Date(year, country.month - 1, country.day);
			if (celebration < today) celebration = new Date(year + 1, country.month - 1, country.day);
			return {
				country,
				days: Math.ceil((celebration - now) / 86400000)
			};
		})
		.sort((a, b) => a.days - b.days)
		.slice(0, 5);

	$('#upcoming').innerHTML = items
		.map((item) => `<div class="mini" onclick="pick('${item.country.name.replaceAll("'", "\\'")}')"><strong>${item.country.name}</strong>${item.country.day} ${monthName(item.country.month)}<div class="countdown">in ${item.days} day${item.days === 1 ? '' : 's'}</div></div>`)
		.join('');
}

function quiz() {
	const answer = countries[Math.floor(Math.random() * countries.length)];
	const others = countries
		.filter((country) => country !== answer)
		.sort(() => Math.random() - 0.5)
		.slice(0, 3);
	const options = [answer, ...others].sort(() => Math.random() - 0.5);

	$('#quizBody').innerHTML = `<h2>Which country celebrates on ${answer.day} ${monthName(answer.month)}?</h2><div class="answers">${options.map((option) => `<button type="button" class="answer" data-name="${option.name}">${option.name}</button>`).join('')}</div><p id="result"></p>`;

	document.querySelectorAll('.answer').forEach((button) => {
		button.onclick = () => {
			document.querySelectorAll('.answer').forEach((node) => {
				node.disabled = true;
			});

			const isCorrect = button.dataset.name === answer.name;
			button.classList.add(isCorrect ? 'correct' : 'wrong');
			$('#result').textContent = isCorrect ? '🎉 Correct! Great exploring!' : `Good try! The answer is ${answer.name}.`;
			setTimeout(() => pick(answer.name), 700);
		};
	});

	$('#quizDialog').showModal();
}

function setupInstallPrompt() {
	const installButton = $('#installBtn');
	const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
	const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

	window.addEventListener('beforeinstallprompt', (event) => {
		event.preventDefault();
		deferredPrompt = event;
		installButton.textContent = 'Install app';
		installButton.hidden = false;
	});

	window.addEventListener('appinstalled', () => {
		deferredPrompt = null;
		installButton.hidden = true;
	});

	if (isIOS && !isStandalone) {
		installButton.textContent = 'How to install';
		installButton.hidden = false;
	}

	installButton.onclick = async () => {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			deferredPrompt = null;
			installButton.hidden = true;
			return;
		}

		if (isIOS && !isStandalone) {
			window.alert('On iPhone/iPad Safari: tap Share, then choose Add to Home Screen.');
		}
	};
}

Promise.all([fetch('data/countries.json').then((response) => response.json()), fetch('data/world.geojson').then((response) => response.json())]).then(([countryList, geo]) => {
	countries = countryList.sort((a, b) => a.name.localeCompare(b.name));
	countries.forEach((country) => byName.set(country.name, country));
	$('#countryList').innerHTML = countries.map((country) => `<option value="${country.name}">`).join('');

	L.geoJSON(geo, {
		style,
		onEachFeature: (feature, layer) => {
			layers.set(feature.properties.name, layer);
			layer.bindTooltip(feature.properties.name, { sticky: true });
			layer.on('click', () => pick(feature.properties.name));
			layer.on('mouseover', () => layer.setStyle({ fillOpacity: 1 }));
			layer.on('mouseout', () => {
				if ($('#search').value !== feature.properties.name) {
					layer.setStyle(style());
				}
			});
		}
	}).addTo(map);

	upcoming();
	pick('Bangladesh');
});

$('#search').addEventListener('change', (event) => pick(event.target.value));
$('#search').addEventListener('input', (event) => {
	const query = event.target.value.toLowerCase();
	const match = countries.find((country) => country.name.toLowerCase() === query);
	if (match) pick(match.name);
});

$('#surprise').onclick = () => pick(countries[Math.floor(Math.random() * countries.length)].name);
$('#quiz').onclick = quiz;

setupInstallPrompt();

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('./sw.js').catch(() => {
		// Keep the app functional even when registration fails.
	});
}