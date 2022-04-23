const register_info = {
    origin: "History",
    topic: "Alerts",
    misc: "all"
};
let socket = {};

let HISTORY = [];
let HISTORY_NEXT_PAGINATION = "";

let EVENTS = [];
let EVENTS_NEXT_PAGINATION = "";

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

function init() {
    socket = StartWebsocket(register_info);

    socket.addEventListener('message', function (event) {
        let type = event.data.toString().split(":")[0];
        if (type === 'register' || type === 'settings' || type === 'Error') return;
        let data = JSON.parse(event.data.toString().split(":").slice(1).join(":"));

        //Echo back (Ping-Pong alternative)
        socket.send(event.data.toString());

        if (type === 'history') Add2History(data);
    });
    
    fetchHistory();
    fetchEvents();
    OUTPUT_create();
}

//History
function Add2History(data) {
    HISTORY.unshift(data);
    showHistory([data], true);
}
function showHistory(history = [], update = false) {
    //Sort just in case
    history.sort((a, b) => b.time - a.time);

    let s = '';
    for (let i = 0; i < history.length; i++) s += createEvent(history[i], i);
    if(update) document.getElementById('HISTORY').innerHTML = s + document.getElementById('HISTORY').innerHTML;
    else document.getElementById('HISTORY').innerHTML = s;
}
function createEvent(event, i) {
    let s = '';
    s += '<div  class="HISTORY_EVENT">';
    s += '<div class="HISTORY_EVENT_TIME">' + RelativeTime(event.time, 'relative') + '</div>';
    s += '<div class="HISTORY_EVENT_TYPE">' + event.topic + '</div>';
    s += '<div class="HISTORY_EVENT_TEXT">';
    s += '<div title="' + FillFormattedString(ALERT_TEXTS[event.topic], event) + '">' + FillFormattedString(ALERT_TEXTS[event.topic], event) + '</div>';
    
    if (event.message && event.message.text) s += '<div class="HISTORY_EVENT_MESSAGE" title="' + event.message.text + '">' + ReplaceEmotes(event.message.text, event.message.emotes, event.message.ffz_emotes, event.message.bttv_emotes, event.message.cheer_emotes) + '</div>';
    s += '</div>';
    s += '<div class="HISTORY_EVENT_UI">';
    s += '<img src="/images/icons/refresh.svg" title="Re-Trigger Alert" onclick="retriggertEvent(' + i + ', event)" />';
    s += '<img src="/images/icons/trash-alt-solid.svg" red title="Remove History Entry" onclick="removeEvent(' + i + ', this, event)" />';
    s += '</div>';
    s += '</div>';
    return s;
}

function fetchHistory(pagination) {
    document.getElementById('History_load_more').disabled = true;
    fetch('/api/alerts/history' + (pagination ? '?pagination=' + pagination : ''), getAuthHeader())
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            HISTORY = json.data;
            HISTORY_NEXT_PAGINATION = json.pagination;
            showHistory(HISTORY);

            let pages = GetPaginationValues(HISTORY_NEXT_PAGINATION);
            if (!pages.length || pages.length == 0 || pages[2].pagecount !== pages[1]) document.getElementById('History_load_more').disabled = false;
        })
        .catch(err => {
            document.getElementById('History_load_more').disabled = false;
            OUTPUT_showError(err.message);
            console.log(err);
        });
}
function retriggertEvent(i, e) {
    e.stopPropagation();
    if (i === undefined) return;

    let event = HISTORY[i];
    if (!event) return;

    const opt = getAuthHeader();
    opt.method = 'POST';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(event);

    fetch('/api/alerts/trigger/' + event.topic, opt)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo("Alert Trigger Sent!");
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
        });
}
async function removeEvent(i, elt) {
    if (i === undefined) return;

    let event = HISTORY[i];
    if (!event) return;

    //Await Confirmation
    let answer = 'NO';

    try {
        answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Do you really want to delete this History Event?");
    } catch (err) {

    }

    if (answer !== 'YES') return Promise.resolve();

    document.getElementById('HISTORY').innerHTML = MISC_LOADING_RING_CREATE();

    const opt = getAuthHeader();
    opt.method = 'DELETE';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify({ id: event['_id'] });

    fetch('/api/alerts/history', opt)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo("Alert Removed!");
            fetchHistory();
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
            showHistory(HISTORY);
        });
}
function loadMoreHistory() {
    document.getElementById('History_load_more').disabled = true;

    fetch('/api/alerts/history?pagination=' + HISTORY_NEXT_PAGINATION, getAuthHeader())
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            HISTORY.concat(json.data);
            HISTORY_NEXT_PAGINATION = json.pagination;
            showHistory(HISTORY);

            let pages = GetPaginationValues(HISTORY_NEXT_PAGINATION);
            if (!pages.length || pages.length == 0 || pages[2].pagecount !== pages[1]) document.getElementById('History_load_more').disabled = false;
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
            document.getElementById('History_load_more').disabled = false;
        });
}

//Events
function fetchEvents(pagination) {
    fetch('/api/alerts/events' + (pagination ? '?pagination=' + pagination : ''), getAuthHeader())
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            EVENTS = json.data;
            EVENTS_NEXT_PAGINATION = json.pagination;
            showEvents(EVENTS);

            //Show
            document.getElementById('ALERTS').style.display = 'block';

            let pages = GetPaginationValues(EVENTS_NEXT_PAGINATION);
            if (!pages.length || pages.length == 0 || pages[2].pagecount !== pages[1]) document.getElementById('Events_load_more').disabled = false;
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
        });
}
function showEvents(events = [], update = false) {
    //Sort just in case
    events.sort((a, b) => b.time - a.time);

    let s = '';
    for (let i = 0; i < events.length; i++) s += createChannelEvent(events[i], i);
    if (update) document.getElementById('EVENTS').innerHTML = s + document.getElementById('EVENTS').innerHTML;
    else document.getElementById('EVENTS').innerHTML = s;
}
function createChannelEvent(event, i) {
    if (event.type === 'hypetrain') return createHypeTrain(event.event);
    if (event.type === 'goal') return createGoal(event.event);
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
            EVENTS_NEXT_PAGINATION = json.pagination;
            showEvents(EVENTS);

            let pages = GetPaginationValues(EVENTS_NEXT_PAGINATION);
            if (!pages.length || pages.length == 0 || pages[2].pagecount !== pages[1]) document.getElementById('Events_load_more').disabled = false;
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