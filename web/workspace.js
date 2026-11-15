const el = id => document.getElementById(id);
function node(tag,text) {
  const item = document.createElement(tag);
  if (text != null) item.textContent = text;
  return item;
}
function label(key) {
  const units = {do:'DO (mg/L)',bod:'BOD (mg/L)',ph:'pH',fc:'FC (MPN/100 mL)'};
  const [parameter,end] = key.split('_');
  if (units[parameter]) return units[parameter] + ' ' + end;
  return key.replaceAll('_',' ').replace(/^./,c => c.toUpperCase());
}
function button(text,action) {
  const item = node('button',text);
  item.type = 'button';
  item.onclick = action;
  return item;
}
async function request(path,method='GET',body) {
  const res = await fetch('/db/'+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data = await res.json();
  if (!res.ok) throw Error(data.error);
  return data;
}
let catalog, section = 'overview', rows = [], choices = {}, generation = 0;
function describe(row) {
  if (row.station_name) return row.id+' · '+row.station_name+' ('+row.report_year+')';
  if (row.name) return row.id+' · '+row.name;
  if (row.longitude != null) return row.id+' · '+row.latitude+', '+row.longitude;
  return String(row.id);
}
function choice_input(items,placeholder) {
  const input = node('select');
  input.append(new Option(placeholder,''));
  for (const item of items) input.append(new Option(describe(item),item.id));
  return input;
}
function field(parent,text,input) {
  const wrap = node('label',text);
  wrap.append(input);
  parent.append(wrap);
  return input;
}
async function open_section(name,success='') {
  const version = ++generation;
  section = name;
  const controls = el('controls');
  controls.replaceChildren();
  el('results').replaceChildren();
  el('heading').textContent = label(name);
  el('notice').textContent = 'Loading…';
  for (const item of el('sections').children) item.setAttribute('aria-current',String(item.dataset.key === name));
  try {
    if (name === 'overview') {
      const counts = await request('overview');
      if (version !== generation) return;
      const cards = node('div'); cards.className = 'totals';
      for (const [key,value] of Object.entries(counts)) {
        const card = node('div',label(key)); card.append(node('strong',value)); cards.append(card);
      }
      el('results').append(cards);
    } else {
      const params = new URLSearchParams();
      const refs = new Set((catalog.fields[name] || []).map(key => catalog.references[key]).filter(Boolean));
      if (name === 'water_quality_record') refs.add('river');
      const entries = await Promise.all([...refs].map(async ref => [ref,await request(ref)]));
      if (version !== generation) return;
      choices = Object.fromEntries(entries);
      let route = name;
      if (name === 'reports') {
        const selection = node('select');
        catalog.reports.forEach(key => selection.append(new Option(label(key),key)));
        field(controls,'Report',selection);
        const year = field(controls,'Report year',node('input'));
        year.type = 'number'; year.value = '2023';
        const report = async () => show_rows('report/'+selection.value+'?year='+encodeURIComponent(year.value),version);
        controls.append(button('Run report',report));
        await report(); return;
      }
      if (name === 'water_quality_record') {
        const term = field(controls,'Station or river',node('input'));
        const year = field(controls,'Year',node('input'));
        year.type = 'number'; year.placeholder = 'All years';
        const river = field(controls,'River',choice_input(choices.river,'All rivers'));
        controls.append(button('Apply filters',() => {
          params.set('q',term.value); params.set('year',year.value); params.set('river',river.value);
          show_rows(name+'?'+params,version);
        }));
      }
      if (name !== 'river_segment') controls.append(button('Add '+label(name).toLowerCase(),() => edit(null)));
      await show_rows(route,version,success); return;
    }
    el('notice').textContent = success;
  } catch(error) { if (version === generation) el('notice').textContent = error.message; }
}
async function show_rows(route,version,success='') {
  try {
    const data = await request(route);
    if (version !== generation) return;
    rows = data;
    const results = el('results'); results.replaceChildren();
    el('notice').textContent = [success,rows.length ? rows.length+' rows' : 'No matching records.'].filter(Boolean).join(' · ');
    if (!rows.length) return;
    const editable = section !== 'reports' && section !== 'river_segment';
    const columns = Object.keys(rows[0]).filter(key => key !== 'edit_history');
    const table = node('table'), head = table.createTHead().insertRow();
    for (const key of columns) head.append(node('th',label(key)));
    if (editable) head.append(node('th','Actions'));
    const body = table.createTBody();
    for (const row of rows) {
      const tr = body.insertRow();
      for (const key of columns) {
        const reference = choices[catalog.references[key]]?.find(item => String(item.id) === String(row[key]));
        tr.insertCell().textContent = reference ? describe(reference) : row[key] ?? '—';
      }
      if (editable) {
        const actions = tr.insertCell();
        actions.append(button('Edit',() => edit(row)),button('Delete',() => remove(row)));
        if (section === 'water_quality_record') actions.append(button('History',() => history_view(row)));
      }
    }
    results.append(table);
  } catch(error) { if (version === generation) el('notice').textContent = error.message; }
}
function history_view(row) {
  const history = row.edit_history || [];
  const detail = node('dialog'), title = node('h2','Edit history · '+describe(row));
  detail.append(title,node('pre',history.length ? JSON.stringify(history,null,2) : 'No edits recorded.'),button('Close',()=>detail.close()));
  detail.onclose = ()=>detail.remove(); document.body.append(detail); detail.showModal();
}
async function remove(row) {
  const warning = section === 'water_quality_record' ? ' Its edit history and linked pollution observations will also be deleted.' : '';
  if (!confirm('Delete '+describe(row)+'?'+warning)) return;
  try { await request(section+'/'+encodeURIComponent(row.id),'DELETE'); await open_section(section,'Deleted.'); }
  catch(error) { el('notice').textContent = error.message; }
}
function edit(row) {
  const dialog = el('editor'), inputs = el('inputs'), form = el('form');
  inputs.replaceChildren(); el('form_error').textContent = '';
  el('form_title').textContent = (row ? 'Edit ' : 'Add ')+label(section).toLowerCase();
  for (const key of catalog.fields[section]) {
    if (row && key === 'id') continue;
    const ref = catalog.references[key];
    const input = ref ? choice_input(choices[ref],'Select…') : node('input');
    if (key === 'measured_on') input.type = 'date';
    input.name = key; input.value = row?.[key] ?? '';
    input.required = !catalog.optional.includes(key);
    field(inputs,label(key)+(input.required ? ' *' : ''),input);
  }
  form.onsubmit = async event => {
    event.preventDefault();
    const submit = form.querySelector('button'); submit.disabled = true;
    try {
      const path = row ? section+'/'+encodeURIComponent(row.id) : section;
      await request(path,row ? 'PUT' : 'POST',Object.fromEntries(new FormData(form)));
      dialog.close(); await open_section(section,'Saved.');
    } catch(error) { el('form_error').textContent = error.message; }
    finally { submit.disabled = false; }
  };
  dialog.showModal();
}
el('cancel').onclick = () => el('editor').close();
request('catalog').then(result => {
  catalog = result;
  for (const key of ['overview','water_quality_record','reports',...Object.keys(result.fields).filter(k=>k!=='water_quality_record')]) {
    const item = button(label(key),()=>open_section(key)); item.dataset.key = key; el('sections').append(item);
  }
  open_section('overview');
}).catch(error => { el('notice').textContent = error.message; });
