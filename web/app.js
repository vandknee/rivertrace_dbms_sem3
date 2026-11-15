let year = null;
let station_data = [];
let network_data;
let geometry;
let selected_station = '1049';
let highlighted = new Set();
let visit_order = [];
let visit_index = 0;
let play_timer = null;
let trace_request = 0;
function pause_trace() {
    clearInterval(play_timer);
    play_timer = null;
    by_id('play-trace').textContent = 'Play';
}
function reset_trace() {
    pause_trace();
    trace_request++;
    visit_order = [];
    visit_index = 0;
    by_id('play-trace').disabled = true;
}
function play_trace() {
    if (play_timer !== null) { pause_trace(); return; }
    if (!visit_order.length) return;
    if (visit_index >= visit_order.length) visit_index = 0;
    if (visit_index === 0) { highlighted.clear(); draw_map(); }
    by_id('play-trace').textContent = 'Pause';
    play_timer = setInterval(() => {
        const id = visit_order[visit_index++];
        highlighted.add(id);
        const line = by_id('network').querySelector(`[data-reach="${id}"]`);
        if (line) {
            line.setAttribute('stroke', '#287ea2');
            line.setAttribute('stroke-width', '4');
        }
        if (visit_index >= visit_order.length) pause_trace();
    }, 65);
}
let table_request = 0;
let refresh_request = 0;
const by_id = id => document.getElementById(id);
const escape_text = text => String(text).replace(/[&<>"']/g, letter => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[letter]));
const format = value => Number(value).toLocaleString('en-IN', {maximumFractionDigits:2});
function range(value) { return value ? format(value.min) + (value.min === value.max ? '' : '–' + format(value.max)) : '—'; }
function badge(status) { return `<span class="badge ${status.toLowerCase().replaceAll(' ','-')}">${escape_text(status)}</span>`; }
function show_error(error) { by_id('error').textContent = error.message; by_id('error').hidden = false; }
async function api(action, params = {}) {
    const query = new URLSearchParams(year === null ? params : {year, ...params});
    const response = await fetch('/api/' + action + '?' + query);
    if (!response.ok) {
        let message = 'Could not load data. Check that the server is running.';
        try { message = (await response.json()).error || message; } catch (error) {}
        throw new Error(message);
    }
    return response.json();
}
function show_page() {
    let page = location.hash.slice(1) || 'dashboard';
    if (!['dashboard','explorer','analysis','about'].includes(page)) page = 'dashboard';
    document.querySelectorAll('.page').forEach(section => section.hidden = section.id !== page);
    document.querySelectorAll('nav a').forEach(link => link.classList.toggle('active', link.hash === '#' + page));
}
window.addEventListener('hashchange', show_page);
document.querySelectorAll('[data-go]').forEach(button => button.onclick = () => location.hash = button.dataset.go);
function station_options() {
    const options = station_data.map(station => `<option value="${escape_text(station.id)}">${escape_text(station.name)} · ${escape_text(station.id)}</option>`).join('');
    by_id('start-station').innerHTML = options;
    by_id('end-station').innerHTML = options;
    by_id('start-station').value = selected_station;
    by_id('end-station').value = station_data.some(row => row.id === '1071') ? '1071' : selected_station;
}
async function load_table() {
    const ticket = ++table_request;
    const rows = await api('stations', {q:by_id('search').value.trim(), river:by_id('river-filter').value, status:by_id('status-filter').value, sort:by_id('sort').value});
    if (ticket !== table_request) return;
    by_id('station-count').textContent = rows.length + (rows.length === 1 ? ' station' : ' stations');
    by_id('station-rows').innerHTML = rows.length ? rows.map(station => `<tr><td><button class="station-link" data-station="${escape_text(station.id)}">${escape_text(station.name)}</button><span class="station-code">CPCB ${escape_text(station.id)}</span></td><td>${escape_text(station.river)}</td><td>${range(station.reading?.bod)}</td><td>${range(station.reading?.do)}</td><td>${badge(station.status)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No stations match these filters.</td></tr>';
}
async function load_ranking() {
    const request_year = year;
    const rows = await api('ranking');
    if (request_year !== year) return;
    by_id('ranking').innerHTML = rows.length ? rows.map((station, index) => `<article class="card rank-card"><span class="rank-number">${String(index+1).padStart(2,'0')}</span><div><h3>${escape_text(station.name)}</h3><span class="score">${escape_text(station.river)} · Score ${format(station.score)} · ${year}</span><ul>${station.reasons.map(reason => `<li>${escape_text(reason)}</li>`).join('')}</ul><button class="secondary" data-record="${escape_text(station.id)}">View record</button><button data-trace="${escape_text(station.id)}">Trace upstream →</button></div></article>`).join('') : '<div class="card empty">No flagged stations for this year.</div>';
}
async function refresh() {
    reset_trace();
    const ticket = ++refresh_request;
    by_id('trace-button').disabled = true;
    by_id('path-button').disabled = true;
    by_id('loading').hidden = false;
    by_id('error').hidden = true;
    const [overview, network] = await Promise.all([api('overview'), api('network')]);
    if (ticket !== refresh_request) return;
    year = overview.years.length ? overview.year : null;
    network_data = network;
    station_data = network.stations;
    by_id('year').innerHTML = overview.years.slice().reverse().map(value => `<option ${value === year ? 'selected' : ''}>${value}</option>`).join('');
    by_id('stats').innerHTML = [['River segments', overview.segments, '⌁'],['Monitoring stations', overview.stations, '⌖'],['Historical records', overview.records, '☷'],['Flagged this year', overview.flagged, '≋']].map(item => `<div class="stat"><div><small>${item[0]}</small><strong>${item[1]}</strong></div><span class="stat-icon">${item[2]}</span></div>`).join('');
    const current_river = by_id('river-filter').value;
    by_id('river-filter').innerHTML = '<option value="">All rivers</option>' + overview.rivers.map(river => `<option>${escape_text(river)}</option>`).join('');
    by_id('river-filter').value = current_river;
    if (!station_data.some(station => station.id === selected_station)) selected_station = station_data[0]?.id || '';
    station_options();
    highlighted.clear();
    draw_map();
    by_id('trace-result').textContent = 'Choose a station to explore its connections.';
    await Promise.all([load_table(), load_ranking()]);
    if (ticket === refresh_request) {
        by_id('loading').hidden = true;
        by_id('trace-button').disabled = !station_data.length;
        by_id('path-button').disabled = !station_data.length;
    }
}
async function show_station(id, compact = false) {
    try {
        const station = await api('station', {id});
        by_id('detail-code').textContent = `${station.river} · CPCB ${station.id}`;
        by_id('detail-name').textContent = station.name;
        const labels = [['bod','BOD (mg/L)'],['do','DO (mg/L)'],['ph','pH'],['fc','Faecal coliform (MPN/100 mL)']];
        const values = `${badge(station.status)} <span class="small-label">${year}</span><div class="detail-values">${labels.map(([key,label]) => `<div><small>${label}</small><strong>${range(station.reading?.[key])}</strong></div>`).join('')}</div><p class="footnote">Annual minimum–maximum values. — = unavailable or below detection limit.</p>`;
        const history = compact ? '' : `<h3>Station history</h3><div class="table-wrap"><table><thead><tr><th>Year</th><th>BOD (mg/L)</th><th>DO (mg/L)</th><th>pH</th><th>FC (MPN/100 mL)</th></tr></thead><tbody>${station.history.map(row => `<tr><td>${row.year}</td><td>${range(row.bod)}</td><td>${range(row.do)}</td><td>${range(row.ph)}</td><td>${range(row.fc)}</td></tr>`).join('')}</tbody></table></div>`;
        by_id('detail-body').innerHTML = values + (compact ? '' : history);
        by_id('detail-trace').onclick = () => { by_id('station-dialog').close(); select_station(id); location.hash = 'explorer'; };
        by_id('station-dialog').showModal();
    } catch (error) { show_error(error); }
}
by_id('close-dialog').onclick = () => by_id('station-dialog').close();
document.addEventListener('click', event => {
    const record = event.target.closest('[data-record]');
    if (record) show_station(record.dataset.record, true);
    const station = event.target.closest('[data-station]');
    if (station) show_station(station.dataset.station);
    const trace = event.target.closest('[data-trace]');
    if (trace) { select_station(trace.dataset.trace); by_id('direction').value = 'upstream'; location.hash = 'explorer'; run_trace(); }
});
function select_station(id) {
    reset_trace();
    selected_station = id;
    by_id('start-station').value = id;
    highlighted.clear();
    by_id('trace-result').textContent = 'Station selected. Choose a direction and trace the river.';
    draw_map();
}
function draw_map() {
    if (!geometry || !network_data) return;
    const points = geometry.features.flatMap(feature => feature.geometry.coordinates);
    const min_x = Math.min(...points.map(p=>p[0]));
    const max_x = Math.max(...points.map(p=>p[0]));
    const min_y = Math.min(...points.map(p=>p[1]));
    const max_y = Math.max(...points.map(p=>p[1]));
    const scale = Math.min(760/((max_x-min_x)*.88),450/(max_y-min_y));
    const width = (max_x-min_x)*.88*scale;
    const height = (max_y-min_y)*scale;
    const project = point => [(900-width)/2+(point[0]-min_x)*.88*scale, (550-height)/2+(max_y-point[1])*scale];
    let html = '<text class="map-title" x="25" y="30">GANGA BASIN / SELECTED REACHES</text><text class="map-title" x="855" y="30">N ↑</text>';
    for (const feature of geometry.features) {
        const line = feature.geometry.coordinates.map(point => project(point).join(',')).join(' ');
        const active = highlighted.has(feature.properties.id);
        html += `<polyline data-reach="${feature.properties.id}" points="${line}" fill="none" stroke="${active ? '#287ea2' : '#a1bba0'}" stroke-width="${active ? 4 : 2.5}" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    for (const station of network_data.stations) {
        const segment = network_data.segments.find(item => item.id === station.segment);
        const [x,y] = project([segment.x,segment.y]);
        const active = station.id === selected_station;
        const color = station.status === 'Flagged' ? '#cd8a41' : station.status === 'Within limits' ? '#438168' : '#9ba398';
        if (active) html += `<circle cx="${x}" cy="${y}" r="13" fill="#287ea222" stroke="#287ea2"/>`;
        html += `<circle class="station-dot" data-map="${escape_text(station.id)}" role="button" tabindex="0" aria-label="Select ${escape_text(station.name)}" cx="${x}" cy="${y}" r="${active ? 6 : 5}" fill="${active ? '#287ea2' : color}"><title>${escape_text(station.name)} · ${station.status}</title></circle>`;
        if (active) html += `<text class="map-label" x="${x-9}" y="${y-18}" text-anchor="${x>680 ? 'end':'start'}">${escape_text(station.name)}</text>`;
    }
    by_id('network').innerHTML = html;
    by_id('network').querySelectorAll('[data-map]').forEach(node => {
        node.onclick = () => select_station(node.dataset.map);
        node.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select_station(node.dataset.map); } };
    });
}
async function run_trace() {
    reset_trace();
    const ticket = trace_request;
    const button = by_id('trace-button');
    button.disabled = true;
    const current_year = year;
    const start = selected_station;
    try {
        const result = await api('trace', {id:start,direction:by_id('direction').value,method:by_id('method').value});
        if (ticket !== trace_request || year !== current_year || start !== selected_station) return;
        visit_order = result.segments.slice();
        by_id('play-trace').disabled = visit_order.length === 0;
        highlighted = new Set(result.segments);
        draw_map();
        const title = result.direction === 'upstream' ? 'Upstream stations' : 'Downstream stations';
        by_id('trace-result').innerHTML = `<strong>${result.visited} reaches visited · ${result.method.toUpperCase()}</strong><p>${title}: ${result.stations.length}. Flagged among them: ${result.candidates.length}.</p>${result.stations.length ? `<ol>${result.stations.map(station => `<li><button data-station="${escape_text(station.id)}">${escape_text(station.name)}</button> ${badge(station.status)}</li>`).join('')}</ol>` : '<p>No other stations on this part of the included network.</p>'}<p class="footnote">${result.direction === 'upstream' ? 'Flagged upstream stations are investigation candidates, not proven pollution sources.' : 'Downstream connectivity shows possible exposure paths, not confirmed pollution or travel time.'}</p><details><summary>Segment visit order</summary><p style="max-height:140px;overflow:auto;overflow-wrap:anywhere">${result.segments.join(' → ')}</p></details>`;
    } catch (error) { show_error(error); } finally { button.disabled = false; }
}
by_id('trace-button').onclick = run_trace;
by_id('play-trace').onclick = play_trace;
['direction', 'method'].forEach(id => by_id(id).onchange = () => {
    reset_trace();
    highlighted.clear();
    draw_map();
    by_id('trace-result').textContent = 'Choose Trace river to use these settings.';
});
by_id('path-button').onclick = async () => {
    reset_trace();
    const ticket = trace_request;
    const button = by_id('path-button'); button.disabled = true;
    const current_year = year, start = selected_station;
    try {
        const result = await api('path', {id:start,to:by_id('end-station').value});
        if (ticket !== trace_request || year !== current_year || start !== selected_station) return;
        highlighted = new Set(result.segments); draw_map();
        by_id('trace-result').innerHTML = result.found ? `<strong>Route found · ${result.hops} segment edges</strong><p>BFS follows downstream connections.${result.same_segment ? ' Both stations are on the same mapped reach; within-reach order is unknown.' : ''}</p><details><summary>Route segments</summary><p style="max-height:160px;overflow:auto;overflow-wrap:anywhere">${result.segments.join(' → ')}</p></details>` : '<strong>No downstream route found.</strong><p>The destination may be upstream, on another branch, or outside the included connections.</p>';
    } catch (error) { show_error(error); } finally { button.disabled = false; }
};
by_id('start-station').onchange = event => select_station(event.target.value);
by_id('clear-map').onclick = () => { reset_trace(); highlighted.clear(); draw_map(); by_id('trace-result').textContent = 'View reset. Choose a direction to trace again.'; };
by_id('year').onchange = async event => { year = Number(event.target.value); by_id('station-dialog').close(); try { await refresh(); } catch (error) { by_id('loading').hidden=true; show_error(error); } };
let search_timer;
by_id('search').oninput = () => { clearTimeout(search_timer); search_timer = setTimeout(()=>load_table().catch(show_error),150); };
['river-filter','status-filter','sort'].forEach(id => by_id(id).onchange = ()=>load_table().catch(show_error));
by_id('all-stations').onclick = () => { by_id('search').value=''; by_id('river-filter').value=''; by_id('status-filter').value=''; load_table().catch(show_error); by_id('search').focus(); };
async function start() {
    show_page();
    try {
        const response = await fetch('/network.geojson');
        if (!response.ok) throw new Error((await response.json()).error || 'The river geometry could not be loaded.');
        geometry = await response.json();
        const tree = await api('tree');
        by_id('tree').innerHTML = tree.map(row => `<div class="tree-row" style="margin-left:${row.depth*30}px">${escape_text(row.name)}</div>`).join('');
        await refresh();
    } catch (error) { by_id('loading').hidden=true; show_error(error); }
}
start();
