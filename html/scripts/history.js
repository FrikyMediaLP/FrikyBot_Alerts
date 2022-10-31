const register_info = {
    origin: "History",
    topic: "Alerts",
    misc: "all"
};
let socket = {};
let RECONNECT_TIMEOUT = 1;
let AUTO_RECONNECT = true;

let HISTORY = [];
let HISTORY_NEXT_PAGINATION = "";

let EVENTS = [];
let EVENTS_NEXT_PAGINATION = "";

let PAUSE_HISTORY_REFRESH = false;

const ALERT_TEXTS = {
    'follow': '{username} just followed!',
    'sub': '{username} just subscribed with {tier}!',
    'resub': '{username} just resubscribed for {months} Months!',
    'giftsub': '{username} just gifted a {tier} Sub to {target}',
    'giftbomb': '{username} just gifted {amount} {tier} Sub(s)',
    'upgrade': '{username} just upgraded their subscription to {tier}!',
    'cheer': '{username} just donated {amount} Bits.',
    'host': '{username} just hosted with {amount} Viewers.',
    'raid': '{username} just raided with {amount} Viewers.'
};

async function init() {
    OUTPUT_create();
    setupWebSocket();


    await fetchOverlays().catch(err => {
        OUTPUT_showError(err.message);
        console.log(err);
    });

    await fetchHistory().catch(err => {
        OUTPUT_showError(err.message);
        console.log(err);
    });

    await fetchEvents().catch(err => {
        OUTPUT_showError(err.message);
        console.log(err);
    });


    //Show
    document.getElementById('ALERTS').style.display = 'block';
    document.getElementById('INIT_LOADER').remove();
    OUTPUT_create();

    setInterval(() => {
        if (!PAUSE_HISTORY_REFRESH) showHistory(HISTORY)
    }, 60 * 1000);
}
function setupWebSocket() {
    socket = StartWebsocket(register_info, TCPMessageHandler, terminated_event);
}
function TCPMessageHandler(event) {
    ECONNECT_TIMEOUT = 1;
    let type = event.data.toString().split(":")[0];
    let data = JSON.parse(event.data.toString().split(":").slice(1).join(":"));

    if (ALERT_TEXTS[type]) Add2History(data);
}
function terminated_event(event) {
    let type = event.toString().substring(0, event.toString().indexOf(':'));

    if (type === 'terminated') {
        setTimeout(() => init(true), Math.exp(RECONNECT_TIMEOUT) * 1000);
        RECONNECT_TIMEOUT++;
    }
}

//History
function Add2History(data) {
    HISTORY.unshift(data);
    showHistory(HISTORY);
}
function showHistory(history = []) {
    //Sort just in case
    history.sort((a, b) => b.time - a.time);

    let s = '';
    for (let i = 0; i < history.length; i++) {
        try {
            s += createEvent(history[i], i);
        } catch (err) {
            console.log(history[i]);
            console.log(err);
        }
    }
    document.getElementById('HISTORY').innerHTML = s;

    if (document.getElementById('HISTORY').innerHTML === "") {
        document.getElementById('HISTORY').innerHTML = '<center>NO ALERTS</center>';
    }

    if (HISTORY.find(elt => elt.seen !== true)) {
        document.getElementById('HISTORY_MARK_BTN').style.display = 'inline-block';
        document.getElementById('HISTORY_SEEN_BTN').style.display = 'inline-block';
    } else {
        document.getElementById('HISTORY_MARK_BTN').style.display = 'none';

        let events = [];

        for (let elt of document.getElementsByClassName('HISTORY_EVENT_UI_MULTISELECT')) {
            if (elt.checked) {
                events.push(parseInt(elt.dataset.index));
            }
        }

        if (events.length === 0) {
            document.getElementById('HISTORY_SEEN_BTN').style.display = 'none';
        }
    }
}
function createEvent(event, i) {
    let s = '';
    s += '<div  class="HISTORY_EVENT" ' + (event.seen !== false ? 'seen' : '') + '>';
    s += '<div class="HISTORY_EVENT_TIME">' + RelativeTime(Math.min(Date.now() - 1000, event.time), 'relative') + '</div>';
    s += '<div class="HISTORY_EVENT_TYPE">' + event.topic + '</div>';
    s += '<div class="HISTORY_EVENT_TEXT" onclick="updateEvent(' + i + ', this)">';
    
    s += '<div title="' + FillFormattedString(ALERT_TEXTS[event.topic], event) + '">' + FillFormattedString(ALERT_TEXTS[event.topic], event) + '</div>';
    
    if (event.message && event.message.text) s += '<div class="HISTORY_EVENT_MESSAGE" title="' + event.message.text + '">' + ReplaceEmotes(event.message.text, event.message.ttv_emotes, event.message.ffz_emotes, event.message.bttv_emotes, event.message.cheer_emotes) + '</div>';
    s += '</div>';
    s += '<div class="HISTORY_EVENT_UI">';
    s += '<img src="/images/icons/refresh.svg" title="Re-Trigger Alert" onclick="retriggertEvent(' + i + ', event)" />';

    s += '<div class="HISTORY_EVENT_UI_REMOVE_WRAPPER">';
    s += '<img src="/images/icons/trash-alt-solid.svg" red title="Remove History Entry" onclick="removeEvent(' + i + ', this, event)" />';
    s += '<input class="HISTORY_EVENT_UI_MULTISELECT" type="checkbox" data-index="' + i + '" onclick="History_multiselect(' + i + ', this, event)" />';
    s += '</div>';

    s += '</div>';
    s += '</div>';
    return s;
}

async function fetchHistory(pagination = GetPaginationString(30, 0, { timesorted: true })) {
    document.getElementById('History_load_more').disabled = true;
    return fetch('/api/alerts/history' + (pagination ? '?pagination=' + pagination : ''), getAuthHeader())
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            HISTORY = json.data;
            showHistory(HISTORY);

            document.getElementById('History_load_more').disabled = false;

            let old_pages = GetPaginationValues(pagination);
            let new_pages = GetPaginationValues(json.pagination);
            
            if (new_pages[2].pagecount === 0 || new_pages[2].pagecount === Math.max(0, old_pages[1] + 1)) document.getElementById('History_load_more').setAttribute('hidden', 'true');
            else document.getElementById('History_load_more').removeAttribute('hidden');

            HISTORY_NEXT_PAGINATION = json.pagination;
        })
        .catch(err => {
            document.getElementById('History_load_more').disabled = false;
            return Promise.reject(err);
        });
}
async function fetchOverlays() {
    return fetch('/api/alerts/overlays', getAuthHeader())
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            let options = [{ name: '', title: 'All Overlays' }];

            for (let overlay of json.overlays) {
                options.push({ name: overlay.token, title: overlay.name });
            }
            
            document.getElementById('HISTOR_HEADER_UI').innerHTML = MISC_createDropdownButton('TRIGGER UNSEEN', options, 0, 'triggerEvents', '', 'HISTORY_SEEN_BTN') + document.getElementById('HISTOR_HEADER_UI').innerHTML;
        })
        .catch(err => {
            return Promise.reject(err);
        });
}

function retriggertEvent(i, e) {
    e.stopPropagation();
    if (i === undefined) return;

    let event = HISTORY[i];
    if (!event) return;
    OUTPUT_hideError();

    if (event.seen === false) event.update_history = true;

    const opt = getAuthHeader();
    opt.method = 'POST';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(event);

    fetch('/api/alerts/trigger/' + event.topic, opt)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo("Alert Trigger Sent!");
            HISTORY[i].seen = true;
            showHistory(HISTORY);
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
        });
}
async function removeEvent(i, elt) {
    if (i === undefined) return;
    OUTPUT_hideError();

    let event = HISTORY[i];
    if (!event) return;

    //Await Confirmation
    let answer = 'NO';

    try {
        answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Do you really want to delete this History Event?");
    } catch (err) {

    }

    if (answer !== 'YES') return Promise.resolve();

    document.getElementById('HISTORY').innerHTML = '<div class="WAITING_RING">' + MISC_LOADING_RING_CREATE() + '</div>';

    const opt = getAuthHeader();
    opt.method = 'DELETE';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify({ events: [event] });

    fetch('/api/alerts/history', opt)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo("Alert Removed!");
            HISTORY.splice(i, 1);
            showHistory(HISTORY);
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
            showHistory(HISTORY);
        });
}
async function updateEvent(i, elt) {
    if (i === undefined) return;

    let event = HISTORY[i];
    if (!event) return;
    OUTPUT_hideError();

    const opt = getAuthHeader();
    opt.method = 'PUT';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify({ events: [event] });

    fetch('/api/alerts/history', opt)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            HISTORY[i].seen = true;
            showHistory(HISTORY);
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
            showHistory(HISTORY);
        });
}

function History_multiselect(i, elt) {
    if (elt.checked) elt.style.display = 'inline-block';
    else elt.style.display = '';

    let events = [];

    for (let elt of document.getElementsByClassName('HISTORY_EVENT_UI_MULTISELECT')) {
        if (elt.checked) {
            events.push(parseInt(elt.dataset.index));
        }
    }

    if (events.length === 0) {
        PAUSE_HISTORY_REFRESH = false;
        document.getElementById('HISTORY_REMOVE_SELECT_BTN').style.display = 'none';
        document.getElementById('HISTORY_MARK_BTN').innerHTML = 'MARK ALL AS SEEN';
        document.getElementById('HISTORY_SEEN_BTN').childNodes[0].childNodes[0].innerHTML = 'TRIGGER UNSEEN';
        if (!HISTORY.find(elt => elt.seen !== true)) document.getElementById('HISTORY_SEEN_BTN').style.display = 'none';
    }
    else {
        PAUSE_HISTORY_REFRESH = true;
        document.getElementById('HISTORY_REMOVE_SELECT_BTN').style.display = 'inline-block';
        document.getElementById('HISTORY_MARK_BTN').innerHTML = 'MARK SELECTED AS SEEN';
        document.getElementById('HISTORY_SEEN_BTN').style.display = 'inline-block';
        document.getElementById('HISTORY_SEEN_BTN').childNodes[0].childNodes[0].innerHTML = 'TRIGGER SELECTED';
    }
}
async function triggerEvents() {
    let overlay = MISC_getDropdownButtonValue(document.getElementById('HISTORY_SEEN_BTN'));
    if (overlay === "") overlay = undefined;
    OUTPUT_hideError();
    
    const opt = getAuthHeader();
    opt.method = 'PUT';
    opt.headers['Content-Type'] = 'application/json';

    let events = [];
    let events_data = [];

    for (let elt of document.getElementsByClassName('HISTORY_EVENT_UI_MULTISELECT')) {
        if (elt.checked) {
            events.push(parseInt(elt.dataset.index));
            events_data.push(HISTORY[parseInt(elt.dataset.index)]);
        }
    }

    if (events.length === 0) {
        opt.body = JSON.stringify({ overlay, event });

        fetch('/api/alerts/trigger/unseen?mode=all', opt)
            .then(STANDARD_FETCH_RESPONSE_CHECKER)
            .then(json => {
                for (let event of HISTORY) {
                    event.seen = true;
                }

                showHistory(HISTORY);
            })
            .catch(err => {
                OUTPUT_showError(err.message);
                console.log(err);
                showHistory(HISTORY);
            });
    } else {
        opt.body = JSON.stringify({ overlay, events: events_data.reverse() });

        fetch('/api/alerts/trigger/collection', opt)
            .then(STANDARD_FETCH_RESPONSE_CHECKER)
            .then(json => {
                for (let event of events) {
                    HISTORY[event].seen = true;
                }

                showHistory(HISTORY);
            })
            .catch(err => {
                OUTPUT_showError(err.message);
                console.log(err);
                showHistory(HISTORY);
            });
    }

    document.getElementById('HISTORY').innerHTML = '<div class="WAITING_RING">' + MISC_LOADING_RING_CREATE() + '</div>';
}
async function updateEvents() {
    let events = [];
    let events_data = [];

    for (let elt of document.getElementsByClassName('HISTORY_EVENT_UI_MULTISELECT')) {
        if (elt.checked) {
            events.push(parseInt(elt.dataset.index));
            events_data.push(HISTORY[parseInt(elt.dataset.index)]);
        }
    }

    if (events.length === 0) {
        events_data = HISTORY.filter((ele, i) => {
            if (ele.seen === false) {
                events.push(i);
                return true;
            }
            return false;
        });
    };
    if (events.length === 0) return;
    OUTPUT_hideError();

    const opt = getAuthHeader();
    opt.method = 'PUT';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify({ events: events_data });

    fetch('/api/alerts/history', opt)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            //Update History seen values
            for (let event of events) {
                HISTORY[event].seen = true;
            }

            showHistory(HISTORY);
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
            showHistory(HISTORY);
        });
}
async function removeEvents() {
    let events = [];
    let events_data = [];

    for (let elt of document.getElementsByClassName('HISTORY_EVENT_UI_MULTISELECT')) {
        if (elt.checked) {
            events.push(parseInt(elt.dataset.index));
            events_data.push(HISTORY[parseInt(elt.dataset.index)]);
        }
    }

    if (events.length === 0) return;

    //Await Confirmation
    let answer = 'NO';

    try {
        answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Do you really want to delete these History Events?");
    } catch (err) {

    }

    if (answer !== 'YES') return Promise.resolve();
    
    OUTPUT_hideError();

    const opt = getAuthHeader();
    opt.method = 'DELETE';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify({ events: events_data });

    fetch('/api/alerts/history', opt)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            //Update History
            for (let event of events.reverse()) {
                HISTORY.splice(event, 1);
            }

            showHistory(HISTORY);
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
            showHistory(HISTORY);
        });
}

function loadMoreHistory() {
    document.getElementById('History_load_more').disabled = true;
    OUTPUT_hideError();

    fetch('/api/alerts/history?pagination=' + HISTORY_NEXT_PAGINATION, getAuthHeader())
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            HISTORY = HISTORY.concat(json.data);
            showHistory(HISTORY);

            document.getElementById('History_load_more').disabled = false;

            let old_pages = GetPaginationValues(HISTORY_NEXT_PAGINATION || json.pagination);
            let new_pages = GetPaginationValues(json.pagination);
            
            if (new_pages[2].pagecount === 0 || new_pages[2].pagecount === Math.max(0, old_pages[1] + 1)) document.getElementById('History_load_more').setAttribute('hidden', 'true');
            else document.getElementById('History_load_more').removeAttribute('hidden');
            
            HISTORY_NEXT_PAGINATION = json.pagination;
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
            document.getElementById('History_load_more').disabled = false;
        });
}

//Events
async function fetchEvents(pagination = GetPaginationString(30, 0, { timesorted: true })) {
    return fetch('/api/alerts/events' + (pagination ? '?pagination=' + pagination : ''), getAuthHeader())
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            EVENTS = json.data;
            showEvents(EVENTS);

            let old_pages = GetPaginationValues(pagination);
            let new_pages = GetPaginationValues(json.pagination);
            
            if (new_pages[2].pagecount === 0 || new_pages[2].pagecount === Math.max(0, old_pages[1] + 1)) document.getElementById('Events_load_more').setAttribute('hidden', 'true');
            else document.getElementById('Events_load_more').removeAttribute('hidden');

            EVENTS_NEXT_PAGINATION = json.pagination;
        });
}
function showEvents(events = [], update = false) {
    //Sort just in case
    events.sort((a, b) => b.time - a.time);

    let s = '';
    for (let i = 0; i < events.length; i++) s += createChannelEvent(events[i], i);
    if (update) document.getElementById('EVENTS').innerHTML = s + document.getElementById('EVENTS').innerHTML;
    else document.getElementById('EVENTS').innerHTML = s;

    if (document.getElementById('EVENTS').innerHTML === "") {
        document.getElementById('EVENTS').innerHTML = '<center>NO EVENTS</center>';
    }
}
function createChannelEvent(event, i) {
    if (event.type === 'hypetrain') return createHypeTrain(event.event);
    else if (event.type === 'goal') return createGoal(event.event);
    else return "";
}
function createHypeTrain(event) {
    let s = '';
    s += '<div  class="CHANNEL_EVENT HYPETRAIN_EVENT">';
    
    s += '<div class="HYPETRAIN_EVENT_HEADER">';
    s += '<div><span>HYPETRAIN LEVEL</span>: <span class="HYPETRAIN_EVENT_LEVEL">' + event.level + '</span></div>';
    s += '<div class="HYPETRAIN_EVENT_TIME">' + RelativeTime(event.ended_at, 'relative') + '</div>';
    s += '</div>';

    s += '<div style="border-bottom: 1px solid gray;">TOP CONTRIBUTIONS</div>';
    s += '<div class="HYPETRAIN_EVENT_BODY">';
    for (let contribution of event.top_contributions) {
        s += '<div class="HYPETRAIN_EVENT_CONTRIBUTION">';
        s += '<div>' + contribution.user_name + '</div>';
        s += '<div>' + Math.floor((contribution.total / event.total) * 100) + '%</div>';
        s += '</div>';
    }
    s += '</div>';

    s += '</div>';
    return s;
}
function createGoal(event) {
    let s = '';
    s += '<div  class="CHANNEL_EVENT GOAL_EVENT">';
    console.log(event);
    s += '</div>';
    return s;
}
function loadMoreEvents() {
    document.getElementById('Events_load_more').disabled = true;

    fetch('/api/alerts/events?pagination=' + EVENTS_NEXT_PAGINATION, getAuthHeader())
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            EVENTS.concat(json.data);
            showEvents(EVENTS);
            
            let old_pages = GetPaginationValues(EVENTS_NEXT_PAGINATION || json.pagination);
            let new_pages = GetPaginationValues(json.pagination);

            if (new_pages[2].pagecount === 0 || new_pages[2].pagecount === old_pages[1] + 1) document.getElementById('Events_load_more').setAttribute('hidden', 'true');
            else document.getElementById('Events_load_more').removeAttribute('hidden');

            EVENTS_NEXT_PAGINATION = json.pagination;
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
            document.getElementById('Events_load_more').disabled = false;
        });
}

//UTIL
function RelativeTime(t_ms = 0, mode) {
    if (t_ms === undefined) return '-';
    if (t_ms < Date.now() / 10) t_ms *= 1000;

    if (mode === 'relative') {
        let rel = Date.now() - t_ms;

        if (rel > 0) {
            if (rel < 60 * 1000) return 'a minute ago';
            else if (rel < 60 * 60 * 1000) return Math.floor(rel / (60 * 1000)) + ' minutes ago';
            else if (rel < 2 * 60 * 60 * 1000) return 'an hour ago';
            else if (rel < 24 * 60 * 60 * 1000) return Math.floor(rel / (60 * 60 * 1000)) + ' hours ago';
        } else {
            rel = -1 * rel;
            if (rel < 60 * 1000) return 'in ' + Math.floor(rel / 1000) + ' seconds';
            else if (rel < 2 * 60 * 1000) return 'in a minute';
            else if (rel < 60 * 60 * 1000) return 'in ' + Math.floor(rel / (60 * 1000)) + ' minutes';
            else if (rel < 2 * 60 * 60 * 1000) return 'in an hour';
            else if (rel < 24 * 60 * 60 * 1000) return 'in ' + Math.floor(rel / (60 * 60 * 1000)) + ' hours';
        }
    }

    let date = new Date(t_ms);

    let day = date.getDate();
    let month = date.getMonth() + 1;

    if (day < 10) day = "0" + day;
    if (month < 10) month = "0" + month;
    
    return day + "." + month + "." + date.getFullYear()  + ' ' + date.toLocaleTimeString('de-DE').split(':').slice(0, 2).join(':');
}